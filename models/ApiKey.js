const mongoose = require('mongoose');

const apiKeySchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        name: {
            type: String,
            required: true,
            trim: true
        },
        type: {
            type: String,
            enum: ['production', 'test'],
            default: 'test'
        },
        prefix: {
            type: String,
            required: true
        },
        last4: {
            type: String,
            required: true
        },
        keyHash: {
            type: String,
            required: true,
            unique: true
        },
        lastUsed: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.models.ApiKey || mongoose.model('ApiKey', apiKeySchema);
