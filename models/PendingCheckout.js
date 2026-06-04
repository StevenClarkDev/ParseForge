const mongoose = require('mongoose');

const pendingCheckoutSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            index: true
        },
        passwordHash: {
            type: String,
            default: ''
        },
        firstName: {
            type: String,
            required: true,
            trim: true
        },
        lastName: {
            type: String,
            required: true,
            trim: true
        },
        company: {
            type: String,
            default: '',
            trim: true
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        stripeSessionId: {
            type: String,
            default: '',
            trim: true,
            index: true
        },
        items: [
            {
                productId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'ApiCatalogItem',
                    required: true
                },
                purchaseType: {
                    type: String,
                    enum: ['one_time', 'monthly', 'yearly'],
                    required: true
                }
            }
        ],
        paymentDetails: {
            billingName: { type: String, default: '', trim: true },
            billingEmail: { type: String, default: '', trim: true },
            companyName: { type: String, default: '', trim: true },
            country: { type: String, default: '', trim: true },
            region: { type: String, default: '', trim: true },
            postalCode: { type: String, default: '', trim: true }
        },
        status: {
            type: String,
            enum: ['pending', 'completed'],
            default: 'pending',
            index: true
        },
        expiresAt: {
            type: Date,
            required: true,
            index: { expires: 0 }
        }
    },
    {
        timestamps: true
    }
);

module.exports =
    mongoose.models.PendingCheckout || mongoose.model('PendingCheckout', pendingCheckoutSchema);
