const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
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
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        passwordHash: {
            type: String,
            required: true
        },
        company: {
            type: String,
            trim: true,
            default: ''
        },
        useCase: {
            type: String,
            trim: true,
            default: ''
        },
        newsletter: {
            type: Boolean,
            default: false
        },
        plan: {
            type: String,
            default: 'starter'
        },
        role: {
            type: String,
            enum: ['developer', 'admin'],
            default: 'developer'
        },
        status: {
            type: String,
            enum: ['active', 'inactive', 'suspended'],
            default: 'active'
        },
        lastLoginAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
