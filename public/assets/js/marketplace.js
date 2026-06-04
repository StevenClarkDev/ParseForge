const API_BASE = window.location.origin;
const AUTH_TOKEN_KEY = 'parseforge_auth_token';
const ITEMS_PER_PAGE = 9;
const REGION_OPTIONS = {
    US: [
        ['AL', 'Alabama'],
        ['AK', 'Alaska'],
        ['AZ', 'Arizona'],
        ['AR', 'Arkansas'],
        ['CA', 'California'],
        ['CO', 'Colorado'],
        ['CT', 'Connecticut'],
        ['DE', 'Delaware'],
        ['FL', 'Florida'],
        ['GA', 'Georgia'],
        ['HI', 'Hawaii'],
        ['ID', 'Idaho'],
        ['IL', 'Illinois'],
        ['IN', 'Indiana'],
        ['IA', 'Iowa'],
        ['KS', 'Kansas'],
        ['KY', 'Kentucky'],
        ['LA', 'Louisiana'],
        ['ME', 'Maine'],
        ['MD', 'Maryland'],
        ['MA', 'Massachusetts'],
        ['MI', 'Michigan'],
        ['MN', 'Minnesota'],
        ['MS', 'Mississippi'],
        ['MO', 'Missouri'],
        ['MT', 'Montana'],
        ['NE', 'Nebraska'],
        ['NV', 'Nevada'],
        ['NH', 'New Hampshire'],
        ['NJ', 'New Jersey'],
        ['NM', 'New Mexico'],
        ['NY', 'New York'],
        ['NC', 'North Carolina'],
        ['ND', 'North Dakota'],
        ['OH', 'Ohio'],
        ['OK', 'Oklahoma'],
        ['OR', 'Oregon'],
        ['PA', 'Pennsylvania'],
        ['RI', 'Rhode Island'],
        ['SC', 'South Carolina'],
        ['SD', 'South Dakota'],
        ['TN', 'Tennessee'],
        ['TX', 'Texas'],
        ['UT', 'Utah'],
        ['VT', 'Vermont'],
        ['VA', 'Virginia'],
        ['WA', 'Washington'],
        ['WV', 'West Virginia'],
        ['WI', 'Wisconsin'],
        ['WY', 'Wyoming']
    ],
    CA: [
        ['AB', 'Alberta'],
        ['BC', 'British Columbia'],
        ['MB', 'Manitoba'],
        ['NB', 'New Brunswick'],
        ['NL', 'Newfoundland and Labrador'],
        ['NS', 'Nova Scotia'],
        ['NT', 'Northwest Territories'],
        ['NU', 'Nunavut'],
        ['ON', 'Ontario'],
        ['PE', 'Prince Edward Island'],
        ['QC', 'Quebec'],
        ['SK', 'Saskatchewan'],
        ['YT', 'Yukon']
    ]
};

let catalogItems = [];
let selectedCheckoutItem = null;
let currentPage = 1;
let currentFilters = {
    category: 'all',
    billing: 'all',
    priceRange: 'all',
    search: '',
    sortBy: 'featured'
};

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
    return selectedCheckoutItem
        ? [{ productId: selectedCheckoutItem.productId, purchaseType: selectedCheckoutItem.purchaseType }]
        : [];
}

