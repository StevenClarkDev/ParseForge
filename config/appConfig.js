const path = require('path');

require('dotenv').config({ quiet: true });

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
const port = Number(process.env.PORT) || 4022;
const jwtSecret = process.env.JWT_SECRET_TOKEN;
const databaseUrl = process.env.DATABASE_URL;
const allowedOrigins = String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

if (!jwtSecret) {
    throw new Error('JWT_SECRET_TOKEN is required');
}

if (isProduction && jwtSecret.length < 32) {
    throw new Error('JWT_SECRET_TOKEN must be at least 32 characters in production');
}

if (isProduction && jwtSecret === 'replace-with-a-long-random-secret') {
    throw new Error('JWT_SECRET_TOKEN must be changed before production');
}

if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
}

module.exports = {
    nodeEnv,
    isProduction,
    port,
    jwtSecret,
    databaseUrl,
    allowedOrigins,
    publicDir: path.join(__dirname, '..', 'public')
};
