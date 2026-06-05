const express = require('express');
const Stripe = require('stripe');
const { serializeCatalogItem } = require('../utils/serializers');

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
const stripePublishableKey =
    process.env.STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHING_KEY || '';
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
const stripeClient = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

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

function createStripeSessionId() {
    return createReference('cs_test_sim');
}

function createStripePaymentIntentId() {
    return createReference('pi_test_sim');
}

function createStripeChargeId() {
    return createReference('ch_test_sim');
}

function createStripeClientSecret(paymentIntentId) {
    return `${paymentIntentId}_secret_${Math.random().toString(36).slice(2, 12)}`;
}

function getRequestBaseUrl(req) {
    const configuredUrl = process.env.APP_URL || process.env.PUBLIC_SITE_URL || process.env.SITE_URL;
    if (configuredUrl) {
        return configuredUrl.replace(/\/+$/, '');
    }

    return `${req.protocol}://${req.get('host')}`;
}

function encodeCheckoutItems(checkoutItems) {
    return checkoutItems
        .map((item) => `${item.product._id.toString()}:${item.purchaseType}`)
        .join('|');
}

function decodeCheckoutItems(value) {
    return String(value || '')
        .split('|')
        .map((entry) => {
            const [productId, purchaseType] = entry.split(':');
            return { productId, purchaseType };
        })
        .filter((item) => item.productId && item.purchaseType);
}

function buildStripeLineItems(checkoutItems) {
    return checkoutItems.map((item) => ({
        quantity: 1,
        price_data: {
            currency: 'usd',
            unit_amount: Math.round(Number(item.purchaseOption.price || 0) * 100),
            ...(item.purchaseType === 'monthly' || item.purchaseType === 'yearly'
                ? {
                    recurring: {
                        interval: item.purchaseType === 'monthly' ? 'month' : 'year'
                    }
                }
                : {}),
            product_data: {
                name: item.product.name,
                description: item.purchaseOption.label,
                metadata: {
                    productId: item.product._id.toString(),
                    purchaseType: item.purchaseType
                }
            }
        }
    }));
}

function getStripeCheckoutMode(checkoutItems) {
    const hasRecurring = checkoutItems.some(
        (item) => item.purchaseType === 'monthly' || item.purchaseType === 'yearly'
    );
    const hasOneTime = checkoutItems.some((item) => item.purchaseType === 'one_time');

    if (hasRecurring && hasOneTime) {
        const error = new Error('Purchase recurring API access and one-time SDK licenses separately');
        error.statusCode = 400;
        throw error;
    }

    return hasRecurring ? 'subscription' : 'payment';
}

function getSessionPaymentIntent(session) {
    if (session.payment_intent && typeof session.payment_intent !== 'string') {
        return session.payment_intent;
    }

    const latestInvoice = session.subscription?.latest_invoice;
    if (latestInvoice?.payment_intent && typeof latestInvoice.payment_intent !== 'string') {
        return latestInvoice.payment_intent;
    }

    return null;
}

function getSessionSubscriptionId(session) {
    if (typeof session.subscription === 'string') {
        return session.subscription;
    }

    return session.subscription?.id || '';
}

function getInvoicePaymentIntent(invoice) {
    if (invoice.payment_intent && typeof invoice.payment_intent !== 'string') {
        return invoice.payment_intent;
    }

    return null;
}

function getInvoicePeriodEnd(invoice) {
    const line = invoice.lines?.data?.find((item) => item.period?.end);
    return line?.period?.end ? new Date(line.period.end * 1000) : null;
}

async function ensureStripeCustomerForCheckout({ user, account }) {
    if (!stripeClient) {
        return '';
    }

    if (user?.stripeCustomerId) {
        return user.stripeCustomerId;
    }

    const customer = await stripeClient.customers.create({
        email: account.email,
        name: account.fullName,
        metadata: user
            ? { userId: user._id.toString() }
            : { pendingEmail: account.email }
    });

    if (user) {
        user.stripeCustomerId = customer.id;
        await user.save();
    }

    return customer.id;
}

