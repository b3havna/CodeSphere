# CodeSphere: Realtime Collaborative Code Editor (code in sync)

## Introduction

**CodeSphere** is a powerful MERN-based real-time collaborative code editor designed to help developers and teams write, debug, execute, and discuss code in sync. Whether conducting interviews, pair programming, or brainstorming architectures, CodeSphere removes remote friction by keeping everyone's workspace, terminal output, and group discussions synchronized in real time.

---

## Key Features

### 1. Real-Time Collaborative Editor
* **State Synchronization**: Powered by CodeMirror and Socket.io to synchronize keystrokes instantly.
* **Presence Indicators**: Visual list of active clients in the room updating dynamically on join or leave.
* **Database Persistence**: Automatic Room state recovery from MongoDB. Implements a debounced saving strategy (saves 2 seconds after typing stops) and a fallback periodic backup (every 10 seconds) during active editing.

### 2. MERN Authentication & Room Ownership (Optional)
* **Anonymous Guest Access**: Anyone can create and join rooms, execute code, and write chats without logging in.
* **Persistent Sessions**: User registration and credentials login secured by pure JS `bcryptjs` hashing. Persistent sessions are maintained using JWTs stored in `localStorage`.
* **Handshake Authentication**: Passes active authentication tokens securely inside the Socket.io handshake payload on initialization.
* **Creator Inventory Panel**: Logged-in users gain access to a personal dashboard of their created rooms on the landing screen, showing room statistics (language, update date) and permitting instant rejoins.

### 3. Integrated Group Chat
* **Persistent Logs**: Chat logs are saved permanently in MongoDB and restored sequentially on client joins.
* **Collapsible UI Panel**: Expand or collapse the sidebar layout with unread message badge count updates.
* **Security & Anti-Spam**: Safe plain-text rendering to prevent XSS payloads and sliding-window rate-limiting (max 5 messages per 3 seconds) to block spam bots.

### 4. Interactive AI Coding Assistant
* **Smart Actions**: Dedicated floating button opening a personal assistant calling the **Groq API** (Llama 3.3 model).
* **Preset Buttons**: Quick buttons (**Explain Code**, **Debug**, **Optimize**, **Add Comments**) sending tailored developer prompts to the assistant.
* **Cursor Integration**: One-click **"Insert into Editor"** button injecting AI code recommendations directly at the cursor location.
* **Fail-safe Prompts**: Automatically handles empty editor states by asking the assistant conversationally to instruct the user.

### 5. Multi-Language Code Execution
* **Secure Compiler Proxy**: Connected to the **JDoodle API** (proxied through the backend server to hide client credentials).
* **Terminal Interface**: Splitted bottom console panel displaying compile/run statistics (Status, Time, Memory) and separate `stdout` / `stderr` text styling.
* **Input Parameters**: Live `stdin` console textarea feeding arguments into execution runs.

### 6. Local Code Download
* **File Export**: Download current editor contents as a file mapped to the correct extension matching the selected language dropdown options.

---

## Tech Stack

* **Frontend**: React.js, CodeMirror, React-Toastify, CSS3, Socket.io-client
* **Backend**: Node.js, Express.js, Socket.io, JSON Web Tokens (JWT), `bcryptjs`
* **Database**: MongoDB (Mongoose Object Modeling)
* **APIs**: JDoodle API (Compiler), Groq API (AI Model)

---

## Installation & Setup

### 1. Prerequisites
* Node.js (v18+)
* MongoDB Local Community Server or MongoDB Atlas URI

### 2. Environment Variables (`.env`)
Create a `.env` file in the project root:
```env
REACT_APP_BACKEND_URL=http://localhost:5000
SERVER_PORT=5000

# MongoDB URI
MONGODB_URI=mongodb://localhost:27017/codesphere

# JWT secret key
JWT_SECRET=your_secure_signing_secret

# JDoodle API (from https://www.jdoodle.com/compiler-api)
JDOODLE_CLIENT_ID=your_jdoodle_client_id
JDOODLE_CLIENT_SECRET=your_jdoodle_client_secret

# Groq API (from https://console.groq.com/)
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
```

### 3. Quick Run Locally

1. Install project-wide dependencies:
   ```bash
   npm install
   ```
2. Start the backend Node server (running on port `5000`):
   ```bash
   npm run server:dev
   ```
3. Start the React development server (running on port `3000`):
   ```bash
   npm start
   ```
4. Access the application in your browser at `http://localhost:3000`.

---

## API Documentation

### Authentication Routes
* **POST `/api/auth/signup`**: Register a new account.
  * *Request Body*: `{ username, email, password }`
  * *Response*: `{ token, user: { id, username, email } }`
* **POST `/api/auth/login`**: Authenticate credentials.
  * *Request Body*: `{ usernameOrEmail, password }`
  * *Response*: `{ token, user: { id, username, email } }`
* **GET `/api/auth/me`**: Fetch active session info using header `Authorization: Bearer <token>`.
  * *Response*: `{ id, username, email }`

### Room Inventory Routes
* **GET `/api/rooms/mine`**: Returns lightweight array of rooms created by the caller (requires auth header).
  * *Response*: `[ { roomId, language, updatedAt }, ... ]`


---

## About Me

I am **Bhavana**, a Computer Science Engineering student passionate about software development, problem-solving, and building impactful projects. I enjoy building full-stack applications and exploring new technologies.

## Connect With Me

GitHub:  
https://github.com/b3havna

LinkedIn:  
https://www.linkedin.com/in/bhavana-79542a329/