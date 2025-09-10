# app.py
from fastapi import FastAPI, HTTPException, status, Depends, Query
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, Field, constr
import sqlite3
import datetime
import threading
import logging
from typing import Optional, List
import json
from jose import JWTError, jwt
from passlib.context import CryptContext
import google.generativeai as genai
from google import genai as genai2
import os
from PIL import Image
from io import BytesIO


# ---------- CONFIG ----------
DB_PATH = "main.db"
logging.basicConfig(filename="logfile.log", level=logging.INFO,
                    format="%(asctime)s : %(levelname)s : %(message)s")

app = FastAPI(title="TinySocial API", version="1.0")

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- DB CONNECTION ----------
db_lock = threading.Lock()
_conn = None

def get_conn():
    global _conn
    if _conn is None:
        _conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        _conn.row_factory = sqlite3.Row
    return _conn

def log_exception(e: Exception):
    logging.exception(e)

def iso_date_time():
    now = datetime.datetime.now()
    return now.date().isoformat(), now.time().isoformat(timespec="seconds")

# ---------- AUTH CONFIG ----------
SECRET_KEY = ""   # ⚠️ change in production
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(password: str, hashed: str) -> bool:
    return pwd_context.verify(password, hashed)

def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None):
    to_encode = data.copy()
    expire = datetime.datetime.utcnow() + (expires_delta or datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None or not user_exists(user_id):
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

# ---------- Pydantic Models ----------
UserIdStr = constr(strip_whitespace=True, pattern=r"^[A-Za-z0-9]+$")

class RegisterReq(BaseModel):
    userID: UserIdStr
    name: str
    password: constr(min_length=4)

class CreatePostReq(BaseModel):
    userID: UserIdStr
    title: constr(max_length=50) = ""
    content: constr(min_length=1, max_length=280)
    # if client sets `hashtag` true, the server will generate hashtags from content
    hashtag: bool = False
    # client can also provide explicit hashtags list
    hashtags: Optional[List[str]] = None

class FollowReq(BaseModel):
    followerID: UserIdStr
    followeeID: UserIdStr

class ShareReq(BaseModel):
    userID: UserIdStr
    postID: int

class PostOut(BaseModel):
    postId: int
    userId: str
    name: Optional[str]
    title: str
    date: str
    time: str
    content: str
    shared: bool
    hashtags: Optional[List[str]] = None


class HashtagReq(BaseModel):
    postID: Optional[int] = None
    content: Optional[str] = None

class HashtagReq(BaseModel):
    postID: Optional[int] = None
    content: Optional[str] = None
    language: Optional[str] = Field(None, description="Language code for translation, e.g., 'es' for Spanish")
# ---------- DB Init ----------
def system_init():
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute('''
            CREATE TABLE IF NOT EXISTS USERS (
                userId TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                password TEXT NOT NULL,
                dateCreated DATE NOT NULL
            )
        ''')
        cur.execute('''
            CREATE TABLE IF NOT EXISTS POST (
                postId INTEGER PRIMARY KEY AUTOINCREMENT,
                userId TEXT NOT NULL REFERENCES USERS(userId),
                title TEXT,
                date DATE,
                time TIME,
                content TEXT,
                shared INTEGER DEFAULT 0,
                hashtags TEXT DEFAULT ''
            )
        ''')
        cur.execute('''
            CREATE TABLE IF NOT EXISTS FOLLOWERS (
                followeeID TEXT NOT NULL REFERENCES USERS(userId),
                followerID TEXT NOT NULL REFERENCES USERS(userId),
                PRIMARY KEY (followeeID, followerID)
            )
        ''')
        conn.commit()
    except Exception as e:
        log_exception(e)
        raise

@app.on_event("startup")
def startup_event():
    system_init()

# ---------- Helper ----------
def user_exists(userID: str) -> bool:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM USERS WHERE userId = ?", (userID,))
    return cur.fetchone() is not None

# ---------- AUTH Endpoints ----------
@app.post("/register", status_code=201)
def register(req: RegisterReq):
    if user_exists(req.userID):
        raise HTTPException(status_code=409, detail="Username already exists")

    hashed_pw = hash_password(req.password)
    date_created = datetime.date.today().isoformat()

    try:
        conn = get_conn()
        with db_lock:
            cur = conn.cursor()
            cur.execute("INSERT INTO USERS (userId, name, password, dateCreated) VALUES (?, ?, ?, ?)",
                        (req.userID, req.name, hashed_pw, date_created))
            conn.commit()
    except Exception as e:
        log_exception(e)
        raise HTTPException(status_code=500, detail="Failed to register user")

    return {"message": f"User '{req.userID}' registered successfully"}

@app.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM USERS WHERE userId = ?", (form_data.username,))
    user = cur.fetchone()
    if not user or not verify_password(form_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_access_token({"sub": user["userId"]})
    return {"access_token": token, "token_type": "bearer"}

# ---------- Social Endpoints ----------
@app.post("/posts", status_code=201)
def make_post(req: CreatePostReq, current_user: str = Depends(get_current_user)):
    if req.userID != current_user:
        raise HTTPException(status_code=403, detail="Cannot create post for another user")

    date_str, time_str = iso_date_time()

    # Decide hashtags: explicit provided list takes precedence, otherwise generate if requested
    hashtags_list: List[str] = []
    if req.hashtags:
        hashtags_list = req.hashtags
    elif req.hashtag:
        # generate from content using Gemini
        try:
            model = genai.GenerativeModel("gemini-2.5-flash")
            prompt = (
                "Generate 3-6 short, trendy hashtags relevant to the text below. "
                "Return only the hashtags separated by spaces or newlines.\n\n" + req.content
            )
            response = model.generate_content(prompt)
            # split by whitespace, strip punctuation
            print(response)
            print(response._result.candidates[0].content.parts[0].text)
            raw = response._result.candidates[0].content.parts[0].text.strip()
            hashtags_list = [h.strip() for h in raw.replace('\n', ' ').split() if h.strip()]
            print(hashtags_list)
        except Exception as e:
            log_exception(e)
            # fallback: leave empty
            hashtags_list = []


    hashtags_json = json.dumps(hashtags_list)

    try:
        conn = get_conn()
        with db_lock:
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO POST (userId, title, date, time, content, shared, hashtags) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (req.userID, req.title, date_str, time_str, req.content, 0, hashtags_json)
            )
            conn.commit()
            post_id = cur.lastrowid
    except Exception as e:
        log_exception(e)
        raise HTTPException(status_code=500, detail="failed to create post")

    return {"message": "POST CREATED SUCCESSFULLY", "postId": post_id, "hashtags": hashtags_list}

@app.get("/posts/{userID}", response_model=List[PostOut])
def list_posts(userID: str, limit: Optional[int] = Query(None, ge=1)):
    if not user_exists(userID):
        raise HTTPException(status_code=404, detail="USER NOT AVAILABLE")

    conn = get_conn()
    cur = conn.cursor()
    q = "SELECT * FROM POST WHERE userId = ? ORDER BY date DESC, time DESC"
    if limit:
        q = q + " LIMIT ?"
        cur.execute(q, (userID, limit))
    else:
        cur.execute(q, (userID,))
    rows = cur.fetchall()
    out = []
    for r in rows:
        cur2 = conn.cursor()
        cur2.execute("SELECT name FROM USERS WHERE userId = ?", (r["userId"],))
        author = cur2.fetchone()
        out.append(PostOut(
            postId=r["postId"],
            userId=r["userId"],
            name=author["name"] if author else "<unknown>",
            title=r["title"] or "",
            date=r["date"],
            time=r["time"],
            content=r["content"],
            shared=bool(r["shared"]),
            hashtags=(json.loads(r["hashtags"]) if r["hashtags"] else [])
        ))
    return out

@app.get("/feed/{userID}", response_model=List[PostOut])
def show_feed(userID: str, limit: Optional[int] = Query(None, ge=1), current_user: str = Depends(get_current_user)):
    if userID != current_user:
        raise HTTPException(status_code=403, detail="Cannot view another user's feed")
    if not user_exists(userID):
        raise HTTPException(status_code=404, detail="USER NOT AVAILABLE")
    conn = get_conn()
    cur = conn.cursor()
    if limit:
        cur.execute(
            """
            SELECT p.* FROM POST p
            WHERE p.userId IN (
                SELECT followeeID FROM FOLLOWERS WHERE followerID = ?
            )
            ORDER BY date DESC, time DESC
            LIMIT ?
            """,
            (userID, limit)
        )
    else:
        cur.execute(
            """
            SELECT p.* FROM POST p
            WHERE p.userId IN (
                SELECT followeeID FROM FOLLOWERS WHERE followerID = ?
            )
            ORDER BY date DESC, time DESC
            """,
            (userID,)
        )
    rows = cur.fetchall()
    out = []
    for r in rows:
        cur2 = conn.cursor()
        cur2.execute("SELECT name FROM USERS WHERE userId = ?", (r["userId"],))
        author = cur2.fetchone()
        out.append(PostOut(
            postId=r["postId"],
            userId=r["userId"],
            name=author["name"] if author else "<unknown>",
            title=r["title"] or "",
            date=r["date"],
            time=r["time"],
            content=r["content"],
            shared=bool(r["shared"]),
            hashtags=(json.loads(r["hashtags"]) if r["hashtags"] else [])
        ))
    return out

@app.post("/follows", status_code=201)
def follow_user(req: FollowReq, current_user: str = Depends(get_current_user)):
    if req.followerID != current_user:
        raise HTTPException(status_code=403, detail="Cannot follow on behalf of another user")

    if not user_exists(req.followerID) or not user_exists(req.followeeID):
        raise HTTPException(status_code=404,
                            detail=f"CHECK WHETHER BOTH '{req.followerID}' AND '{req.followeeID}' ARE IN THE TABLE")

    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM FOLLOWERS WHERE followerID = ? AND followeeID = ?", (req.followerID, req.followeeID))
    if cur.fetchone():
        raise HTTPException(status_code=409, detail="FOLLOW MAPPING ALREADY EXISTS")

    try:
        with db_lock:
            cur.execute("INSERT INTO FOLLOWERS (followeeID, followerID) VALUES (?, ?)",
                        (req.followeeID, req.followerID))
            conn.commit()
    except Exception as e:
        log_exception(e)
        raise HTTPException(status_code=500, detail="THERE IS SOME ISSUE IN CREATING FOLLOW")

    return {"message": f"FOLLOW OPERATION DONE SUCCESSFULLY WITH followerID='{req.followerID}' AND followeeID='{req.followeeID}'"}

@app.post("/share", status_code=201)
def share_post(req: ShareReq, current_user: str = Depends(get_current_user)):
    if req.userID != current_user:
        raise HTTPException(status_code=403, detail="Cannot share as another user")

    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM POST WHERE postId = ?", (req.postID,))
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="PLS ENTER A VALID POST ID")

    date_str, time_str = iso_date_time()
    try:
        with db_lock:
            cur.execute(
                "INSERT INTO POST (userId, title, date, time, content, shared) VALUES (?, ?, ?, ?, ?, ?)",
                (req.userID, row["title"], date_str, time_str, row["content"], 1)
            )
            conn.commit()
            new_post_id = cur.lastrowid
    except Exception as e:
        log_exception(e)
        raise HTTPException(status_code=500, detail="THERE IS SOME ISSUE IN SHARING THE POST")

    return {"message": "POST SHARED SUCCESSFULLY", "postId": new_post_id}


