const User = require('../models/User');
const { verifyToken } = require('../utils/auth');

function createAuthMiddleware(jwtSecret) {
    return async function authMiddleware(req, res, next) {
        try {
            const authHeader = req.headers.authorization || '';
            const [scheme, token] = authHeader.split(' ');

            if (scheme !== 'Bearer' || !token) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            const payload = verifyToken(token, jwtSecret);
            const user = await User.findById(payload.sub);

            if (!user) {
                return res.status(401).json({ error: 'Invalid session' });
            }

            req.user = user;
            return next();
        } catch (error) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
    };
}

function createOptionalAuthMiddleware(authMiddleware) {
    return function optionalAuth(req, res, next) {
        const authHeader = req.headers.authorization || '';

        if (!authHeader.startsWith('Bearer ')) {
            return next();
        }

        return authMiddleware(req, res, next);
    };
}

function requireAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    return next();
}

module.exports = {
    createAuthMiddleware,
    createOptionalAuthMiddleware,
    requireAdmin
};
