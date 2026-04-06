const HOME_API_BASE = window.location.origin;

function formatCompactNumber(value) {
    return new Intl.NumberFormat('en-US', {
        notation: 'compact',
        maximumFractionDigits: 1
    }).format(Number(value || 0));
}

function escapeHomeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getHomePurchaseOptions(product) {
    return product?.pricing?.purchaseOptions || [];
}

function getHomeDefaultOption(product) {
    const options = getHomePurchaseOptions(product);
    return options.find((option) => option.type === product?.pricing?.defaultPurchaseType) || options[0] || null;
}

function buildHomePrice(option) {
    if (!option) {
        return 'Unavailable';
    }

    if (option.type === 'one_time') {
        return `$${option.price.toFixed(0)} once`;
    }

    if (option.type === 'monthly') {
        return `$${option.price.toFixed(0)}/mo`;
    }

    return `$${option.price.toFixed(0)}/yr`;
}

function updateHomeStats(items) {
    const subscriptionCount = items.filter((item) => item.pricing?.billingModel === 'subscription').length;
    const oneTimeCount = items.filter((item) => item.pricing?.billingModel === 'one_time').length;
    const avgRating =
        items.length > 0
            ? (items.reduce((sum, item) => sum + Number(item.rating || 0), 0) / items.length).toFixed(1)
            : '4.8';

    const statMap = {
        heroProductsCount: String(items.length),
        heroSubscriptionCount: String(subscriptionCount),
        heroOneTimeCount: String(oneTimeCount),
        heroRatingValue: avgRating
    };

    Object.entries(statMap).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
}

function createHomeShowcaseCard(product) {
    const option = getHomeDefaultOption(product);
    return `
        <article class="showcase-card">
            <div class="showcase-card-top">
                <span class="showcase-chip">${escapeHomeHtml((product.badge || 'featured').toUpperCase())}</span>
                <span class="showcase-type">${escapeHomeHtml(product.type.toUpperCase())}</span>
            </div>
            <h3 class="showcase-title">${escapeHomeHtml(product.name)}</h3>
            <p class="showcase-copy">${escapeHomeHtml(product.description)}</p>
            <div class="showcase-meta">
                <span>${escapeHomeHtml(product.language)}</span>
                <span>${escapeHomeHtml(`${Number(product.rating || 0).toFixed(1)} rating`)}</span>
                <span>${escapeHomeHtml(`${formatCompactNumber(product.downloads || 0)} downloads`)}</span>
            </div>
            <div class="showcase-footer">
                <div class="showcase-pricing">
                    <strong>${escapeHomeHtml(buildHomePrice(option))}</strong>
                    <span>${escapeHomeHtml(product.pricing?.billingModel === 'subscription' ? 'managed access' : 'team license')}</span>
                </div>
                <a href="/marketplace" class="showcase-link">View product</a>
            </div>
        </article>
    `;
}

function getFallbackFeaturedProducts() {
    return [
        {
            name: 'Identity Verification API',
            type: 'api',
            badge: 'featured',
            language: 'REST',
            rating: 4.9,
            downloads: 12600,
            description: 'KYC onboarding, document validation, and regional fraud signals for growth teams.',
            pricing: {
                billingModel: 'subscription',
                defaultPurchaseType: 'monthly',
                purchaseOptions: [{ type: 'monthly', price: 79 }]
            }
        },
        {
            name: 'Next.js Auth SDK',
            type: 'sdk',
            badge: 'bestseller',
            language: 'Next.js',
            rating: 4.9,
            downloads: 19300,
            description: 'Production-ready auth helpers and protected-route building blocks for modern Next.js apps.',
            pricing: {
                billingModel: 'one_time',
                defaultPurchaseType: 'one_time',
                purchaseOptions: [{ type: 'one_time', price: 129 }]
            }
        },
        {
            name: 'Invoice OCR API',
            type: 'api',
            badge: 'new',
            language: 'REST',
            rating: 4.9,
            downloads: 9700,
            description: 'Extract totals, taxes, line items, and vendor data from invoices with minimal tuning.',
            pricing: {
                billingModel: 'subscription',
                defaultPurchaseType: 'monthly',
                purchaseOptions: [{ type: 'monthly', price: 89 }]
            }
        },
        {
            name: 'React Native Payments SDK',
            type: 'sdk',
            badge: 'featured',
            language: 'React Native',
            rating: 4.8,
            downloads: 11200,
            description: 'Mobile checkout surfaces, tokenization flows, and purchase events for commerce apps.',
            pricing: {
                billingModel: 'one_time',
                defaultPurchaseType: 'one_time',
                purchaseOptions: [{ type: 'one_time', price: 179 }]
            }
        }
    ];
}

function renderHomeShowcase(items) {
    const grid = document.getElementById('homeFeaturedGrid');
    if (!grid) {
        return;
    }

    const featured = [...items]
        .sort((first, second) => {
            const badgeOrder = { featured: 0, bestseller: 1, new: 2 };
            return (badgeOrder[first.badge] ?? 9) - (badgeOrder[second.badge] ?? 9);
        })
        .slice(0, 4);

    grid.innerHTML = featured.map((item) => createHomeShowcaseCard(item)).join('');
}

async function initializeHomePage() {
    if (!document.getElementById('homeFeaturedGrid')) {
        return;
    }

    try {
        const response = await fetch(`${HOME_API_BASE}/api/catalog`);
        const payload = await response.json().catch(() => ({}));

        if (!response.ok || !Array.isArray(payload.items)) {
            throw new Error('Unable to load featured products');
        }

        updateHomeStats(payload.items);
        renderHomeShowcase(payload.items);
    } catch (error) {
        const fallbackItems = getFallbackFeaturedProducts();
        updateHomeStats(fallbackItems);
        renderHomeShowcase(fallbackItems);
    }
}

document.addEventListener('DOMContentLoaded', initializeHomePage);
