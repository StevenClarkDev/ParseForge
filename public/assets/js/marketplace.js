const API_BASE = window.location.origin;
const AUTH_TOKEN_KEY = 'parseforge_auth_token';
const CART_KEY = 'parseforge_cart_v2';
const ITEMS_PER_PAGE = 9;

let catalogItems = [];
let cart = loadCart();
let currentPage = 1;
let currentFilters = {
    category: 'all',
    billing: 'all',
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

function formatCompactNumber(value) {
    return new Intl.NumberFormat('en-US', {
        notation: 'compact',
        maximumFractionDigits: 1
    }).format(Number(value || 0));
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

function getCardBrand(cardNumber) {
    const digits = String(cardNumber || '').replace(/\D/g, '');

    if (digits.startsWith('4')) return 'Visa';
    if (/^5[1-5]/.test(digits)) return 'Mastercard';
    if (/^3[47]/.test(digits)) return 'American Express';
    if (/^6(?:011|5)/.test(digits)) return 'Discover';
    return 'Card';
}

function buildPaymentDetailsPayload(form, paymentMethodType) {
    const fullName = form.elements.fullName?.value.trim() || '';
    const email = form.elements.email?.value.trim() || '';
    const company = form.elements.company?.value.trim() || '';
    const country = form.elements.country?.value || '';
    const region = form.elements.state?.value || '';
    const postalCode = form.elements.zipCode?.value.trim() || '';
    const paymentDetails = {
        billingName: fullName,
        billingEmail: email,
        companyName: company,
        country,
        region,
        postalCode,
        cardholderName: fullName,
        cardBrand: '',
        cardLast4: '',
        expiryMonth: '',
        expiryYear: ''
    };

    if (paymentMethodType === 'stripe_card') {
        const cardNumber = form.elements.cardNumber?.value.trim() || '';
        const expiry = form.elements.expiry?.value.trim() || '';
        const [month = '', year = ''] = expiry.split('/');

        paymentDetails.cardBrand = getCardBrand(cardNumber);
        paymentDetails.cardLast4 = cardNumber.replace(/\D/g, '').slice(-4);
        paymentDetails.expiryMonth = month;
        paymentDetails.expiryYear = year;
    }

    return paymentDetails;
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

function buildStartingPriceLabel(product) {
    const defaultOption = getDefaultPurchaseOption(product);

    if (!defaultOption) {
        return 'Unavailable';
    }

    if (defaultOption.type === 'one_time') {
        return `$${defaultOption.price.toFixed(2)} once`;
    }

    if (defaultOption.type === 'monthly') {
        return `From $${defaultOption.price.toFixed(2)}/mo`;
    }

    return `From $${defaultOption.price.toFixed(2)}/yr`;
}

function getBillingSummary(product) {
    return product?.pricing?.billingModel === 'subscription'
        ? 'Subscription'
        : 'One-time license';
}

function hasOwnership(product) {
    return Boolean(product?.ownership?.hasOneTimeAccess || product?.ownership?.hasSubscription);
}

function getOwnershipLabel(product) {
    if (product?.ownership?.hasOneTimeAccess) {
        return 'Owned';
    }

    if (product?.ownership?.hasSubscription) {
        return 'Subscribed';
    }

    return '';
}

function isOwnedForPurchase(product, purchaseType) {
    if (!product?.ownership) {
        return false;
    }

    if (purchaseType === 'one_time') {
        return product.ownership.hasOneTimeAccess;
    }

    return product.ownership.hasSubscription;
}

function normalizeCart() {
    cart = cart
        .map((entry) => {
            const product = getProductById(entry.productId);
            const option = product ? getPurchaseOption(product, entry.purchaseType) : null;

            if (!product || !option || isOwnedForPurchase(product, option.type)) {
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

        if (currentFilters.billing !== 'all' && product.pricing?.billingModel !== currentFilters.billing) {
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
                product.version,
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
        case 'top-rated':
            return sorted.sort(
                (a, b) => (b.rating || 0) - (a.rating || 0) || (b.reviews || 0) - (a.reviews || 0)
            );
        case 'newest':
            return sorted.sort((a, b) => (b.reviews || 0) - (a.reviews || 0));
        default:
            return sorted.sort((a, b) => {
                const badgeOrder = { featured: 0, bestseller: 1, new: 2, '': 3 };
                return (badgeOrder[a.badge || ''] || 9) - (badgeOrder[b.badge || ''] || 9);
            });
    }
}

function updateHeroStats() {
    const statMap = {
        heroApiCount: catalogItems.filter((item) => item.type === 'api').length,
        heroSdkCount: catalogItems.filter((item) => item.type === 'sdk').length,
        heroSubscriptionProducts: catalogItems.filter(
            (item) => item.pricing?.billingModel === 'subscription'
        ).length,
        heroOneTimeProducts: catalogItems.filter((item) => item.pricing?.billingModel === 'one_time')
            .length
    };

    Object.entries(statMap).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = String(value);
        }
    });
}

function renderCollections() {
    const grid = document.getElementById('collectionGrid');
    if (!grid) {
        return;
    }

    const mostPopularApi = [...catalogItems]
        .filter((item) => item.type === 'api')
        .sort((a, b) => (b.downloads || 0) - (a.downloads || 0))[0];
    const bestSdk = [...catalogItems]
        .filter((item) => item.type === 'sdk')
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
    const topRated = [...catalogItems].sort(
        (a, b) => (b.rating || 0) - (a.rating || 0) || (b.reviews || 0) - (a.reviews || 0)
    )[0];

    const collections = [
        {
            title: 'Operational APIs',
            description:
                'Managed products for teams that need recurring value, uptime, and commercially clear subscription access.',
            actionLabel: 'View subscription APIs',
            action: `applyQuickFilter('api', 'subscription', 'popular')`,
            product: mostPopularApi
        },
        {
            title: 'Implementation SDKs',
            description:
                'One-time purchases for teams that want reusable integration kits and fast rollout without monthly overhead.',
            actionLabel: 'View one-time SDKs',
            action: `applyQuickFilter('sdk', 'one_time', 'top-rated')`,
            product: bestSdk
        },
        {
            title: 'High-Intent Picks',
            description:
                'The most persuasive products in the catalog for buyers comparing proof, adoption, and rollout speed.',
            actionLabel: 'See top-rated products',
            action: `applyQuickFilter('all', 'all', 'top-rated')`,
            product: topRated
        }
    ];

    grid.innerHTML = collections
        .map((collection) => {
            const product = collection.product;
            return `
                <article class="collection-card">
                    <div class="collection-topline">
                        <span class="showcase-chip">${escapeHtml(collection.title)}</span>
                        <span class="collection-product-type">${escapeHtml(product?.type?.toUpperCase() || 'CATALOG')}</span>
                    </div>
                    <h3>${escapeHtml(collection.title)}</h3>
                    <p>${escapeHtml(collection.description)}</p>
                    ${
                        product
                            ? `
                                <div class="collection-featured-product">
                                    <strong>${escapeHtml(product.name)}</strong>
                                    <span>${escapeHtml(buildStartingPriceLabel(product))}</span>
                                </div>
                              `
                            : ''
                    }
                    <button type="button" class="btn-secondary" onclick="${collection.action}">
                        ${escapeHtml(collection.actionLabel)}
                    </button>
                </article>
            `;
        })
        .join('');
}

function renderActiveFilters() {
    const container = document.getElementById('activeFilters');
    if (!container) {
        return;
    }

    const chips = [];

    if (currentFilters.search) {
        chips.push(`Search: ${currentFilters.search}`);
    }

    if (currentFilters.category !== 'all') {
        chips.push(`Type: ${currentFilters.category.toUpperCase()}`);
    }

    if (currentFilters.billing !== 'all') {
        chips.push(
            `Billing: ${currentFilters.billing === 'one_time' ? 'ONE-TIME' : 'SUBSCRIPTION'}`
        );
    }

    if (currentFilters.priceRange !== 'all') {
        chips.push(`Price: ${currentFilters.priceRange}`);
    }

    if (currentFilters.sortBy !== 'featured') {
        chips.push(`Sort: ${currentFilters.sortBy.replace('-', ' ')}`);
    }

    if (!chips.length) {
        container.innerHTML = '<span class="filter-chip">No filters applied</span>';
        return;
    }

    container.innerHTML = `
        ${chips.map((chip) => `<span class="filter-chip">${escapeHtml(chip)}</span>`).join('')}
        <button type="button" class="filter-chip filter-chip-clear" onclick="clearFilters()">Clear all</button>
    `;
}

function updateResultsSummary(filteredProducts) {
    const countElement = document.getElementById('resultsCount');
    const summaryElement = document.getElementById('resultsSummary');

    if (countElement) {
        countElement.textContent = String(filteredProducts.length);
    }

    if (summaryElement) {
        summaryElement.textContent =
            filteredProducts.length === catalogItems.length
                ? 'products ready to ship'
                : 'products match your current filters';
    }
}

function createProductCard(product) {
    const defaultOption = getDefaultPurchaseOption(product);
    const options = getPurchaseOptions(product);
    const ownershipLabel = getOwnershipLabel(product);
    const isOwned = hasOwnership(product);
    const docsHref = isOwned ? `/docs.html?product=${encodeURIComponent(product.slug || product.id)}` : '#';
    const docsLabel = isOwned ? 'Open docs' : 'Docs locked';
    const badgeHtml = product.badge
        ? `<div class="product-badge ${escapeHtml(product.badge)}">${escapeHtml(product.badge)}</div>`
        : '';
    const inCart = defaultOption
        ? cart.some((item) => item.key === getCartKey(product.id, defaultOption.type))
        : false;
    const buttonAction =
        options.length > 1 && !isOwned
            ? `event.stopPropagation(); openProductModal('${product.id}')`
            : defaultOption && !isOwned
              ? `event.stopPropagation(); ${inCart ? `removeFromCartByKey('${getCartKey(product.id, defaultOption.type)}')` : `addToCart('${product.id}', '${defaultOption.type}')`}`
              : 'event.stopPropagation();';
    const buttonLabel =
        isOwned
            ? ownershipLabel
            : options.length > 1
              ? 'Choose plan'
              : inCart
                ? 'Added'
                : defaultOption
                  ? 'Add to cart'
                  : 'Unavailable';

    return `
        <article class="product-card" onclick="openProductModal('${product.id}')">
            <div class="product-topline">
                ${badgeHtml}
                ${ownershipLabel ? `<div class="ownership-badge">${escapeHtml(ownershipLabel)}</div>` : ''}
            </div>
            <div class="product-icon">${escapeHtml(product.icon || product.type.toUpperCase())}</div>
            <div class="product-category-row">
                <div class="product-category">${escapeHtml(product.type)}</div>
                <span class="purchase-status">${escapeHtml(getBillingSummary(product))}</span>
            </div>
            <div class="product-name">${escapeHtml(product.name)}</div>
            <div class="product-description">${escapeHtml(product.description)}</div>
            <div class="product-stats">
                <span class="product-stat">${escapeHtml(`${Number(product.rating || 0).toFixed(1)} rating`)}</span>
                <span class="product-stat">${escapeHtml(`${formatCompactNumber(product.downloads || 0)} downloads`)}</span>
                <span class="product-stat">${escapeHtml(product.status || 'stable')}</span>
            </div>
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
                    <div class="product-price">${escapeHtml(buildStartingPriceLabel(product))}</div>
                    <span class="product-price-label">${escapeHtml(product.language)} · ${escapeHtml(`${product.reviews || 0} reviews`)}</span>
                </div>
            </div>
            <div class="product-cta-row">
                <a class="docs-link ${isOwned ? '' : 'locked'}" href="${escapeHtml(docsHref)}" onclick="event.stopPropagation(); ${isOwned ? '' : "showNotification('Purchase this product to unlock its documentation.', 'info'); return false;"}">${escapeHtml(docsLabel)}</a>
                <button class="add-to-cart-btn ${inCart || isOwned ? 'added' : ''}" onclick="${buttonAction}">
                    ${escapeHtml(buttonLabel)}
                </button>
            </div>
        </article>
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
    const emptyResults = document.getElementById('emptyResults');
    if (!grid) {
        return;
    }

    const filtered = sortProducts(filterProducts());
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const visible = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    updateResultsSummary(filtered);
    renderActiveFilters();

    if (!filtered.length) {
        grid.innerHTML = '';
        if (emptyResults) {
            emptyResults.hidden = false;
        }
        renderPagination(0);
        return;
    }

    if (emptyResults) {
        emptyResults.hidden = true;
    }

    grid.innerHTML = visible.map((product) => createProductCard(product)).join('');
    renderPagination(filtered.length);
}

function changePage(page) {
    currentPage = page;
    renderProducts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function addToCart(productId, purchaseType) {
    const product = getProductById(productId);
    const option = getPurchaseOption(product, purchaseType);

    if (!product || !option) {
        showNotification('That billing option is not available.', 'error');
        return;
    }

    if (isOwnedForPurchase(product, option.type)) {
        showNotification('Your account already has access to this product.', 'info');
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
                    <span class="empty-cart-label">Add a license or subscription to get started</span>
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
    const ownershipLabel = getOwnershipLabel(product);
    const isOwned = hasOwnership(product);
    const docsHref = isOwned ? `/docs.html?product=${encodeURIComponent(product.slug || product.id)}` : '#';
    details.innerHTML = `
        <div class="product-detail">
            <div class="product-detail-left">
                <div class="product-detail-icon">${escapeHtml(product.icon || product.type.toUpperCase())}</div>
                <div class="product-fact-grid">
                    <div class="product-fact-card">
                        <span>Billing</span>
                        <strong>${escapeHtml(getBillingSummary(product))}</strong>
                    </div>
                    <div class="product-fact-card">
                        <span>Version</span>
                        <strong>${escapeHtml(product.version || 'v1')}</strong>
                    </div>
                    <div class="product-fact-card">
                        <span>Downloads</span>
                        <strong>${escapeHtml(formatCompactNumber(product.downloads || 0))}</strong>
                    </div>
                    <div class="product-fact-card">
                        <span>Status</span>
                        <strong>${escapeHtml(product.status || 'stable')}</strong>
                    </div>
                </div>
            </div>
            <div class="product-detail-right">
                <div class="product-category-row">
                    <div class="product-category">${escapeHtml(product.type)}</div>
                    ${ownershipLabel ? `<span class="ownership-badge">${escapeHtml(ownershipLabel)}</span>` : ''}
                </div>
                <h2>${escapeHtml(product.name)}</h2>
                <div class="product-rating">
                    <span class="rating-count">${escapeHtml(`${Number(product.rating || 0).toFixed(1)} rating · ${product.reviews || 0} reviews`)}</span>
                </div>
                <div class="product-detail-description">${escapeHtml(product.description)}</div>
                <div class="product-detail-features">
                    <h3>What the buyer gets</h3>
                    <ul>
                        ${(product.features || []).map((feature) => `<li>${escapeHtml(feature)}</li>`).join('')}
                    </ul>
                </div>
                <div class="product-modal-actions">
                    <a class="btn-secondary" href="${escapeHtml(docsHref)}" onclick="${isOwned ? '' : "showNotification('Purchase this product to unlock its documentation.', 'info'); return false;"}">${escapeHtml(isOwned ? 'Open docs' : 'Docs locked')}</a>
                    <a class="btn-secondary" href="/login?next=/dashboard.html">Buyer dashboard</a>
                </div>
                <div class="purchase-options">
                    ${options
                        .map((option) => {
                            const optionOwned = isOwnedForPurchase(product, option.type);
                            const optionInCart = cart.some(
                                (item) => item.key === getCartKey(product.id, option.type)
                            );
                            const buttonLabel = optionOwned
                                ? ownershipLabel
                                : optionInCart
                                  ? 'Added to cart'
                                  : 'Add to cart';

                            return `
                                <button class="purchase-option-btn ${optionOwned || optionInCart ? 'added' : ''}" onclick="${optionOwned ? '' : `addToCart('${product.id}', '${option.type}'); closeProductModal();`}">
                                    <span class="purchase-option-title">${escapeHtml(option.label)}</span>
                                    <span class="purchase-option-price">${escapeHtml(buildPriceLabel(option))}</span>
                                    <span class="purchase-option-copy">${escapeHtml(optionOwned ? 'Your account already has access to this product.' : 'Attach this plan to your buyer workspace after checkout.')}</span>
                                    <span class="purchase-option-action">${escapeHtml(buttonLabel)}</span>
                                </button>
                            `;
                        })
                        .join('')}
                </div>
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
            window.location.href = '/login.html?next=/marketplace.html';
        }, 900);
        return;
    }

    const submitButton = event.currentTarget.querySelector('button[type="submit"]');
    const paymentMethodType = getSelectedPaymentMethod();
    const items = getCheckoutItemsPayload();
    const paymentDetails = buildPaymentDetailsPayload(event.currentTarget, paymentMethodType);

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
            window.location.href = '/login.html?next=/marketplace.html';
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
                paymentIntentId: sessionPayload.session?.paymentIntentId,
                paymentDetails
            })
        });

        const payload = await response.json().catch(() => ({}));

        if (response.status === 401) {
            window.localStorage.removeItem(AUTH_TOKEN_KEY);
            window.location.href = '/login.html?next=/marketplace.html';
            return;
        }

        if (!response.ok) {
            throw new Error(payload.error || 'Checkout failed');
        }

        cart = [];
        saveCart();
        await fetchCatalog();
        normalizeCart();
        updateHeroStats();
        renderCollections();
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

    document.getElementById('billingFilter')?.addEventListener('change', (event) => {
        currentFilters.billing = event.target.value;
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

function applyQuickFilter(category = 'all', billing = 'all', sortBy = 'featured') {
    currentFilters.category = category;
    currentFilters.billing = billing;
    currentFilters.sortBy = sortBy;
    currentPage = 1;

    document.getElementById('categoryFilter').value = category;
    document.getElementById('billingFilter').value = billing;
    document.getElementById('sortBy').value = sortBy;

    renderProducts();
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function clearFilters() {
    currentFilters = {
        category: 'all',
        billing: 'all',
        priceRange: 'all',
        search: '',
        sortBy: 'featured'
    };
    currentPage = 1;

    document.getElementById('searchProducts').value = '';
    document.getElementById('categoryFilter').value = 'all';
    document.getElementById('billingFilter').value = 'all';
    document.getElementById('priceFilter').value = 'all';
    document.getElementById('sortBy').value = 'featured';

    renderProducts();
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
        const requestedType = new URLSearchParams(window.location.search).get('type');
        if (requestedType === 'api' || requestedType === 'sdk') {
            currentFilters.category = requestedType;
            const categoryFilter = document.getElementById('categoryFilter');
            if (categoryFilter) {
                categoryFilter.value = requestedType;
            }
        }
        normalizeCart();
        setupEventListeners();
        handlePaymentChange({ target: { value: getSelectedPaymentMethod() } });
        updateHeroStats();
        renderCollections();
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

window.changePage = changePage;
window.toggleCart = toggleCart;
window.openProductModal = openProductModal;
window.closeProductModal = closeProductModal;
window.proceedToCheckout = proceedToCheckout;
window.closeCheckoutModal = closeCheckoutModal;
window.addToCart = addToCart;
window.removeFromCartByKey = removeFromCartByKey;
window.applyQuickFilter = applyQuickFilter;
window.clearFilters = clearFilters;

document.addEventListener('DOMContentLoaded', initializeMarketplace);
