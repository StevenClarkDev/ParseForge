const express = require('express');
const app = express();
const PORT = process.env.PORT || 4022;
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
require("dotenv").config();
const http = require("http");
const server = http.createServer(app);
const connectDb = require("./configDb");

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// In-memory data stores (simulating database)
let apiKeys = [
    {
        id: 'key_1',
        name: 'Production Key',
        key: 'pk_live_51JxK2bC3fGhIjKlMnOpQrStUvWxYz4f2a',
        created: new Date('2026-02-15').toISOString(),
        lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        type: 'production'
    },
    {
        id: 'key_2',
        name: 'Development Key',
        key: 'pk_test_51JxK2bC3fGhIjKlMnOpQrStUvWx8c9b',
        created: new Date('2026-02-01').toISOString(),
        lastUsed: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        type: 'test'
    },
    {
        id: 'key_3',
        name: 'Staging Key',
        key: 'pk_test_51JxK2bC3fGhIjKlMnOpQrStAb3d5e6f',
        created: new Date('2026-01-20').toISOString(),
        lastUsed: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        type: 'test'
    }
];

let recentActivity = [];
let usageStats = {
    calls: [],
    responseTimes: [],
    statusCodes: {}
};

// Initialize data
function initializeData() {
    // Generate usage data for last 30 days
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        usageStats.calls.push({
            date: date.toISOString(),
            count: Math.floor(Math.random() * 2000) + 2500
        });
    }

    // Generate response time data
    for (let i = 0; i < 50; i++) {
        usageStats.responseTimes.push({
            timestamp: new Date(Date.now() - i * 15 * 60 * 1000).toISOString(),
            time: Math.floor(Math.random() * 30) + 70
        });
    }

    // Initialize status codes
    usageStats.statusCodes = {
        '200': 18500,
        '201': 3200,
        '404': 420,
        '500': 85,
        'other': 342
    };

    // Generate initial activity
    generateActivity();
}

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
    for (let i = 0; i < 20; i++) {
        const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
        recentActivity.push({
            id: `activity_${i}`,
            method: endpoint.method,
            path: endpoint.path,
            status: endpoint.status,
            responseTime: Math.floor(Math.random() * 100) + 30,
            timestamp: new Date(Date.now() - i * 2 * 60 * 1000).toISOString()
        });
    }
}

// Utility function to mask API key
function maskKey(key) {
    const prefix = key.substring(0, key.indexOf('_') + 5);
    return prefix + '••••••••••••••••' + key.slice(-4);
}

// Dashboard API Routes

// Get dashboard statistics
app.get('/api/dashboard/stats', (req, res) => {
    const totalCalls = usageStats.calls.reduce((sum, day) => sum + day.count, 0);
    const avgResponseTime = Math.floor(
        usageStats.responseTimes.reduce((sum, rt) => sum + rt.time, 0) / 
        usageStats.responseTimes.length
    );
    const totalRequests = Object.values(usageStats.statusCodes).reduce((sum, val) => sum + val, 0);
    const successfulRequests = usageStats.statusCodes['200'] + usageStats.statusCodes['201'];
    const successRate = ((successfulRequests / totalRequests) * 100).toFixed(1);

    res.json({
        apiCalls: totalCalls,
        activeKeys: apiKeys.length,
        avgResponseTime: avgResponseTime,
        successRate: successRate,
        changePercentage: '+12%'
    });
});

// Get usage data for charts
app.get('/api/dashboard/usage', (req, res) => {
    const { period = 7 } = req.query;
    const days = parseInt(period);
    const data = usageStats.calls.slice(-days);
    
    res.json({
        labels: data.map(d => {
            const date = new Date(d.date);
            return date.toLocaleDateString('en-US', { weekday: 'short' });
        }),
        values: data.map(d => d.count)
    });
});

// Get response time data
app.get('/api/dashboard/response-times', (req, res) => {
    const data = usageStats.responseTimes.slice(0, 20).reverse();
    
    res.json({
        labels: data.map(rt => {
            const date = new Date(rt.timestamp);
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        }),
        values: data.map(rt => rt.time)
    });
});

// Get status code distribution
app.get('/api/dashboard/status-codes', (req, res) => {
    res.json({
        labels: ['200 OK', '201 Created', '404 Not Found', '500 Error', 'Other'],
        values: [
            usageStats.statusCodes['200'],
            usageStats.statusCodes['201'],
            usageStats.statusCodes['404'],
            usageStats.statusCodes['500'],
            usageStats.statusCodes['other']
        ]
    });
});

