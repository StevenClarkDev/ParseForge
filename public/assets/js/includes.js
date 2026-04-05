/**
 * HTML Includes System
 * Loads header and footer from separate HTML files
 */

// Load HTML includes on page load
document.addEventListener('DOMContentLoaded', function() {
    loadIncludes();
});

async function loadIncludes() {
    // Load header
    const headerPlaceholder = document.getElementById('header-placeholder');
    if (headerPlaceholder) {
        try {
            const headerResponse = await fetch('includes/header.html');
            if (headerResponse.ok) {
                const headerHTML = await headerResponse.text();
                headerPlaceholder.innerHTML = headerHTML;
                
                // Add page-specific elements after header is loaded
                addPageSpecificElements();

                // Set active nav link after header is loaded
                setActiveNavLink();
            }
        } catch (error) {
            console.error('Error loading header:', error);
        }
    }

    // Load footer
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

// Add page-specific elements to header
function addPageSpecificElements() {
    const currentPath = window.location.pathname;
    const navContainer = document.querySelector('.navbar .container');
    
    // Add cart button for marketplace page
    if ((currentPath === '/marketplace' || currentPath === '/marketplace.html') && navContainer) {
        const cartButton = document.createElement('button');
        cartButton.className = 'cart-button-nav';
        cartButton.onclick = function() { toggleCart(); };
        cartButton.innerHTML = `
            <span class="cart-icon">🛒</span>
            <span class="cart-count" id="cartCount">0</span>
        `;
        navContainer.appendChild(cartButton);
    }
}

// Set active class on current page's nav link
function setActiveNavLink() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-links a');
    
    navLinks.forEach(link => {
        const linkHref = link.getAttribute('href');
        link.classList.remove('active');
        
        // Match both /page and /page.html formats
        if (linkHref === currentPath || 
            linkHref === currentPath.replace('.html', '') ||
            (currentPath === '/' && (linkHref === '/' || linkHref === '/index' || linkHref === 'index.html'))) {
            link.classList.add('active');
        }
    });
}
