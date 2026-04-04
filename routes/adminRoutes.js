const express = require('express');
const { serializeCatalogItem } = require('../utils/serializers');

function normalizeFeatureInput(features) {
    return Array.isArray(features)
        ? features
        : String(features || '')
            .split('\n')
            .map((feature) => feature.trim())
            .filter(Boolean);
}

function normalizeBooleanInput(value, fallback = false) {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'string') {
        return ['true', '1', 'on', 'yes'].includes(value.toLowerCase());
    }

    return fallback;
}

function createAdminRoutes({
    authMiddleware,
    requireAdmin,
    User,
    PricingPlan,
    ApiCatalogItem,
    CatalogPurchase,
    ContentPage,
    BrandingSettings,
    createPasswordHash
}) {
    const router = express.Router();

    router.use(authMiddleware, requireAdmin);

    router.get('/overview', async (req, res) => {
        const totalUsers = await User.countDocuments();
        const activeSubscriptions = await CatalogPurchase.countDocuments({
            status: 'active',
            purchaseType: { $in: ['monthly', 'yearly'] }
        });
        const totalAPIs = await ApiCatalogItem.countDocuments();
        const subscriptions = await CatalogPurchase.find({
            status: 'active',
            purchaseType: { $in: ['monthly', 'yearly'] }
        });
        const monthlyRevenue = subscriptions.reduce((sum, purchase) => {
            if (purchase.purchaseType === 'yearly') {
                return sum + purchase.unitPrice / 12;
            }

            return sum + purchase.unitPrice;
        }, 0);

        return res.json({
            totalUsers,
            activeSubscriptions,
            totalAPIs,
            monthlyRevenue
        });
    });

    router.get('/recent-activities', (req, res) => res.json([
        { id: 1, action: 'New user registered', user: 'john@example.com', time: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
        { id: 2, action: 'Pricing plan updated', user: 'Admin', time: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
        { id: 3, action: 'New API added', user: 'Admin', time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
        { id: 4, action: 'User subscription changed', user: 'sarah@company.com', time: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() }
    ]));

    router.get('/pricing', async (req, res) => {
        const pricingPlans = await PricingPlan.find().sort({ createdAt: 1 });
        return res.json(pricingPlans.map((plan) => ({
            id: plan._id.toString(),
            name: plan.name,
            monthlyPrice: plan.monthlyPrice,
            yearlyPrice: plan.yearlyPrice,
            features: plan.features,
            status: plan.status
        })));
    });

    router.post('/pricing', async (req, res) => {
        const newPlan = await PricingPlan.create({
            name: req.body.name,
            monthlyPrice: Number(req.body.monthlyPrice) || 0,
            yearlyPrice: Number(req.body.yearlyPrice) || 0,
            features: normalizeFeatureInput(req.body.features),
            status: req.body.status || 'active'
        });

        return res.json({
            success: true,
            plan: {
                id: newPlan._id.toString(),
                name: newPlan.name,
                monthlyPrice: newPlan.monthlyPrice,
                yearlyPrice: newPlan.yearlyPrice,
                features: newPlan.features,
                status: newPlan.status
            }
        });
    });

    router.put('/pricing/:id', async (req, res) => {
        const plan = await PricingPlan.findByIdAndUpdate(
            req.params.id,
            {
                name: req.body.name,
                monthlyPrice: Number(req.body.monthlyPrice) || 0,
                yearlyPrice: Number(req.body.yearlyPrice) || 0,
                features: normalizeFeatureInput(req.body.features),
                status: req.body.status || 'active'
            },
            { new: true }
        );

        if (!plan) {
            return res.status(404).json({ error: 'Plan not found' });
        }

        return res.json({
            success: true,
            plan: {
                id: plan._id.toString(),
                name: plan.name,
                monthlyPrice: plan.monthlyPrice,
                yearlyPrice: plan.yearlyPrice,
                features: plan.features,
                status: plan.status
            }
        });
    });

    router.delete('/pricing/:id', async (req, res) => {
        const plan = await PricingPlan.findByIdAndDelete(req.params.id);
        if (!plan) {
            return res.status(404).json({ error: 'Plan not found' });
        }

        return res.json({ success: true });
    });

    router.get('/apis', async (req, res) => {
        const apis = await ApiCatalogItem.find().sort({ createdAt: 1 });
        return res.json(apis.map((api) => serializeCatalogItem(api)));
    });

    router.post('/apis', async (req, res) => {
        const newApi = await ApiCatalogItem.create({
            name: req.body.name,
            slug: req.body.slug,
            type: req.body.type,
            language: req.body.language,
            version: req.body.version,
            description: req.body.description,
            documentation: req.body.documentation,
            features: normalizeFeatureInput(req.body.features),
            icon: req.body.icon,
            badge: req.body.badge || '',
            allowOneTimePurchase: normalizeBooleanInput(req.body.allowOneTimePurchase, true),
            allowMonthlySubscription: normalizeBooleanInput(req.body.allowMonthlySubscription, true),
            allowYearlySubscription: normalizeBooleanInput(req.body.allowYearlySubscription, true),
            oneTimePrice: Number(req.body.oneTimePrice) || 0,
            monthlyPrice: Number(req.body.monthlyPrice) || 0,
            yearlyPrice: Number(req.body.yearlyPrice) || 0,
            downloads: Number(req.body.downloads) || 0,
            rating: Number(req.body.rating) || 0,
            reviews: Number(req.body.reviews) || 0,
            isPublished: normalizeBooleanInput(req.body.isPublished, true),
            status: req.body.status || 'stable'
        });

        return res.json({
            success: true,
            api: serializeCatalogItem(newApi)
        });
    });

    router.put('/apis/:id', async (req, res) => {
        const api = await ApiCatalogItem.findByIdAndUpdate(
            req.params.id,
            {
                name: req.body.name,
                slug: req.body.slug,
                type: req.body.type,
                language: req.body.language,
                version: req.body.version,
                description: req.body.description,
                documentation: req.body.documentation,
                features: normalizeFeatureInput(req.body.features),
                icon: req.body.icon,
                badge: req.body.badge || '',
                allowOneTimePurchase: normalizeBooleanInput(req.body.allowOneTimePurchase, true),
                allowMonthlySubscription: normalizeBooleanInput(req.body.allowMonthlySubscription, true),
                allowYearlySubscription: normalizeBooleanInput(req.body.allowYearlySubscription, true),
                oneTimePrice: Number(req.body.oneTimePrice) || 0,
                monthlyPrice: Number(req.body.monthlyPrice) || 0,
                yearlyPrice: Number(req.body.yearlyPrice) || 0,
                downloads: Number(req.body.downloads) || 0,
                rating: Number(req.body.rating) || 0,
                reviews: Number(req.body.reviews) || 0,
                isPublished: normalizeBooleanInput(req.body.isPublished, true),
                status: req.body.status || 'stable'
            },
            { new: true }
        );

        if (!api) {
            return res.status(404).json({ error: 'API/SDK not found' });
        }

        return res.json({
            success: true,
            api: serializeCatalogItem(api)
        });
    });

    router.delete('/apis/:id', async (req, res) => {
        const api = await ApiCatalogItem.findByIdAndDelete(req.params.id);
        if (!api) {
            return res.status(404).json({ error: 'API/SDK not found' });
        }

        return res.json({ success: true });
    });

    router.get('/content/:type', async (req, res) => {
        const content = await ContentPage.findOne({ key: req.params.type });
        if (!content) {
            return res.status(404).json({ error: 'Content not found' });
        }

        return res.json({
            key: content.key,
            title: content.title,
            body: content.body
        });
    });

    router.post('/content/:type', async (req, res) => {
        const content = await ContentPage.findOneAndUpdate(
            { key: req.params.type },
            {
                key: req.params.type,
                title: req.body.title,
                body: req.body.body
            },
            { upsert: true, new: true }
        );

        return res.json({
            success: true,
            content: {
                key: content.key,
                title: content.title,
                body: content.body
            }
        });
    });

    router.get('/branding', async (req, res) => {
        const branding = await BrandingSettings.findOne({ key: 'default' });
        return res.json(branding);
    });

    router.post('/branding', async (req, res) => {
        const branding = await BrandingSettings.findOneAndUpdate(
            { key: 'default' },
            { ...req.body, key: 'default' },
            { upsert: true, new: true }
        );

        return res.json({ success: true, branding });
    });

    router.get('/users', async (req, res) => {
        const { search = '', page = 1, limit = 10 } = req.query;
        const filters = {};

        if (search) {
            filters.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const pageNumber = Number.parseInt(page, 10) || 1;
        const pageSize = Number.parseInt(limit, 10) || 10;
        const total = await User.countDocuments(filters);
        const users = await User.find(filters)
            .sort({ createdAt: -1 })
            .skip((pageNumber - 1) * pageSize)
            .limit(pageSize);

        return res.json({
            users: users.map((user) => ({
                id: user._id.toString(),
                name: `${user.firstName} ${user.lastName}`.trim(),
                email: user.email,
                plan: user.plan,
                status: user.status,
                joined: user.createdAt
            })),
            total,
            page: pageNumber,
            totalPages: Math.ceil(total / pageSize)
        });
    });

    router.post('/users', async (req, res) => {
        const [firstName = '', ...lastNameParts] = String(req.body.name || '').trim().split(' ');
        const lastName = lastNameParts.join(' ') || 'User';

        const user = await User.create({
            firstName: firstName || 'New',
            lastName,
            email: String(req.body.email).trim().toLowerCase(),
            passwordHash: createPasswordHash('changeme123'),
            plan: req.body.plan || 'starter',
            status: req.body.status || 'active'
        });

        return res.json({
            success: true,
            user: {
                id: user._id.toString(),
                name: `${user.firstName} ${user.lastName}`.trim(),
                email: user.email,
                plan: user.plan,
                status: user.status,
                joined: user.createdAt
            }
        });
    });

    router.put('/users/:id', async (req, res) => {
        const [firstName = '', ...lastNameParts] = String(req.body.name || '').trim().split(' ');
        const updates = {
            email: req.body.email,
            plan: req.body.plan,
            status: req.body.status
        };

        if (req.body.name) {
            updates.firstName = firstName || 'Updated';
            updates.lastName = lastNameParts.join(' ') || 'User';
        }

        const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        return res.json({
            success: true,
            user: {
                id: user._id.toString(),
                name: `${user.firstName} ${user.lastName}`.trim(),
                email: user.email,
                plan: user.plan,
                status: user.status,
                joined: user.createdAt
            }
        });
    });

    router.delete('/users/:id', async (req, res) => {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        return res.json({ success: true });
    });

    return router;
}

module.exports = createAdminRoutes;
