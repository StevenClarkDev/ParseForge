const mongoose = require('mongoose');
require('dotenv').config();

const connectDb = async () => {
    try {
        if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL is not configured');
        }

        await mongoose.connect(process.env.DATABASE_URL);
        console.log('Database connected successfully');
    } catch (error) {
        console.error('Database connection failed');
        console.error('Reason:', error.message);
        throw error;
    }
};

module.exports = connectDb;
