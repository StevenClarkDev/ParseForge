(function () {
    const STORAGE_KEY = 'parseforge_theme';
    const LIGHT = 'light';
    const DARK = 'dark';

    function getSavedTheme() {
        try {
            return window.localStorage.getItem(STORAGE_KEY);
        } catch (error) {
            return null;
        }
    }

    function saveTheme(theme) {
        try {
            window.localStorage.setItem(STORAGE_KEY, theme);
        } catch (error) {
            return null;
        }

        return theme;
    }

    function normalizeTheme(theme) {
        return theme === DARK ? DARK : LIGHT;
    }

    function updateToggleButtons(theme) {
        const nextTheme = theme === DARK ? LIGHT : DARK;

        document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
            button.setAttribute('aria-label', `Switch to ${nextTheme} theme`);
            button.setAttribute('aria-pressed', String(theme === DARK));
            button.title = `Switch to ${nextTheme} theme`;

            const icon = button.querySelector('[data-theme-toggle-icon]');
            if (icon) {
                icon.textContent = theme === DARK ? 'L' : 'D';
            }
        });
    }

    function applyTheme(theme, persist) {
        const nextTheme = normalizeTheme(theme);
        document.documentElement.setAttribute('data-theme', nextTheme);
        document.documentElement.style.colorScheme = nextTheme;

        if (persist) {
            saveTheme(nextTheme);
        }

        updateToggleButtons(nextTheme);
    }

    applyTheme(getSavedTheme(), false);

    window.ParseForgeTheme = {
        applyTheme,
        updateToggleButtons
    };

    document.addEventListener('click', (event) => {
        const button = event.target.closest('[data-theme-toggle]');
        if (!button) {
            return;
        }

        const currentTheme = normalizeTheme(document.documentElement.getAttribute('data-theme'));
        applyTheme(currentTheme === DARK ? LIGHT : DARK, true);
    });

    document.addEventListener('DOMContentLoaded', () => {
        updateToggleButtons(normalizeTheme(document.documentElement.getAttribute('data-theme')));

        const observer = new MutationObserver(() => {
            updateToggleButtons(normalizeTheme(document.documentElement.getAttribute('data-theme')));
        });

        observer.observe(document.body, { childList: true, subtree: true });
    });
}());
