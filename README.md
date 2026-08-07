# CodeSphere - Real-time Collaborative Code Editor

CodeSphere is a premium, state-of-the-art web application designed for real-time collaborative coding and developer collaboration. It features a fully synchronized code editor, real-time group chat, AI-powered coding assistance, and direct code execution capabilities in multiple programming languages.

---

## Major Features

* **Real-time Collaborative Code Editor**: Fully synchronized editor allowing multiple developers to type and edit code concurrently.
* **Socket.io Live Collaboration**: Ultra-low latency, real-time messaging layer handling room sync, user status events, and message broadcasting.
* **JWT Authentication**: Secure user registration, login, and route protection using JSON Web Tokens (JWT).
* **AI Coding Assistant**: Powered by the Groq Llama 3 API, offering context-aware suggestions, explanations, and code generations directly inside the room.
* **Code Execution**: Powered by the JDoodle Compiler API, allowing developers to execute JavaScript, Python, C++, and Java code with standard inputs (stdin) and outputs.
* **Persistent Rooms**: MongoDB integration automatically stores and restores the active editor state (code and language) and chat logs.
* **Real-time Chat**: Dedicated room chat channel with rate-limiting protection to discuss logic alongside code.
* **Multi-Language Support**: Support for JavaScript, Python, C++, and Java syntax highlighting and compile execution.

---

## Tech Stack

### Frontend
* **React**: Core library for rendering interface components.
* **Recoil**: State management for user profiles, session states, and settings.
* **CodeMirror (v5)**: Professional web-based code editor interface.
* **Socket.io Client**: Real-time event communication client.

### Backend
* **Node.js & Express.js**: Application server architecture and REST API endpoints.
* **Socket.io (Server)**: WebSocket engine managing connection rooms.
* **MongoDB & Mongoose**: Room data and chat history persistence layer.
* **JSON Web Tokens (JWT)**: Secure user session authorization.
* **Groq API**: Stateless endpoint integration for AI queries.
* **JDoodle API**: Engine for compilation and code execution.

---

## Project Structure

```text
CodeSphere/
│
├── client/                     # React Frontend App
│   ├── public/                 # Static assets
│   ├── src/                    # React components, pages, state atoms
│   ├── package.json            # CRA scripts and dependency manifests
│   └── vercel.json             # Vercel SPA rewrite rules
│
├── server/                     # Express + Socket.io Server App
│   ├── actions/                # Shared socket event name constants
│   ├── config/                 # MongoDB Atlas database config
│   ├── middleware/             # Route authorization middleware
│   ├── models/                 # Mongoose schema definitions
│   ├── routes/                 # Express API routing endpoints
│   ├── server.js               # Server core startup script
│   └── verify_chat.js          # Chat verification test suite
│
├── DEPLOYMENT.md               # Detailed deployment steps
└── README.md                   # Project overview & developer guide
```

---

## Local Setup

Follow these steps to run both frontend and backend concurrently in development mode.

### 1. Backend Server Setup

```bash
cd server
npm install
```

Create a `.env` file in the `server/` directory and populate it with your local development keys (see [Environment Variables](#environment-variables)):
```bash
# Start backend server in development mode
npm run dev
```
The server will start listening on `http://localhost:5000`.

### 2. Frontend Client Setup

```bash
cd ../client
npm install
```

Create a `.env` file in the `client/` directory containing your api url:
```env
REACT_APP_API_URL=http://localhost:5000
DISABLE_ESLINT_PLUGIN=true
```

Start the React development server:
```bash
npm start
```
The client dashboard will open automatically in your browser at `http://localhost:3000`.

---

## Environment Variables

### Backend Configuration (`server/.env`)
- `PORT`: Server listening port (default: `5000`).
- `MONGO_URI`: MongoDB connection URI (Atlas string or local `mongodb://localhost:27017/codesphere`).
- `JWT_SECRET`: Secret key used for signing JWT login tokens.
- `FRONTEND_URLS`: Comma-separated list of allowed frontend CORS origins (e.g. `http://localhost:3000,https://codesphere.vercel.app`).
- `JDOODLE_CLIENT_ID`: JDoodle API compiler client ID.
- `JDOODLE_CLIENT_SECRET`: JDoodle API compiler client secret.
- `GROQ_API_KEY`: Groq API authorization token.
- `GROQ_MODEL`: Groq LLM model name (default: `llama-3.3-70b-versatile`).

### Frontend Configuration (`client/.env`)
- `REACT_APP_API_URL`: Root URL of the active backend server (e.g. `http://localhost:5000` or `https://codesphere-backend.onrender.com`). No trailing slash.
- `DISABLE_ESLINT_PLUGIN`: Should be set to `true` to prevent local configuration conflicts from halting builds.

---

## Deployment

* **Frontend**: Hosted on [Vercel](https://vercel.com) using root directory build settings pointing to `client`.
* **Backend**: Hosted on [Render](https://render.com) using root directory build settings pointing to `server`.
* **Database**: Hosted on [MongoDB Atlas](https://www.mongodb.com).

For step-by-step setup instructions, please read [DEPLOYMENT.md](file:///c:/Users/khata/OneDrive/Desktop/codesphere%20-%20deployment/Realtime-Collaborative-Code-Editor/DEPLOYMENT.md).

---

## Detailed Features

* **User Authentication & Room Control**: Register and login securely. Unregistered users can join rooms as Guests, but registered users gain dashboard access listing their created rooms.
* **Dynamic Code Execution**: Code compiles and executes securely against the JDoodle compilation system. The editor displays status outputs and error streams with CPU time and memory analytics.
* **AI Coding Copilot**: A drawer overlay houses the AI Copilot. Ask logic questions, debug issues, or request code. The AI receives your current code context automatically so you don't need to copy-paste.
* **Synchronized Code Typing**: Edits trigger a 2-second debounce timer that automatically updates and saves the active file into MongoDB, preserving room code even if all participants disconnect.

---

## Future Roadmap

1. **Multi-File Workspace**: Add folder directory structures inside rooms to write multi-file projects (React components, imports).
2. **Video & Voice Calls**: Integrate WebRTC channels for audio/video call functionality directly inside rooms.
3. **Operational Transformation (OT) / CRDT**: Migrate synchronization protocol to Yjs or ShareDB for conflict-free typing resolutions.
4. **Git Sync**: Sync rooms directly with GitHub repositories to push edits straight to branch commits.