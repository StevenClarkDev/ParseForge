const express = require('express');

function createUserRoutes({ authMiddleware, User, sanitizeUser, createPasswordHash, logActivity }) {
    const router = express.Router();

    router.get('/', authMiddleware, async (req, res) => {
        const users = await User.find().sort({ createdAt: -1 }).limit(25);
        logActivity('GET', '/api/users', 200);
        return res.json(users.map(sanitizeUser));
    });

    router.get('/:id', authMiddleware, async (req, res) => {
        const user = await User.findById(req.params.id);

        if (!user) {
            logActivity('GET', `/api/users/${req.params.id}`, 404);
            return res.status(404).json({ error: 'User not found' });
        }

        logActivity('GET', `/api/users/${req.params.id}`, 200);
        return res.json(sanitizeUser(user));
    });

    router.post('/', authMiddleware, async (req, res) => {
        const { firstName, lastName, email, password = 'changeme123', company = '', useCase = '' } = req.body;

        if (!firstName || !lastName || !email) {
            return res.status(400).json({ error: 'First name, last name, and email are required' });
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
        const allowedFields = ['firstName', 'lastName', 'company', 'useCase', 'plan', 'status'];
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

    router.delete('/:id', authMiddleware, async (req, res) => {
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
