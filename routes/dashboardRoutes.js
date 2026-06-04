const express = require('express');

function buildDateKey(date) {
    return date.toISOString().slice(0, 10);
}

function buildUsageSeries({ purchases, days }) {
    const today = new Date();
    const purchaseCounts = new Map();

    purchases.forEach((purchase) => {
        const key = buildDateKey(new Date(purchase.createdAt));
        purchaseCounts.set(key, (purchaseCounts.get(key) || 0) + 1);
    });

    const labels = [];
    const values = [];

    for (let index = days - 1; index >= 0; index -= 1) {
        const date = new Date(today);
        date.setDate(today.getDate() - index);
        const key = buildDateKey(date);
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        values.push(purchaseCounts.get(key) || 0);
    }

    return { labels, values };
}

function createWorkspaceActivity({ purchases, limit = 10 }) {
    const purchaseActivity = purchases.map((purchase) => ({
        id: `purchase_${purchase._id.toString()}`,
        method: 'BUY',
        path: purchase.productName || 'Catalog product',
        status: purchase.status === 'active' ? 200 : 410,
        responseTime: 0,
        timestamp: purchase.createdAt,
        detail: `${purchase.purchaseType === 'one_time' ? 'One-time license' : `${purchase.purchaseType} subscription`} ${purchase.orderReference}`
    }));

    return purchaseActivity
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);
}

async function getWorkspaceSnapshot({ req, CatalogPurchase, ApiCatalogItem }) {
    const purchases = await CatalogPurchase.find({ userId: req.user._id, status: 'active' }).sort({ createdAt: -1 });

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

    return { purchases: decoratedPurchases };
}

function createDashboardRoutes({ authMiddleware, usageStats, getRecentActivity, CatalogPurchase, ApiCatalogItem }) {
    const router = express.Router();

    router.use(authMiddleware);

    router.get('/stats', async (req, res) => {
        const { purchases } = await getWorkspaceSnapshot({
            req,
            CatalogPurchase,
            ApiCatalogItem
        });
        const subscriptions = purchases.filter(
            (purchase) => purchase.purchaseType === 'monthly' || purchase.purchaseType === 'yearly'
        ).length;
        const oneTimeLicenses = purchases.filter((purchase) => purchase.purchaseType === 'one_time').length;

        return res.json({
            ownedProducts: purchases.length,
            subscriptions,
            oneTimeLicenses,
            docsUnlocked: purchases.length,
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
        const { purchases } = await getWorkspaceSnapshot({
            req,
            CatalogPurchase,
            ApiCatalogItem
        });
        return res.json(buildUsageSeries({ purchases, days: Math.min(Math.max(days, 7), 90) }));
    });

    router.get('/response-times', (req, res) => {
        const data = usageStats.responseTimes.slice(0, 20).reverse();

        return res.json({
            labels: data.map((entry) => new Date(entry.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })),
            values: []
        });
    });

    router.get('/status-codes', (req, res) => {
        return res.json({
            labels: ['Active purchases', 'Expired access', 'Pending access'],
            values: [0, 0, 0]
        });
    });

    router.get('/endpoints', async (req, res) => {
        const { purchases } = await getWorkspaceSnapshot({
            req,
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
        const { purchases } = await getWorkspaceSnapshot({
            req,
            CatalogPurchase,
            ApiCatalogItem
        });
        const workspaceActivity = createWorkspaceActivity({ purchases, limit: 10 });
        return res.json(workspaceActivity.length ? workspaceActivity : getRecentActivity(0));
    });

    return router;
}

module.exports = createDashboardRoutes;
