const API_BASE = window.location.origin;
const AUTH_TOKEN_KEY = 'parseforge_auth_token';
const CART_KEY = 'parseforge_cart_v2';
const ITEMS_PER_PAGE = 12;

let catalogItems = [];
let cart = loadCart();
let currentPage = 1;
let currentFilters = {
    category: 'all',
    priceRange: 'all',
    search: '',
    sortBy: 'featured'
};

function loadCart() {
    try {
        const parsed = JSON.parse(window.localStorage.getItem(CART_KEY) || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        return [];
    }
}

function saveCart() {
    window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getAuthHeaders(includeJson = false) {
    const headers = {};
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY);

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    if (includeJson) {
        headers['Content-Type'] = 'application/json';
    }

    return headers;
}

function getCheckoutItemsPayload() {
    return cart.map((item) => ({
        productId: item.productId,
        purchaseType: item.purchaseType
    }));
}

function getSelectedPaymentMethod() {
    return document.querySelector('input[name="payment"]:checked')?.value || 'stripe_checkout';
}

async function fetchCatalog() {
    const response = await fetch(`${API_BASE}/api/catalog`, {
        headers: getAuthHeaders()
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(payload.error || 'Unable to load marketplace items');
    }

    catalogItems = Array.isArray(payload.items) ? payload.items : [];
}

function getProductById(productId) {
    return catalogItems.find((product) => product.id === productId) || null;
}

function getPurchaseOptions(product) {
    return product?.pricing?.purchaseOptions || [];
}

function getPurchaseOption(product, purchaseType) {
    return getPurchaseOptions(product).find((option) => option.type === purchaseType) || null;
}

function getDefaultPurchaseOption(product) {
    const options = getPurchaseOptions(product);
    const defaultType = product?.pricing?.defaultPurchaseType;
    return options.find((option) => option.type === defaultType) || options[0] || null;
}

function getCartKey(productId, purchaseType) {
    return `${productId}:${purchaseType}`;
}

function buildPriceLabel(option) {
    if (!option) {
        return 'Unavailable';
    }

    if (option.type === 'one_time') {
        return `$${option.price.toFixed(2)} once`;
    }

    if (option.type === 'monthly') {
        return `$${option.price.toFixed(2)}/mo`;
    }

    return `$${option.price.toFixed(2)}/yr`;
}

function buildHeroCopy(product) {
    const options = getPurchaseOptions(product);
    const hasOneTime = options.some((option) => option.type === 'one_time');
    const hasSubscription = options.some((option) => option.type === 'monthly' || option.type === 'yearly');

    if (hasOneTime && hasSubscription) {
        return 'Buy once or subscribe';
    }

    if (hasSubscription) {
        return 'Subscription access';
    }

    return 'One-time purchase';
}

function normalizeCart() {
    cart = cart
        .map((entry) => {
            const product = getProductById(entry.productId);
            const option = product ? getPurchaseOption(product, entry.purchaseType) : null;

            if (!product || !option) {
                return null;
            }

            return {
                key: getCartKey(product.id, option.type),
                productId: product.id,
                purchaseType: option.type,
                name: product.name,
                category: product.type,
                icon: product.icon,
                price: option.price,
                priceLabel: buildPriceLabel(option)
            };
        })
        .filter(Boolean);

    saveCart();
}

function filterProducts() {
    return catalogItems.filter((product) => {
        if (currentFilters.category !== 'all' && product.type !== currentFilters.category) {
            return false;
        }

        const effectivePrice = Number(product.pricing?.minPrice || 0);
        if (currentFilters.priceRange !== 'all') {
            if (currentFilters.priceRange === '200+' && effectivePrice < 200) {
                return false;
            }

            if (currentFilters.priceRange !== '200+') {
                const [min, max] = currentFilters.priceRange.split('-').map((value) => Number(value));
                if (effectivePrice < min || effectivePrice > max) {
                    return false;
                }
            }
        }

        if (currentFilters.search) {
            const search = currentFilters.search.toLowerCase();
            const haystacks = [
                product.name,
                product.description,
                product.language,
                ...(product.features || [])
            ].map((value) => String(value || '').toLowerCase());

            if (!haystacks.some((value) => value.includes(search))) {
                return false;
            }
        }

        return true;
    });
}

function sortProducts(products) {
    const sorted = [...products];

    switch (currentFilters.sortBy) {
        case 'price-low':
            return sorted.sort((a, b) => (a.pricing?.minPrice || 0) - (b.pricing?.minPrice || 0));
        case 'price-high':
            return sorted.sort((a, b) => (b.pricing?.minPrice || 0) - (a.pricing?.minPrice || 0));
        case 'popular':
            return sorted.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
        case 'newest':
            return sorted.sort((a, b) => (b.reviews || 0) - (a.reviews || 0));
        default:
            return sorted.sort((a, b) => {
                const badgeOrder = { featured: 0, bestseller: 1, new: 2, '': 3 };
                return (badgeOrder[a.badge || ''] || 9) - (badgeOrder[b.badge || ''] || 9);
            });
    }
}

function createProductCard(product) {
    const defaultOption = getDefaultPurchaseOption(product);
    const badgeHtml = product.badge
        ? `<div class="product-badge ${escapeHtml(product.badge)}">${escapeHtml(product.badge)}</div>`
        : '';
    const options = getPurchaseOptions(product);
    const inCart = defaultOption
        ? cart.some((item) => item.key === getCartKey(product.id, defaultOption.type))
        : false;
    const buttonAction =
        options.length > 1
            ? `event.stopPropagation(); openProductModal('${product.id}')`
            : defaultOption
              ? `event.stopPropagation(); ${inCart ? `removeFromCartByKey('${getCartKey(product.id, defaultOption.type)}')` : `addToCart('${product.id}', '${defaultOption.type}')`}`
              : 'event.stopPropagation();';
    const buttonLabel =
        options.length > 1
            ? 'Choose plan'
            : inCart
              ? 'Added'
              : defaultOption
                ? 'Add to cart'
                : 'Unavailable';

    return `
        <div class="product-card" onclick="openProductModal('${product.id}')">
            ${badgeHtml}
            <div class="product-icon">${escapeHtml(product.icon || product.type.toUpperCase())}</div>
            <div class="product-category">${escapeHtml(product.type)}</div>
            <div class="product-name">${escapeHtml(product.name)}</div>
            <div class="product-description">${escapeHtml(product.description)}</div>
            <div class="billing-badges">
                ${options
                    .map(
                        (option) =>
                            `<span class="billing-badge">${escapeHtml(option.shortLabel)} ${escapeHtml(buildPriceLabel(option))}</span>`,
                    )
                    .join('')}
            </div>
            <ul class="product-features">
                ${(product.features || [])
                    .slice(0, 3)
                    .map((feature) => `<li>${escapeHtml(feature)}</li>`)
                    .join('')}
            </ul>
            <div class="product-footer">
                <div class="price-stack">
                    <div class="product-price">${defaultOption ? `$${defaultOption.price.toFixed(2)}` : 'N/A'}</div>
                    <span class="product-price-label">${escapeHtml(buildHeroCopy(product))}</span>
                </div>
                <button class="add-to-cart-btn ${inCart ? 'added' : ''}" onclick="${buttonAction}">
                    ${escapeHtml(buttonLabel)}
                </button>
            </div>
        </div>
    `;
}

function renderPagination(totalItems) {
    const pagination = document.getElementById('pagination');
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    if (!pagination) {
        return;
    }

    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let markup = '';
    if (currentPage > 1) {
        markup += `<button onclick="changePage(${currentPage - 1})">Previous</button>`;
    }

    for (let index = 1; index <= totalPages; index += 1) {
        const isCurrent = index === currentPage;
        markup += `<button class="${isCurrent ? 'active' : ''}" onclick="changePage(${index})">${index}</button>`;
    }

    if (currentPage < totalPages) {
        markup += `<button onclick="changePage(${currentPage + 1})">Next</button>`;
    }

    pagination.innerHTML = markup;
}

function renderProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) {
        return;
    }

    const filtered = sortProducts(filterProducts());
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const visible = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    grid.innerHTML = visible.map((product) => createProductCard(product)).join('');
    renderPagination(filtered.length);
    updateProductCount(catalogItems.length);
}

