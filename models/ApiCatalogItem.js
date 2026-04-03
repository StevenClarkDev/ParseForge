const mongoose = require('mongoose');

const apiCatalogItemSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
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

module.exports = mongoose.models.ApiCatalogItem || mongoose.model('ApiCatalogItem', apiCatalogItemSchema);
