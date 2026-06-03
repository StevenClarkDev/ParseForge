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
            if (payload.supportSession?.active) {
                const [adminUser, impersonatedUser] = await Promise.all([
                    User.findById(payload.supportSession.adminUserId),
                    User.findById(payload.sub)
                ]);

                if (!adminUser || adminUser.role !== 'admin' || !impersonatedUser) {
                    return res.status(401).json({ error: 'Invalid support session' });
                }

                req.user = impersonatedUser;
                req.actor = adminUser;
                req.supportSession = {
                    active: true,
                    adminUserId: adminUser._id.toString(),
                    adminEmail: adminUser.email,
                    adminName: `${adminUser.firstName} ${adminUser.lastName}`.trim(),
                    customerUserId: impersonatedUser._id.toString(),
                    permissions: payload.supportSession.permissions || ['read_only'],
                    startedAt: payload.supportSession.startedAt || null,
                    endsAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : null
                };

                return next();
            }

            const user = await User.findById(payload.sub);

            if (!user) {
                return res.status(401).json({ error: 'Invalid session' });
            }

            req.user = user;
            req.actor = user;
            req.supportSession = null;
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

        const originalStatus = res.status.bind(res);
        const originalJson = res.json.bind(res);
        let authStatusCode = 200;

        res.status = function captureStatus(code) {
            authStatusCode = code;
            return res;
        };

        res.json = function ignoreOptionalAuthFailure(payload) {
            res.status = originalStatus;
            res.json = originalJson;

            if (authStatusCode === 401) {
                req.optionalAuthError = payload?.error || 'Invalid optional session';
                return next();
            }

            return originalStatus(authStatusCode).json(payload);
        };

        return authMiddleware(req, res, function optionalAuthSuccess(error) {
            res.status = originalStatus;
            res.json = originalJson;
            return next(error);
        });
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
