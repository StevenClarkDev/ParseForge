function sanitizeUser(user) {
    return {
        id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        name: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        company: user.company,
        useCase: user.useCase,
        newsletter: user.newsletter,
        plan: user.plan,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt
    };
}

module.exports = {
    sanitizeUser
};
