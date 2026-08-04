const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true
    },
    text: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        required: true
    }
});

// Compound index on roomId and timestamp chronologically
messageSchema.index({ roomId: 1, timestamp: 1 });

module.exports = mongoose.model('Message', messageSchema);
