document.addEventListener('DOMContentLoaded', () => {
    console.log('ParseForge loaded');
});

function toggleMenu() {
    const navLinks = document.querySelector('.nav-links');

    if (navLinks) {
        navLinks.classList.toggle('active');
    }
}

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function handleAnchorClick(event) {
        const target = document.querySelector(this.getAttribute('href'));

        if (!target) {
            return;
        }

        event.preventDefault();
        target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    });
});
