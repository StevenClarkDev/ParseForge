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
    process.env.BOOTSTRAP_ADMIN_EMAIL = readArgument('--email', 'admin@parseforge.dev');
    process.env.BOOTSTRAP_ADMIN_PASSWORD = readArgument('--password', 'ParseForgeAdmin123!');
    process.env.BOOTSTRAP_ADMIN_FIRST_NAME = readArgument('--first-name', 'ParseForge');
    process.env.BOOTSTRAP_ADMIN_LAST_NAME = readArgument('--last-name', 'Admin');

    await connectDb();

    const user = await ensureBootstrapAdminUser({
        User: require('../models/User'),
        createPasswordHash: require('../utils/auth').createPasswordHash
    });

    console.log(
        JSON.stringify(
            {
                success: true,
                id: user.id,
                email: user.email,
                role: user.role,
                password: process.env.BOOTSTRAP_ADMIN_PASSWORD
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
