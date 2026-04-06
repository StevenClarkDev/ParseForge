/**
 * HTML Includes System
 * Loads header and footer from separate HTML files
 */

document.addEventListener('DOMContentLoaded', function onReady() {
    loadIncludes();
});

async function loadIncludes() {
    const headerPlaceholder = document.getElementById('header-placeholder');
    if (headerPlaceholder) {
        try {
            const headerResponse = await fetch('includes/header.html');
            if (headerResponse.ok) {
                const headerHTML = await headerResponse.text();
                headerPlaceholder.innerHTML = headerHTML;
                addPageSpecificElements();
                setActiveNavLink();
            }
        } catch (error) {
            console.error('Error loading header:', error);
        }
    }

    const footerPlaceholder = document.getElementById('footer-placeholder');
    if (footerPlaceholder) {
        try {
            const footerResponse = await fetch('includes/footer.html');
            if (footerResponse.ok) {
                const footerHTML = await footerResponse.text();
                footerPlaceholder.innerHTML = footerHTML;
            }
        } catch (error) {
            console.error('Error loading footer:', error);
        }
    }
}

function addPageSpecificElements() {
    const currentPath = window.location.pathname;
    const navContainer = document.querySelector('.navbar .container');

    if ((currentPath === '/marketplace' || currentPath === '/marketplace.html') && navContainer) {
        const cartButton = document.createElement('button');
        cartButton.className = 'cart-button-nav';
        cartButton.onclick = function handleCartClick() {
            toggleCart();
        };
        cartButton.innerHTML = `
            <span class="cart-icon">Cart</span>
            <span class="cart-count" id="cartCount">0</span>
        `;
        navContainer.appendChild(cartButton);
    }
}

function setActiveNavLink() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-links a');

    navLinks.forEach((link) => {
        const linkHref = link.getAttribute('href');
        link.classList.remove('active');

        if (
            linkHref === currentPath ||
            linkHref === currentPath.replace('.html', '') ||
            (currentPath === '/' && (linkHref === '/' || linkHref === '/index' || linkHref === 'index.html'))
        ) {
            link.classList.add('active');
        }
    });
}
