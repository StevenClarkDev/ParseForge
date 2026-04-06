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

function normalizeBillingModel(value) {
    return value === 'subscription' ? 'subscription' : 'one_time';
}

function normalizePositiveNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function createValidationError(message) {
    const error = new Error(message);
    error.statusCode = 400;
    return error;
}

function maskEmail(value) {
    const email = String(value || '').trim();
    const atIndex = email.indexOf('@');

    if (atIndex <= 1) {
        return email ? 'Hidden until verified' : 'Not provided';
    }

    return `${email.slice(0, 1)}***${email.slice(atIndex)}`;
}

function formatMaskedCardNumber(last4) {
    const digits = String(last4 || '').replace(/\D/g, '').slice(-4);
    return digits ? `**** **** **** ${digits}` : 'Not captured';
}

function formatExpiry(month, year) {
    if (!month || !year) {
        return 'Not captured';
    }

    const normalizedYear = String(year).slice(-2);
    return `${String(month).padStart(2, '0')}/${normalizedYear}`;
}

function buildPaymentMethodLabel(paymentMethodType) {
    return paymentMethodType === 'stripe_card'
        ? 'Simulated Stripe Card Entry'
        : 'Simulated Stripe Checkout';
}

function buildPaymentDetailsSummary(purchase, product, revealSensitive = false) {
    const details = purchase.paymentDetails || {};
    const hasProtectedDetails = Boolean(
        details.billingName ||
        details.billingEmail ||
        details.companyName ||
        details.country ||
        details.region ||
        details.postalCode ||
        details.cardholderName ||
        details.cardBrand ||
        details.cardLast4 ||
        details.expiryMonth ||
        details.expiryYear,
    );

    return {
        id: purchase._id.toString(),
        orderReference: purchase.orderReference,
        productName: product?.name || 'Archived product',
        purchaseType: purchase.purchaseType,
        status: purchase.status,
        amount: purchase.unitPrice,
        currency: purchase.currency,
        paymentProvider: purchase.paymentProvider,
        paymentMethodType: purchase.paymentMethodType,
        paymentMethodLabel: buildPaymentMethodLabel(purchase.paymentMethodType),
        purchasedAt: purchase.createdAt,
        renewsAt: purchase.renewsAt,
        canReveal: hasProtectedDetails,
        revealed: revealSensitive,
        protectedDetails: {
            billingName: revealSensitive
                ? details.billingName || 'Not provided'
                : details.billingName
                  ? 'Hidden until verified'
                  : 'Not provided',
            billingEmail: revealSensitive
                ? details.billingEmail || 'Not provided'
                : details.billingEmail
                  ? maskEmail(details.billingEmail)
                  : 'Not provided',
            companyName: revealSensitive
                ? details.companyName || 'Not provided'
                : details.companyName
                  ? 'Hidden until verified'
                  : 'Not provided',
            country: revealSensitive
                ? details.country || 'Not provided'
                : details.country
                  ? 'Hidden until verified'
                  : 'Not provided',
            region: revealSensitive
                ? details.region || 'Not provided'
                : details.region
                  ? 'Hidden until verified'
                  : 'Not provided',
            postalCode: revealSensitive
                ? details.postalCode || 'Not provided'
                : details.postalCode
                  ? 'Hidden until verified'
                  : 'Not provided',
            cardholderName: revealSensitive
                ? details.cardholderName || 'Not captured'
                : details.cardholderName
                  ? 'Hidden until verified'
                  : 'Not captured',
            cardBrand: revealSensitive
                ? details.cardBrand || 'Not captured'
                : details.cardBrand
                  ? 'Hidden until verified'
                  : 'Not captured',
            cardNumber: formatMaskedCardNumber(details.cardLast4),
            expiry: revealSensitive
                ? formatExpiry(details.expiryMonth, details.expiryYear)
                : details.expiryMonth && details.expiryYear
                  ? 'Hidden until verified'
                  : 'Not captured'
        },
        complianceNote: 'Full card numbers and CVV are never stored or shown by ParseForge.'
    };
}

