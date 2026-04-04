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
        oneTimePrice: 99,
        monthlyPrice: 19,
        yearlyPrice: 190,
        allowOneTimePurchase: true,
        allowMonthlySubscription: true,
        allowYearlySubscription: true,
        features: ['Production access', 'Documentation', 'API key support']
    },
    sdk: {
        icon: '{ }',
        badge: 'new',
        oneTimePrice: 149,
        monthlyPrice: 29,
        yearlyPrice: 290,
        allowOneTimePurchase: true,
        allowMonthlySubscription: true,
        allowYearlySubscription: true,
        features: ['Source package', 'Integration guides', 'Version updates']
    }
};

function getCatalogDefaults(type = 'api') {
    return CATALOG_DEFAULTS[type] || CATALOG_DEFAULTS.api;
}

function buildPurchaseOptions(item, defaults) {
    const options = [];
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

    if (allowOneTimePurchase && oneTimePrice > 0) {
        options.push({
            type: 'one_time',
            price: oneTimePrice,
            label: 'One-time purchase',
            shortLabel: 'Buy once'
        });
    }

    if (allowMonthlySubscription && monthlyPrice > 0) {
        options.push({
            type: 'monthly',
            price: monthlyPrice,
            label: 'Monthly subscription',
            shortLabel: 'Monthly'
        });
    }

    if (allowYearlySubscription && yearlyPrice > 0) {
        options.push({
            type: 'yearly',
            price: yearlyPrice,
            label: 'Yearly subscription',
            shortLabel: 'Yearly'
        });
    }

    return options;
}

function serializeCatalogItem(item, { ownership = [] } = {}) {
    const defaults = getCatalogDefaults(item.type);
    const purchaseOptions = buildPurchaseOptions(item, defaults);
    const defaultPurchaseType =
        purchaseOptions.find((option) => option.type === 'one_time')?.type ||
        purchaseOptions[0]?.type ||
        null;
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
            allowOneTimePurchase:
                typeof item.allowOneTimePurchase === 'boolean'
                    ? item.allowOneTimePurchase
                    : defaults.allowOneTimePurchase,
            allowMonthlySubscription:
                typeof item.allowMonthlySubscription === 'boolean'
                    ? item.allowMonthlySubscription
                    : defaults.allowMonthlySubscription,
            allowYearlySubscription:
                typeof item.allowYearlySubscription === 'boolean'
                    ? item.allowYearlySubscription
                    : defaults.allowYearlySubscription,
            oneTimePrice:
                typeof item.oneTimePrice === 'number' ? item.oneTimePrice : defaults.oneTimePrice,
            monthlyPrice:
                typeof item.monthlyPrice === 'number' ? item.monthlyPrice : defaults.monthlyPrice,
            yearlyPrice:
                typeof item.yearlyPrice === 'number' ? item.yearlyPrice : defaults.yearlyPrice,
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
