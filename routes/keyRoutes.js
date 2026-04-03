const express = require('express');

function createKeyRoutes({ authMiddleware, ApiKey, createApiKeyValue, hashApiKey, maskKeyFromParts }) {
    const router = express.Router();

    router.get('/', authMiddleware, async (req, res) => {
        const keys = await ApiKey.find({ userId: req.user._id }).sort({ createdAt: -1 });

        return res.json(
            keys.map((key) => ({
                id: key._id.toString(),
                name: key.name,
                key: maskKeyFromParts(key.prefix, key.last4),
                created: key.createdAt,
                lastUsed: key.lastUsed,
                type: key.type
            }))
        );
    });

    router.post('/', authMiddleware, async (req, res) => {
        const { name, type = 'test' } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        const normalizedType = type === 'production' ? 'production' : 'test';
        const generatedKey = createApiKeyValue(normalizedType);

        const apiKey = await ApiKey.create({
            userId: req.user._id,
            name: String(name).trim(),
            type: normalizedType,
            prefix: generatedKey.prefix,
            last4: generatedKey.last4,
            keyHash: hashApiKey(generatedKey.value)
        });

        return res.status(201).json({
            id: apiKey._id.toString(),
            name: apiKey.name,
            type: apiKey.type,
            key: maskKeyFromParts(apiKey.prefix, apiKey.last4),
            fullKey: generatedKey.value,
            created: apiKey.createdAt,
            lastUsed: apiKey.lastUsed
        });
    });

    router.delete('/:id', authMiddleware, async (req, res) => {
        const deletedKey = await ApiKey.findOneAndDelete({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!deletedKey) {
            return res.status(404).json({ error: 'API key not found' });
        }

        return res.json({ success: true, message: 'API key revoked successfully' });
    });

    return router;
}

module.exports = createKeyRoutes;
