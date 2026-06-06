const express = require('express');

function createUserRoutes({ authMiddleware, User, sanitizeUser, createPasswordHash, verifyPassword, logActivity }) {
    const router = express.Router();

    function isAdmin(req) {
        return req.user.role === 'admin';
    }

    function canAccessUser(req, userId) {
        return isAdmin(req) || req.user._id.toString() === String(userId);
    }

    router.get('/', authMiddleware, async (req, res) => {
        if (!isAdmin(req)) {
            logActivity('GET', '/api/users', 200);
            return res.json([sanitizeUser(req.user)]);
        }

        const users = await User.find().sort({ createdAt: -1 }).limit(25);
        logActivity('GET', '/api/users', 200);
        return res.json(users.map(sanitizeUser));
    });

    router.get('/:id', authMiddleware, async (req, res) => {
        if (!canAccessUser(req, req.params.id)) {
            logActivity('GET', `/api/users/${req.params.id}`, 403);
            return res.status(403).json({ error: 'You can only access your own user profile' });
        }

        const user = await User.findById(req.params.id);

        if (!user) {
            logActivity('GET', `/api/users/${req.params.id}`, 404);
            return res.status(404).json({ error: 'User not found' });
        }

        logActivity('GET', `/api/users/${req.params.id}`, 200);
        return res.json(sanitizeUser(user));
    });

    router.post('/', authMiddleware, async (req, res) => {
        if (!isAdmin(req)) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { firstName, lastName, email, password, company = '', useCase = '' } = req.body;

        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({ error: 'First name, last name, email, and password are required' });
        }

        if (String(password).length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long' });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const existingUser = await User.findOne({ email: normalizedEmail });

        if (existingUser) {
            return res.status(409).json({ error: 'User already exists' });
        }

        const user = await User.create({
            firstName: String(firstName).trim(),
            lastName: String(lastName).trim(),
            email: normalizedEmail,
            passwordHash: createPasswordHash(password),
            company: String(company).trim(),
            useCase: String(useCase).trim()
        });

        logActivity('POST', '/api/users', 201);
        return res.status(201).json(sanitizeUser(user));
    });

    router.put('/:id', authMiddleware, async (req, res) => {
        if (!canAccessUser(req, req.params.id)) {
            logActivity('PUT', `/api/users/${req.params.id}`, 403);
            return res.status(403).json({ error: 'You can only update your own user profile' });
        }

        const allowedFields = isAdmin(req)
            ? ['firstName', 'lastName', 'company', 'useCase', 'plan', 'status']
            : ['firstName', 'lastName', 'company', 'useCase'];
        const updates = {};

        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true });

        if (!user) {
            logActivity('PUT', `/api/users/${req.params.id}`, 404);
            return res.status(404).json({ error: 'User not found' });
        }

        logActivity('PUT', `/api/users/${req.params.id}`, 200);
        return res.json(sanitizeUser(user));
    });

    router.put('/:id/password', authMiddleware, async (req, res) => {
        if (!canAccessUser(req, req.params.id)) {
            logActivity('PUT', `/api/users/${req.params.id}/password`, 403);
            return res.status(403).json({ error: 'You can only update your own password' });
        }

        const { currentPassword = '', newPassword = '' } = req.body;
        const user = await User.findById(req.params.id);

        if (!user) {
            logActivity('PUT', `/api/users/${req.params.id}/password`, 404);
            return res.status(404).json({ error: 'User not found' });
        }

        if (!isAdmin(req) && !verifyPassword(currentPassword, user.passwordHash)) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        if (String(newPassword).length < 8) {
            return res.status(400).json({ error: 'New password must be at least 8 characters long' });
        }

        user.passwordHash = createPasswordHash(newPassword);
        await user.save();

        logActivity('PUT', `/api/users/${req.params.id}/password`, 200);
        return res.json({ success: true });
    });

    router.delete('/:id', authMiddleware, async (req, res) => {
        if (!canAccessUser(req, req.params.id)) {
            logActivity('DELETE', `/api/users/${req.params.id}`, 403);
            return res.status(403).json({ error: 'You can only delete your own user profile' });
        }

        const user = await User.findByIdAndDelete(req.params.id);

        if (!user) {
            logActivity('DELETE', `/api/users/${req.params.id}`, 404);
            return res.status(404).json({ error: 'User not found' });
        }

        logActivity('DELETE', `/api/users/${req.params.id}`, 204);
        return res.json({ success: true });
    });

    return router;
}

module.exports = createUserRoutes;