function buildCatalogItemPayload(body) {
    const billingModel = normalizeBillingModel(body.billingModel);
    const oneTimePrice = normalizePositiveNumber(body.oneTimePrice);
    const monthlyPrice = normalizePositiveNumber(body.monthlyPrice);
    const yearlyPrice = normalizePositiveNumber(body.yearlyPrice);

    const payload = {
        name: body.name,
        slug: body.slug,
        type: body.type,
        language: body.language,
        version: body.version,
        description: body.description,
        documentation: body.documentation,
        features: normalizeFeatureInput(body.features),
        icon: body.icon,
        badge: body.badge || '',
        billingModel,
        downloads: Number(body.downloads) || 0,
        rating: Number(body.rating) || 0,
        reviews: Number(body.reviews) || 0,
        isPublished: normalizeBooleanInput(body.isPublished, true),
        status: body.status || 'stable'
    };

    if (billingModel === 'one_time') {
        if (!(oneTimePrice > 0)) {
            throw createValidationError('One-time products must have a price greater than 0');
        }

        return {
            ...payload,
            allowOneTimePurchase: true,
            allowMonthlySubscription: false,
            allowYearlySubscription: false,
            oneTimePrice,
            monthlyPrice: 0,
            yearlyPrice: 0
        };
    }

    const allowMonthlySubscription = normalizeBooleanInput(body.allowMonthlySubscription, false);
    const allowYearlySubscription = normalizeBooleanInput(body.allowYearlySubscription, false);

    if (!allowMonthlySubscription && !allowYearlySubscription) {
        throw createValidationError(
            'Subscription products must include a monthly plan, yearly plan, or both'
        );
    }

    if (allowMonthlySubscription && !(monthlyPrice > 0)) {
        throw createValidationError('Monthly subscriptions must have a price greater than 0');
    }

    if (allowYearlySubscription && !(yearlyPrice > 0)) {
        throw createValidationError('Yearly subscriptions must have a price greater than 0');
    }

    return {
        ...payload,
        allowOneTimePurchase: false,
        allowMonthlySubscription,
        allowYearlySubscription,
        oneTimePrice: 0,
        monthlyPrice: allowMonthlySubscription ? monthlyPrice : 0,
        yearlyPrice: allowYearlySubscription ? yearlyPrice : 0
    };
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
    createPasswordHash,
    verifyPassword,
    createToken,
    jwtSecret
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
        try {
            const newApi = await ApiCatalogItem.create(buildCatalogItemPayload(req.body));

            return res.json({
                success: true,
                api: serializeCatalogItem(newApi)
            });
        } catch (error) {
            const statusCode = error.name === 'ValidationError' ? 400 : error.statusCode || 500;
            return res.status(statusCode).json({
                error: error.message || 'Unable to create API/SDK'
            });
        }
    });

    router.put('/apis/:id', async (req, res) => {
        try {
            const api = await ApiCatalogItem.findByIdAndUpdate(
                req.params.id,
                buildCatalogItemPayload(req.body),
                { new: true, runValidators: true }
            );

            if (!api) {
                return res.status(404).json({ error: 'API/SDK not found' });
            }

            return res.json({
                success: true,
                api: serializeCatalogItem(api)
            });
        } catch (error) {
            const statusCode = error.name === 'ValidationError' ? 400 : error.statusCode || 500;
            return res.status(statusCode).json({
                error: error.message || 'Unable to update API/SDK'
            });
        }
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

    router.get('/users/:id/payment-methods', async (req, res) => {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const purchases = await CatalogPurchase.find({ userId: user._id }).sort({ createdAt: -1 });
        const products = await ApiCatalogItem.find({
            _id: { $in: purchases.map((purchase) => purchase.catalogItemId) }
        });
        const productMap = new Map(products.map((product) => [product._id.toString(), product]));

        return res.json({
            user: {
                id: user._id.toString(),
                name: `${user.firstName} ${user.lastName}`.trim(),
                email: user.email,
                plan: user.plan,
                status: user.status,
                joined: user.createdAt
            },
            paymentMethods: purchases.map((purchase) =>
                buildPaymentDetailsSummary(
                    purchase,
                    productMap.get(purchase.catalogItemId.toString()),
                    false,
                ),
            )
        });
    });

    router.post('/users/:id/support-session', async (req, res) => {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const token = createToken(user, jwtSecret, {
            expiresIn: '30m',
            supportSession: {
                adminUserId: req.user._id.toString(),
                adminEmail: req.user.email,
                adminName: `${req.user.firstName} ${req.user.lastName}`.trim(),
                permissions: ['read_only']
            }
        });

        return res.json({
            success: true,
            token,
            supportSession: {
                active: true,
                adminUserId: req.user._id.toString(),
                adminName: `${req.user.firstName} ${req.user.lastName}`.trim(),
                customerUserId: user._id.toString(),
                customerName: `${user.firstName} ${user.lastName}`.trim(),
                customerEmail: user.email,
                permissions: ['read_only'],
                dashboardUrl: '/dashboard.html',
                expiresInMinutes: 30
            }
        });
    });

    router.post('/users/:id/payment-methods/:purchaseId/reveal', async (req, res) => {
        const password = String(req.body.password || '');

        if (!password) {
            return res.status(400).json({ error: 'Admin password is required' });
        }

        if (!verifyPassword(password, req.user.passwordHash)) {
            return res.status(403).json({ error: 'Password confirmation failed' });
        }

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const purchase = await CatalogPurchase.findOne({
            _id: req.params.purchaseId,
            userId: user._id
        });

        if (!purchase) {
            return res.status(404).json({ error: 'Payment record not found' });
        }

        const product = await ApiCatalogItem.findById(purchase.catalogItemId);

        return res.json({
            success: true,
            paymentMethod: buildPaymentDetailsSummary(purchase, product, true)
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
