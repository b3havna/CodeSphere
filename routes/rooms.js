const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const auth = require('../middleware/auth');

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
