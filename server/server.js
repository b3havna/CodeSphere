require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const ACTIONS = require('./actions/Actions');
const connectDB = require('./config/db');
const Room = require('./models/Room');
const Message = require('./models/Message');
const jwt = require('jsonwebtoken');

// Connect database (fails process startup if connection cannot be established)
connectDB();

const server = http.createServer(app);

// Parse allowed frontend origins from environment variables
const allowedOrigins = process.env.FRONTEND_URLS
    ? process.env.FRONTEND_URLS.split(",").map(url => url.trim())
    : ["http://localhost:3000"];

// Configure Socket.io with proper multi-origin CORS support
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Import authentication and rooms routes
const authRoutes = require('./routes/auth');
const roomsRoutes = require('./routes/rooms');

// Configure Express with proper multi-origin CORS support
app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomsRoutes);

// In-memory rate limiting for AI assistant (socketId -> lastRequestTimestamp)
const aiRateLimits = {};
// In-memory rate limiting for code execution (socketId -> lastRequestTimestamp)
const executeRateLimits = {};

app.post('/api/ai-assist', async (req, res) => {
    const { socketId, prompt, code } = req.body;

    // 1. Verify Groq API Key
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        return res.status(500).json({
            error: 'Groq API key is not configured on the server.'
        });
    }

    // 2. Cooldown check per socketId
    if (socketId) {
        const now = Date.now();
        const lastRequest = aiRateLimits[socketId] || 0;
        if (now - lastRequest < 3000) {
            return res.status(429).json({
                error: 'Please wait a few seconds before asking the AI again.'
            });
        }
        aiRateLimits[socketId] = now;
    }

    // 3. Length cap check (combined prompt and code context <= 6000 chars)
    const combinedLength = (prompt || '').length + (code || '').length;
    if (combinedLength > 6000) {
        return res.status(400).json({
            error: 'Request content is too long. Please shorten your prompt or code context.'
        });
    }

    // 4. Construct Groq API Chat Completion request payload
    let userContent = prompt || '';
    if (code) {
        userContent = `Here is the current code in the editor:\n\`\`\`\n${code}\n\`\`\`\n\nUser request: ${prompt}`;
    }

    try {
        const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                max_tokens: 2048,
                messages: [
                    {
                        role: "system",
                        content: "You are an AI coding assistant inside a collaborative code editor. Help the user with their programming tasks. Provide clear, direct explanations. When suggesting code changes, always wrap code snippets in markdown code blocks. Keep responses succinct."
                    },
                    {
                        role: 'user',
                        content: userContent
                    }
                ]
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            console.error('Groq API Error:', errBody);
            // Expose Groq's error body in non-production environments to aid debugging.
            if (process.env.NODE_ENV !== 'production') {
                return res.status(response.status).json({
                    error: `Groq API error: ${response.statusText || 'Request failed'}`,
                    groqErrorBody: errBody,
                });
            }
            return res.status(response.status).json({
                error: `Groq API error: ${response.statusText || 'Request failed'}`
            });
        }

        const data = await response.json();
        const replyText = data.choices?.[0]?.message?.content || '';
        return res.json({ text: replyText });
    } catch (err) {
        console.error('Server error calling Groq API:', err);
        return res.status(500).json({
            error: 'Network failure or server error.'
        });
    }
});

