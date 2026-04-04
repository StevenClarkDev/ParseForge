const mongoose = require('mongoose');

const catalogPurchaseSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        catalogItemId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ApiCatalogItem',
            required: true,
            index: true
        },
        purchaseType: {
            type: String,
            enum: ['one_time', 'monthly', 'yearly'],
            required: true
        },
        status: {
            type: String,
            enum: ['active', 'canceled'],
            default: 'active'
        },
        unitPrice: {
            type: Number,
            required: true
        },
        currency: {
            type: String,
            default: 'USD'
        },
        paymentProvider: {
            type: String,
            enum: ['stripe_simulated'],
            default: 'stripe_simulated'
        },
        paymentMethodType: {
            type: String,
            enum: ['stripe_checkout', 'stripe_card'],
            default: 'stripe_checkout'
        },
        providerSessionId: {
            type: String,
            default: '',
            trim: true
        },
        providerPaymentIntentId: {
            type: String,
            default: '',
            trim: true
        },
        providerChargeId: {
            type: String,
            default: '',
            trim: true
        },
        orderReference: {
            type: String,
            required: true,
            trim: true
        },
        renewsAt: {
            type: Date,
            default: null
        },
        canceledAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

module.exports =
    mongoose.models.CatalogPurchase || mongoose.model('CatalogPurchase', catalogPurchaseSchema);
