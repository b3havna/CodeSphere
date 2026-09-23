const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Room = require('../models/Room');
const auth = require('../middleware/auth');

// POST /api/rooms - Create a new room (Protected by JWT)
router.post('/', auth, async (req, res) => {
    try {
        const { roomId: customRoomId } = req.body || {};
        const roomId = customRoomId || uuidv4();

        // Check if room already exists
        const existingRoom = await Room.findOne({ roomId }).exec();
        if (existingRoom) {
            return res.status(400).json({ error: 'Room already exists' });
        }

        const room = await Room.create({
            roomId,
            code: '',
            language: 'javascript',
            createdBy: req.user.id
        });

        return res.status(201).json({
            roomId: room.roomId,
            createdBy: room.createdBy
        });
    } catch (err) {
        console.error('Create room failed:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/rooms/mine
router.get('/mine', auth, async (req, res) => {
    try {
        const rooms = await Room.find({ createdBy: req.user.id })
            .select('roomId language updatedAt')
            .sort({ updatedAt: -1 })
            .exec();

        return res.json(rooms);
    } catch (err) {
        console.error('Fetch user rooms failed:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
