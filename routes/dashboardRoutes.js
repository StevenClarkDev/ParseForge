const express = require('express');

function createDashboardRoutes({ optionalAuth, usageStats, getRecentActivity, ApiKey }) {
    const router = express.Router();

    router.get('/stats', optionalAuth, async (req, res) => {
        const totalCalls = usageStats.calls.reduce((sum, day) => sum + day.count, 0);
        const avgResponseTime = Math.floor(
            usageStats.responseTimes.reduce((sum, item) => sum + item.time, 0) /
            usageStats.responseTimes.length
        );
        const totalRequests = Object.values(usageStats.statusCodes).reduce((sum, value) => sum + value, 0);
        const successfulRequests = usageStats.statusCodes[200] + usageStats.statusCodes[201];
        const successRate = ((successfulRequests / totalRequests) * 100).toFixed(1);
        const activeKeys = req.user ? await ApiKey.countDocuments({ userId: req.user._id }) : await ApiKey.countDocuments();

        return res.json({
            apiCalls: totalCalls,
            activeKeys,
            avgResponseTime,
            successRate,
            changePercentage: '+12%'
        });
    });

    router.get('/usage', (req, res) => {
        const days = Number.parseInt(req.query.period, 10) || 7;
        const data = usageStats.calls.slice(-days);

        return res.json({
            labels: data.map((entry) => new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short' })),
            values: data.map((entry) => entry.count)
        });
    });

    router.get('/response-times', (req, res) => {
        const data = usageStats.responseTimes.slice(0, 20).reverse();

        return res.json({
            labels: data.map((entry) => new Date(entry.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })),
            values: data.map((entry) => entry.time)
        });
    });

    router.get('/status-codes', (req, res) => {
        return res.json({
            labels: ['200 OK', '201 Created', '404 Not Found', '500 Error', 'Other'],
            values: [
                usageStats.statusCodes[200],
                usageStats.statusCodes[201],
                usageStats.statusCodes[404],
                usageStats.statusCodes[500],
                usageStats.statusCodes.other
            ]
        });
    });

    router.get('/endpoints', (req, res) => res.json([
        { method: 'GET', path: '/api/users', count: 8432 },
        { method: 'POST', path: '/api/auth/login', count: 5234 },
        { method: 'GET', path: '/api/status', count: 3891 },
        { method: 'POST', path: '/api/keys', count: 1843 },
        { method: 'DELETE', path: '/api/keys/:id', count: 892 }
    ]));

    router.get('/activity', (req, res) => res.json(getRecentActivity(10)));

    return router;
}

module.exports = createDashboardRoutes;
