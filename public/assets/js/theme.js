(function () {
    const storageKey = 'parseforge_theme';

    function getSavedTheme() {
        try {
            return window.localStorage.getItem(storageKey);
        } catch (error) {
            return null;
        }
    }

    function saveTheme(theme) {
        try {
            window.localStorage.setItem(storageKey, theme);
        } catch (error) {
            return;
        }
    }

    function setTheme(theme) {
        const isLight = theme === 'light';
        document.documentElement.setAttribute('data-theme', isLight ? 'light' : 'dark');
        document.documentElement.style.colorScheme = isLight ? 'light' : 'dark';

        document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
            const ariaLabel = isLight ? 'Switch to dark theme' : 'Switch to light theme';
            const ariaPressed = String(isLight);
            if (button.getAttribute('aria-label') !== ariaLabel) {
                button.setAttribute('aria-label', ariaLabel);
            }
            if (button.getAttribute('aria-pressed') !== ariaPressed) {
                button.setAttribute('aria-pressed', ariaPressed);
            }
            button.classList.toggle('is-light', isLight);

            const label = button.querySelector('[data-theme-label]');
            const labelText = isLight ? 'Dark' : 'Light';
            if (label && label.textContent !== labelText) {
                label.textContent = labelText;
            }
        });
    }

    setTheme(getSavedTheme() === 'dark' ? 'dark' : 'light');

    document.addEventListener('click', (event) => {
        const button = event.target.closest('[data-theme-toggle]');
        if (!button) {
            return;
        }

        const nextTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        saveTheme(nextTheme);
        setTheme(nextTheme);
    });

    document.addEventListener('DOMContentLoaded', () => {
        setTheme(document.documentElement.getAttribute('data-theme'));

        const observer = new MutationObserver(() => {
            setTheme(document.documentElement.getAttribute('data-theme'));
        });

        observer.observe(document.body, { childList: true, subtree: true });
    });
}());
