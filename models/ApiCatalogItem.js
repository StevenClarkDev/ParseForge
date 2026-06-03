const mongoose = require('mongoose');

const MIN_PRODUCT_PRICE = 999;
const MIN_YEARLY_API_PRICE = 9990;

function inferBillingModel(doc) {
    if (doc.type === 'api') {
        return 'subscription';
    }

    if (doc.type === 'sdk') {
        return 'one_time';
    }

    if (doc.billingModel === 'subscription') {
        return 'subscription';
    }

    if (
        doc.allowOneTimePurchase === false &&
        (doc.allowMonthlySubscription === true || doc.allowYearlySubscription === true)
    ) {
        return 'subscription';
    }

    return 'one_time';
}

const apiCatalogItemSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        slug: {
            type: String,
            trim: true,
            lowercase: true,
            index: true
        },
        type: {
            type: String,
            enum: ['api', 'sdk'],
            required: true
        },
        language: {
            type: String,
            required: true,
            trim: true
        },
        version: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            required: true,
            trim: true
        },
        documentation: {
            type: String,
            default: '',
            trim: true
        },
        features: {
            type: [String],
            default: []
        },
        icon: {
            type: String,
            default: ''
        },
        badge: {
            type: String,
            enum: ['', 'featured', 'bestseller', 'new'],
            default: ''
        },
        billingModel: {
            type: String,
            enum: ['one_time', 'subscription'],
            default() {
                return inferBillingModel(this);
            }
        },
        allowOneTimePurchase: {
            type: Boolean,
            default: true
        },
        allowMonthlySubscription: {
            type: Boolean,
            default: true
        },
        allowYearlySubscription: {
            type: Boolean,
            default: true
        },
        oneTimePrice: {
            type: Number,
            default: 0
        },
        monthlyPrice: {
            type: Number,
            default: 0
        },
        yearlyPrice: {
            type: Number,
            default: 0
        },
        downloads: {
            type: Number,
            default: 0
        },
        rating: {
            type: Number,
            default: 4.8
        },
        reviews: {
            type: Number,
            default: 0
        },
        isPublished: {
            type: Boolean,
            default: true
        },
        status: {
            type: String,
            enum: ['stable', 'beta', 'deprecated'],
            default: 'stable'
        }
    },
    {
        timestamps: true
    }
);

apiCatalogItemSchema.pre('validate', function setSlug() {
    if (!this.slug && this.name) {
        this.slug = String(this.name)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    this.billingModel = inferBillingModel(this);

    if (this.type === 'api') {
        this.billingModel = 'subscription';
        this.allowOneTimePurchase = false;
        this.allowMonthlySubscription = true;
        this.allowYearlySubscription = true;
        this.oneTimePrice = 0;

        if (Number(this.monthlyPrice) < MIN_PRODUCT_PRICE) {
            this.invalidate(
                'monthlyPrice',
                'APIs require a monthly subscription price of at least $999'
            );
        }

        if (Number(this.yearlyPrice) < MIN_YEARLY_API_PRICE) {
            this.invalidate(
                'yearlyPrice',
                'APIs require a yearly subscription price of at least $9,990'
            );
        }
    } else if (this.type === 'sdk') {
        this.billingModel = 'one_time';
        this.allowOneTimePurchase = true;
        this.allowMonthlySubscription = false;
        this.allowYearlySubscription = false;
        this.monthlyPrice = 0;
        this.yearlyPrice = 0;

        if (Number(this.oneTimePrice) < MIN_PRODUCT_PRICE) {
            this.invalidate('oneTimePrice', 'SDKs require a one-time price of at least $999');
        }
    } else if (this.billingModel === 'subscription') {
        this.allowOneTimePurchase = false;
        this.oneTimePrice = 0;

        if (!this.allowMonthlySubscription && !this.allowYearlySubscription) {
            this.invalidate(
                'billingModel',
                'Subscription products must include a monthly plan, yearly plan, or both'
            );
        }

        if (this.allowMonthlySubscription && Number(this.monthlyPrice) < MIN_PRODUCT_PRICE) {
            this.invalidate(
                'monthlyPrice',
                'Monthly subscriptions must have a price of at least $999'
            );
        }

        if (this.allowYearlySubscription && Number(this.yearlyPrice) < MIN_YEARLY_API_PRICE) {
            this.invalidate(
                'yearlyPrice',
                'Yearly subscriptions must have a price of at least $9,990'
            );
        }
    } else {
        this.allowOneTimePurchase = true;
        this.allowMonthlySubscription = false;
        this.allowYearlySubscription = false;
        this.monthlyPrice = 0;
        this.yearlyPrice = 0;

        if (Number(this.oneTimePrice) < MIN_PRODUCT_PRICE) {
            this.invalidate('oneTimePrice', 'One-time products must have a price of at least $999');
        }
    }
});

module.exports = mongoose.models.ApiCatalogItem || mongoose.model('ApiCatalogItem', apiCatalogItemSchema);
