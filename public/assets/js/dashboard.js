const API_BASE = window.location.origin;
const DASHBOARD_AUTH_TOKEN_KEY = 'parseforge_auth_token';
const DASHBOARD_SUPPORT_ADMIN_TOKEN_KEY = 'parseforge_support_admin_token';
const DASHBOARD_SUPPORT_CONTEXT_KEY = 'parseforge_support_context';

if (!window.localStorage.getItem(DASHBOARD_AUTH_TOKEN_KEY)) {
    window.location.replace('/login.html?next=/dashboard.html');
}

let dashboardData = {
    stats: {},
    activity: [],
    profile: null,
    purchases: []
};

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function toggleMenu() {
    const navLinks = document.querySelector('.nav-links');
    if (navLinks) {
        navLinks.classList.toggle('active');
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    clearStaleSupportSession();
    initializeSidebar();
    initializeScrollSpy();

    const ready = await loadDashboardData();
    if (ready) {
        setInterval(refreshDashboardData, 30000);
    }
});

function clearStaleSupportSession() {
    window.localStorage.removeItem(DASHBOARD_SUPPORT_ADMIN_TOKEN_KEY);
    window.localStorage.removeItem(DASHBOARD_SUPPORT_CONTEXT_KEY);
}

function getAuthHeaders() {
    return {
        Authorization: `Bearer ${window.localStorage.getItem(DASHBOARD_AUTH_TOKEN_KEY) || ''}`,
        'Content-Type': 'application/json'
    };
}

function handleAuthFailure(response) {
    if (response.status !== 401) {
        return false;
    }

    window.localStorage.removeItem(DASHBOARD_AUTH_TOKEN_KEY);
    clearStaleSupportSession();
    window.location.replace('/login.html?next=/dashboard.html');
    return true;
}

async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);

    if (handleAuthFailure(response)) {
        return null;
    }

    const payload = await response.json();

    if (!response.ok) {
        throw new Error(payload.error || 'Request failed');
    }

    return payload;
}

