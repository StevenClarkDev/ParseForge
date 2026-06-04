const mongoose = require('mongoose');

const connectDb = require('../configDb');
const User = require('../models/User');
const ApiCatalogItem = require('../models/ApiCatalogItem');
const CatalogPurchase = require('../models/CatalogPurchase');

const clientEmail = String(process.argv[2] || 'client@parseforge.dev').trim().toLowerCase();

function addDays(date, dayCount) {
    const result = new Date(date);
    result.setDate(result.getDate() + dayCount);
    return result;
}

function createOrderReference(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

async function ensurePurchase({ user, product, purchaseType, unitPrice, renewsAt }) {
    const existing = await CatalogPurchase.findOne({
        userId: user._id,
        catalogItemId: product._id,
        purchaseType,
        status: 'active'
    });

    if (existing) {
        return { purchase: existing, created: false };
    }

    const purchase = await CatalogPurchase.create({
        userId: user._id,
        catalogItemId: product._id,
        purchaseType,
        unitPrice,
        currency: 'USD',
        paymentProvider: 'stripe_simulated',
        paymentMethodType: 'stripe_checkout',
        providerSessionId: createOrderReference('seed_session'),
        providerPaymentIntentId: createOrderReference('seed_intent'),
        providerChargeId: createOrderReference('seed_charge'),
        orderReference: createOrderReference('PF-SEED'),
        renewsAt,
        paymentDetails: {
            billingName: `${user.firstName} ${user.lastName}`.trim(),
            billingEmail: user.email,
            companyName: user.company || 'ParseForge QA',
            country: 'United States',
            region: 'CA',
            postalCode: '94105',
            collectionMode: 'hosted_checkout'
        }
    });

    return { purchase, created: true };
}

async function main() {
    await connectDb();

    const user = await User.findOne({ email: clientEmail });
    if (!user) {
        throw new Error(`Client account not found: ${clientEmail}`);
    }

    const [apiProduct, sdkProduct] = await Promise.all([
        ApiCatalogItem.findOne({
            type: 'api',
            isPublished: { $ne: false },
            monthlyPrice: { $gt: 0 }
        }).sort({ name: 1 }),
        ApiCatalogItem.findOne({
            type: 'sdk',
            isPublished: { $ne: false },
            oneTimePrice: { $gt: 0 }
        }).sort({ name: 1 })
    ]);

    if (!apiProduct) {
        throw new Error('No published API product with monthly pricing was found');
    }

    if (!sdkProduct) {
        throw new Error('No published SDK product with one-time pricing was found');
    }

    const apiResult = await ensurePurchase({
        user,
        product: apiProduct,
        purchaseType: 'monthly',
        unitPrice: apiProduct.monthlyPrice,
        renewsAt: addDays(new Date(), 30)
    });
    const sdkResult = await ensurePurchase({
        user,
        product: sdkProduct,
        purchaseType: 'one_time',
        unitPrice: sdkProduct.oneTimePrice,
        renewsAt: null
    });

    const activePurchases = await CatalogPurchase.countDocuments({
        userId: user._id,
        status: 'active'
    });

    console.log(JSON.stringify({
        client: user.email,
        api: {
            name: apiProduct.name,
            purchaseType: 'monthly',
            created: apiResult.created
        },
        sdk: {
            name: sdkProduct.name,
            purchaseType: 'one_time',
            created: sdkResult.created
        },
        activePurchases
    }, null, 2));
}

main()
    .catch((error) => {
        console.error(error.message || 'Unable to seed client purchases');
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