function hasAuthToken() {
    return Boolean(window.localStorage.getItem(AUTH_TOKEN_KEY));
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

    if (payload.sessionExpired) {
        window.localStorage.removeItem(AUTH_TOKEN_KEY);
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
            if (currentFilters.priceRange === '10000+' && effectivePrice < 10000) {
                return false;
            }

            if (currentFilters.priceRange !== '10000+') {
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
        chips.push(`Price: ${formatPriceRangeLabel(currentFilters.priceRange)}`);
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

function formatPriceRangeLabel(range) {
    const labels = {
        '999-2499': '$999 - $2,499',
        '2500-4999': '$2,500 - $4,999',
        '5000-9999': '$5,000 - $9,999',
        '10000+': '$10,000+'
    };

    return labels[range] || range;
}

function updateResultsSummary(filteredProducts) {
    const countElement = document.getElementById('resultsCount');
    const summaryElement = document.getElementById('resultsSummary');

    if (countElement) {
        countElement.textContent = filteredProducts.length === catalogItems.length ? 'Catalog' : 'Filtered catalog';
    }

    if (summaryElement) {
        summaryElement.textContent =
            filteredProducts.length === catalogItems.length
                ? 'Browse buyer-ready APIs and SDKs by category, billing model, and implementation fit.'
                : 'Review the products that match your current filters.';
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
    const buttonAction =
        options.length > 1 && !isOwned
            ? `event.stopPropagation(); openProductModal('${product.id}')`
            : defaultOption && !isOwned
              ? `event.stopPropagation(); openCheckout('${product.id}', '${defaultOption.type}')`
              : 'event.stopPropagation();';
    const buttonLabel =
        isOwned
            ? ownershipLabel
            : options.length > 1
              ? 'Choose plan'
              : defaultOption
                ? 'Buy now'
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
                    <span class="product-price-label">${escapeHtml(`${product.language} - ${product.reviews || 0} reviews`)}</span>
                </div>
            </div>
            <div class="product-cta-row">
                <a class="docs-link ${isOwned ? '' : 'locked'}" href="${escapeHtml(docsHref)}" onclick="event.stopPropagation(); ${isOwned ? '' : "showNotification('Purchase this product to unlock its documentation.', 'info'); return false;"}">${escapeHtml(docsLabel)}</a>
                <button class="checkout-now-btn ${isOwned ? 'added' : ''}" onclick="${buttonAction}">
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
    scrollToCatalogResults();
}

function scrollToCatalogResults() {
    const target =
        document.getElementById('catalogResultsAnchor') ||
        document.getElementById('productsGrid') ||
        document.getElementById('catalog');

    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function openCheckout(productId, purchaseType) {
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

    selectedCheckoutItem = {
        productId: product.id,
        purchaseType: option.type,
        name: product.name,
        category: product.type,
        icon: product.icon,
        price: option.price,
        priceLabel: buildPriceLabel(option)
    };

    if (hasAuthToken()) {
        const charged = await chargeSavedPaymentMethod();
        if (charged) {
            return;
        }
    }

    renderCheckoutSummary();
    handleCountryChange();
    closeProductModal();
    document.getElementById('checkoutModal')?.classList.add('active');
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
                            const buttonLabel = optionOwned
                                ? ownershipLabel
                                : 'Buy now';

                            return `
                                <button class="purchase-option-btn ${optionOwned ? 'added' : ''}" onclick="${optionOwned ? '' : `openCheckout('${product.id}', '${option.type}')`}">
                                    <span class="purchase-option-title">${escapeHtml(option.label)}</span>
                                    <span class="purchase-option-price">${escapeHtml(buildPriceLabel(option))}</span>
                                    <span class="purchase-option-copy">${escapeHtml(optionOwned ? 'Your account already has access to this product.' : 'Checkout now and unlock docs after payment.')}</span>
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
    const subtotal = selectedCheckoutItem?.price || 0;
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

function renderCheckoutSummary() {
    if (!selectedCheckoutItem) {
        showNotification('Choose a product option to checkout.', 'error');
        return;
    }

    const orderItems = document.getElementById('orderItems');
    if (orderItems) {
        orderItems.innerHTML = `
            <div class="order-item">
                <span class="order-item-name">${escapeHtml(selectedCheckoutItem.name)} (${escapeHtml(selectedCheckoutItem.priceLabel)})</span>
                <span class="order-item-price">$${selectedCheckoutItem.price.toFixed(2)}</span>
            </div>
        `;
    }

    recalculateOrderTotals();

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
}

async function chargeSavedPaymentMethod() {
    if (!selectedCheckoutItem) {
        return false;
    }

    showNotification('Checking saved payment method...', 'info');

    try {
        const response = await fetch(`${API_BASE}/api/catalog/checkout/saved-payment`, {
            method: 'POST',
            headers: getAuthHeaders(true),
            body: JSON.stringify({ items: getCheckoutItemsPayload() })
        });
        const payload = await response.json().catch(() => ({}));

        if (response.status === 401) {
            window.localStorage.removeItem(AUTH_TOKEN_KEY);
            return false;
        }

        if (response.status === 409) {
            showNotification('Add a Stripe payment method once to enable instant future purchases.', 'info');
            return false;
        }

        if (!response.ok) {
            showNotification(payload.error || 'Saved payment method could not be charged.', 'error');
            return false;
        }

        selectedCheckoutItem = null;
        await fetchCatalog();
        renderCollections();
        renderProducts();
        closeProductModal();
        closeCheckoutModal();
        showNotification('Purchase completed with your saved Stripe payment method.', 'success');
        window.setTimeout(() => {
            window.location.href = '/dashboard.html';
        }, 900);
        return true;
    } catch (error) {
        showNotification(error.message || 'Saved payment method could not be charged.', 'error');
        return false;
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
    const stateSelect = document.getElementById('stateSelect');
    const stateLabel = document.getElementById('stateLabel');
    const zipGroup = document.getElementById('zipGroup');
    const country = document.getElementById('countrySelect')?.value;
    const regions = REGION_OPTIONS[country] || [];

    if (stateGroup) {
        stateGroup.style.display = regions.length ? 'block' : 'none';
    }

    if (stateLabel) {
        stateLabel.textContent = country === 'CA' ? 'Province' : 'State';
    }

    if (stateSelect) {
        stateSelect.required = Boolean(regions.length);
        stateSelect.innerHTML = `
            <option value="">Select ${country === 'CA' ? 'province' : 'state'}</option>
            ${regions
                .map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`)
                .join('')}
        `;
    }

    if (zipGroup) {
        zipGroup.style.display = country ? 'block' : 'none';
    }

    recalculateOrderTotals();
}

async function handleCheckout(event) {
    event.preventDefault();

    if (!selectedCheckoutItem) {
        showNotification('Choose a product option before checkout.', 'error');
        return;
    }

    const submitButton = event.currentTarget.querySelector('button[type="submit"]');
    const paymentMethodType = getSelectedPaymentMethod();
    const items = getCheckoutItemsPayload();
    const paymentDetails = buildPaymentDetailsPayload(event.currentTarget, paymentMethodType);
    const account = {
        fullName: event.currentTarget.elements.fullName?.value.trim() || '',
        email: event.currentTarget.elements.email?.value.trim() || '',
        password: event.currentTarget.elements.password?.value || '',
        company: event.currentTarget.elements.company?.value.trim() || '',
        savePaymentConsent: Boolean(event.currentTarget.elements.savePaymentConsent?.checked)
    };

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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items,
                paymentMethodType,
                paymentDetails,
                account
            })
        });

        const sessionPayload = await sessionResponse.json().catch(() => ({}));

        if (!sessionResponse.ok) {
            throw new Error(sessionPayload.error || 'Unable to create the Stripe checkout session');
        }

        if (sessionPayload.provider === 'stripe' && sessionPayload.session?.url) {
            window.location.href = sessionPayload.session.url;
            return;
        }

        throw new Error('Stripe checkout did not return a payment URL. Please try again.');
    } catch (error) {
        showNotification(error.message || 'Checkout failed.', 'error');
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Continue to Stripe Checkout';
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
    scrollToCatalogResults();
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
        setupEventListeners();
        handlePaymentChange({ target: { value: getSelectedPaymentMethod() } });
        renderCollections();
        renderProducts();
    } catch (error) {
        showNotification(error.message || 'Unable to load marketplace.', 'error');
    }
}

window.marketplaceDebug = {
    getCatalog: () => catalogItems,
    getSelectedCheckoutItem: () => selectedCheckoutItem
};

window.changePage = changePage;
window.openProductModal = openProductModal;
window.closeProductModal = closeProductModal;
window.openCheckout = openCheckout;
window.closeCheckoutModal = closeCheckoutModal;
window.applyQuickFilter = applyQuickFilter;
window.clearFilters = clearFilters;

document.addEventListener('DOMContentLoaded', initializeMarketplace);
