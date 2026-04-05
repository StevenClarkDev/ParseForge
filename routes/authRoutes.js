const express = require('express');
const User = require('../models/User');
const { createPasswordHash, verifyPassword, createToken } = require('../utils/auth');
const { sanitizeUser } = require('../utils/serializers');
const {
    ensureBootstrapAdminUser,
    getBootstrapAdminConfig
} = require('../seeds/bootstrapAdminUser');

function createAuthRoutes({ jwtSecret, authMiddleware }) {
    const router = express.Router();

    router.post('/register', async (req, res) => {
        try {
            const {
                firstName,
                lastName,
                email,
                password,
                company = '',
                useCase = '',
                newsletter = false
            } = req.body;

            if (!firstName || !lastName || !email || !password) {
                return res.status(400).json({ error: 'First name, last name, email, and password are required' });
            }

            if (password.length < 8) {
                return res.status(400).json({ error: 'Password must be at least 8 characters long' });
            }

            const normalizedEmail = String(email).trim().toLowerCase();
            const existingUser = await User.findOne({ email: normalizedEmail });

            if (existingUser) {
                return res.status(409).json({ error: 'An account with this email already exists' });
            }

            const adminExists = (await User.countDocuments({ role: 'admin' })) > 0;

            const user = await User.create({
                firstName: String(firstName).trim(),
                lastName: String(lastName).trim(),
                email: normalizedEmail,
                passwordHash: createPasswordHash(password),
                company: String(company).trim(),
                useCase: String(useCase).trim(),
                newsletter: Boolean(newsletter),
                role: adminExists ? 'developer' : 'admin'
            });

            return res.status(201).json({
                token: createToken(user, jwtSecret),
                user: sanitizeUser(user)
            });
        } catch (error) {
            return res.status(500).json({ error: 'Unable to register user' });
        }
    });

    router.post('/login', async (req, res) => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ error: 'Email and password are required' });
            }

            const normalizedEmail = String(email).trim().toLowerCase();
            const bootstrapAdmin = getBootstrapAdminConfig();

            if (
                bootstrapAdmin &&
                normalizedEmail === bootstrapAdmin.email &&
                password === bootstrapAdmin.password
            ) {
                await ensureBootstrapAdminUser({ User, createPasswordHash });
            }

            const user = await User.findOne({ email: normalizedEmail });

            if (!user || !verifyPassword(password, user.passwordHash)) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            user.lastLoginAt = new Date();
            await user.save();

            return res.json({
                token: createToken(user, jwtSecret),
                user: sanitizeUser(user)
            });
        } catch (error) {
            return res.status(500).json({ error: 'Unable to sign in' });
        }
    });

    router.get('/me', authMiddleware, async (req, res) => res.json({ user: sanitizeUser(req.user) }));

    return router;
}

module.exports = createAuthRoutes;