function initializeSidebar() {
    const menuItems = document.querySelectorAll('.menu-item');

    menuItems.forEach((item) => {
        item.addEventListener('click', function handleMenuClick(event) {
            const href = this.getAttribute('href');

            if (href && !href.startsWith('#')) {
                return;
            }

            event.preventDefault();
            menuItems.forEach((menuItem) => menuItem.classList.remove('active'));
            this.classList.add('active');

            const section = href ? document.querySelector(href) : null;
            if (section) {
                section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

function initializeScrollSpy() {
    const sections = document.querySelectorAll('.dashboard-content section[id]');
    const menuItems = document.querySelectorAll('.menu-item');

    if (!sections.length) {
        return;
    }

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) {
                    return;
                }

                const id = entry.target.getAttribute('id');
                menuItems.forEach((item) => {
                    if (item.getAttribute('href') === `#${id}`) {
                        menuItems.forEach((menuItem) => menuItem.classList.remove('active'));
                        item.classList.add('active');
                    }
                });
            });
        },
        {
            threshold: 0.3,
            rootMargin: '-100px 0px -45% 0px'
        }
    );

    sections.forEach((section) => observer.observe(section));
}

async function loadDashboardData() {
    try {
        const [profile, stats, activity, purchasesPayload] = await Promise.all([
            fetchJson(`${API_BASE}/api/auth/me`, { headers: getAuthHeaders() }),
            fetchJson(`${API_BASE}/api/dashboard/stats`, { headers: getAuthHeaders() }),
            fetchJson(`${API_BASE}/api/dashboard/activity`, { headers: getAuthHeaders() }),
            fetchJson(`${API_BASE}/api/catalog/purchases`, { headers: getAuthHeaders() })
        ]);

        if (!profile) {
            return false;
        }

        dashboardData = {
            profile: profile.user,
            stats: stats || {},
            activity: activity || [],
            purchases: purchasesPayload?.purchases || []
        };

        updateUI();
        return true;
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showNotification(error.message || 'Failed to load dashboard data', 'error');
        return false;
    }
}

async function refreshDashboardData() {
    await loadDashboardData();
}

function updateUI() {
    updateHeader();
    updateStats();
    updatePurchaseSummary();
    updatePurchases();
    updateDocuments();
    updateBilling();
    updateActivity();
}

function getPurchaseCounts() {
    const purchases = dashboardData.purchases || [];

    return {
        total: purchases.length,
        subscriptions: purchases.filter(
            (purchase) => purchase.purchaseType === 'monthly' || purchase.purchaseType === 'yearly'
        ).length,
        oneTime: purchases.filter((purchase) => purchase.purchaseType === 'one_time').length,
        apis: purchases.filter((purchase) => purchase.product?.type === 'api').length,
        sdks: purchases.filter((purchase) => purchase.product?.type === 'sdk').length
    };
}

function formatPurchaseType(purchaseType) {
    switch (purchaseType) {
        case 'monthly':
            return 'Monthly subscription';
        case 'yearly':
            return 'Yearly subscription';
        default:
            return 'One-time license';
    }
}

function formatShortDate(value) {
    if (!value) {
        return 'Not scheduled';
    }

    return new Date(value).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function updateHeader() {
    const title = document.getElementById('dashboardWelcome');
    const subtitle = document.getElementById('dashboardSubtitle');
    const { total } = getPurchaseCounts();

    if (title && dashboardData.profile) {
        title.textContent = `Welcome back, ${dashboardData.profile.firstName}!`;
    }

    if (subtitle) {
        subtitle.textContent =
            total > 0
                ? 'Your purchased APIs, SDK licenses, documentation, and renewal details are ready.'
                : 'Purchase an API subscription or SDK license to unlock product documentation.';
    }
}

function updateStats() {
    const counts = getPurchaseCounts();

    document.getElementById('ownedProductsValue').textContent = String(counts.total);
    document.getElementById('subscriptionsValue').textContent = String(counts.subscriptions);
    document.getElementById('sdkLicensesValue').textContent = String(counts.oneTime);
    document.getElementById('docsUnlockedValue').textContent = String(counts.total);

    document.getElementById('ownedProductsMeta').textContent =
        counts.total > 0
            ? `${counts.apis} APIs and ${counts.sdks} SDKs`
            : 'No active purchases yet';
    document.getElementById('subscriptionsMeta').textContent =
        counts.subscriptions > 0
            ? `${counts.subscriptions} active API subscriptions`
            : 'Monthly or yearly API access';
    document.getElementById('sdkLicensesMeta').textContent =
        counts.oneTime > 0
            ? `${counts.oneTime} one-time SDK licenses`
            : 'One-time SDK ownership';
    document.getElementById('docsUnlockedMeta').textContent =
        counts.total > 0
            ? 'Docs available for every owned product'
            : 'Documentation is purchase-gated';
}

function updatePurchaseSummary() {
    const accessLine = document.getElementById('summaryAccessLine');
    const orderLine = document.getElementById('summaryOrderLine');
    const nextLine = document.getElementById('summaryNextLine');
    const purchases = dashboardData.purchases || [];
    const latestPurchase = purchases[0];
    const counts = getPurchaseCounts();

    if (accessLine) {
        accessLine.textContent =
            counts.total > 0
                ? `${counts.total} purchased products in this workspace`
                : 'No purchased products in this workspace yet';
    }

    if (orderLine) {
        orderLine.textContent = latestPurchase
            ? `${latestPurchase.product.name} - ${formatPurchaseType(latestPurchase.purchaseType)}`
            : 'No completed purchases yet';
    }

    if (nextLine) {
        nextLine.textContent =
            counts.total > 0
                ? 'Open your unlocked docs or buy another product.'
                : 'Browse the marketplace to unlock product access.';
    }
}

function updatePurchases() {
    const purchasesList = document.getElementById('purchasesList');
    if (!purchasesList) {
        return;
    }

    if (!dashboardData.purchases.length) {
        purchasesList.innerHTML = `
            <div class="empty-state-card">
                <h3>No products purchased yet</h3>
                <p>Buy a one-time SDK license or subscribe to an API and it will appear here immediately.</p>
                <a href="marketplace.html" class="btn-primary">Browse Marketplace</a>
            </div>
        `;
        return;
    }

    purchasesList.innerHTML = dashboardData.purchases.map(renderPurchaseCard).join('');
}

function renderPurchaseCard(purchase) {
    const renewalLine =
        purchase.renewsAt && (purchase.purchaseType === 'monthly' || purchase.purchaseType === 'yearly')
            ? `Renews ${formatShortDate(purchase.renewsAt)}`
            : 'Permanent access';
    const docsHref = `docs.html?product=${encodeURIComponent(purchase.product.slug || purchase.product.id)}`;

    return `
        <article class="purchase-card">
            <div class="purchase-card-top">
                <div>
                    <span class="purchase-type">${formatPurchaseType(purchase.purchaseType)}</span>
                    <h3>${escapeHtml(purchase.product.name)}</h3>
                </div>
                <span class="purchase-status">${escapeHtml(purchase.status)}</span>
            </div>
            <p class="purchase-description">${escapeHtml(purchase.product.description)}</p>
            <div class="purchase-meta">
                <span>${escapeHtml(purchase.product.type.toUpperCase())}</span>
                <span>${escapeHtml(purchase.product.language)}</span>
                <span>${formatShortDate(purchase.createdAt)}</span>
            </div>
            <div class="purchase-card-bottom">
                <div class="purchase-pricing">
                    <strong>$${Number(purchase.unitPrice || 0).toFixed(2)}</strong>
                    <span>${escapeHtml(renewalLine)}</span>
                </div>
                <div class="purchase-actions">
                    <a href="${docsHref}" class="btn-secondary">Open Docs</a>
                    <span class="purchase-order">${escapeHtml(purchase.orderReference)}</span>
                </div>
            </div>
        </article>
    `;
}

function updateDocuments() {
    const documentsList = document.getElementById('documentsList');
    if (!documentsList) {
        return;
    }

    if (!dashboardData.purchases.length) {
        documentsList.innerHTML = `
            <div class="empty-state-card compact">
                <h3>No docs unlocked yet</h3>
                <p>Product documentation becomes available after the matching API or SDK is purchased.</p>
            </div>
        `;
        return;
    }

    documentsList.innerHTML = dashboardData.purchases
        .map((purchase) => {
            const docsHref = `docs.html?product=${encodeURIComponent(purchase.product.slug || purchase.product.id)}`;
            return `
                <article class="document-card">
                    <span class="purchase-type">${escapeHtml(purchase.product.type.toUpperCase())}</span>
                    <h3>${escapeHtml(purchase.product.name)}</h3>
                    <p>${escapeHtml(purchase.purchaseLabel || formatPurchaseType(purchase.purchaseType))}</p>
                    <a href="${docsHref}" class="btn-secondary">View Documentation</a>
                </article>
            `;
        })
        .join('');
}

function updateBilling() {
    const billingList = document.getElementById('billingSummaryList');
    if (!billingList) {
        return;
    }

    const purchases = dashboardData.purchases || [];
    const subscriptions = purchases.filter(
        (purchase) => purchase.purchaseType === 'monthly' || purchase.purchaseType === 'yearly'
    );
    const oneTime = purchases.filter((purchase) => purchase.purchaseType === 'one_time');
    const savedPayment = dashboardData.stats.savedPaymentMethod;

    billingList.innerHTML = `
        <article class="billing-summary-card">
            <span class="summary-label">API renewals</span>
            <strong>${subscriptions.length}</strong>
            <p>${subscriptions.length ? 'Recurring API products are active.' : 'No recurring API subscriptions yet.'}</p>
        </article>
        <article class="billing-summary-card">
            <span class="summary-label">SDK licenses</span>
            <strong>${oneTime.length}</strong>
            <p>${oneTime.length ? 'One-time SDK purchases stay attached to this account.' : 'No SDK licenses purchased yet.'}</p>
        </article>
        <article class="billing-summary-card">
            <span class="summary-label">Saved payment</span>
            <strong>${savedPayment ? `${escapeHtml(savedPayment.brand || 'Card')} **** ${escapeHtml(savedPayment.last4)}` : 'Not saved'}</strong>
            <p>${savedPayment ? 'Future purchases can use the saved Stripe payment method.' : 'A payment method is saved after Stripe checkout.'}</p>
        </article>
    `;
}

function updateActivity() {
    const activityList = document.getElementById('recentActivityList');
    if (!activityList) {
        return;
    }

    if (!dashboardData.activity.length) {
        activityList.innerHTML = '<p class="empty-state">No recent purchase activity yet.</p>';
        return;
    }

    activityList.innerHTML = dashboardData.activity
        .map((activity) => {
            const isSuccess = activity.status >= 200 && activity.status < 300;
            const iconClass = isSuccess ? 'success' : 'error';
            const timeAgo = getRelativeTime(new Date(activity.timestamp));
            const detail = activity.detail ? ` - ${escapeHtml(activity.detail)}` : '';

            return `
                <div class="activity-item">
                    <div class="activity-icon ${iconClass}" aria-hidden="true"></div>
                    <div class="activity-info">
                        <div class="activity-title">${escapeHtml(activity.method)} ${escapeHtml(activity.path)}</div>
                        <div class="activity-meta">${timeAgo} - ${escapeHtml(activity.status)}${detail}</div>
                    </div>
                </div>
            `;
        })
        .join('');
}

function getRelativeTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
        return 'Just now';
    }

    if (diffMins < 60) {
        return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    }

    if (diffHours < 24) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    }

    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#1de9b6' : type === 'error' ? '#ff3366' : '#00d9ff'};
        color: ${type === 'success' || type === 'info' ? '#0a0e27' : '#ffffff'};
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.25);
        z-index: 10000;
        font-weight: 700;
    `;

    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}
