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
            button.setAttribute('aria-label', isLight ? 'Switch to dark theme' : 'Switch to light theme');
            button.setAttribute('aria-pressed', String(isLight));

            const label = button.querySelector('[data-theme-label]');
            if (label) {
                label.textContent = isLight ? 'Dark' : 'Light';
            }
        });
    }

    setTheme(getSavedTheme() === 'light' ? 'light' : 'dark');

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
    });
}());
