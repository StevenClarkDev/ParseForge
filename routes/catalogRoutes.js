const express = require('express');
const { serializeCatalogItem } = require('../utils/serializers');

function addDays(date, dayCount) {
    const result = new Date(date);
    result.setDate(result.getDate() + dayCount);
    return result;
}

function createOrderReference() {
    return `PF-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function createCatalogRoutes({
    authMiddleware,
    optionalAuth,
    logActivity,
    ApiCatalogItem,
    CatalogPurchase
}) {
    const router = express.Router();

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
                })
            ),
            total: items.length
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
                        createdAt: purchase.createdAt,
                        renewsAt: purchase.renewsAt,
                        product: serializedProduct,
                        purchaseLabel: purchaseOption?.label || purchase.purchaseType
                    };
                })
                .filter(Boolean)
        });
    });

    router.post('/checkout', authMiddleware, async (req, res) => {
        const items = Array.isArray(req.body.items) ? req.body.items : [];

        if (!items.length) {
            return res.status(400).json({ error: 'At least one catalog item is required' });
        }

        const productIds = [...new Set(items.map((item) => String(item.productId || '')).filter(Boolean))];
        const products = await ApiCatalogItem.find({ _id: { $in: productIds } });
        const productMap = new Map(products.map((product) => [product._id.toString(), product]));
        const processedPurchases = [];

        for (const requestedItem of items) {
            const product = productMap.get(String(requestedItem.productId || ''));
            const purchaseType = String(requestedItem.purchaseType || '');

            if (!product) {
                return res.status(404).json({ error: 'One of the selected products was not found' });
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
            { total: 0, subscriptions: 0, oneTimePurchases: 0 }
        );

        logActivity('POST', '/api/catalog/checkout', 201);

        return res.status(201).json({
            success: true,
            summary: checkoutSummary,
            purchases: processedPurchases.map((purchase) => ({
                id: purchase._id.toString(),
                orderReference: purchase.orderReference,
                purchaseType: purchase.purchaseType,
                unitPrice: purchase.unitPrice,
                renewsAt: purchase.renewsAt
            }))
        });
    });

    return router;
}

module.exports = createCatalogRoutes;
