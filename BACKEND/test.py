import sqlite3
import os
import datetime
import time
from collections import defaultdict


db = sqlite3.connect('main.db')
cur = db.cursor()
log_file  = open('logfile.log','a')


cache = defaultdict(list)
CACHE_LIMIT = 1


def get_date_time():
    now = datetime.datetime.now()
    date = now.strftime('%Y-%m-%d')
    time = now.strftime('%H:%M:%S')

    return date+time


def log(e):
    dt = get_date_time()

    log_file.write(f"{dt} : {e}\n")
    log_file.flush()

def system_init():
    try:
        cur.execute(
            '''
            CREATE TABLE IF NOT EXISTS USERS (userId STRING PRIMARY KEY, name STRING, dateCreated DATE)
            '''    
        )
        cur.execute(
            '''
            CREATE TABLE IF NOT EXISTS POST (userId STRING REFERENCES USERS(userId), title STRING, date DATE, time TIME, content STRING, share BOOL, postId INTEGER PRIMARY KEY AUTOINCREMENT)
            '''
        )
        cur.execute(
            '''
            CREATE TABLE IF NOT EXISTS FOLLOWERS (followeeID STRING REFERENCES USERS(userId), followerId STRING REFERENCES USERS(userId), PRIMARY KEY (followeeID, followerId))
        '''
        )

        db.commit()
    
    except Exception as e:
        log(e)
        print("CANT START THE APP DUE TO STARTING ISSUES")
        return 0

    return 1



def create_user(userID:str ,name:str):
    if not userID.isalnum():
        return "USER ID MUST CONTAIN ONLY ALPHA's and NUM's"

    if cur.execute(f"SELECT userID FROM USERS WHERE userID='{userID}'").fetchall():
        return "USERNAME EXISTS ALREADY PLS  TRY WITH SOME OTHER ID"


    date = datetime.date.today()

    try:
        cur.execute(
        f'''
            INSERT INTO USERS VALUES('{userID}','{name}','{datetime.date.today()}')
        ''')

        db.commit()
    except Exception as e:
        log(e)
        return "THERE IS SOME ISSUE IN CREATING USER, PLS TRY AGAIN LATER"

    return f"USER WITH USERID = '{userID}' CREATED SUCCESSFULLY"



def make_post(userID:str,content:str,title:str):
    if cur.execute(f"SELECT userID FROM USERS WHERE userID='{userID}'").fetchall()==[]:
        return "USERNAME DOESNT EXIST PLS CHECK ONCE"
    
    if len(content)==0 or content.isspace():
        return "PLS ENTER SOME CONTENT"
    
    if len(content)>280:
        return "CONTENT LENGTH MUST BE LESS THAN 280 CHARACTERS"
    
    if len(title)>50:
        return "TITLE LENGTH MUST BE LESS THAN 50 CHARACTERS"
    
    now = datetime.datetime.now()
    date = now.strftime('%Y-%m-%d')
    time = now.strftime('%H:%M:%S')

    try:
        cur.execute(
            f"INSERT INTO POST (userId, title, date, time, content,share) VALUES ('{userID}', '{title}', '{date}', '{time}', '{content}',{0})"
        )
        db.commit()
    except Exception as e:
        log(e)
        return "THERE IS SOME ISSUE IN CREATING POST, PLS TRY AGAIN LATER"

    return f"POST CREATED SUCCESSFULLY WITH postId = {cur.lastrowid}"

def check_user_availabilty(userID):
    return cur.execute(f"SELECT userID FROM USERS WHERE userID='{userID}'").fetchall() != []


def follow_user(followerID:str, followeeID:str):
    if not followerID.isalnum() or not followeeID.isalnum():
        return "USER ID MUST CONTAIN ONLY ALPHA's and NUM's"

    if not check_user_availabilty(followeeID)  or not check_user_availabilty(followerID):
        return f"CHECK WHETHER BOTH '{followerID}' AND '{followeeID}' ARE IN THE TABLE"

    if cur.execute(f"SELECT * FROM FOLLOWERS WHERE  followerID='{followerID}' AND followeeID='{followeeID}'").fetchall():
        return "FOLLOW MAPPING ALREADY EXISTS"

    try:
        cur.execute(
            f'''
                INSERT INTO FOLLOWERS (followeeID,followerID) VALUES('{followeeID}','{followerID}')
            '''
        )
        db.commit()

    except Exception as e:
        log(e)
        print(e)
        return "THERE IS SOME ISSUE IN CREATING FOLLOW, PLS TRY AGAIN LATER"

    return f"FOLLOW OPERATION DONE SUCCESSFULLY WITH followerID='{followerID}' AND followeeID='{followeeID}"