@app.post("/hashtags")
def generate_hashtags(req: HashtagReq, current_user: str = Depends(get_current_user)):
    if not req.content and not req.postID:
        raise HTTPException(status_code=400, detail="Provide either postID or content")

    text = req.content
    if req.postID:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("SELECT content FROM POST WHERE postId = ?", (req.postID,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Post not found")
        text = row["content"]

    # Ask Gemini for hashtags
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        prompt = f"Translate the following text to {req.language}. Just return the translated output:\n\n tamil"
        response = model.generate_content(prompt)

        hashtags = response.text.strip()
        return {"hashtags": text}
    except Exception as e:
        log_exception(e)
        raise HTTPException(status_code=500, detail="Failed to generate hashtags")

@app.post("/image")
def generate_image(req: HashtagReq, current_user: str = Depends(get_current_user)):
    from openai import OpenAI
    import base64

    client = OpenAI(api_key="") 

    response = client.responses.create(
        model="gpt-5",
        input="Generate an image for the following content: " + (req.content or ""),
        tools=[{"type": "image_generation"}],
    )

    # Save the image to a file
    image_data = [
        output.result
        for output in response.output
        if output.type == "image_generation_call"
    ]
        
    if image_data:
        image_base64 = image_data[0]
        with open("output.png", "wb") as f:
            f.write(base64.b64decode(image_base64))

@app.post("/translate")
def generate_translate(req: HashtagReq, current_user: str = Depends(get_current_user)):
    if not req.content and not req.postID:
        raise HTTPException(status_code=400, detail="Provide either postID or content")

    text = req.content
    if req.postID:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("SELECT content FROM POST WHERE postId = ?", (req.postID,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Post not found")
        text = row["content"]

    # Ask Gemini for hashtags
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        prompt = f"Translate the following text to {req.language}. Just return the translated output:\n\n{text}"
        response = model.generate_content(prompt)

        hashtags = response.text.strip()
        return {"hashtags": hashtags}
    except Exception as e:
        log_exception(e)
        raise HTTPException(status_code=500, detail="Failed to generate hashtags")