// Get top endpoints
app.get('/api/dashboard/endpoints', (req, res) => {
    const endpoints = [
        { method: 'GET', path: '/api/users', count: 8432 },
        { method: 'POST', path: '/api/data', count: 5234 },
        { method: 'GET', path: '/api/status', count: 3891 },
        { method: 'PUT', path: '/api/users/:id', count: 1843 },
        { method: 'DELETE', path: '/api/users/:id', count: 892 }
    ];
    
    res.json(endpoints);
});

// Get recent activity
app.get('/api/dashboard/activity', (req, res) => {
    res.json(recentActivity.slice(0, 10));
});

// API Keys Management

// Get all API keys
app.get('/api/keys', (req, res) => {
    const keys = apiKeys.map(key => ({
        ...key,
        key: maskKey(key.key)
    }));
    res.json(keys);
});

// Create new API key
app.post('/api/keys', (req, res) => {
    const { name, type = 'test' } = req.body;
    
    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }
    
    const prefix = type === 'production' ? 'pk_live_' : 'pk_test_';
    const randomKey = crypto.randomBytes(24).toString('hex');
    const newKey = {
        id: `key_${Date.now()}`,
        name,
        key: prefix + randomKey,
        created: new Date().toISOString(),
        lastUsed: null,
        type
    };
    
    apiKeys.push(newKey);
    
    res.status(201).json({
        ...newKey,
        key: maskKey(newKey.key),
        fullKey: newKey.key // Only shown once
    });
});

// Revoke API key
app.delete('/api/keys/:id', (req, res) => {
    const { id } = req.params;
    const index = apiKeys.findIndex(key => key.id === id);
    
    if (index === -1) {
        return res.status(404).json({ error: 'API key not found' });
    }
    
    apiKeys.splice(index, 1);
    res.json({ success: true, message: 'API key revoked successfully' });
});

// Sample API endpoints (with activity tracking)
app.get('/api/status', (req, res) => {
    logActivity('GET', '/api/status', 200);
    res.json({ status: 'online', version: '1.0.0' });
});

app.get('/api/users/:id', (req, res) => {
    const { id } = req.params;
    logActivity('GET', `/api/users/${id}`, 200);
    res.json({
        id: id,
        name: 'Sample User',
        email: 'user@example.com',
        created: new Date().toISOString()
    });
});

app.post('/api/data', (req, res) => {
    const data = req.body;
    logActivity('POST', '/api/data', 201);
    res.json({
        success: true,
        message: 'Data received successfully',
        received: data,
        timestamp: new Date().toISOString()
    });
});

// Log API activity
function logActivity(method, path, status) {
    recentActivity.unshift({
        id: `activity_${Date.now()}`,
        method,
        path,
        status,
        responseTime: Math.floor(Math.random() * 100) + 30,
        timestamp: new Date().toISOString()
    });
    
    // Keep only last 50 activities
    if (recentActivity.length > 50) {
        recentActivity = recentActivity.slice(0, 50);
    }
}

// Serve documentation files
app.get('/docs/:page', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'docs.html'));
});

// ========================================
// ADMIN API ENDPOINTS
// ========================================

// In-memory admin data stores
let pricingPlans = [
    {
        id: 'plan_1',
        name: 'Starter',
        monthlyPrice: 89,
        yearlyPrice: 890,
        features: ['10,000 API calls/month', 'Basic support', 'Team collaboration (5 members)', 'Standard documentation', 'Email notifications'],
        status: 'active'
    },
    {
        id: 'plan_2',
        name: 'Professional',
        monthlyPrice: 149,
        yearlyPrice: 1490,
        features: ['50,000 API calls/month', 'Priority support', 'Team collaboration (15 members)', 'Advanced features', 'Webhook support', 'Custom integrations'],
        status: 'active'
    },
    {
        id: 'plan_3',
        name: 'Enterprise',
        monthlyPrice: 0,
        yearlyPrice: 0,
        features: ['Unlimited API calls', '24/7 Premium support', 'Unlimited team members', 'White-label options', 'Dedicated account manager', 'SLA guarantee', 'Custom contracts'],
        status: 'active'
    }
];

