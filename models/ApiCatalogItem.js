const mongoose = require('mongoose');

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

apiCatalogItemSchema.pre('validate', function setSlug(next) {
    if (!this.slug && this.name) {
        this.slug = String(this.name)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    next();
});

module.exports = mongoose.models.ApiCatalogItem || mongoose.model('ApiCatalogItem', apiCatalogItemSchema);