app.post('/api/execute', async (req, res) => {
    const { socketId, language, source_code, stdin } = req.body;

    // 1. Verify JDoodle client credentials
    const clientId = process.env.JDOODLE_CLIENT_ID;
    const clientSecret = process.env.JDOODLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        return res.status(500).json({
            error: 'JDoodle credentials are not configured on the server.'
        });
    }

    // 2. Cooldown check per socketId (5 seconds)
    if (socketId) {
        const now = Date.now();
        const lastRequest = executeRateLimits[socketId] || 0;
        if (now - lastRequest < 5000) {
            return res.status(429).json({
                error: 'Please wait 5 seconds before running code again.'
            });
        }
        executeRateLimits[socketId] = now;
    }

    // 3. Length cap check (combined source code and stdin <= 10000 chars)
    const combinedLength = (source_code || '').length + (stdin || '').length;
    if (combinedLength > 10000) {
        return res.status(400).json({
            error: 'Execution content is too long. Please shorten your code or stdin.'
        });
    }

    // 4. Map language string to JDoodle configurations
    const languageMap = {
        'javascript': { language: 'nodejs', versionIndex: '5' }, // Node.js 22.0.0
        'python': { language: 'python3', versionIndex: '5' },     // Python 3.12.0
        'cpp': { language: 'cpp17', versionIndex: '0' },          // GCC 11.1.0 (C++17)
        'java': { language: 'java', versionIndex: '4' }           // JDK 17.0.1
    };

    const targetConfig = languageMap[language];
    if (!targetConfig) {
        return res.status(400).json({
            error: `Unsupported language selected for execution: ${language || 'unknown'}`
        });
    }

    // 5. Setup AbortController for 15s fetch timeout safeguard
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        const response = await fetch('https://api.jdoodle.com/v1/execute', {
            method: 'POST',
            signal: controller.signal,
            headers: {
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                clientId,
                clientSecret,
                script: source_code,
                language: targetConfig.language,
                versionIndex: targetConfig.versionIndex,
                stdin: stdin || ''
            })
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errBody = await response.text();
            console.error('JDoodle API Error:', errBody);
            
            // Map common HTTP errors to descriptive messages
            if (response.status === 401 || response.status === 403) {
                return res.status(response.status).json({
                    error: 'Unauthorized. Invalid JDoodle clientId or clientSecret configuration.'
                });
            } else if (response.status === 429) {
                return res.status(429).json({
                    error: 'Daily JDoodle execution limit reached (200 requests/day exceeded). Please try again tomorrow.'
                });
            }
            
            return res.status(response.status).json({
                error: `Execution service returned status ${response.status}`,
                jdoodleErrorBody: errBody
            });
        }

        const data = await response.json();

        // Handle logical JDoodle errors (such as daily credits exhausted inside 200 payload)
        if (data.error) {
            return res.status(400).json({
                error: data.error
            });
        }

        return res.json({
            output: data.output || '',
            statusCode: data.statusCode,
            memory: data.memory,
            cpuTime: data.cpuTime
        });

    } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            console.error('JDoodle API Timeout: Request aborted after 15 seconds.');
            return res.status(504).json({
                error: 'The execution service took too long to respond. Please try again.'
            });
        }
        console.error('Server error calling JDoodle API:', err);
        return res.status(500).json({
            error: 'Network failure or server error.'
        });
    }
});

const { v4: uuidv4 } = require('uuid');

const userSocketMap = {};
// Map tracking active room editor states, debounce, and periodic timers
const activeRooms = new Map();
// Rate limiting storage: socketId -> Array of message timestamps (sliding window)
const socketRateLimits = {};
function getAllConnectedClients(roomId) {
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
        (socketId) => {
            return {
                socketId,
                username: userSocketMap[socketId],
            };
        }
    );
}

// Helper to perform atomic room database persistence using findOneAndUpdate with upsert
async function triggerSave(roomId) {
    const roomState = activeRooms.get(roomId);
    if (!roomState) return;

    // Check if code or language has changed relative to last persisted state
    if (roomState.code === roomState.lastSavedCode && roomState.language === roomState.lastSavedLanguage) {
        return;
    }

    const codeToSave = roomState.code;
    const languageToSave = roomState.language;

    try {
        await Room.findOneAndUpdate(
            { roomId },
            { code: codeToSave, language: languageToSave },
            { upsert: true, returnDocument: 'after' }
        ).exec();

        // Update last saved states on successful database write
        roomState.lastSavedCode = codeToSave;
        roomState.lastSavedLanguage = languageToSave;
        console.log(`Successfully saved room ${roomId} to MongoDB.`);
    } catch (err) {
        console.error(`Runtime database save error for room ${roomId}:`, err.message);
    }
}