let apisSDKs = [
    {
        id: 'api_1',
        name: 'Users API',
        type: 'api',
        language: 'REST',
        version: 'v2.1.0',
        description: 'Complete user management with authentication, profiles, and permissions.',
        documentation: '/docs.html#users',
        status: 'stable'
    },
    {
        id: 'sdk_1',
        name: 'Node.js SDK',
        type: 'sdk',
        language: 'JavaScript',
        version: 'v3.2.1',
        description: 'Full-featured Node.js SDK with TypeScript support and async/await.',
        documentation: '/sdks.html#nodejs',
        status: 'stable'
    },
    {
        id: 'sdk_2',
        name: 'Python SDK',
        type: 'sdk',
        language: 'Python',
        version: 'v2.8.0',
        description: 'Pythonic SDK with support for asyncio and type hints.',
        documentation: '/sdks.html#python',
        status: 'stable'
    },
    {
        id: 'api_2',
        name: 'Data API',
        type: 'api',
        language: 'REST',
        version: 'v1.5.2',
        description: 'Store, retrieve, and query data with powerful filtering capabilities.',
        documentation: '/docs.html#data',
        status: 'stable'
    }
];

let contentPages = {
    about: {
        title: 'About ParseForge',
        body: 'ParseForge is a powerful developer platform providing APIs, SDKs, and tools to build modern applications.'
    },
    docs: {
        title: 'Documentation',
        body: 'Comprehensive API documentation with examples and guides.'
    },
    resources: {
        title: 'Resources & Blog',
        body: 'Developer guides, tutorials, and best practices.'
    },
    hero: {
        title: 'Build Powerful Applications with ParseForge',
        body: 'A complete developer platform with robust APIs, comprehensive documentation, and powerful tools to accelerate your development.'
    }
};

let branding = {
    logoType: 'svg',
    logoCode: '<svg>...</svg>',
    primaryColor: '#00d9ff',
    secondaryColor: '#1de9b6',
    accentColor: '#b84dff'
};

let users = [
    {
        id: 'user_1',
        name: 'John Developer',
        email: 'john@example.com',
        plan: 'professional',
        status: 'active',
        joined: new Date('2026-01-15').toISOString()
    },
    {
        id: 'user_2',
        name: 'Sarah Smith',
        email: 'sarah@company.com',
        plan: 'enterprise',
        status: 'active',
        joined: new Date('2026-01-20').toISOString()
    },
    {
        id: 'user_3',
        name: 'Mike Johnson',
        email: 'mike@startup.io',
        plan: 'starter',
        status: 'active',
        joined: new Date('2026-02-01').toISOString()
    },
    {
        id: 'user_4',
        name: 'Emily Brown',
        email: 'emily@tech.com',
        plan: 'professional',
        status: 'inactive',
        joined: new Date('2025-12-10').toISOString()
    }
];

// Admin Overview Stats
app.get('/api/admin/overview', (req, res) => {
    const stats = {
        totalUsers: users.length,
        activeSubscriptions: users.filter(u => u.status === 'active').length,
        totalAPIs: apisSDKs.length,
        monthlyRevenue: users.filter(u => u.status === 'active').reduce((sum, user) => {
            const plan = pricingPlans.find(p => p.name.toLowerCase() === user.plan);
            return sum + (plan ? plan.monthlyPrice : 0);
        }, 0)
    };
    res.json(stats);
});

