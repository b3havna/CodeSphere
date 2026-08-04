const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Validation
        if (!username || !username.trim()) {
            return res.status(400).json({ error: 'Username is required' });
        }
        if (!email || !email.trim()) {
            return res.status(400).json({ error: 'Email is required' });
        }
        // Basic email regex format check
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }
        if (!password || password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }

        // Duplicate check
        const existingUsername = await User.findOne({ username: username.trim() }).exec();
        if (existingUsername) {
            return res.status(400).json({ error: 'Username is already taken' });
        }
        const existingEmail = await User.findOne({ email: email.trim().toLowerCase() }).exec();
        if (existingEmail) {
            return res.status(400).json({ error: 'Email is already registered' });
        }

        // Direct hashing inside signup controller
        const passwordHash = await bcrypt.hash(password, 10);

        // Save User
        const user = await User.create({
            username: username.trim(),
            email: email.trim().toLowerCase(),
            passwordHash
        });

        // JWT Generation
        const payload = { id: user._id, username: user.username, email: user.email };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

        return res.status(201).json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (err) {
        console.error('Signup error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { usernameOrEmail, password } = req.body;

        if (!usernameOrEmail || !password) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const identifier = usernameOrEmail.trim().toLowerCase();

        // Query user by username or email
        const user = await User.findOne({
            $or: [
                { username: usernameOrEmail.trim() },
                { email: identifier }
            ]
        }).exec();

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Compare password hash
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // JWT Generation
        const payload = { id: user._id, username: user.username, email: user.email };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

        return res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
    return res.json({
        id: req.user.id,
        username: req.user.username,
        email: req.user.email
    });
});

module.exports = router;
