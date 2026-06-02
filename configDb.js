const mongoose = require('mongoose');
const { databaseUrl } = require('./config/appConfig');

const connectDb = async () => {
    try {
        await mongoose.connect(databaseUrl, {
            serverSelectionTimeoutMS: 10000,
            maxPoolSize: 10
        });
        console.log('Database connected successfully');
    } catch (error) {
        console.error('Database connection failed');
        console.error('Reason:', error.message);
        throw error;
    }
};

module.exports = connectDb;
