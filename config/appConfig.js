const path = require('path');

require('dotenv').config();

const port = Number(process.env.PORT) || 4022;
const jwtSecret = process.env.JWT_SECRET_TOKEN;

if (!jwtSecret) {
    throw new Error('JWT_SECRET_TOKEN is required');
}

module.exports = {
    port,
    jwtSecret,
    publicDir: path.join(__dirname, '..', 'public')
};
