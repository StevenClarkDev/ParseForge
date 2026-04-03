const express = require('express');

function createDataRoutes({ authMiddleware, logActivity }) {
    const router = express.Router();

    router.get('/', authMiddleware, (req, res) => {
        logActivity('GET', '/api/data', 200);
        return res.json({
            items: [
                { id: 'data_1', name: 'Example', value: 'Sample data' },
                { id: 'data_2', name: 'Metrics', value: 'Operational snapshot' }
            ]
        });
    });

    router.post('/', authMiddleware, (req, res) => {
        logActivity('POST', '/api/data', 201);
        return res.json({
            success: true,
            message: 'Data received successfully',
            received: req.body,
            timestamp: new Date().toISOString()
        });
    });

    return router;
}

module.exports = createDataRoutes;
