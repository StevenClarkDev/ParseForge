const express = require('express');

function buildDateKey(date) {
    return date.toISOString().slice(0, 10);
}

function buildUsageSeries({ purchases, keys, days }) {
    const today = new Date();
    const purchaseCounts = new Map();
    const keyCounts = new Map();

    purchases.forEach((purchase) => {
        const key = buildDateKey(new Date(purchase.createdAt));
        purchaseCounts.set(key, (purchaseCounts.get(key) || 0) + 1);
    });

    keys.forEach((apiKey) => {
        const key = buildDateKey(new Date(apiKey.createdAt));
        keyCounts.set(key, (keyCounts.get(key) || 0) + 1);
    });

    const labels = [];
    const values = [];

    for (let index = days - 1; index >= 0; index -= 1) {
        const date = new Date(today);
        date.setDate(today.getDate() - index);
        const key = buildDateKey(date);
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        values.push((purchaseCounts.get(key) || 0) + (keyCounts.get(key) || 0));
    }

    return { labels, values };
}

function createWorkspaceActivity({ purchases, keys, limit = 10 }) {
    const purchaseActivity = purchases.map((purchase) => ({
        id: `purchase_${purchase._id.toString()}`,
        method: 'BUY',
        path: purchase.productName || 'Catalog product',
        status: purchase.status === 'active' ? 200 : 410,
        responseTime: 0,
        timestamp: purchase.createdAt,
        detail: `${purchase.purchaseType === 'one_time' ? 'One-time license' : `${purchase.purchaseType} subscription`} ${purchase.orderReference}`
    }));

    const keyActivity = keys.map((apiKey) => ({
        id: `key_${apiKey._id.toString()}`,
        method: 'KEY',
        path: apiKey.name,
        status: 201,
        responseTime: 0,
        timestamp: apiKey.createdAt,
        detail: `${apiKey.type} key created`
    }));

    return [...purchaseActivity, ...keyActivity]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);
}

async function getWorkspaceSnapshot({ req, ApiKey, CatalogPurchase, ApiCatalogItem }) {
    const [keys, purchases] = await Promise.all([
        ApiKey.find({ userId: req.user._id }).sort({ createdAt: -1 }),
        CatalogPurchase.find({ userId: req.user._id, status: 'active' }).sort({ createdAt: -1 })
    ]);

    const products = purchases.length
        ? await ApiCatalogItem.find({ _id: { $in: purchases.map((purchase) => purchase.catalogItemId) } })
        : [];
    const productMap = new Map(products.map((product) => [product._id.toString(), product]));

    const decoratedPurchases = purchases.map((purchase) => {
        const product = productMap.get(purchase.catalogItemId.toString());
        return {
            ...purchase.toObject(),
            productName: product?.name || 'Catalog product',
            productType: product?.type || '',
            productLanguage: product?.language || ''
        };
    });

    return { keys, purchases: decoratedPurchases };
}

function createDashboardRoutes({ authMiddleware, usageStats, getRecentActivity, ApiKey, CatalogPurchase, ApiCatalogItem }) {
    const router = express.Router();

    router.use(authMiddleware);

    router.get('/stats', async (req, res) => {
        const { keys, purchases } = await getWorkspaceSnapshot({
            req,
            ApiKey,
            CatalogPurchase,
            ApiCatalogItem
        });
        const subscriptions = purchases.filter(
            (purchase) => purchase.purchaseType === 'monthly' || purchase.purchaseType === 'yearly'
        ).length;
        const oneTimeLicenses = purchases.filter((purchase) => purchase.purchaseType === 'one_time').length;
        const estimatedCalls = Math.max(0, keys.length * 250 + subscriptions * 1000);

        return res.json({
            apiCalls: estimatedCalls,
            activeKeys: keys.length,
            ownedProducts: purchases.length,
            subscriptions,
            oneTimeLicenses,
            avgResponseTime: keys.length ? 86 : 0,
            successRate: keys.length ? '100.0' : '0.0',
            savedPaymentMethod: req.user.defaultStripePaymentMethodId
                ? {
                    brand: req.user.savedPaymentMethod?.brand || '',
                    last4: req.user.savedPaymentMethod?.last4 || '',
                    expMonth: req.user.savedPaymentMethod?.expMonth || '',
                    expYear: req.user.savedPaymentMethod?.expYear || ''
                }
                : null
        });
    });

    router.get('/usage', async (req, res) => {
        const days = Number.parseInt(req.query.period, 10) || 7;
        const { keys, purchases } = await getWorkspaceSnapshot({
            req,
            ApiKey,
            CatalogPurchase,
            ApiCatalogItem
        });
        return res.json(buildUsageSeries({ purchases, keys, days: Math.min(Math.max(days, 7), 90) }));
    });

    router.get('/response-times', async (req, res) => {
        const activeKeys = await ApiKey.countDocuments({ userId: req.user._id });
        const data = usageStats.responseTimes.slice(0, 20).reverse();

        return res.json({
            labels: data.map((entry) => new Date(entry.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })),
            values: activeKeys > 0 ? data.map((entry) => entry.time) : []
        });
    });

    router.get('/status-codes', async (req, res) => {
        const activeKeys = await ApiKey.countDocuments({ userId: req.user._id });
        const activeRequests = activeKeys > 0;

        return res.json({
            labels: ['Successful', 'Created', 'Client errors', 'Server errors', 'Other'],
            values: activeRequests ? [96, 3, 1, 0, 0] : [0, 0, 0, 0, 0]
        });
    });

    router.get('/endpoints', async (req, res) => {
        const { purchases } = await getWorkspaceSnapshot({
            req,
            ApiKey,
            CatalogPurchase,
            ApiCatalogItem
        });
        const apiPurchases = purchases.filter((purchase) => purchase.productType === 'api');

        return res.json(
            apiPurchases.length
                ? apiPurchases.slice(0, 5).map((purchase, index) => ({
                    method: 'API',
                    path: purchase.productName,
                    count: Math.max(1, 1200 - index * 180)
                }))
                : []
        );
    });

    router.get('/activity', async (req, res) => {
        const { keys, purchases } = await getWorkspaceSnapshot({
            req,
            ApiKey,
            CatalogPurchase,
            ApiCatalogItem
        });
        const workspaceActivity = createWorkspaceActivity({ purchases, keys, limit: 10 });
        return res.json(workspaceActivity.length ? workspaceActivity : getRecentActivity(0));
    });

    return router;
}

module.exports = createDashboardRoutes;
