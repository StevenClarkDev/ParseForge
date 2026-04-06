const crypto = require('crypto');
const jwt = require('jsonwebtoken');

function createPasswordHash(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${derivedKey}`;
}

function verifyPassword(password, storedHash) {
    const [salt, originalHash] = storedHash.split(':');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    const originalBuffer = Buffer.from(originalHash, 'hex');
    return crypto.timingSafeEqual(derivedKey, originalBuffer);
}

function hashApiKey(key) {
    return crypto.createHash('sha256').update(key).digest('hex');
}

function maskKeyFromParts(prefix, last4) {
    return `${prefix}${'•'.repeat(16)}${last4}`;
}

function createApiKeyValue(type) {
    const prefix = type === 'production' ? 'pk_live_' : 'pk_test_';
    const value = `${prefix}${crypto.randomBytes(24).toString('hex')}`;

    return {
        value,
        prefix,
        last4: value.slice(-4)
    };
}

function createToken(user, jwtSecret, options = {}) {
    const payload = {
        sub: user._id.toString(),
        email: user.email,
        role: user.role
    };

    if (options.supportSession) {
        payload.supportSession = {
            active: true,
            adminUserId: options.supportSession.adminUserId,
            adminEmail: options.supportSession.adminEmail,
            adminName: options.supportSession.adminName || '',
            customerUserId: user._id.toString(),
            permissions: options.supportSession.permissions || ['read_only'],
            startedAt: options.supportSession.startedAt || new Date().toISOString()
        };
    }

    return jwt.sign(
        payload,
        jwtSecret,
        { expiresIn: options.expiresIn || '7d' }
    );
}

function verifyToken(token, jwtSecret) {
    return jwt.verify(token, jwtSecret);
}

module.exports = {
    createPasswordHash,
    verifyPassword,
    hashApiKey,
    maskKeyFromParts,
    createApiKeyValue,
    createToken,
    verifyToken
};
