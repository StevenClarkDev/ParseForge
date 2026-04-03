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
        type: 'api',
        language: 'REST',
        version: 'v2.1.0',
        description: 'Complete user management with authentication, profiles, and permissions.',
        documentation: '/docs.html#users',
        status: 'stable'
    },
    {
        name: 'Node.js SDK',
        type: 'sdk',
        language: 'JavaScript',
        version: 'v3.2.1',
        description: 'Full-featured Node.js SDK with TypeScript support and async/await.',
        documentation: '/sdks.html#nodejs',
        status: 'stable'
    },
    {
        name: 'Python SDK',
        type: 'sdk',
        language: 'Python',
        version: 'v2.8.0',
        description: 'Pythonic SDK with support for asyncio and type hints.',
        documentation: '/sdks.html#python',
        status: 'stable'
    },
    {
        name: 'Data API',
        type: 'api',
        language: 'REST',
        version: 'v1.5.2',
        description: 'Store, retrieve, and query data with powerful filtering capabilities.',
        documentation: '/docs.html#data',
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
