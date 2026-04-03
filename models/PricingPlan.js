const mongoose = require('mongoose');

const pricingPlanSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            unique: true
        },
        monthlyPrice: {
            type: Number,
            required: true,
            default: 0
        },
        yearlyPrice: {
            type: Number,
            required: true,
            default: 0
        },
        features: {
            type: [String],
            default: []
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active'
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.models.PricingPlan || mongoose.model('PricingPlan', pricingPlanSchema);
