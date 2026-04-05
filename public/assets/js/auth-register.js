const AUTH_TOKEN_KEY = 'parseforge_auth_token';
const registerForm = document.getElementById('registerForm');
const authMessage = document.getElementById('authMessage');
const submitButton = document.getElementById('registerSubmit');

if (window.localStorage.getItem(AUTH_TOKEN_KEY)) {
    window.location.replace('dashboard.html');
}

function setRegisterMessage(message, type) {
    authMessage.className = `auth-message ${type}`;
    authMessage.textContent = message;
}

registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    authMessage.className = 'auth-message';

    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
        setRegisterMessage('Passwords do not match.', 'error');
        return;
    }

    if (password.length < 8) {
        setRegisterMessage('Password must be at least 8 characters long.', 'error');
        return;
    }

    submitButton.disabled = true;

    try {
        const response = await fetch(`${window.location.origin}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                firstName: document.getElementById('firstName').value,
                lastName: document.getElementById('lastName').value,
                email: document.getElementById('email').value,
                company: document.getElementById('company').value,
                useCase: document.getElementById('useCase').value,
                password,
                newsletter: document.getElementById('newsletter').checked
            })
        });

        const payload = await response.json();

        if (!response.ok) {
            throw new Error(payload.error || 'Unable to create account');
        }

        window.localStorage.setItem(AUTH_TOKEN_KEY, payload.token);
        setRegisterMessage('Account created. Redirecting to your dashboard...', 'success');

        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 700);
    } catch (error) {
        setRegisterMessage(error.message, 'error');
    } finally {
        submitButton.disabled = false;
    }
});
