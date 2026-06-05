const mongoose = require('mongoose');

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
        documentationFiles: [
            {
                originalName: { type: String, required: true, trim: true },
                storedName: { type: String, required: true, trim: true },
                relativePath: { type: String, required: true, trim: true },
                mimeType: { type: String, default: '', trim: true },
                size: { type: Number, default: 0 },
                uploadedAt: { type: Date, default: Date.now }
            }
        ],
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

        if (!(Number(this.monthlyPrice) > 0)) {
            this.invalidate(
                'monthlyPrice',
                'APIs require a monthly subscription price greater than 0'
            );
        }

        if (!(Number(this.yearlyPrice) > 0)) {
            this.invalidate(
                'yearlyPrice',
                'APIs require a yearly subscription price greater than 0'
            );
        }
    } else if (this.type === 'sdk') {
        this.billingModel = 'one_time';
        this.allowOneTimePurchase = true;
        this.allowMonthlySubscription = false;
        this.allowYearlySubscription = false;
        this.monthlyPrice = 0;
        this.yearlyPrice = 0;

        if (!(Number(this.oneTimePrice) > 0)) {
            this.invalidate('oneTimePrice', 'SDKs require a one-time price greater than 0');
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

        if (this.allowMonthlySubscription && !(Number(this.monthlyPrice) > 0)) {
            this.invalidate(
                'monthlyPrice',
                'Monthly subscriptions must have a price greater than 0'
            );
        }

        if (this.allowYearlySubscription && !(Number(this.yearlyPrice) > 0)) {
            this.invalidate(
                'yearlyPrice',
                'Yearly subscriptions must have a price greater than 0'
            );
        }
    } else {
        this.allowOneTimePurchase = true;
        this.allowMonthlySubscription = false;
        this.allowYearlySubscription = false;
        this.monthlyPrice = 0;
        this.yearlyPrice = 0;

        if (!(Number(this.oneTimePrice) > 0)) {
            this.invalidate('oneTimePrice', 'One-time products must have a price greater than 0');
        }
    }
});

module.exports = mongoose.models.ApiCatalogItem || mongoose.model('ApiCatalogItem', apiCatalogItemSchema);
