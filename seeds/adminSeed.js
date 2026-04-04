const PricingPlan = require('../models/PricingPlan');
const ApiCatalogItem = require('../models/ApiCatalogItem');
const ContentPage = require('../models/ContentPage');
const BrandingSettings = require('../models/BrandingSettings');

const defaultPricingPlans = [
    {
        name: 'Starter',
        monthlyPrice: 89,
        yearlyPrice: 890,
        features: ['10,000 API calls/month', 'Basic support', 'Team collaboration (5 members)', 'Standard documentation', 'Email notifications'],
        status: 'active'
    },
    {
        name: 'Professional',
        monthlyPrice: 149,
        yearlyPrice: 1490,
        features: ['50,000 API calls/month', 'Priority support', 'Team collaboration (15 members)', 'Advanced features', 'Webhook support', 'Custom integrations'],
        status: 'active'
    },
    {
        name: 'Enterprise',
        monthlyPrice: 0,
        yearlyPrice: 0,
        features: ['Unlimited API calls', '24/7 Premium support', 'Unlimited team members', 'White-label options', 'Dedicated account manager', 'SLA guarantee', 'Custom contracts'],
        status: 'active'
    }
];

const defaultApiCatalogItems = [
    {
        name: 'Users API',
        slug: 'users-api',
        type: 'api',
        language: 'REST',
        version: 'v2.1.0',
        description: 'Complete user management with authentication, profiles, and permissions.',
        documentation: '/docs.html#users',
        features: ['User profiles', 'Authentication flows', 'Role permissions'],
        icon: '</>',
        badge: 'featured',
        allowOneTimePurchase: true,
        allowMonthlySubscription: true,
        allowYearlySubscription: true,
        oneTimePrice: 99,
        monthlyPrice: 19,
        yearlyPrice: 190,
        downloads: 18400,
        rating: 4.9,
        reviews: 214,
        isPublished: true,
        status: 'stable'
    },
    {
        name: 'Node.js SDK',
        slug: 'nodejs-sdk',
        type: 'sdk',
        language: 'JavaScript',
        version: 'v3.2.1',
        description: 'Full-featured Node.js SDK with TypeScript support and async/await.',
        documentation: '/sdks.html#nodejs',
        features: ['TypeScript support', 'Async workflows', 'Webhook helpers'],
        icon: '{ }',
        badge: 'bestseller',
        allowOneTimePurchase: true,
        allowMonthlySubscription: true,
        allowYearlySubscription: true,
        oneTimePrice: 149,
        monthlyPrice: 29,
        yearlyPrice: 290,
        downloads: 27600,
        rating: 4.8,
        reviews: 312,
        isPublished: true,
        status: 'stable'
    },
    {
        name: 'Python SDK',
        slug: 'python-sdk',
        type: 'sdk',
        language: 'Python',
        version: 'v2.8.0',
        description: 'Pythonic SDK with support for asyncio and type hints.',
        documentation: '/sdks.html#python',
        features: ['Asyncio support', 'Typed clients', 'CLI utilities'],
        icon: '{ }',
        badge: 'new',
        allowOneTimePurchase: true,
        allowMonthlySubscription: true,
        allowYearlySubscription: true,
        oneTimePrice: 159,
        monthlyPrice: 29,
        yearlyPrice: 290,
        downloads: 13800,
        rating: 4.7,
        reviews: 146,
        isPublished: true,
        status: 'stable'
    },
    {
        name: 'Data API',
        slug: 'data-api',
        type: 'api',
        language: 'REST',
        version: 'v1.5.2',
        description: 'Store, retrieve, and query data with powerful filtering capabilities.',
        documentation: '/docs.html#data',
        features: ['Flexible schemas', 'Query filters', 'Webhook-ready events'],
        icon: '</>',
        badge: 'featured',
        allowOneTimePurchase: true,
        allowMonthlySubscription: true,
        allowYearlySubscription: true,
        oneTimePrice: 119,
        monthlyPrice: 24,
        yearlyPrice: 240,
        downloads: 9400,
        rating: 4.8,
        reviews: 128,
        isPublished: true,
        status: 'stable'
    }
];

const defaultContentPages = {
    about: {
        title: 'About ParseForge',
        body: 'ParseForge is a powerful developer platform providing APIs, SDKs, and tools to build modern applications.'
    },
    docs: {
        title: 'Documentation',
        body: 'Comprehensive API documentation with examples and guides.'
    },
    resources: {
        title: 'Resources & Blog',
        body: 'Developer guides, tutorials, and best practices.'
    },
    hero: {
        title: 'Build Powerful Applications with ParseForge',
        body: 'A complete developer platform with robust APIs, comprehensive documentation, and powerful tools to accelerate your development.'
    }
};

const defaultBranding = {
    logoType: 'svg',
    logoCode: '<svg>...</svg>',
    primaryColor: '#00d9ff',
    secondaryColor: '#1de9b6',
    accentColor: '#b84dff'
};

async function seedAdminData() {
    if ((await PricingPlan.countDocuments()) === 0) {
        await PricingPlan.insertMany(defaultPricingPlans);
    }

    if ((await ApiCatalogItem.countDocuments()) === 0) {
        await ApiCatalogItem.insertMany(defaultApiCatalogItems);
    }

    await ApiCatalogItem.updateMany(
        { allowOneTimePurchase: { $exists: false } },
        { $set: { allowOneTimePurchase: true } }
    );
    await ApiCatalogItem.updateMany(
        { allowMonthlySubscription: { $exists: false } },
        { $set: { allowMonthlySubscription: true } }
    );
    await ApiCatalogItem.updateMany(
        { allowYearlySubscription: { $exists: false } },
        { $set: { allowYearlySubscription: true } }
    );
    await ApiCatalogItem.updateMany(
        { type: 'api', oneTimePrice: { $exists: false } },
        { $set: { oneTimePrice: 99, monthlyPrice: 19, yearlyPrice: 190, icon: '</>', badge: 'featured', isPublished: true } }
    );
    await ApiCatalogItem.updateMany(
        { type: 'sdk', oneTimePrice: { $exists: false } },
        { $set: { oneTimePrice: 149, monthlyPrice: 29, yearlyPrice: 290, icon: '{ }', badge: 'new', isPublished: true } }
    );
    await ApiCatalogItem.updateMany(
        { features: { $exists: false } },
        { $set: { features: [] } }
    );
    await ApiCatalogItem.updateMany(
        { downloads: { $exists: false } },
        { $set: { downloads: 0, rating: 4.8, reviews: 0 } }
    );

    if ((await ContentPage.countDocuments()) === 0) {
        await ContentPage.insertMany(
            Object.entries(defaultContentPages).map(([key, value]) => ({
                key,
                ...value
            }))
        );
    }

    if ((await BrandingSettings.countDocuments()) === 0) {
        await BrandingSettings.create({
            key: 'default',
            ...defaultBranding
        });
    }
}

module.exports = {
    seedAdminData
};
