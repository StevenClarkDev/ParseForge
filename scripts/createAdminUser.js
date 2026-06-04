const mongoose = require('mongoose');

const connectDb = require('../configDb');
const { ensureBootstrapAdminUser } = require('../seeds/bootstrapAdminUser');

function readArgument(flag, fallback) {
    const index = process.argv.indexOf(flag);
    if (index === -1 || index === process.argv.length - 1) {
        return fallback;
    }

    return process.argv[index + 1];
}

async function main() {
    const password = readArgument('--password', process.env.BOOTSTRAP_ADMIN_PASSWORD || '');
    if (!password || password.length < 8) {
        throw new Error('Provide an admin password of at least 8 characters with --password or BOOTSTRAP_ADMIN_PASSWORD');
    }

    process.env.BOOTSTRAP_ADMIN_ENABLED = 'true';
    process.env.BOOTSTRAP_ADMIN_EMAIL = readArgument('--email', 'admin@parse-forge.com');
    process.env.BOOTSTRAP_ADMIN_PASSWORD = password;
    process.env.BOOTSTRAP_ADMIN_FIRST_NAME = readArgument('--first-name', 'ParseForge');
    process.env.BOOTSTRAP_ADMIN_LAST_NAME = readArgument('--last-name', 'Super Admin');

    await connectDb();

    const User = require('../models/User');
    const user = await ensureBootstrapAdminUser({
        User,
        createPasswordHash: require('../utils/auth').createPasswordHash
    });
    const replaceEmail = readArgument('--replace-email', '').trim().toLowerCase();

    if (replaceEmail && replaceEmail !== user.email) {
        await User.updateOne(
            { email: replaceEmail },
            {
                $set: {
                    role: 'developer',
                    status: 'inactive'
                }
            }
        );
    }

    console.log(
        JSON.stringify(
            {
                success: true,
                id: user.id,
                email: user.email,
                role: user.role,
                replacedEmail: replaceEmail || null
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
