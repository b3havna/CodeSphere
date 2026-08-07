const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    code: {
        type: String,
        default: ""
    },
    language: {
        type: String,
        default: "javascript"
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
}, {
    timestamps: true // Automatically creates and manages createdAt and updatedAt fields
});

module.exports = mongoose.model('Room', roomSchema);
