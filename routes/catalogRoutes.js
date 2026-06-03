const express = require('express');
const { serializeCatalogItem } = require('../utils/serializers');

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

function createCatalogRoutes({
    authMiddleware,
    optionalAuth,
    logActivity,
    ApiCatalogItem,
    CatalogPurchase
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

    router.post('/checkout/session', authMiddleware, async (req, res) => {
        try {
            if (!ensureWritablePurchaseSession(req, res)) {
                return;
            }

            const items = Array.isArray(req.body.items) ? req.body.items : [];
            const paymentMethodType = normalizePaymentMethodType(req.body.paymentMethodType);

            if (!items.length) {
                return res.status(400).json({ error: 'At least one catalog item is required' });
            }

            const checkoutItems = await buildCheckoutSelection(items, ApiCatalogItem);
            const summary = summarizeCheckoutItems(checkoutItems);
            const paymentIntentId = createStripePaymentIntentId();
            const sessionId = createStripeSessionId();

            logActivity('POST', '/api/catalog/checkout/session', 201);

            return res.status(201).json({
                success: true,
                provider: 'stripe_simulated',
                publishableKey: 'pk_test_parseforge_simulated',
                session: {
                    id: sessionId,
                    paymentIntentId,
                    clientSecret: createStripeClientSecret(paymentIntentId),
                    paymentMethodType,
                    amount: summary.total,
                    currency: 'USD',
                    expiresAt: addDays(new Date(), 1),
                    lineItems: checkoutItems.map((item) => ({
                        productId: item.product._id.toString(),
                        name: item.product.name,
                        purchaseType: item.purchaseType,
                        label: item.purchaseOption.label,
                        price: item.purchaseOption.price
                    }))
                }
            });
        } catch (error) {
            return res
                .status(error.statusCode || 500)
                .json({ error: error.message || 'Unable to create checkout session' });
        }
    });

    router.post('/checkout', authMiddleware, async (req, res) => {
        try {
            if (!ensureWritablePurchaseSession(req, res)) {
                return;
            }

            const items = Array.isArray(req.body.items) ? req.body.items : [];
            const paymentProvider = String(req.body.paymentProvider || 'stripe_simulated');
            const paymentMethodType = normalizePaymentMethodType(req.body.paymentMethodType);

            if (paymentProvider !== 'stripe_simulated') {
                return res.status(400).json({ error: 'Only simulated Stripe checkout is supported' });
            }

            if (!items.length) {
                return res.status(400).json({ error: 'At least one catalog item is required' });
            }

            const checkoutItems = await buildCheckoutSelection(items, ApiCatalogItem);
            const processedPurchases = [];
            const providerSessionId = String(req.body.sessionId || createStripeSessionId());
            const providerPaymentIntentId = String(
                req.body.paymentIntentId || createStripePaymentIntentId(),
            );
            const providerChargeId = createStripeChargeId();
            const paymentDetails = buildPaymentDetailsSnapshot(
                req.body.paymentDetails,
                paymentMethodType,
            );

            for (const item of checkoutItems) {
                const { product, purchaseType, purchaseOption } = item;

                const existingOneTime = await CatalogPurchase.findOne({
                    userId: req.user._id,
                    catalogItemId: product._id,
                    purchaseType: 'one_time',
                    status: 'active'
                });

                if (purchaseType === 'one_time' && existingOneTime) {
                    processedPurchases.push(existingOneTime);
                    continue;
                }

                const activeSubscription = await CatalogPurchase.findOne({
                    userId: req.user._id,
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

                if (purchaseType === 'monthly' || purchaseType === 'yearly') {
                    if (activeSubscription) {
                        activeSubscription.purchaseType = purchaseType;
                        activeSubscription.unitPrice = purchaseOption.price;
                        activeSubscription.renewsAt = renewalDate;
                        activeSubscription.orderReference = createOrderReference();
                        activeSubscription.paymentProvider = paymentProvider;
                        activeSubscription.paymentMethodType = paymentMethodType;
                        activeSubscription.providerSessionId = providerSessionId;
                        activeSubscription.providerPaymentIntentId = providerPaymentIntentId;
                        activeSubscription.providerChargeId = providerChargeId;
                        activeSubscription.paymentDetails = paymentDetails;
                        await activeSubscription.save();
                        processedPurchases.push(activeSubscription);
                        continue;
                    }
                }

                const purchase = await CatalogPurchase.create({
                    userId: req.user._id,
                    catalogItemId: product._id,
                    purchaseType,
                    unitPrice: purchaseOption.price,
                    currency: 'USD',
                    paymentProvider,
                    paymentMethodType,
                    providerSessionId,
                    providerPaymentIntentId,
                    providerChargeId,
                    paymentDetails,
                    renewsAt: renewalDate,
                    orderReference: createOrderReference()
                });

                processedPurchases.push(purchase);
            }

            const checkoutSummary = processedPurchases.reduce(
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

            logActivity('POST', '/api/catalog/checkout', 201);

            return res.status(201).json({
                success: true,
                summary: checkoutSummary,
                payment: {
                    provider: paymentProvider,
                    paymentMethodType,
                    sessionId: providerSessionId,
                    paymentIntentId: providerPaymentIntentId,
                    chargeId: providerChargeId,
                    status: 'succeeded'
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
            return res
                .status(error.statusCode || 500)
                .json({ error: error.message || 'Unable to complete checkout' });
        }
    });

    return router;
}

module.exports = createCatalogRoutes;
