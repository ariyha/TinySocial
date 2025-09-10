# TinySocial - Social Feed Application

A beautiful, serene social media application built with React.js and Tailwind CSS, featuring a dark theme with emerald green accents.

## Features

- **Authentication**: User registration and login with JWT tokens
- **Post Creation**: Create and share posts with titles and content
- **Social Feed**: View posts from users you follow
- **Follow System**: Follow other users to see their posts in your feed
- **Post Sharing**: Share posts from other users
- **Beautiful UI**: Dark, serene theme with smooth animations
- **Responsive Design**: Works great on desktop and mobile

## Tech Stack

- React.js with TypeScript
- Tailwind CSS for styling
- Context API for state management
- JWT for authentication
- Responsive design

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Running backend API server

### Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Configure environment variables in `.env`
4. Start the development server: `npm start`

The application will open in your browser at `http://localhost:3000`.

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).



# TinySocial Backend API

TinySocial is a simple social networking backend built using **FastAPI** and **SQLite**. It supports user authentication, posting, following, sharing, hashtag generation using Gemini, translation, and basic image generation.

---

## Features

* **User Authentication**

  * Register new users
  * Secure login with JWT tokens
  * Password hashing with bcrypt

* **Social Features**

  * Create posts with optional hashtags (auto-generated via Gemini)
  * Follow and unfollow users
  * Share posts
  * View user posts
  * View personalized feed (posts from followed users)

* **AI Features**

  * Hashtag generation with Gemini models
  * Translation of post content
  * Image generation using OpenAI API

* **Database**

  * SQLite backend with tables for `USERS`, `POST`, and `FOLLOWERS`

* **CORS Support**

  * Configured for React frontend (`http://localhost:3000`)

---

## Requirements

Install dependencies with:

```bash
pip install fastapi uvicorn pydantic jose passlib[bcrypt] google-generativeai openai Pillow
```

---

## Database Schema

### USERS

* `userId` (TEXT, PRIMARY KEY)
* `name` (TEXT)
* `password` (TEXT, hashed)
* `dateCreated` (DATE)

### POST

* `postId` (INTEGER, PRIMARY KEY AUTOINCREMENT)
* `userId` (TEXT, FK -> USERS)
* `title` (TEXT)
* `date` (DATE)
* `time` (TIME)
* `content` (TEXT)
* `shared` (INTEGER, 0 or 1)
* `hashtags` (TEXT, JSON list)

### FOLLOWERS

* `followeeID` (TEXT, FK -> USERS)
* `followerID` (TEXT, FK -> USERS)
* PRIMARY KEY `(followeeID, followerID)`

---

## API Endpoints

### Authentication

* **POST** `/register` → Register new user
* **POST** `/login` → Login and get JWT token

### Posts

* **POST** `/posts` → Create a new post
* **GET** `/posts/{userID}` → List posts by a user
* **GET** `/feed/{userID}` → Get feed of followed users

### Social

* **POST** `/follows` → Follow a user
* **POST** `/share` → Share a post

### AI Integration

* **POST** `/hashtags` → Generate hashtags from text or post ID
* **POST** `/translate` → Translate post content
* **POST** `/image` → Generate an image from content

---

## Example Usage

### Register a User

```bash
curl -X POST http://127.0.0.1:8000/register \
  -H "Content-Type: application/json" \
  -d '{"userID":"alice","name":"Alice","password":"mypassword"}'
```

### Login

```bash
curl -X POST http://127.0.0.1:8000/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=alice&password=mypassword"
```

### Create Post

```bash
curl -X POST http://127.0.0.1:8000/posts \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"userID":"alice","title":"Hello","content":"My first post!","hashtag":true}'
```

### Follow User

```bash
curl -X POST http://127.0.0.1:8000/follows \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"followerID":"alice","followeeID":"bob"}'
```

---

## Running the Server

```bash
uvicorn app:app --reload
```

Server runs at: [http://127.0.0.1:8000](http://127.0.0.1:8000)

Interactive API docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## Notes

* Replace `SECRET_KEY` in `app.py` before production.
* Ensure proper API keys are set for Google Generative AI and OpenAI before using `/hashtags`, `/translate`, and `/image`.
* SQLite is used for simplicity. For production, migrate to a more robust DB (e.g., PostgreSQL).

---

## License

MIT License