async function saveDefaultPaymentMethodFromStripe({ user, stripeCustomerId, paymentMethodId }) {
    if (!user || !stripeClient || !stripeCustomerId || !paymentMethodId) {
        return;
    }

    const paymentMethod = await stripeClient.paymentMethods.retrieve(paymentMethodId);
    user.stripeCustomerId = stripeCustomerId;
    user.defaultStripePaymentMethodId = paymentMethod.id;
    user.savedPaymentMethod = {
        brand: paymentMethod.card?.brand || '',
        last4: paymentMethod.card?.last4 || '',
        expMonth: paymentMethod.card?.exp_month ? String(paymentMethod.card.exp_month).padStart(2, '0') : '',
        expYear: paymentMethod.card?.exp_year ? String(paymentMethod.card.exp_year) : '',
        updatedAt: new Date()
    };
    user.paymentMethodConsentAt = user.paymentMethodConsentAt || new Date();
    await user.save();
}

function getSavedPaymentMethodSummary(user) {
    if (!user?.defaultStripePaymentMethodId) {
        return null;
    }

    return {
        brand: user.savedPaymentMethod?.brand || '',
        last4: user.savedPaymentMethod?.last4 || '',
        expMonth: user.savedPaymentMethod?.expMonth || '',
        expYear: user.savedPaymentMethod?.expYear || ''
    };
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

function splitFullName(fullName) {
    const parts = sanitizeText(fullName, 120).split(/\s+/).filter(Boolean);
    return {
        firstName: parts[0] || 'ParseForge',
        lastName: parts.slice(1).join(' ') || 'Buyer'
    };
}

function normalizeCheckoutAccount(source = {}) {
    const fullName = sanitizeText(source.fullName, 120);
    const email = sanitizeEmail(source.email);
    const password = String(source.password || '');
    const { firstName, lastName } = splitFullName(fullName);

    if (!fullName) {
        const error = new Error('Full name is required for checkout');
        error.statusCode = 400;
        throw error;
    }

    if (!email) {
        const error = new Error('Email address is required for checkout');
        error.statusCode = 400;
        throw error;
    }

    if (password.length < 8) {
        const error = new Error('Password must be at least 8 characters long');
        error.statusCode = 400;
        throw error;
    }

    if (source.savePaymentConsent !== true) {
        const error = new Error('Authorize saved payment method use to continue');
        error.statusCode = 400;
        throw error;
    }

    return {
        fullName,
        firstName,
        lastName,
        email,
        password,
        company: sanitizeText(source.company, 120)
    };
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

function ensureWritablePurchaseSession(req, res) {
    if (req.supportSession?.active) {
        res.status(403).json({
            error: 'Support sessions are read-only. Exit support mode before completing checkout.'
        });
        return false;
    }

    return true;
}

async function buildCheckoutSelection(items, ApiCatalogItem) {
    const productIds = [...new Set(items.map((item) => String(item.productId || '')).filter(Boolean))];
    const products = await ApiCatalogItem.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map((product) => [product._id.toString(), product]));

    return items.map((requestedItem) => {
        const product = productMap.get(String(requestedItem.productId || ''));
        const purchaseType = String(requestedItem.purchaseType || '');

        if (!product) {
            const error = new Error('One of the selected products was not found');
            error.statusCode = 404;
            throw error;
        }

        const serializedProduct = serializeCatalogItem(product);
        const purchaseOption = serializedProduct.pricing.purchaseOptions.find(
            (option) => option.type === purchaseType
        );

        if (!purchaseOption) {
            const error = new Error(
                `The selected billing option is not available for ${product.name}`,
            );
            error.statusCode = 400;
            throw error;
        }

        return {
            product,
            serializedProduct,
            purchaseType,
            purchaseOption
        };
    });
}

function summarizeCheckoutItems(checkoutItems) {
    return checkoutItems.reduce(
        (summary, item) => {
            summary.total += item.purchaseOption.price;
            if (item.purchaseType === 'monthly' || item.purchaseType === 'yearly') {
                summary.subscriptions += 1;
            } else {
                summary.oneTimePurchases += 1;
            }
            return summary;
        },
        { total: 0, subscriptions: 0, oneTimePurchases: 0 },
    );
}

async function processCheckoutPurchases({
    userId,
    checkoutItems,
    CatalogPurchase,
    paymentProvider,
    paymentMethodType,
    providerSessionId,
    providerPaymentIntentId,
    providerChargeId,
    providerSubscriptionId = '',
    paymentDetails
}) {
    const existingSessionPurchases = await CatalogPurchase.find({
        userId,
        providerSessionId
    });

    if (providerSessionId && existingSessionPurchases.length) {
        return existingSessionPurchases;
    }

    const processedPurchases = [];

    for (const item of checkoutItems) {
        const { product, purchaseType, purchaseOption } = item;

        const existingOneTime = await CatalogPurchase.findOne({
            userId,
            catalogItemId: product._id,
            purchaseType: 'one_time',
            status: 'active'
        });

        if (purchaseType === 'one_time' && existingOneTime) {
            processedPurchases.push(existingOneTime);
            continue;
        }

        const activeSubscription = await CatalogPurchase.findOne({
            userId,
            catalogItemId: product._id,
            purchaseType: { $in: ['monthly', 'yearly'] },
            status: 'active'
        });

        const renewalDate =
            purchaseType === 'monthly'
                ? addDays(new Date(), 30)
                : purchaseType === 'yearly'
                  ? addDays(new Date(), 365)
                  : null;

        if ((purchaseType === 'monthly' || purchaseType === 'yearly') && activeSubscription) {
            activeSubscription.purchaseType = purchaseType;
            activeSubscription.unitPrice = purchaseOption.price;
            activeSubscription.renewsAt = renewalDate;
            activeSubscription.orderReference = createOrderReference();
            activeSubscription.paymentProvider = paymentProvider;
            activeSubscription.paymentMethodType = paymentMethodType;
            activeSubscription.providerSessionId = providerSessionId;
            activeSubscription.providerPaymentIntentId = providerPaymentIntentId;
            activeSubscription.providerChargeId = providerChargeId;
            activeSubscription.providerSubscriptionId = providerSubscriptionId;
            activeSubscription.paymentDetails = paymentDetails;
            await activeSubscription.save();
            processedPurchases.push(activeSubscription);
            continue;
        }

        const purchase = await CatalogPurchase.create({
            userId,
            catalogItemId: product._id,
            purchaseType,
            unitPrice: purchaseOption.price,
            currency: 'USD',
            paymentProvider,
            paymentMethodType,
            providerSessionId,
            providerPaymentIntentId,
            providerChargeId,
            providerSubscriptionId,
            paymentDetails,
            renewsAt: renewalDate,
            orderReference: createOrderReference()
        });

        processedPurchases.push(purchase);
    }

    return processedPurchases;
}

async function fulfillStripeCheckoutSession({
    session,
    ApiCatalogItem,
    CatalogPurchase,
    PendingCheckout,
    User,
    createPasswordHash,
    createToken,
    jwtSecret,
    touchLogin = false
}) {
    if (session.payment_status !== 'paid') {
        const error = new Error('Stripe checkout has not been paid yet');
        error.statusCode = 402;
        throw error;
    }

    const pendingCheckout = await PendingCheckout.findOne({ stripeSessionId: session.id });
    if (!pendingCheckout) {
        const error = new Error('Pending checkout was not found');
        error.statusCode = 404;
        throw error;
    }

    const items = pendingCheckout.items?.length
        ? pendingCheckout.items.map((item) => ({
            productId: item.productId.toString(),
            purchaseType: item.purchaseType
        }))
        : decodeCheckoutItems(session.metadata?.items);
    if (!items.length) {
        const error = new Error('Stripe checkout session is missing purchase metadata');
        error.statusCode = 400;
        throw error;
    }

    const checkoutItems = await buildCheckoutSelection(items, ApiCatalogItem);
    let buyer = pendingCheckout.userId ? await User.findById(pendingCheckout.userId) : null;
    if (!buyer) {
        buyer = await User.findOne({ email: pendingCheckout.email });
    }

    if (!buyer) {
        buyer = await User.create({
            firstName: pendingCheckout.firstName,
            lastName: pendingCheckout.lastName,
            email: pendingCheckout.email,
            passwordHash: pendingCheckout.passwordHash || createPasswordHash(createReference('buyer_password')),
            company: pendingCheckout.company,
            role: 'developer',
            lastLoginAt: touchLogin ? new Date() : null
        });
    } else if (touchLogin) {
        buyer.lastLoginAt = new Date();
        await buyer.save();
    }

    const paymentIntent = getSessionPaymentIntent(session);
    const paymentMethodId =
        typeof paymentIntent?.payment_method === 'string' ? paymentIntent.payment_method : '';
    const stripeCustomerId =
        typeof session.customer === 'string'
            ? session.customer
            : session.customer?.id || pendingCheckout.stripeCustomerId;
    const chargeId =
        typeof paymentIntent?.latest_charge === 'string' ? paymentIntent.latest_charge : '';
    const paymentDetails = buildPaymentDetailsSnapshot(
        {
            ...pendingCheckout.paymentDetails,
            billingName: session.customer_details?.name || pendingCheckout.paymentDetails?.billingName,
            billingEmail: session.customer_details?.email || pendingCheckout.email,
            country: session.customer_details?.address?.country || pendingCheckout.paymentDetails?.country,
            region: session.customer_details?.address?.state || pendingCheckout.paymentDetails?.region,
            postalCode:
                session.customer_details?.address?.postal_code ||
                pendingCheckout.paymentDetails?.postalCode
        },
        'stripe_checkout',
    );

    const processedPurchases = await processCheckoutPurchases({
        userId: buyer._id,
        checkoutItems,
        CatalogPurchase,
        paymentProvider: 'stripe',
        paymentMethodType: 'stripe_checkout',
        providerSessionId: session.id,
        providerPaymentIntentId: paymentIntent?.id || '',
        providerChargeId: chargeId,
        providerSubscriptionId: getSessionSubscriptionId(session),
        paymentDetails
    });
    const checkoutSummary = summarizeProcessedPurchases(processedPurchases);
    await saveDefaultPaymentMethodFromStripe({
        user: buyer,
        stripeCustomerId,
        paymentMethodId
    });
    pendingCheckout.userId = buyer._id;
    pendingCheckout.status = 'completed';
    await pendingCheckout.save();

    return {
        success: true,
        summary: checkoutSummary,
        payment: {
            provider: 'stripe',
            paymentMethodType: 'stripe_checkout',
            sessionId: session.id,
            paymentIntentId: paymentIntent?.id || '',
            chargeId,
            subscriptionId: getSessionSubscriptionId(session),
            status: session.payment_status
        },
        purchases: processedPurchases.map((purchase) => ({
            id: purchase._id.toString(),
            orderReference: purchase.orderReference,
            purchaseType: purchase.purchaseType,
            unitPrice: purchase.unitPrice,
            renewsAt: purchase.renewsAt
        })),
        token: touchLogin ? createToken(buyer, jwtSecret) : null,
        user: {
            id: buyer._id.toString(),
            firstName: buyer.firstName,
            lastName: buyer.lastName,
            email: buyer.email,
            role: buyer.role
        }
    };
}

async function updateSubscriptionFromStripeEvent({ subscription, CatalogPurchase, status = 'active' }) {
    const subscriptionId = typeof subscription === 'string' ? subscription : subscription.id;
    if (!subscriptionId) {
        return 0;
    }

    const update = {
        status,
        canceledAt: status === 'canceled' ? new Date() : null
    };

    if (subscription.current_period_end) {
        update.renewsAt = new Date(subscription.current_period_end * 1000);
    }

    const result = await CatalogPurchase.updateMany(
        { providerSubscriptionId: subscriptionId },
        { $set: update }
    );

    return result.modifiedCount || 0;
}

async function handleInvoicePaid({ invoice, CatalogPurchase }) {
    const subscriptionId =
        typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
    if (!subscriptionId) {
        return 0;
    }

    const paymentIntent = getInvoicePaymentIntent(invoice);
    const chargeId =
        typeof paymentIntent?.latest_charge === 'string' ? paymentIntent.latest_charge : '';
    const update = {
        status: 'active',
        canceledAt: null,
        providerPaymentIntentId: paymentIntent?.id || '',
        providerChargeId: chargeId
    };
    const periodEnd = getInvoicePeriodEnd(invoice);
    if (periodEnd) {
        update.renewsAt = periodEnd;
    }

    const result = await CatalogPurchase.updateMany(
        { providerSubscriptionId: subscriptionId },
        { $set: update }
    );

    return result.modifiedCount || 0;
}

function summarizeProcessedPurchases(processedPurchases) {
    return processedPurchases.reduce(
        (summary, purchase) => {
            summary.total += purchase.unitPrice;
            if (purchase.purchaseType === 'monthly' || purchase.purchaseType === 'yearly') {
                summary.subscriptions += 1;
            } else {
                summary.oneTimePurchases += 1;
            }
            return summary;
        },
        { total: 0, subscriptions: 0, oneTimePurchases: 0 },
    );
}

function createCatalogRoutes({
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
}) {
    const router = express.Router();

    router.get('/docs', authMiddleware, async (req, res) => {
        const purchases = await CatalogPurchase.find({
            userId: req.user._id,
            status: 'active'
        }).sort({ createdAt: -1 });

        const products = await ApiCatalogItem.find({
            _id: { $in: purchases.map((purchase) => purchase.catalogItemId) },
            isPublished: { $ne: false }
        }).sort({ type: 1, name: 1 });

        const purchaseMap = purchases.reduce((map, purchase) => {
            const key = purchase.catalogItemId.toString();
            const current = map.get(key) || [];
            current.push(purchase);
            map.set(key, current);
            return map;
        }, new Map());

        return res.json({
            documents: products.map((product) => {
                const ownership = purchaseMap.get(product._id.toString()) || [];
                return {
                    ...serializeCatalogItem(product, {
                        ownership,
                        exposeDocumentation: true
                    }),
                    access: {
                        purchaseTypes: ownership.map((purchase) => purchase.purchaseType),
                        renewsAt: ownership.find((purchase) => purchase.renewsAt)?.renewsAt || null
                    }
                };
            })
        });
    });

    router.get('/', optionalAuth, async (req, res) => {
        const filters = { isPublished: { $ne: false } };
        const { type = '', search = '' } = req.query;

        if (type === 'api' || type === 'sdk') {
            filters.type = type;
        }

        if (search) {
            filters.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { language: { $regex: search, $options: 'i' } }
            ];
        }

        const items = await ApiCatalogItem.find(filters).sort({ createdAt: -1 });
        let ownershipMap = new Map();

        if (req.user && items.length) {
            const purchases = await CatalogPurchase.find({
                userId: req.user._id,
                catalogItemId: { $in: items.map((item) => item._id) },
                status: 'active'
            });

            ownershipMap = purchases.reduce((map, purchase) => {
                const key = purchase.catalogItemId.toString();
                const current = map.get(key) || [];
                current.push(purchase);
                map.set(key, current);
                return map;
            }, new Map());
        }

        logActivity('GET', '/api/catalog', 200);

        return res.json({
            items: items.map((item) =>
                serializeCatalogItem(item, {
                    ownership: ownershipMap.get(item._id.toString()) || []
                }),
            ),
            total: items.length,
            sessionExpired: Boolean(req.optionalAuthError)
        });
    });

    router.get('/purchases', authMiddleware, async (req, res) => {
        const purchases = await CatalogPurchase.find({
            userId: req.user._id,
            status: 'active'
        }).sort({ createdAt: -1 });

        const products = await ApiCatalogItem.find({
            _id: { $in: purchases.map((purchase) => purchase.catalogItemId) }
        });
        const productMap = new Map(products.map((product) => [product._id.toString(), product]));

        return res.json({
            purchases: purchases
                .map((purchase) => {
                    const product = productMap.get(purchase.catalogItemId.toString());
                    if (!product) {
                        return null;
                    }

                    const serializedProduct = serializeCatalogItem(product, { ownership: [purchase] });
                    const purchaseOption = serializedProduct.pricing.purchaseOptions.find(
                        (option) => option.type === purchase.purchaseType
                    );

                    return {
                        id: purchase._id.toString(),
                        orderReference: purchase.orderReference,
                        purchaseType: purchase.purchaseType,
                        status: purchase.status,
                        unitPrice: purchase.unitPrice,
                        currency: purchase.currency,
                        paymentProvider: purchase.paymentProvider,
                        paymentMethodType: purchase.paymentMethodType,
                        providerSessionId: purchase.providerSessionId,
                        providerPaymentIntentId: purchase.providerPaymentIntentId,
                        createdAt: purchase.createdAt,
                        renewsAt: purchase.renewsAt,
                        product: serializedProduct,
                        purchaseLabel: purchaseOption?.label || purchase.purchaseType
                    };
                })
                .filter(Boolean)
        });
    });

    router.post('/checkout/session', async (req, res) => {
        try {
            if (!ensureWritablePurchaseSession(req, res)) {
                return;
            }

            const items = Array.isArray(req.body.items) ? req.body.items : [];
            const paymentMethodType = normalizePaymentMethodType(req.body.paymentMethodType);
            const account = normalizeCheckoutAccount(req.body.account);
            const paymentDetails = buildPaymentDetailsSnapshot(req.body.paymentDetails, paymentMethodType);

            if (!items.length) {
                return res.status(400).json({ error: 'At least one catalog item is required' });
            }

            const checkoutItems = await buildCheckoutSelection(items, ApiCatalogItem);
            const summary = summarizeCheckoutItems(checkoutItems);
            const existingUser = await User.findOne({ email: account.email });
            const stripeMode = getStripeCheckoutMode(checkoutItems);

            if (existingUser && !verifyPassword(account.password, existingUser.passwordHash)) {
                return res.status(409).json({
                    error: 'An account already exists for this email. Enter its password to attach this purchase.'
                });
            }

            if (stripeClient && stripePublishableKey) {
                const baseUrl = getRequestBaseUrl(req);
                const stripeCustomerId = await ensureStripeCustomerForCheckout({
                    user: existingUser,
                    account
                });
                const pendingCheckout = await PendingCheckout.create({
                    email: account.email,
                    passwordHash: existingUser ? '' : createPasswordHash(account.password),
                    firstName: account.firstName,
                    lastName: account.lastName,
                    company: account.company,
                    userId: existingUser?._id || null,
                    stripeCustomerId,
                    items: checkoutItems.map((item) => ({
                        productId: item.product._id,
                        purchaseType: item.purchaseType
                    })),
                    paymentDetails: {
                        ...paymentDetails,
                        billingName: account.fullName,
                        billingEmail: account.email,
                        companyName: account.company
                    },
                    expiresAt: addDays(new Date(), 1)
                });
                const sessionConfig = {
                    mode: stripeMode,
                    client_reference_id: pendingCheckout._id.toString(),
                    customer: stripeCustomerId,
                    line_items: buildStripeLineItems(checkoutItems),
                    success_url: `${baseUrl}/checkout-success.html?session_id={CHECKOUT_SESSION_ID}`,
                    cancel_url: `${baseUrl}/marketplace.html?checkout=cancelled`,
                    metadata: {
                        pendingCheckoutId: pendingCheckout._id.toString(),
                        items: encodeCheckoutItems(checkoutItems),
                        paymentMethodType
                    }
                };

                if (stripeMode === 'payment') {
                    sessionConfig.payment_intent_data = {
                        setup_future_usage: 'off_session',
                        metadata: {
                            pendingCheckoutId: pendingCheckout._id.toString(),
                            items: encodeCheckoutItems(checkoutItems)
                        }
                    };
                } else {
                    sessionConfig.subscription_data = {
                        metadata: {
                            pendingCheckoutId: pendingCheckout._id.toString(),
                            items: encodeCheckoutItems(checkoutItems)
                        }
                    };
                }

                const session = await stripeClient.checkout.sessions.create(sessionConfig);
                pendingCheckout.stripeSessionId = session.id;
                await pendingCheckout.save();

                logActivity('POST', '/api/catalog/checkout/session', 201);

                return res.status(201).json({
                    success: true,
                    provider: 'stripe',
                    publishableKey: stripePublishableKey,
                    session: {
                        id: session.id,
                        url: session.url,
                        amount: summary.total,
                        currency: 'USD',
                        expiresAt: session.expires_at
                            ? new Date(session.expires_at * 1000).toISOString()
                            : null,
                        lineItems: checkoutItems.map((item) => ({
                            productId: item.product._id.toString(),
                            name: item.product.name,
                            purchaseType: item.purchaseType,
                            label: item.purchaseOption.label,
                            price: item.purchaseOption.price
                        }))
                    }
                });
            }

            return res.status(503).json({ error: 'Stripe live checkout is not configured' });
        } catch (error) {
            return res
                .status(error.statusCode || 500)
                .json({ error: error.message || 'Unable to create checkout session' });
        }
    });

    router.post('/checkout', authMiddleware, async (req, res) => {
        return res.status(410).json({ error: 'Legacy direct checkout is disabled. Use Stripe Checkout.' });
    });

    router.post('/checkout/saved-payment', authMiddleware, async (req, res) => {
        try {
            if (!ensureWritablePurchaseSession(req, res)) {
                return;
            }

            if (!stripeClient) {
                return res.status(503).json({ error: 'Stripe checkout is not configured' });
            }

            if (!req.user.stripeCustomerId || !req.user.defaultStripePaymentMethodId) {
                return res.status(409).json({
                    error: 'No saved payment method is available for this account'
                });
            }

            const items = Array.isArray(req.body.items) ? req.body.items : [];
            if (!items.length) {
                return res.status(400).json({ error: 'At least one catalog item is required' });
            }

            const checkoutItems = await buildCheckoutSelection(items, ApiCatalogItem);
            const summary = summarizeCheckoutItems(checkoutItems);
            const paymentIntent = await stripeClient.paymentIntents.create({
                amount: Math.round(Number(summary.total || 0) * 100),
                currency: 'usd',
                customer: req.user.stripeCustomerId,
                payment_method: req.user.defaultStripePaymentMethodId,
                off_session: true,
                confirm: true,
                description: `ParseForge purchase for ${req.user.email}`,
                metadata: {
                    userId: req.user._id.toString(),
                    items: encodeCheckoutItems(checkoutItems)
                }
            });

            const chargeId =
                typeof paymentIntent.latest_charge === 'string' ? paymentIntent.latest_charge : '';
            const paymentDetails = buildPaymentDetailsSnapshot(
                {
                    billingName: `${req.user.firstName} ${req.user.lastName}`.trim(),
                    billingEmail: req.user.email,
                    companyName: req.user.company
                },
                'stripe_checkout',
            );
            const processedPurchases = await processCheckoutPurchases({
                userId: req.user._id,
                checkoutItems,
                CatalogPurchase,
                paymentProvider: 'stripe',
                paymentMethodType: 'stripe_checkout',
                providerSessionId: paymentIntent.id,
                providerPaymentIntentId: paymentIntent.id,
                providerChargeId: chargeId,
                paymentDetails
            });
            const checkoutSummary = summarizeProcessedPurchases(processedPurchases);

            logActivity('POST', '/api/catalog/checkout/saved-payment', 201);

            return res.status(201).json({
                success: true,
                summary: checkoutSummary,
                payment: {
                    provider: 'stripe',
                    paymentMethodType: 'stripe_checkout',
                    paymentIntentId: paymentIntent.id,
                    chargeId,
                    status: paymentIntent.status,
                    savedPaymentMethod: getSavedPaymentMethodSummary(req.user)
                },
                purchases: processedPurchases.map((purchase) => ({
                    id: purchase._id.toString(),
                    orderReference: purchase.orderReference,
                    purchaseType: purchase.purchaseType,
                    unitPrice: purchase.unitPrice,
                    renewsAt: purchase.renewsAt
                }))
            });
        } catch (error) {
            const declineMessage =
                error.code === 'authentication_required'
                    ? 'Saved payment method requires authentication. Please checkout with Stripe again.'
                    : error.message;

            const statusCode =
                Number(error.statusCode || error.status) >= 400
                    ? Number(error.statusCode || error.status)
                    : 402;

            return res
                .status(statusCode)
                .json({ error: declineMessage || 'Unable to charge saved payment method' });
        }
    });

    router.get('/checkout/complete', async (req, res) => {
        try {
            if (!stripeClient) {
                return res.status(503).json({ error: 'Stripe checkout is not configured' });
            }

            const sessionId = String(req.query.session_id || '');
            if (!sessionId) {
                return res.status(400).json({ error: 'Stripe session id is required' });
            }

            const session = await stripeClient.checkout.sessions.retrieve(sessionId, {
                expand: ['payment_intent', 'subscription.latest_invoice.payment_intent']
            });

            const result = await fulfillStripeCheckoutSession({
                session,
                ApiCatalogItem,
                CatalogPurchase,
                PendingCheckout,
                User,
                createPasswordHash,
                createToken,
                jwtSecret,
                touchLogin: true
            });

            logActivity('GET', '/api/catalog/checkout/complete', 200);

            return res.json(result);
        } catch (error) {
            return res
                .status(error.statusCode || 500)
                .json({ error: error.message || 'Unable to confirm Stripe checkout' });
        }
    });

    return router;
}

