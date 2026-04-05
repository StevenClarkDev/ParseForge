const AUTH_TOKEN_KEY = 'parseforge_auth_token';

function logoutAndRedirect(target = '/login.html') {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    window.sessionStorage.removeItem(AUTH_TOKEN_KEY);
    window.location.href = target;
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
    logout: logoutAndRedirect
};
