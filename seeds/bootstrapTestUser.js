const DEFAULT_BOOTSTRAP_TEST_USER = {
    enabled: true,
    firstName: 'Test',
    lastName: 'Developer',
    email: 'tester@parseforge.dev',
    password: 'ParseForgeUser123!',
    company: 'ParseForge QA',
    useCase: 'login-testing',
    plan: 'starter'
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

function getBootstrapTestUserConfig() {
    const enabled = normalizeBoolean(process.env.BOOTSTRAP_TEST_USER_ENABLED, true);

    if (!enabled) {
        return null;
    }

    return {
        firstName: String(process.env.BOOTSTRAP_TEST_USER_FIRST_NAME || DEFAULT_BOOTSTRAP_TEST_USER.firstName).trim(),
        lastName: String(process.env.BOOTSTRAP_TEST_USER_LAST_NAME || DEFAULT_BOOTSTRAP_TEST_USER.lastName).trim(),
        email: String(process.env.BOOTSTRAP_TEST_USER_EMAIL || DEFAULT_BOOTSTRAP_TEST_USER.email).trim().toLowerCase(),
        password: String(process.env.BOOTSTRAP_TEST_USER_PASSWORD || DEFAULT_BOOTSTRAP_TEST_USER.password),
        company: String(process.env.BOOTSTRAP_TEST_USER_COMPANY || DEFAULT_BOOTSTRAP_TEST_USER.company).trim(),
        useCase: String(process.env.BOOTSTRAP_TEST_USER_USE_CASE || DEFAULT_BOOTSTRAP_TEST_USER.useCase).trim(),
        plan: String(process.env.BOOTSTRAP_TEST_USER_PLAN || DEFAULT_BOOTSTRAP_TEST_USER.plan).trim()
    };
}

async function ensureBootstrapTestUser({ User, createPasswordHash }) {
    const config = getBootstrapTestUserConfig();

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
                role: 'developer',
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
    DEFAULT_BOOTSTRAP_TEST_USER,
    ensureBootstrapTestUser,
    getBootstrapTestUserConfig
};
