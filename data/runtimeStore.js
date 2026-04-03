const usageStats = {
    calls: [],
    responseTimes: [],
    statusCodes: {}
};

let recentActivity = [];

function generateActivity() {
    const endpoints = [
        { method: 'GET', path: '/api/users', status: 200 },
        { method: 'GET', path: '/api/users/123', status: 200 },
        { method: 'POST', path: '/api/data', status: 201 },
        { method: 'GET', path: '/api/status', status: 200 },
        { method: 'PUT', path: '/api/users/456', status: 200 },
        { method: 'DELETE', path: '/api/users/789', status: 204 },
        { method: 'GET', path: '/api/users/999', status: 404 }
    ];

    recentActivity = [];
    for (let index = 0; index < 20; index += 1) {
        const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
        recentActivity.push({
            id: `activity_${index}`,
            method: endpoint.method,
            path: endpoint.path,
            status: endpoint.status,
            responseTime: Math.floor(Math.random() * 100) + 30,
            timestamp: new Date(Date.now() - index * 2 * 60 * 1000).toISOString()
        });
    }
}

function initializeRuntimeData() {
    usageStats.calls = [];
    usageStats.responseTimes = [];
    usageStats.statusCodes = {
        200: 18500,
        201: 3200,
        404: 420,
        500: 85,
        other: 342
    };

    const now = new Date();
    for (let index = 29; index >= 0; index -= 1) {
        const date = new Date(now);
        date.setDate(date.getDate() - index);
        usageStats.calls.push({
            date: date.toISOString(),
            count: Math.floor(Math.random() * 2000) + 2500
        });
    }

    for (let index = 0; index < 50; index += 1) {
        usageStats.responseTimes.push({
            timestamp: new Date(Date.now() - index * 15 * 60 * 1000).toISOString(),
            time: Math.floor(Math.random() * 30) + 70
        });
    }

    generateActivity();
}

function logActivity(method, routePath, status) {
    recentActivity.unshift({
        id: `activity_${Date.now()}`,
        method,
        path: routePath,
        status,
        responseTime: Math.floor(Math.random() * 100) + 30,
        timestamp: new Date().toISOString()
    });

    if (recentActivity.length > 50) {
        recentActivity = recentActivity.slice(0, 50);
    }
}

function getRecentActivity(limit = 10) {
    return recentActivity.slice(0, limit);
}

module.exports = {
    usageStats,
    initializeRuntimeData,
    logActivity,
    getRecentActivity
};
