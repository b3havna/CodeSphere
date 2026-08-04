const mongoose = require('mongoose');

const connectDB = async () => {
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
        console.error('CRITICAL ERROR: MONGODB_URI environment variable is not defined!');
        console.error('The server requires a valid MongoDB connection string to enforce room persistence.');
        process.exit(1);
    }

    try {
        await mongoose.connect(mongoURI);
        console.log('MongoDB connection established successfully.');
    } catch (err) {
        console.error('CRITICAL ERROR: Failed to connect to MongoDB during startup.');
        console.error(err.message);
        process.exit(1); // Fail-fast policy
    }
};

module.exports = connectDB;
