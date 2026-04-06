const AUTH_TOKEN_KEY = 'parseforge_auth_token';
const SUPPORT_ADMIN_TOKEN_KEY = 'parseforge_support_admin_token';
const SUPPORT_CONTEXT_KEY = 'parseforge_support_context';

function logoutAndRedirect(target = '/login.html') {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    window.sessionStorage.removeItem(AUTH_TOKEN_KEY);
    window.localStorage.removeItem(SUPPORT_ADMIN_TOKEN_KEY);
    window.localStorage.removeItem(SUPPORT_CONTEXT_KEY);
    window.location.href = target;
}

function storeSupportSession(adminToken, supportToken, context = {}) {
    if (adminToken) {
        window.localStorage.setItem(SUPPORT_ADMIN_TOKEN_KEY, adminToken);
    }

    window.localStorage.setItem(AUTH_TOKEN_KEY, supportToken);
    window.localStorage.setItem(SUPPORT_CONTEXT_KEY, JSON.stringify(context));
}

function getSupportContext() {
    try {
        return JSON.parse(window.localStorage.getItem(SUPPORT_CONTEXT_KEY) || 'null');
    } catch (error) {
        return null;
    }
}

function restoreAdminSession(target = '/admin.html') {
    const adminToken = window.localStorage.getItem(SUPPORT_ADMIN_TOKEN_KEY);

    if (!adminToken) {
        logoutAndRedirect('/admin-login.html');
        return false;
    }

    window.localStorage.setItem(AUTH_TOKEN_KEY, adminToken);
    window.localStorage.removeItem(SUPPORT_ADMIN_TOKEN_KEY);
    window.localStorage.removeItem(SUPPORT_CONTEXT_KEY);
    window.location.href = target;
    return true;
}

function isSupportSessionActive() {
    return Boolean(window.localStorage.getItem(SUPPORT_ADMIN_TOKEN_KEY));
}

function attachLogoutHandlers() {
    document.querySelectorAll('[data-logout-link]').forEach((link) => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            logoutAndRedirect(link.getAttribute('href') || '/login.html');
        });
    });
}

document.addEventListener('DOMContentLoaded', attachLogoutHandlers);

window.ParseForgeSession = {
    AUTH_TOKEN_KEY,
    SUPPORT_ADMIN_TOKEN_KEY,
    SUPPORT_CONTEXT_KEY,
    logout: logoutAndRedirect,
    storeSupportSession,
    getSupportContext,
    restoreAdminSession,
    isSupportSessionActive
};
