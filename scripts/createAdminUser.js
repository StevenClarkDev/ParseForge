const mongoose = require('mongoose');

const connectDb = require('../configDb');
const User = require('../models/User');
const { createPasswordHash } = require('../utils/auth');

function readArgument(flag, fallback) {
    const index = process.argv.indexOf(flag);
    if (index === -1 || index === process.argv.length - 1) {
        return fallback;
    }

    return process.argv[index + 1];
}

async function main() {
    const email = readArgument('--email', 'admin@parseforge.dev');
    const password = readArgument('--password', 'ParseForgeAdmin123!');
    const firstName = readArgument('--first-name', 'ParseForge');
    const lastName = readArgument('--last-name', 'Admin');

    await connectDb();

    const user = await User.findOneAndUpdate(
        { email: String(email).trim().toLowerCase() },
        {
            $set: {
                firstName: String(firstName).trim(),
                lastName: String(lastName).trim(),
                email: String(email).trim().toLowerCase(),
                passwordHash: createPasswordHash(password),
                company: 'ParseForge',
                useCase: 'platform-admin',
                newsletter: false,
                plan: 'enterprise',
                role: 'admin',
                status: 'active'
            }
        },
        {
            upsert: true,
            new: true,
            runValidators: true,
            setDefaultsOnInsert: true
        }
    );

    console.log(
        JSON.stringify(
            {
                success: true,
                id: user._id.toString(),
                email: user.email,
                role: user.role,
                status: user.status
            },
            null,
            2
        )
    );
}

main()
    .catch((error) => {
        console.error(error.message || 'Unable to create admin user');
        process.exitCode = 1;
    })
    .finally(async () => {
        try {
            await mongoose.disconnect();
        } catch (error) {
            // Ignore disconnect errors during shutdown.
        }
    });