function changePage(page) {
    currentPage = page;
    renderProducts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateProductCount(count = catalogItems.length) {
    const element = document.getElementById('totalProducts');
    if (element) {
        element.textContent = String(count);
    }
}

function addToCart(productId, purchaseType) {
    const product = getProductById(productId);
    const option = getPurchaseOption(product, purchaseType);

    if (!product || !option) {
        showNotification('That billing option is not available.', 'error');
        return;
    }

    const key = getCartKey(product.id, option.type);
    if (cart.some((item) => item.key === key)) {
        showNotification('That item is already in your cart.', 'info');
        return;
    }

    cart.push({
        key,
        productId: product.id,
        purchaseType: option.type,
        name: product.name,
        category: product.type,
        icon: product.icon,
        price: option.price,
        priceLabel: buildPriceLabel(option)
    });

    saveCart();
    updateCartUI();
    renderProducts();
    showNotification('Added to cart.', 'success');
}

function removeFromCartByKey(key) {
    cart = cart.filter((item) => item.key !== key);
    saveCart();
    updateCartUI();
    renderProducts();
    showNotification('Removed from cart.', 'info');
}

function updateCartUI() {
    const cartCount = document.getElementById('cartCount');
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    const total = cart.reduce((sum, item) => sum + item.price, 0);

    if (cartCount) {
        cartCount.textContent = String(cart.length);
    }

    if (cartItems) {
        if (!cart.length) {
            cartItems.innerHTML = `
                <div class="empty-cart">
                    <p>Your cart is empty</p>
                    <span style="font-size: 3rem;">Cart</span>
                </div>
            `;
        } else {
            cartItems.innerHTML = cart
                .map(
                    (item) => `
                        <div class="cart-item">
                            <div class="cart-item-icon">${escapeHtml(item.icon || item.category.toUpperCase())}</div>
                            <div class="cart-item-info">
                                <div class="cart-item-name">${escapeHtml(item.name)}</div>
                                <div class="cart-item-category">${escapeHtml(item.priceLabel)}</div>
                                <div class="cart-item-price">$${item.price.toFixed(2)}</div>
                            </div>
                            <button class="remove-item" onclick="removeFromCartByKey('${item.key}')">X</button>
                        </div>
                    `,
                )
                .join('');
        }
    }

    if (cartTotal) {
        cartTotal.textContent = `$${total.toFixed(2)}`;
    }
}

function toggleCart() {
    document.getElementById('cartSidebar')?.classList.toggle('active');
    document.getElementById('cartBackdrop')?.classList.toggle('active');
}

function openProductModal(productId) {
    const product = getProductById(productId);
    const modal = document.getElementById('productModal');
    const details = document.getElementById('productDetails');

    if (!product || !modal || !details) {
        return;
    }

    const options = getPurchaseOptions(product);
    details.innerHTML = `
        <div class="product-detail">
            <div class="product-detail-left">
                <div class="product-detail-icon">${escapeHtml(product.icon || product.type.toUpperCase())}</div>
                <div class="product-screenshots">
                    <div class="screenshot">${escapeHtml(product.type.toUpperCase())}</div>
                    <div class="screenshot">${escapeHtml(product.language)}</div>
                    <div class="screenshot">${escapeHtml(product.version)}</div>
                    <div class="screenshot">${escapeHtml(product.status)}</div>
                </div>
            </div>
            <div class="product-detail-right">
                <div class="product-category">${escapeHtml(product.type)}</div>
                <h2>${escapeHtml(product.name)}</h2>
                <div class="product-rating">
                    <span class="rating-count">${escapeHtml(String(product.rating || 0))} (${escapeHtml(String(product.reviews || 0))} reviews)</span>
                </div>
                <div class="product-detail-description">${escapeHtml(product.description)}</div>
                <div class="product-detail-features">
                    <h3>Included</h3>
                    <ul>
                        ${(product.features || []).map((feature) => `<li>${escapeHtml(feature)}</li>`).join('')}
                    </ul>
                </div>
                <div class="purchase-options">
                    ${options
                        .map(
                            (option) => `
                                <button class="purchase-option-btn" onclick="addToCart('${product.id}', '${option.type}'); closeProductModal();">
                                    ${escapeHtml(option.label)} - ${escapeHtml(buildPriceLabel(option))}
                                </button>
                            `,
                        )
                        .join('')}
                </div>
                <p class="product-price-label" style="margin-top: 1rem;">Documentation: <a href="${escapeHtml(product.documentation || '#')}" style="color: var(--neon-blue);">Open docs</a></p>
            </div>
        </div>
    `;

    modal.classList.add('active');
}

function closeProductModal() {
    document.getElementById('productModal')?.classList.remove('active');
}

function recalculateOrderTotals() {
    const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
    const subtotalElement = document.getElementById('orderSubtotal');
    const totalElement = document.getElementById('orderTotal');
    const taxRow = document.getElementById('taxRow');

    if (subtotalElement) {
        subtotalElement.textContent = `$${subtotal.toFixed(2)}`;
    }

    if (taxRow) {
        taxRow.style.display = 'none';
    }

    if (totalElement) {
        totalElement.textContent = `$${subtotal.toFixed(2)}`;
    }
}

function proceedToCheckout() {
    if (!cart.length) {
        showNotification('Your cart is empty.', 'error');
        return;
    }

    const orderItems = document.getElementById('orderItems');
    if (orderItems) {
        orderItems.innerHTML = cart
            .map(
                (item) => `
                    <div class="order-item">
                        <span class="order-item-name">${escapeHtml(item.name)} (${escapeHtml(item.priceLabel)})</span>
                        <span class="order-item-price">$${item.price.toFixed(2)}</span>
                    </div>
                `,
            )
            .join('');
    }

    recalculateOrderTotals();
    document.getElementById('checkoutModal')?.classList.add('active');

    const emailField = document.querySelector('#checkoutForm input[name="email"]');
    if (emailField && window.localStorage.getItem(AUTH_TOKEN_KEY) && !emailField.value) {
        fetch(`${API_BASE}/api/auth/me`, { headers: getAuthHeaders() })
            .then((response) => response.json())
            .then((payload) => {
                if (payload?.user?.email) {
                    emailField.value = payload.user.email;
                }
            })
            .catch(() => {});
    }

    if (document.getElementById('cartSidebar')?.classList.contains('active')) {
        toggleCart();
    }
}

function closeCheckoutModal() {
    document.getElementById('checkoutModal')?.classList.remove('active');
}

function handlePaymentChange(event) {
    const cardDetails = document.getElementById('cardDetails');
    if (cardDetails) {
        cardDetails.style.display = event.target.value === 'stripe_card' ? 'grid' : 'none';
    }
}

function validateSimulatedCardFields(form) {
    const cardNumber = form.elements.cardNumber?.value.trim() || '';
    const expiry = form.elements.expiry?.value.trim() || '';
    const cvv = form.elements.cvv?.value.trim() || '';

    if (!cardNumber || !expiry || !cvv) {
        throw new Error('Enter the simulated card details to continue.');
    }
}

function handleCountryChange() {
    const stateGroup = document.getElementById('stateGroup');
    const zipGroup = document.getElementById('zipGroup');
    const country = document.getElementById('countrySelect')?.value;

    if (stateGroup) {
        stateGroup.style.display = country === 'US' || country === 'CA' ? 'block' : 'none';
    }

    if (zipGroup) {
        zipGroup.style.display = country ? 'block' : 'none';
    }

    recalculateOrderTotals();
}

async function handleCheckout(event) {
    event.preventDefault();

    const authToken = window.localStorage.getItem(AUTH_TOKEN_KEY);
    if (!authToken) {
        showNotification('Please sign in to complete your order.', 'error');
        window.setTimeout(() => {
            window.location.href = '/login.html';
        }, 900);
        return;
    }

    const submitButton = event.currentTarget.querySelector('button[type="submit"]');
    const paymentMethodType = getSelectedPaymentMethod();
    const items = getCheckoutItemsPayload();

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Creating Stripe session...';
    }

    try {
        if (paymentMethodType === 'stripe_card') {
            validateSimulatedCardFields(event.currentTarget);
        }

        const sessionResponse = await fetch(`${API_BASE}/api/catalog/checkout/session`, {
            method: 'POST',
            headers: getAuthHeaders(true),
            body: JSON.stringify({
                items,
                paymentMethodType
            })
        });

        const sessionPayload = await sessionResponse.json().catch(() => ({}));

        if (sessionResponse.status === 401) {
            window.localStorage.removeItem(AUTH_TOKEN_KEY);
            window.location.href = '/login.html';
            return;
        }

        if (!sessionResponse.ok) {
            throw new Error(sessionPayload.error || 'Unable to create the simulated Stripe session');
        }

        if (submitButton) {
            submitButton.textContent = 'Confirming simulated payment...';
        }

        const response = await fetch(`${API_BASE}/api/catalog/checkout`, {
            method: 'POST',
            headers: getAuthHeaders(true),
            body: JSON.stringify({
                items,
                paymentProvider: 'stripe_simulated',
                paymentMethodType,
                sessionId: sessionPayload.session?.id,
                paymentIntentId: sessionPayload.session?.paymentIntentId
            })
        });

        const payload = await response.json().catch(() => ({}));

        if (response.status === 401) {
            window.localStorage.removeItem(AUTH_TOKEN_KEY);
            window.location.href = '/login.html';
            return;
        }

        if (!response.ok) {
            throw new Error(payload.error || 'Checkout failed');
        }

        cart = [];
        saveCart();
        updateCartUI();
        renderProducts();
        closeCheckoutModal();
        showNotification('Simulated Stripe payment completed successfully.', 'success');
        window.setTimeout(() => {
            window.location.href = '/dashboard.html';
        }, 1200);
    } catch (error) {
        showNotification(error.message || 'Checkout failed.', 'error');
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Complete Simulated Payment';
        }
    }
}

