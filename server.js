const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');

const connectDb = require('./configDb');
const { port, jwtSecret, publicDir } = require('./config/appConfig');
const { usageStats, initializeRuntimeData, logActivity, getRecentActivity } = require('./data/runtimeStore');
const { createPasswordHash, createApiKeyValue, hashApiKey, maskKeyFromParts } = require('./utils/auth');
const { sanitizeUser } = require('./utils/serializers');
const { createAuthMiddleware, createOptionalAuthMiddleware, requireAdmin } = require('./middleware/auth');
const { seedAdminData } = require('./seeds/adminSeed');

const User = require('./models/User');
const ApiKey = require('./models/ApiKey');
const PricingPlan = require('./models/PricingPlan');
const ApiCatalogItem = require('./models/ApiCatalogItem');
const ContentPage = require('./models/ContentPage');
const BrandingSettings = require('./models/BrandingSettings');

const createAuthRoutes = require('./routes/authRoutes');
const createDashboardRoutes = require('./routes/dashboardRoutes');
const createKeyRoutes = require('./routes/keyRoutes');
const createUserRoutes = require('./routes/userRoutes');
const createDataRoutes = require('./routes/dataRoutes');
const createAdminRoutes = require('./routes/adminRoutes');
const createSiteRoutes = require('./routes/siteRoutes');

const app = express();
const server = http.createServer(app);

const authMiddleware = createAuthMiddleware(jwtSecret);
const optionalAuth = createOptionalAuthMiddleware(authMiddleware);

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(publicDir));

app.use('/api/auth', createAuthRoutes({ jwtSecret, authMiddleware }));
app.use('/api/dashboard', createDashboardRoutes({ optionalAuth, usageStats, getRecentActivity, ApiKey }));
app.use('/api/keys', createKeyRoutes({ authMiddleware, ApiKey, createApiKeyValue, hashApiKey, maskKeyFromParts }));
app.use('/api/users', createUserRoutes({ authMiddleware, User, sanitizeUser, createPasswordHash, logActivity }));
app.use('/api/data', createDataRoutes({ authMiddleware, logActivity }));
app.use('/api/admin', createAdminRoutes({
    authMiddleware,
    requireAdmin,
    User,
    PricingPlan,
    ApiCatalogItem,
    ContentPage,
    BrandingSettings,
    createPasswordHash
}));
app.use('/', createSiteRoutes({ publicDir, logActivity }));

initializeRuntimeData();

async function start() {
    try {
        await connectDb();
        await seedAdminData();
        server.listen(port, () => {
            console.log(`ParseForge server running on http://localhost:${port}`);
        });
    } catch (error) {
        console.error(`Failed to start server on port ${port}`);
        process.exit(1);
    }
}

start();