app.get('/api/admin/recent-activities', (req, res) => {
    const adminActivities = [
        { id: 1, action: 'New user registered', user: 'john@example.com', time: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
        { id: 2, action: 'Pricing plan updated', user: 'Admin', time: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
        { id: 3, action: 'New API added', user: 'Admin', time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
        { id: 4, action: 'User subscription changed', user: 'sarah@company.com', time: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() }
    ];
    res.json(adminActivities);
});

// Pricing Plans Management
app.get('/api/admin/pricing', (req, res) => {
    res.json(pricingPlans);
});

app.post('/api/admin/pricing', (req, res) => {
    const newPlan = {
        id: `plan_${Date.now()}`,
        ...req.body,
        features: req.body.features.split('\n').filter(f => f.trim())
    };
    pricingPlans.push(newPlan);
    res.json({ success: true, plan: newPlan });
});

app.put('/api/admin/pricing/:id', (req, res) => {
    const index = pricingPlans.findIndex(p => p.id === req.params.id);
    if (index !== -1) {
        pricingPlans[index] = {
            ...pricingPlans[index],
            ...req.body,
            features: req.body.features.split('\n').filter(f => f.trim())
        };
        res.json({ success: true, plan: pricingPlans[index] });
    } else {
        res.status(404).json({ error: 'Plan not found' });
    }
});

app.delete('/api/admin/pricing/:id', (req, res) => {
    const index = pricingPlans.findIndex(p => p.id === req.params.id);
    if (index !== -1) {
        pricingPlans.splice(index, 1);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Plan not found' });
    }
});

// APIs & SDKs Management
app.get('/api/admin/apis', (req, res) => {
    res.json(apisSDKs);
});

app.post('/api/admin/apis', (req, res) => {
    const newAPI = {
        id: `${req.body.type}_${Date.now()}`,
        ...req.body
    };
    apisSDKs.push(newAPI);
    res.json({ success: true, api: newAPI });
});

app.put('/api/admin/apis/:id', (req, res) => {
    const index = apisSDKs.findIndex(a => a.id === req.params.id);
    if (index !== -1) {
        apisSDKs[index] = { ...apisSDKs[index], ...req.body };
        res.json({ success: true, api: apisSDKs[index] });
    } else {
        res.status(404).json({ error: 'API/SDK not found' });
    }
});

app.delete('/api/admin/apis/:id', (req, res) => {
    const index = apisSDKs.findIndex(a => a.id === req.params.id);
    if (index !== -1) {
        apisSDKs.splice(index, 1);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'API/SDK not found' });
    }
});

// Content Management
app.get('/api/admin/content/:type', (req, res) => {
    const content = contentPages[req.params.type];
    if (content) {
        res.json(content);
    } else {
        res.status(404).json({ error: 'Content not found' });
    }
});

app.post('/api/admin/content/:type', (req, res) => {
    contentPages[req.params.type] = req.body;
    res.json({ success: true, content: contentPages[req.params.type] });
});

// Branding Management
app.get('/api/admin/branding', (req, res) => {
    res.json(branding);
});

app.post('/api/admin/branding', (req, res) => {
    branding = { ...branding, ...req.body };
    res.json({ success: true, branding });
});

// Users Management
app.get('/api/admin/users', (req, res) => {
    const { search, page = 1, limit = 10 } = req.query;
    let filteredUsers = users;
    
    if (search) {
        filteredUsers = users.filter(u => 
            u.name.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase())
        );
    }
    
    const start = (page - 1) * limit;
    const paginatedUsers = filteredUsers.slice(start, start + parseInt(limit));
    
    res.json({
        users: paginatedUsers,
        total: filteredUsers.length,
        page: parseInt(page),
        totalPages: Math.ceil(filteredUsers.length / limit)
    });
});

app.post('/api/admin/users', (req, res) => {
    const newUser = {
        id: `user_${Date.now()}`,
        ...req.body,
        joined: new Date().toISOString()
    };
    users.push(newUser);
    res.json({ success: true, user: newUser });
});

app.put('/api/admin/users/:id', (req, res) => {
    const index = users.findIndex(u => u.id === req.params.id);
    if (index !== -1) {
        users[index] = { ...users[index], ...req.body };
        res.json({ success: true, user: users[index] });
    } else {
        res.status(404).json({ error: 'User not found' });
    }
});

app.delete('/api/admin/users/:id', (req, res) => {
    const index = users.findIndex(u => u.id === req.params.id);
    if (index !== -1) {
        users.splice(index, 1);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'User not found' });
    }
});

// Clean URL routing - serve HTML files without .html extension
app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api/') || req.path.startsWith('/assets/') || req.path.startsWith('/includes/')) {
        return next();
    }
    
    // If path already has .html, continue normally
    if (req.path.endsWith('.html')) {
        return next();
    }
    
    // If root path, serve index.html
    if (req.path === '/') {
        return res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
    
    // Try to serve the HTML file without extension
    const filePath = path.join(__dirname, 'public', req.path + '.html');
    const fs = require('fs');
    
    if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
    }
    
    // If no .html file found, continue to next middleware (will serve static files or 404)
    next();
});

// Initialize data on startup
initializeData();

// Start server
const start = () => {
  try {
    connectDb();
    server.listen(PORT, () => {
      console.log(`Server is Running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.log(`Having Errors Running On Port : ${PORT}`);
  }
};

start();
