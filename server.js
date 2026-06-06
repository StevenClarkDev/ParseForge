require('express-async-errors');

const express = require('express');
const compression = require('compression');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const rateLimit = require('express-rate-limit');

const connectDb = require('./configDb');
const { port, jwtSecret, publicDir, allowedOrigins, isProduction } = require('./config/appConfig');
const { usageStats, initializeRuntimeData, logActivity, getRecentActivity } = require('./data/runtimeStore');
const {
    createPasswordHash,
    verifyPassword,
    createToken,
    createApiKeyValue,
    hashApiKey,
    maskKeyFromParts
} = require('./utils/auth');
const { sanitizeUser } = require('./utils/serializers');
const { createAuthMiddleware, createOptionalAuthMiddleware, requireAdmin } = require('./middleware/auth');
const { seedAdminData } = require('./seeds/adminSeed');
const { ensureBootstrapAdminUser } = require('./seeds/bootstrapAdminUser');
const { ensureBootstrapTestUser } = require('./seeds/bootstrapTestUser');

const User = require('./models/User');
const ApiKey = require('./models/ApiKey');
const PricingPlan = require('./models/PricingPlan');
const ApiCatalogItem = require('./models/ApiCatalogItem');
const CatalogPurchase = require('./models/CatalogPurchase');
const PendingCheckout = require('./models/PendingCheckout');
const ContentPage = require('./models/ContentPage');
const BrandingSettings = require('./models/BrandingSettings');

const createAuthRoutes = require('./routes/authRoutes');
const createDashboardRoutes = require('./routes/dashboardRoutes');
const createKeyRoutes = require('./routes/keyRoutes');
const createUserRoutes = require('./routes/userRoutes');
const createDataRoutes = require('./routes/dataRoutes');
const createAdminRoutes = require('./routes/adminRoutes');
const createCatalogRoutes = require('./routes/catalogRoutes');
const { createStripeWebhookRoutes } = require('./routes/catalogRoutes');
const createSiteRoutes = require('./routes/siteRoutes');

const app = express();
const server = http.createServer(app);

const authMiddleware = createAuthMiddleware(jwtSecret);
const optionalAuth = createOptionalAuthMiddleware(authMiddleware);

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(helmet({
    contentSecurityPolicy: false
}));
app.use(compression());
app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(Object.assign(new Error('Origin is not allowed by CORS'), { statusCode: 403 }));
    },
    credentials: false
}));
app.use('/api/catalog', createStripeWebhookRoutes({
    logActivity,
    ApiCatalogItem,
    CatalogPurchase,
    PendingCheckout,
    User,
    createPasswordHash,
    createToken,
    jwtSecret
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '250kb' }));
app.use('/api', rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: isProduction ? 300 : 2000,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' }
}));
app.use(express.static(publicDir, {
    maxAge: isProduction ? '1d' : 0,
    etag: true,
    setHeaders(res, filePath) {
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
}));

app.use('/api/auth', createAuthRoutes({ jwtSecret, authMiddleware }));
app.use('/api/dashboard', createDashboardRoutes({
    authMiddleware,
    usageStats,
    getRecentActivity,
    CatalogPurchase,
    ApiCatalogItem
}));
app.use('/api/keys', createKeyRoutes({ authMiddleware, ApiKey, createApiKeyValue, hashApiKey, maskKeyFromParts }));
app.use('/api/users', createUserRoutes({ authMiddleware, User, sanitizeUser, createPasswordHash, verifyPassword, logActivity }));
app.use('/api/data', createDataRoutes({ authMiddleware, logActivity }));
app.use('/api/catalog', createCatalogRoutes({
    authMiddleware,
    optionalAuth,
    logActivity,
    ApiCatalogItem,
    CatalogPurchase,
    PendingCheckout,
    User,
    createPasswordHash,
    verifyPassword,
    createToken,
    jwtSecret
}));
app.use('/api/admin', createAdminRoutes({
    authMiddleware,
    requireAdmin,
    User,
    PricingPlan,
    ApiCatalogItem,
    CatalogPurchase,
    ContentPage,
    BrandingSettings,
    createPasswordHash,
    verifyPassword,
    createToken,
    jwtSecret
}));
app.use('/', createSiteRoutes({ publicDir, logActivity }));

app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

app.use((error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }

    const statusCode = Number(error.statusCode || error.status || 500);
    const safeStatus = statusCode >= 400 && statusCode < 600 ? statusCode : 500;
    const isPublicError = safeStatus < 500;

    if (!isPublicError) {
        console.error('Unhandled request error:', error);
    }

    return res.status(safeStatus).json({
        error: isPublicError ? error.message : 'Internal server error'
    });
});

initializeRuntimeData();

async function start() {
    try {
        await connectDb();
        await seedAdminData();
        await ensureBootstrapAdminUser({ User, createPasswordHash });
        await ensureBootstrapTestUser({ User, createPasswordHash });
        server.listen(port, () => {
            console.log(`ParseForge server running on port ${port}`);
        });
    } catch (error) {
        console.error(`Failed to start server on port ${port}`);
        process.exit(1);
    }
}

start();
