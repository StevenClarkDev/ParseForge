function sanitizeUser(user) {
    return {
        id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        name: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        company: user.company,
        useCase: user.useCase,
        newsletter: user.newsletter,
        plan: user.plan,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt
    };
}

const CATALOG_DEFAULTS = {
    api: {
        icon: '</>',
        badge: 'featured',
        billingModel: 'subscription',
        oneTimePrice: 0,
        monthlyPrice: 19,
        yearlyPrice: 190,
        allowOneTimePurchase: false,
        allowMonthlySubscription: true,
        allowYearlySubscription: true,
        features: ['Production access', 'Documentation', 'API key support']
    },
    sdk: {
        icon: '{ }',
        badge: 'new',
        billingModel: 'one_time',
        oneTimePrice: 149,
        monthlyPrice: 0,
        yearlyPrice: 0,
        allowOneTimePurchase: true,
        allowMonthlySubscription: false,
        allowYearlySubscription: false,
        features: ['Source package', 'Integration guides', 'Version updates']
    }
};

function getCatalogDefaults(type = 'api') {
    return CATALOG_DEFAULTS[type] || CATALOG_DEFAULTS.api;
}

function getBillingModel(item, defaults) {
    if (item.billingModel === 'subscription') {
        return 'subscription';
    }

    if (item.billingModel === 'one_time') {
        return 'one_time';
    }

    const allowOneTimePurchase =
        typeof item.allowOneTimePurchase === 'boolean'
            ? item.allowOneTimePurchase
            : defaults.allowOneTimePurchase;
    const allowMonthlySubscription =
        typeof item.allowMonthlySubscription === 'boolean'
            ? item.allowMonthlySubscription
            : defaults.allowMonthlySubscription;
    const allowYearlySubscription =
        typeof item.allowYearlySubscription === 'boolean'
            ? item.allowYearlySubscription
            : defaults.allowYearlySubscription;

    if (!allowOneTimePurchase && (allowMonthlySubscription || allowYearlySubscription)) {
        return 'subscription';
    }

    return defaults.billingModel || 'one_time';
}

function getPricingState(item, defaults) {
    const oneTimePrice =
        typeof item.oneTimePrice === 'number' ? item.oneTimePrice : defaults.oneTimePrice;
    const monthlyPrice =
        typeof item.monthlyPrice === 'number' ? item.monthlyPrice : defaults.monthlyPrice;
    const yearlyPrice =
        typeof item.yearlyPrice === 'number' ? item.yearlyPrice : defaults.yearlyPrice;
    const allowOneTimePurchase =
        typeof item.allowOneTimePurchase === 'boolean'
            ? item.allowOneTimePurchase
            : defaults.allowOneTimePurchase;
    const allowMonthlySubscription =
        typeof item.allowMonthlySubscription === 'boolean'
            ? item.allowMonthlySubscription
            : defaults.allowMonthlySubscription;
    const allowYearlySubscription =
        typeof item.allowYearlySubscription === 'boolean'
            ? item.allowYearlySubscription
            : defaults.allowYearlySubscription;

    const billingModel = getBillingModel(item, defaults);

    return {
        billingModel,
        allowOneTimePurchase: billingModel === 'one_time',
        allowMonthlySubscription: billingModel === 'subscription' ? allowMonthlySubscription : false,
        allowYearlySubscription: billingModel === 'subscription' ? allowYearlySubscription : false,
        oneTimePrice: billingModel === 'one_time' ? oneTimePrice : 0,
        monthlyPrice:
            billingModel === 'subscription' && allowMonthlySubscription ? monthlyPrice : 0,
        yearlyPrice:
            billingModel === 'subscription' && allowYearlySubscription ? yearlyPrice : 0
    };
}

function buildPurchaseOptions(pricingState) {
    const options = [];

    if (pricingState.allowOneTimePurchase && pricingState.oneTimePrice > 0) {
        options.push({
            type: 'one_time',
            price: pricingState.oneTimePrice,
            label: 'One-time purchase',
            shortLabel: 'Buy once'
        });
    }

    if (pricingState.allowMonthlySubscription && pricingState.monthlyPrice > 0) {
        options.push({
            type: 'monthly',
            price: pricingState.monthlyPrice,
            label: 'Monthly subscription',
            shortLabel: 'Monthly'
        });
    }

    if (pricingState.allowYearlySubscription && pricingState.yearlyPrice > 0) {
        options.push({
            type: 'yearly',
            price: pricingState.yearlyPrice,
            label: 'Yearly subscription',
            shortLabel: 'Yearly'
        });
    }

    return options;
}

function serializeCatalogItem(item, { ownership = [] } = {}) {
    const defaults = getCatalogDefaults(item.type);
    const pricingState = getPricingState(item, defaults);
    const purchaseOptions = buildPurchaseOptions(pricingState);
    const defaultPurchaseType = purchaseOptions[0]?.type || null;
    const minPrice = purchaseOptions.length
        ? Math.min(...purchaseOptions.map((option) => option.price))
        : 0;
    const ownershipTypes = ownership.map((access) => access.purchaseType);

    return {
        id: item._id.toString(),
        slug:
            item.slug ||
            String(item.name || '')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, ''),
        name: item.name,
        type: item.type,
        language: item.language,
        version: item.version,
        description: item.description,
        documentation: item.documentation,
        features:
            Array.isArray(item.features) && item.features.length ? item.features : defaults.features,
        icon: item.icon || defaults.icon,
        badge: typeof item.badge === 'string' ? item.badge : defaults.badge,
        status: item.status,
        isPublished: typeof item.isPublished === 'boolean' ? item.isPublished : true,
        downloads: typeof item.downloads === 'number' ? item.downloads : 0,
        rating: typeof item.rating === 'number' ? item.rating : 4.8,
        reviews: typeof item.reviews === 'number' ? item.reviews : 0,
        pricing: {
            billingModel: pricingState.billingModel,
            allowOneTimePurchase: pricingState.allowOneTimePurchase,
            allowMonthlySubscription: pricingState.allowMonthlySubscription,
            allowYearlySubscription: pricingState.allowYearlySubscription,
            oneTimePrice: pricingState.oneTimePrice,
            monthlyPrice: pricingState.monthlyPrice,
            yearlyPrice: pricingState.yearlyPrice,
            purchaseOptions,
            defaultPurchaseType,
            minPrice
        },
        ownership: {
            purchaseTypes: ownershipTypes,
            hasOneTimeAccess: ownershipTypes.includes('one_time'),
            hasSubscription:
                ownershipTypes.includes('monthly') || ownershipTypes.includes('yearly')
        }
    };
}

module.exports = {
    sanitizeUser,
    serializeCatalogItem
};
