(function initializeTheme() {
    const STORAGE_KEY = 'parseforge_theme';
    const LIGHT_THEME = 'light';
    const DARK_THEME = 'dark';

    function getStoredTheme() {
        try {
            return window.localStorage.getItem(STORAGE_KEY);
        } catch (error) {
            return null;
        }
    }

    function persistTheme(theme) {
        try {
            window.localStorage.setItem(STORAGE_KEY, theme);
        } catch (error) {
            return null;
        }

        return theme;
    }

    function normalizeTheme(theme) {
        return theme === DARK_THEME ? DARK_THEME : LIGHT_THEME;
    }

    function getCurrentTheme() {
        return normalizeTheme(document.documentElement.getAttribute('data-theme'));
    }

    function updateButtons(theme) {
        const isDark = theme === DARK_THEME;
        document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
            button.setAttribute('aria-pressed', String(isDark));
            button.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');

            const icon = button.querySelector('[data-theme-toggle-icon]');
            const label = button.querySelector('[data-theme-toggle-label]');

            if (icon) {
                icon.textContent = isDark ? 'L' : 'D';
            }

            if (label) {
                label.textContent = isDark ? 'Light' : 'Dark';
            }
        });
    }

    function applyTheme(theme, shouldPersist) {
        const nextTheme = normalizeTheme(theme);
        document.documentElement.setAttribute('data-theme', nextTheme);
        document.documentElement.style.colorScheme = nextTheme;

        if (shouldPersist) {
            persistTheme(nextTheme);
        }

        updateButtons(nextTheme);
    }

    function createThemeButton(extraClass) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `theme-toggle${extraClass ? ` ${extraClass}` : ''}`;
        button.setAttribute('data-theme-toggle', '');
        button.innerHTML = '<span data-theme-toggle-icon aria-hidden="true"></span><span data-theme-toggle-label></span>';
        button.addEventListener('click', () => {
            applyTheme(getCurrentTheme() === DARK_THEME ? LIGHT_THEME : DARK_THEME, true);
        });
        return button;
    }

    function mountThemeToggle() {
        const navLinks = document.querySelector('.nav-links');

        if (navLinks && !navLinks.querySelector('[data-theme-toggle]')) {
            const item = document.createElement('li');
            item.className = 'theme-toggle-item';
            item.appendChild(createThemeButton());
            navLinks.insertBefore(item, navLinks.firstChild);
        }

        if (navLinks) {
            const floatingToggle = document.querySelector('.theme-toggle-floating');
            if (floatingToggle) {
                floatingToggle.remove();
            }
        } else if (!document.querySelector('.theme-toggle-floating')) {
            document.body.appendChild(createThemeButton('theme-toggle-floating'));
        }

        updateButtons(getCurrentTheme());
    }

    applyTheme(getStoredTheme(), false);

    window.ParseForgeTheme = {
        applyTheme,
        mountThemeToggle
    };

    document.addEventListener('DOMContentLoaded', () => {
        mountThemeToggle();

        const observer = new MutationObserver(() => mountThemeToggle());
        observer.observe(document.body, { childList: true, subtree: true });
    });
}());