function setupEventListeners() {
    document.getElementById('searchProducts')?.addEventListener('input', (event) => {
        currentFilters.search = event.target.value;
        currentPage = 1;
        renderProducts();
    });

    document.getElementById('categoryFilter')?.addEventListener('change', (event) => {
        currentFilters.category = event.target.value;
        currentPage = 1;
        renderProducts();
    });

    document.getElementById('priceFilter')?.addEventListener('change', (event) => {
        currentFilters.priceRange = event.target.value;
        currentPage = 1;
        renderProducts();
    });

    document.getElementById('sortBy')?.addEventListener('change', (event) => {
        currentFilters.sortBy = event.target.value;
        renderProducts();
    });

    document.getElementById('checkoutForm')?.addEventListener('submit', handleCheckout);
    document.getElementById('countrySelect')?.addEventListener('change', handleCountryChange);
    document
        .querySelectorAll('input[name="payment"]')
        .forEach((input) => input.addEventListener('change', handlePaymentChange));
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'success' ? 'linear-gradient(135deg, rgba(0, 255, 136, 0.2), rgba(29, 233, 182, 0.2))' :
                     type === 'error' ? 'linear-gradient(135deg, rgba(255, 51, 102, 0.2), rgba(255, 0, 85, 0.2))' :
                     'rgba(0, 217, 255, 0.2)'};
        border: 1px solid ${type === 'success' ? 'var(--success)' :
                           type === 'error' ? 'var(--danger)' :
                           'var(--neon-blue)'};
        color: var(--text-primary);
        padding: 1rem 1.5rem;
        border-radius: 12px;
        backdrop-filter: blur(20px);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        z-index: 10000;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    window.setTimeout(() => {
        notification.remove();
    }, 3000);
}

function toggleMenu() {
    const navLinks = document.querySelector('.nav-links');
    if (navLinks) {
        navLinks.classList.toggle('active');
    }
}

async function initializeMarketplace() {
    try {
        await fetchCatalog();
        normalizeCart();
        setupEventListeners();
        handlePaymentChange({ target: { value: getSelectedPaymentMethod() } });
        renderProducts();
        updateCartUI();
        window.setTimeout(updateCartUI, 500);
    } catch (error) {
        showNotification(error.message || 'Unable to load marketplace.', 'error');
    }
}

window.marketplaceDebug = {
    getCatalog: () => catalogItems,
    getCart: () => cart
};

document.addEventListener('DOMContentLoaded', initializeMarketplace);
