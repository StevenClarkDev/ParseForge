const express = require('express');
const path = require('path');
const fs = require('fs');

function createSiteRoutes({ publicDir, logActivity }) {
    const router = express.Router();

    router.get('/status', (req, res) => {
        logActivity('GET', '/api/status', 200);
        return res.json({ status: 'online', version: '1.0.0' });
    });

    router.get('/docs/:page', (req, res) => res.sendFile(path.join(publicDir, 'docs.html')));

    router.get('*', (req, res, next) => {
        if (req.path.startsWith('/api/') || req.path.startsWith('/assets/') || req.path.startsWith('/includes/')) {
            return next();
        }

        if (req.path.endsWith('.html')) {
            return next();
        }

        if (req.path === '/') {
            return res.sendFile(path.join(publicDir, 'index.html'));
        }

        const filePath = path.join(publicDir, `${req.path}.html`);
        if (fs.existsSync(filePath)) {
            return res.sendFile(filePath);
        }

        return next();
    });

    return router;
}

module.exports = createSiteRoutes;
