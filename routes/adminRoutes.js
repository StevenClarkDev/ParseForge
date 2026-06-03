const express = require('express');
const crypto = require('crypto');
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

function addDays(date, dayCount) {
    const result = new Date(date);
    result.setDate(result.getDate() + dayCount);
    return result;
}

function createReference(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function createOrderReference() {
    return `PF-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function createStripeAdminSessionId() {
    return createReference('cs_admin_sim');
}

function createStripeAdminPaymentIntentId() {
    return createReference('pi_admin_sim');
}

function createStripeAdminChargeId() {
    return createReference('ch_admin_sim');
}

function normalizePaymentMethodType(value) {
    return value === 'stripe_card' ? 'stripe_card' : 'stripe_checkout';
}

function sanitizeText(value, maxLength = 120) {
    return String(value || '').trim().slice(0, maxLength);
}

function sanitizeEmail(value) {
    return sanitizeText(value, 160).toLowerCase();
}

function sanitizeLast4(value) {
    const digits = String(value || '').replace(/\D/g, '');
    return digits.slice(-4);
}

function sanitizeMonth(value) {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 2);

    if (!digits) {
        return '';
    }

    const month = Number.parseInt(digits, 10);
    return month >= 1 && month <= 12 ? String(month).padStart(2, '0') : '';
}

function sanitizeYear(value) {
    const digits = String(value || '').replace(/\D/g, '');

    if (digits.length >= 4) {
        return digits.slice(0, 4);
    }

    if (digits.length === 2) {
        return `20${digits}`;
    }

    return '';
}

function buildPaymentDetailsSnapshot(source = {}, paymentMethodType = 'stripe_checkout') {
    return {
        billingName: sanitizeText(source.billingName, 120),
        billingEmail: sanitizeEmail(source.billingEmail),
        companyName: sanitizeText(source.companyName, 120),
        country: sanitizeText(source.country, 64),
        region: sanitizeText(source.region, 64),
        postalCode: sanitizeText(source.postalCode, 24),
        cardholderName: sanitizeText(source.cardholderName, 120),
        cardBrand: sanitizeText(source.cardBrand, 32),
        cardLast4: paymentMethodType === 'stripe_card' ? sanitizeLast4(source.cardLast4) : '',
        expiryMonth: paymentMethodType === 'stripe_card' ? sanitizeMonth(source.expiryMonth) : '',
        expiryYear: paymentMethodType === 'stripe_card' ? sanitizeYear(source.expiryYear) : '',
        collectionMode: paymentMethodType === 'stripe_card' ? 'direct_card' : 'hosted_checkout'
    };
}

function buildAdminChargeContext(adminUser, sourcePurchaseId, notes) {
    return {
        triggeredFrom: 'admin_support',
        initiatedByAdminId: adminUser._id,
        initiatedByAdminEmail: adminUser.email,
        initiatedByAdminName: `${adminUser.firstName} ${adminUser.lastName}`.trim(),
        sourcePurchaseId,
        notes: sanitizeText(notes, 280)
    };
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
        serviceEligible: purchase.paymentProvider === 'stripe_simulated',
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
    if (body.type !== 'api' && body.type !== 'sdk') {
        throw createValidationError('Choose either API or SDK as the product type');
    }

    const allowedBadges = new Set(['', 'featured', 'bestseller', 'new']);
    const allowedStatuses = new Set(['stable', 'beta', 'deprecated']);
    const type = body.type;
    const billingModel = type === 'api' ? 'subscription' : 'one_time';
    const oneTimePrice = normalizePositiveNumber(body.oneTimePrice);
    const monthlyPrice = normalizePositiveNumber(body.monthlyPrice);
    const yearlyPrice = normalizePositiveNumber(body.yearlyPrice);
    const badge = allowedBadges.has(body.badge) ? body.badge : '';
    const status = allowedStatuses.has(body.status) ? body.status : 'stable';

    const payload = {
        name: body.name,
        slug: body.slug,
        type,
        language: body.language,
        version: body.version,
        description: body.description,
        documentation: body.documentation,
        features: normalizeFeatureInput(body.features),
        icon: body.icon,
        badge,
        billingModel,
        downloads: Number(body.downloads) || 0,
        rating: Number(body.rating) || 0,
        reviews: Number(body.reviews) || 0,
        isPublished: normalizeBooleanInput(body.isPublished, true),
        status
    };

    if (type === 'sdk') {
        if (!(oneTimePrice > 0)) {
            throw createValidationError('SDKs must have a one-time price greater than 0');
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

    if (!(monthlyPrice > 0)) {
        throw createValidationError('APIs must have a monthly subscription price greater than 0');
    }

    if (!(yearlyPrice > 0)) {
        throw createValidationError('APIs must have a yearly subscription price greater than 0');
    }

    return {
        ...payload,
        allowOneTimePurchase: false,
        allowMonthlySubscription: true,
        allowYearlySubscription: true,
        oneTimePrice: 0,
        monthlyPrice,
        yearlyPrice
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
        return res.json(apis.map((api) => serializeCatalogItem(api, { exposeDocumentation: true })));
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

    router.post('/users/:id/services', async (req, res) => {
        const password = String(req.body.password || '');
        const catalogItemId = String(req.body.catalogItemId || '').trim();
        const purchaseType = String(req.body.purchaseType || '').trim();
        const sourcePurchaseId = String(req.body.sourcePurchaseId || '').trim();
        const notes = String(req.body.notes || '');

        if (!password) {
            return res.status(400).json({ error: 'Admin password is required' });
        }

        if (!verifyPassword(password, req.user.passwordHash)) {
            return res.status(403).json({ error: 'Password confirmation failed' });
        }

        if (!catalogItemId) {
            return res.status(400).json({ error: 'A catalog product is required' });
        }

        if (!purchaseType) {
            return res.status(400).json({ error: 'A billing option is required' });
        }

        if (!sourcePurchaseId) {
            return res.status(400).json({ error: 'A saved payment source is required' });
        }

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const product = await ApiCatalogItem.findById(catalogItemId);

        if (!product) {
            return res.status(404).json({ error: 'Catalog product not found' });
        }

        const serializedProduct = serializeCatalogItem(product);
        const purchaseOption = serializedProduct.pricing.purchaseOptions.find(
            (option) => option.type === purchaseType
        );

        if (!purchaseOption) {
            return res.status(400).json({
                error: `The selected billing option is not available for ${product.name}`
            });
        }

        const sourcePurchase = await CatalogPurchase.findOne({
            _id: sourcePurchaseId,
            userId: user._id
        });

        if (!sourcePurchase) {
            return res.status(404).json({ error: 'Saved payment source not found' });
        }

        if (sourcePurchase.paymentProvider !== 'stripe_simulated') {
            return res.status(400).json({
                error: 'Only simulated Stripe payment sources can be reused right now'
            });
        }

        const paymentMethodType = normalizePaymentMethodType(sourcePurchase.paymentMethodType);
        const paymentDetails = buildPaymentDetailsSnapshot(
            sourcePurchase.paymentDetails || {},
            paymentMethodType,
        );

        if (!paymentDetails.billingEmail) {
            paymentDetails.billingEmail = sanitizeEmail(user.email);
        }

        if (!paymentDetails.billingName) {
            paymentDetails.billingName = sanitizeText(
                `${user.firstName} ${user.lastName}`.trim(),
                120,
            );
        }

        const providerSessionId = createStripeAdminSessionId();
        const providerPaymentIntentId = createStripeAdminPaymentIntentId();
        const providerChargeId = createStripeAdminChargeId();
        const renewalDate =
            purchaseType === 'monthly'
                ? addDays(new Date(), 30)
                : purchaseType === 'yearly'
                  ? addDays(new Date(), 365)
                  : null;

        const existingOneTime = await CatalogPurchase.findOne({
            userId: user._id,
            catalogItemId: product._id,
            purchaseType: 'one_time',
            status: 'active'
        });

        if (purchaseType === 'one_time' && existingOneTime) {
            return res.status(409).json({
                error: 'This customer already has active access to the selected one-time product'
            });
        }

        const adminChargeContext = buildAdminChargeContext(req.user, sourcePurchase._id, notes);
        let purchase = null;
        let action = 'created';

        if (purchaseType === 'monthly' || purchaseType === 'yearly') {
            const activeSubscription = await CatalogPurchase.findOne({
                userId: user._id,
                catalogItemId: product._id,
                purchaseType: { $in: ['monthly', 'yearly'] },
                status: 'active'
            });

            if (activeSubscription) {
                activeSubscription.purchaseType = purchaseType;
                activeSubscription.unitPrice = purchaseOption.price;
                activeSubscription.currency = 'USD';
                activeSubscription.paymentProvider = 'stripe_simulated';
                activeSubscription.paymentMethodType = paymentMethodType;
                activeSubscription.providerSessionId = providerSessionId;
                activeSubscription.providerPaymentIntentId = providerPaymentIntentId;
                activeSubscription.providerChargeId = providerChargeId;
                activeSubscription.orderReference = createOrderReference();
                activeSubscription.paymentDetails = paymentDetails;
                activeSubscription.renewsAt = renewalDate;
                activeSubscription.adminChargeContext = adminChargeContext;
                await activeSubscription.save();
                purchase = activeSubscription;
                action = 'updated';
            }
        }

        if (!purchase) {
            purchase = await CatalogPurchase.create({
                userId: user._id,
                catalogItemId: product._id,
                purchaseType,
                unitPrice: purchaseOption.price,
                currency: 'USD',
                paymentProvider: 'stripe_simulated',
                paymentMethodType,
                providerSessionId,
                providerPaymentIntentId,
                providerChargeId,
                orderReference: createOrderReference(),
                paymentDetails,
                adminChargeContext,
                renewsAt: renewalDate
            });
        }

        return res.status(201).json({
            success: true,
            action,
            customer: {
                id: user._id.toString(),
                name: `${user.firstName} ${user.lastName}`.trim(),
                email: user.email
            },
            product: {
                id: product._id.toString(),
                name: product.name,
                purchaseType,
                unitPrice: purchase.unitPrice,
                renewsAt: purchase.renewsAt,
                orderReference: purchase.orderReference
            },
            payment: {
                provider: 'stripe_simulated',
                mode: 'admin_off_session',
                sourcePurchaseId: sourcePurchase._id.toString(),
                sourceOrderReference: sourcePurchase.orderReference,
                paymentMethodType,
                sessionId: providerSessionId,
                paymentIntentId: providerPaymentIntentId,
                chargeId: providerChargeId,
                status: 'succeeded'
            }
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
        const temporaryPassword = String(req.body.password || '').trim() || crypto.randomBytes(12).toString('base64url');

        const user = await User.create({
            firstName: firstName || 'New',
            lastName,
            email: String(req.body.email).trim().toLowerCase(),
            passwordHash: createPasswordHash(temporaryPassword),
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
            },
            temporaryPassword
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
