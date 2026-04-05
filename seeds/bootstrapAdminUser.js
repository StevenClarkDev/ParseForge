const DEFAULT_BOOTSTRAP_ADMIN = {
    enabled: true,
    firstName: 'ParseForge',
    lastName: 'Admin',
    email: 'admin@parseforge.dev',
    password: 'ParseForgeAdmin123!',
    company: 'ParseForge',
    useCase: 'platform-admin',
    plan: 'enterprise'
};

function normalizeBoolean(value, fallback = true) {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'string') {
        return !['false', '0', 'no', 'off'].includes(value.toLowerCase());
    }

    return fallback;
}

function getBootstrapAdminConfig() {
    const enabled = normalizeBoolean(process.env.BOOTSTRAP_ADMIN_ENABLED, true);

    if (!enabled) {
        return null;
    }

    return {
        firstName: String(process.env.BOOTSTRAP_ADMIN_FIRST_NAME || DEFAULT_BOOTSTRAP_ADMIN.firstName).trim(),
        lastName: String(process.env.BOOTSTRAP_ADMIN_LAST_NAME || DEFAULT_BOOTSTRAP_ADMIN.lastName).trim(),
        email: String(process.env.BOOTSTRAP_ADMIN_EMAIL || DEFAULT_BOOTSTRAP_ADMIN.email).trim().toLowerCase(),
        password: String(process.env.BOOTSTRAP_ADMIN_PASSWORD || DEFAULT_BOOTSTRAP_ADMIN.password),
        company: String(process.env.BOOTSTRAP_ADMIN_COMPANY || DEFAULT_BOOTSTRAP_ADMIN.company).trim(),
        useCase: String(process.env.BOOTSTRAP_ADMIN_USE_CASE || DEFAULT_BOOTSTRAP_ADMIN.useCase).trim(),
        plan: String(process.env.BOOTSTRAP_ADMIN_PLAN || DEFAULT_BOOTSTRAP_ADMIN.plan).trim()
    };
}

async function ensureBootstrapAdminUser({ User, createPasswordHash }) {
    const config = getBootstrapAdminConfig();

    if (!config) {
        return null;
    }

    const user = await User.findOneAndUpdate(
        { email: config.email },
        {
            $set: {
                firstName: config.firstName,
                lastName: config.lastName,
                email: config.email,
                passwordHash: createPasswordHash(config.password),
                company: config.company,
                useCase: config.useCase,
                newsletter: false,
                plan: config.plan,
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

    return {
        id: user._id.toString(),
        email: user.email,
        role: user.role
    };
}

module.exports = {
    DEFAULT_BOOTSTRAP_ADMIN,
    ensureBootstrapAdminUser,
    getBootstrapAdminConfig
};