// Helper to manage debounced save timers
function queueSave(roomId) {
    const roomState = activeRooms.get(roomId);
    if (!roomState) return;

    // Skip timer queue if current state matches last saved snapshot
    if (roomState.code === roomState.lastSavedCode && roomState.language === roomState.lastSavedLanguage) {
        return;
    }

    // Reset 2-second debounce timer on every edit
    if (roomState.debounceTimer) {
        clearTimeout(roomState.debounceTimer);
    }
    roomState.debounceTimer = setTimeout(() => {
        triggerSave(roomId);
    }, 2000);
}

io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = decoded;
        } catch (err) {
            console.warn('Socket handshake token validation failed:', err.message);
            // Allow connection to proceed anonymously
        }
    }
    next();
});

io.on('connection', (socket) => {
    console.log('socket connected', socket.id);

    socket.on(ACTIONS.JOIN, async ({ roomId, username }) => {
        userSocketMap[socket.id] = username;
        socket.join(roomId);

        let roomCode = '';
        let roomLanguage = 'javascript';

        try {
            // 1. Check MongoDB for existing Room document
            const roomDoc = await Room.findOne({ roomId }).exec();
            if (roomDoc) {
                roomCode = roomDoc.code || '';
                roomLanguage = roomDoc.language || 'javascript';
            } else {
                // If it does not exist, create it in MongoDB.
                // If socket.user exists, associate with the user. Otherwise createdBy is null.
                const creatorId = socket.user ? socket.user.id : null;
                await Room.create({
                    roomId,
                    code: '',
                    language: 'javascript',
                    createdBy: creatorId
                });
                roomCode = '';
                roomLanguage = 'javascript';
            }

            // 2. Initialize activeRooms Map entry if not already present
            if (!activeRooms.has(roomId)) {
                const roomState = {
                    code: roomCode,
                    language: roomLanguage,
                    lastSavedCode: roomCode,
                    lastSavedLanguage: roomLanguage,
                    debounceTimer: null,
                    periodicTimer: null
                };

                // Start periodic 10-second save interval
                roomState.periodicTimer = setInterval(() => {
                    triggerSave(roomId);
                }, 10000);

                activeRooms.set(roomId, roomState);
            }

            // 3. Send initial room state to the joining user
            socket.emit('init-room-state', {
                code: roomCode,
                language: roomLanguage
            });

            // 4. Retrieve and sync chat messages from MongoDB (chronologically sorted)
            const messages = await Message.find({ roomId }).sort({ timestamp: 1 }).exec();
            const formattedMessages = messages.map(msg => ({
                id: msg._id.toString(),
                username: msg.username,
                text: msg.text,
                timestamp: msg.timestamp.getTime()
            }));

            socket.emit(ACTIONS.SYNC_CHAT, {
                messages: formattedMessages
            });

        } catch (err) {
            console.error(`Error loading state for room ${roomId}:`, err);
            // Non-blocking: ensure client still receives empty chat array fallback
            socket.emit(ACTIONS.SYNC_CHAT, { messages: [] });
        }

        // 5. Notify other clients of the new user joining
        const clients = getAllConnectedClients(roomId);
        clients.forEach(({ socketId }) => {
            io.to(socketId).emit(ACTIONS.JOINED, {
                clients,
                username,
                socketId: socket.id,
            });
        });
    });

    socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
        socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });

        // Update in-memory room code state and queue database save
        const roomState = activeRooms.get(roomId);
        if (roomState) {
            roomState.code = code || '';
            queueSave(roomId);
        }
    });

    socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
        io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
        // Retrieve roomId for this socket to keep activeRooms in-sync with live editor values
        const rooms = Array.from(socket.rooms).filter(r => r !== socket.id);
        rooms.forEach(roomId => {
            const roomState = activeRooms.get(roomId);
            if (roomState) {
                roomState.code = code || '';
                queueSave(roomId);
            }
        });
    });

    socket.on('language-change', ({ roomId, language }) => {
        const roomState = activeRooms.get(roomId);
        if (roomState) {
            roomState.language = language;
            queueSave(roomId);
        }
        // Broadcast language change to other sockets in the room
        socket.in(roomId).emit('room-language-changed', { language });
    });

    socket.on(ACTIONS.SEND_MESSAGE, async ({ roomId, text }) => {
        const socketId = socket.id;
        const now = new Date();

        // 1. Sliding Window Rate Limiting (max 5 messages per 3 seconds)
        if (!socketRateLimits[socketId]) {
            socketRateLimits[socketId] = [];
        }
        // Filter out timestamps older than 3 seconds (3000ms)
        const nowTime = now.getTime();
        socketRateLimits[socketId] = socketRateLimits[socketId].filter(
            (timestamp) => nowTime - timestamp < 3000
        );

        if (socketRateLimits[socketId].length >= 5) {
            socket.emit('chat-error', {
                message: 'You are sending messages too quickly. Please wait a moment.',
            });
            return;
        }

        socketRateLimits[socketId].push(nowTime);

        // 2. Validate message content
        if (!text || typeof text !== 'string') return;
        
        let trimmedText = text.trim();
        if (trimmedText.length === 0) return;

        // Truncate message text if it exceeds 1000 characters
        if (trimmedText.length > 1000) {
            trimmedText = trimmedText.substring(0, 1000) + '...';
        }

        // 3. Resolve username from server mapping
        const username = userSocketMap[socketId] || 'Anonymous';

        try {
            // 4. Save to MongoDB
            const savedMsg = await Message.create({
                roomId,
                username,
                text: trimmedText,
                timestamp: now
            });

            // 5. Broadcast to the entire room (including sender) mapping _id to string id
            io.to(roomId).emit(ACTIONS.RECEIVE_MESSAGE, {
                id: savedMsg._id.toString(),
                username: savedMsg.username,
                text: savedMsg.text,
                timestamp: savedMsg.timestamp.getTime()
            });
        } catch (err) {
            console.error('Error saving chat message to database:', err.message);
            // Non-blocking fallback: broadcast local message details if write fails
            io.to(roomId).emit(ACTIONS.RECEIVE_MESSAGE, {
                id: uuidv4(),
                username,
                text: trimmedText,
                timestamp: nowTime
            });
        }
    });

    socket.on('disconnecting', () => {
        const rooms = [...socket.rooms];
        rooms.forEach((roomId) => {
            socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
                socketId: socket.id,
                username: userSocketMap[socket.id],
            });

            // Check if this socket is the last user in the room.
            // Since the disconnecting socket is still in the room, room size will be 1.
            const roomAdapter = io.sockets.adapter.rooms.get(roomId);
            if (roomAdapter && roomAdapter.size === 1) {
                // Perform final save and clear timers/states safely to prevent leaks
                triggerSave(roomId).finally(() => {
                    const roomState = activeRooms.get(roomId);
                    if (roomState) {
                        if (roomState.debounceTimer) clearTimeout(roomState.debounceTimer);
                        if (roomState.periodicTimer) clearInterval(roomState.periodicTimer);
                        activeRooms.delete(roomId);
                    }
                });
            }
        });
        
        // Clean up mappings for this socket to prevent memory leaks
        delete userSocketMap[socket.id];
        delete socketRateLimits[socket.id];
        delete aiRateLimits[socket.id];
        delete executeRateLimits[socket.id];
        socket.leave();
    });
});

// Serve response in production (e.g. Render health checks)
app.get('/', (req, res) => {
    const htmlContent = '<h1>Welcome to the code editor server</h1>';
    res.setHeader('Content-Type', 'text/html');
    res.send(htmlContent);
});

// Support standard PORT environment variable for Render, falling back to SERVER_PORT or 5000
const PORT = process.env.PORT || process.env.SERVER_PORT || 5000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
