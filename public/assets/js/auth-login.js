const AUTH_TOKEN_KEY = 'parseforge_auth_token';
const loginForm = document.getElementById('loginForm');
const authMessage = document.getElementById('authMessage');
const submitButton = document.getElementById('loginSubmit');

if (window.localStorage.getItem(AUTH_TOKEN_KEY)) {
    window.location.replace('dashboard.html');
}

function setLoginMessage(message, type) {
    authMessage.className = `auth-message ${type}`;
    authMessage.textContent = message;
}

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    submitButton.disabled = true;
    setLoginMessage('', 'error');
    authMessage.className = 'auth-message';

    try {
        const response = await fetch(`${window.location.origin}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: document.getElementById('email').value,
                password: document.getElementById('password').value
            })
        });

        const payload = await response.json();

        if (!response.ok) {
            throw new Error(payload.error || 'Unable to sign in');
        }

        window.localStorage.setItem(AUTH_TOKEN_KEY, payload.token);
        setLoginMessage('Login successful. Redirecting to your dashboard...', 'success');

        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 600);
    } catch (error) {
        setLoginMessage(error.message, 'error');
    } finally {
        submitButton.disabled = false;
    }
});