function createStripeWebhookRoutes({
    logActivity,
    ApiCatalogItem,
    CatalogPurchase,
    PendingCheckout,
    User,
    createPasswordHash,
    createToken,
    jwtSecret
}) {
    const router = express.Router();

    router.post('/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
        if (!stripeClient || !stripeWebhookSecret) {
            return res.status(503).json({ error: 'Stripe webhook is not configured' });
        }

        const signature = req.get('stripe-signature');
        let event;

        try {
            event = stripeClient.webhooks.constructEvent(req.body, signature, stripeWebhookSecret);
        } catch (error) {
            return res.status(400).json({ error: 'Invalid Stripe webhook signature' });
        }

        try {
            if (event.type === 'checkout.session.completed') {
                const eventSession = event.data.object;
                const session = await stripeClient.checkout.sessions.retrieve(eventSession.id, {
                    expand: ['payment_intent', 'subscription.latest_invoice.payment_intent']
                });
                await fulfillStripeCheckoutSession({
                    session,
                    ApiCatalogItem,
                    CatalogPurchase,
                    PendingCheckout,
                    User,
                    createPasswordHash,
                    createToken,
                    jwtSecret,
                    touchLogin: false
                });
            } else if (event.type === 'invoice.paid') {
                await handleInvoicePaid({
                    invoice: event.data.object,
                    CatalogPurchase
                });
            } else if (event.type === 'invoice.payment_failed') {
                const invoice = event.data.object;
                const subscriptionId =
                    typeof invoice.subscription === 'string'
                        ? invoice.subscription
                        : invoice.subscription?.id;
                if (subscriptionId) {
                    await CatalogPurchase.updateMany(
                        { providerSubscriptionId: subscriptionId },
                        { $set: { status: 'canceled', canceledAt: new Date() } }
                    );
                }
            } else if (event.type === 'customer.subscription.updated') {
                await updateSubscriptionFromStripeEvent({
                    subscription: event.data.object,
                    CatalogPurchase,
                    status: event.data.object.status === 'active' ? 'active' : 'canceled'
                });
            } else if (event.type === 'customer.subscription.deleted') {
                await updateSubscriptionFromStripeEvent({
                    subscription: event.data.object,
                    CatalogPurchase,
                    status: 'canceled'
                });
            }

            logActivity('POST', '/api/catalog/stripe/webhook', 200);
            return res.json({ received: true });
        } catch (error) {
            console.error('Stripe webhook processing failed:', error);
            return res.status(500).json({ error: 'Unable to process Stripe webhook' });
        }
    });

    return router;
}

module.exports = createCatalogRoutes;
module.exports.createStripeWebhookRoutes = createStripeWebhookRoutes;