def show_feed(userID:str,limit:int = 1):
    if not check_user_availabilty(userID):
        return "USER NOT AVAILABLE"

    try:
        if limit:
            out = cur.execute(f"SELECT * FROM POST WHERE userID in (SELECT followeeID from FOLLOWERS WHERE followerID ='{userID}') ORDER BY DATE DESC, TIME DESC LIMIT {limit}").fetchall()
        # elif limit and userID in cache:
        #     log('Using cache')
        #     out = cache[userID][:limit]
        else:
            out = cur.execute(f"SELECT * FROM POST WHERE userID in (SELECT followeeID from FOLLOWERS WHERE followerID ='{userID}') ORDER BY DATE DESC, TIME DESC").fetchall()

        print(out)
        if not out:
            print("No posts to show.")
            return

        for row in out:
            userId, title, date_, time_, content, share, postId = row
            name_row = cur.execute("SELECT name FROM USERS WHERE userId = ?", (userId,)).fetchone()
            name = name_row[0] if name_row else "<unknown>"

            print("-" * 60)
            print(f"postId : {postId}")
            print(f"userId : {userId}    name : {name}")
            print(f"date   : {date_}    time : {time_}")
            print(f"title  : {title}")
            print("content:")
            print(content)
            print(f"shared : {'Yes' if share else 'No'}")
        print("-" * 60)

    except Exception as e:
        log(e)
        pass

def share_post(userID:str,postID:str):
    if not check_user_availabilty(userID):
        return "USER NOT AVAILABLE"

    out = cur.execute(f"SELECT * FROM POST WHERE postId={postID}").fetchall()
    if out==[]:
        return "PLS ENTER A VALID POST ID"
    
    out=out[0]
    userId2, title, date_, time_, content, share, postId = out

    # print(out)
    # print(userID)
    # print(type(out[0]))
    # print(out[0]!=userID)
    # if str(out[0])!=userID:
    #     return "PLS ENTER A VALID USER IF FOR THE POST"

    now = datetime.datetime.now()
    date = now.strftime('%Y-%m-%d')
    time = now.strftime('%H:%M:%S')



    try:
        cur.execute(
            f"INSERT INTO POST (userId, title, date, time, content,share) VALUES ('{userID}', '{title}', '{date}', '{time}', '{content}',{0})"
        )
        db.commit()
    except Exception as e:
        log(e)
        return "THERE IS SOME ISSUE IN CREATING POST, PLS TRY AGAIN LATER"
    
    out = list(out)
    out[-2]=1
    if len(cache[userID])<CACHE_LIMIT:
        cache[userID].append(out)
    else:
        cache[userID].append(out)
        cache[userID].sort(key=lambda x: (x[2], x[3]),reverse=True)
        cache[userID].pop(-1)

    return f"POST SHARED SUCCESSFULLY WITH postId = {postID}"


def listposts(userID:str):
    if not check_user_availabilty(userID):
        return "USER NOT AVAILABLE"
    
    try:
        cur.execute(f"SELECT * FROM POST WHERE userID='{userID}' ORDER BY DATE DESC, TIME DESC")
        out = cur.fetchall()
        if not out:
            print("No posts to show.")
            return
        
        for row in out:
            userId, title, date_, time_, content, share, postId = row
            name_row = cur.execute("SELECT name FROM USERS WHERE userId = ?", (userId,)).fetchone()
            name = name_row[0] if name_row else "<unknown>"

            print("-" * 60)
            print(f"postId : {postId}")
            print(f"userId : {userId}    name : {name}")
            print(f"date   : {date_}    time : {time_}")
            print(f"title  : {title}")
            print("content:")
            print(content)
            print(f"shared : {'Yes' if share else 'No'}")
        
    except Exception as e:
        log(e)
        return "THERE WAS SOME ISSUE IN FETCHING POSTS"