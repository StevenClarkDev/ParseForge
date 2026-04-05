const PricingPlan = require('../models/PricingPlan');
const ApiCatalogItem = require('../models/ApiCatalogItem');
const ContentPage = require('../models/ContentPage');
const BrandingSettings = require('../models/BrandingSettings');
const { curatedCatalogItems } = require('./catalogSeedData');

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
        await ApiCatalogItem.insertMany(curatedCatalogItems);
    }

    await ApiCatalogItem.updateMany(
        {
            billingModel: { $exists: false },
            allowOneTimePurchase: true,
            allowMonthlySubscription: false,
            allowYearlySubscription: false
        },
        { $set: { billingModel: 'one_time' } }
    );
    await ApiCatalogItem.updateMany(
        {
            billingModel: { $exists: false },
            allowOneTimePurchase: false,
            $or: [
                { allowMonthlySubscription: true },
                { allowYearlySubscription: true }
            ]
        },
        { $set: { billingModel: 'subscription' } }
    );
    await ApiCatalogItem.updateMany(
        { billingModel: { $exists: false }, type: 'api' },
        { $set: { billingModel: 'subscription' } }
    );
    await ApiCatalogItem.updateMany(
        { billingModel: { $exists: false }, type: 'sdk' },
        { $set: { billingModel: 'one_time' } }
    );
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
