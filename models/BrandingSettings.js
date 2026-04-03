const mongoose = require('mongoose');

const brandingSettingsSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            default: 'default'
        },
        logoType: {
            type: String,
            enum: ['svg', 'image'],
            default: 'svg'
        },
        logoCode: {
            type: String,
            default: '<svg>...</svg>'
        },
        primaryColor: {
            type: String,
            default: '#00d9ff'
        },
        secondaryColor: {
            type: String,
            default: '#1de9b6'
        },
        accentColor: {
            type: String,
            default: '#b84dff'
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.models.BrandingSettings || mongoose.model('BrandingSettings', brandingSettingsSchema);
