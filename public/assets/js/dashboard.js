const API_BASE = window.location.origin;
const AUTH_TOKEN_KEY = 'parseforge_auth_token';
const SUPPORT_ADMIN_TOKEN_KEY = 'parseforge_support_admin_token';
const SUPPORT_CONTEXT_KEY = 'parseforge_support_context';
const authToken = window.localStorage.getItem(AUTH_TOKEN_KEY);

if (!authToken) {
    window.location.replace('/login.html?next=/dashboard.html');
}

let charts = {
    usage: null,
    response: null,
    status: null
};

let dashboardData = {
    stats: {},
    apiKeys: [],
    activity: [],
    endpoints: [],
    profile: null,
    purchases: [],
    supportSession: null
};
let pendingRevokeKeyId = '';
let pendingRevokeButton = null;

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
    initializeSidebar();
    initializeEventListeners();
    initializeScrollSpy();

    const ready = await loadDashboardData();
    if (!ready) {
        return;
    }

    initializeCharts();
    setInterval(refreshDashboardData, 30000);
});

function getAuthHeaders() {
    return {
        Authorization: `Bearer ${window.localStorage.getItem(AUTH_TOKEN_KEY) || ''}`,
        'Content-Type': 'application/json'
    };
}

function handleAuthFailure(response) {
    if (response.status === 401) {
        if (window.ParseForgeSession?.isSupportSessionActive?.()) {
            window.ParseForgeSession.restoreAdminSession?.('/admin.html');
            return true;
        }

        if (window.localStorage.getItem(SUPPORT_ADMIN_TOKEN_KEY)) {
            restoreAdminSessionDirect('/admin.html');
            return true;
        }

        window.localStorage.removeItem(AUTH_TOKEN_KEY);
        window.location.replace('/login.html?next=/dashboard.html');
        return true;
    }

    return false;
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

            if (href && href.startsWith('#')) {
                const section = document.querySelector(href);
                if (section) {
                    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
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
                    const href = item.getAttribute('href');
                    if (href === `#${id}`) {
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
        const [profile, stats, usage, responseTimes, statusCodes, endpoints, activity, keys, purchasesPayload] =
            await Promise.all([
                fetchJson(`${API_BASE}/api/auth/me`, { headers: getAuthHeaders() }),
                fetchJson(`${API_BASE}/api/dashboard/stats`, { headers: getAuthHeaders() }),
                fetchJson(`${API_BASE}/api/dashboard/usage?period=7`, { headers: getAuthHeaders() }),
                fetchJson(`${API_BASE}/api/dashboard/response-times`, { headers: getAuthHeaders() }),
                fetchJson(`${API_BASE}/api/dashboard/status-codes`, { headers: getAuthHeaders() }),
                fetchJson(`${API_BASE}/api/dashboard/endpoints`, { headers: getAuthHeaders() }),
                fetchJson(`${API_BASE}/api/dashboard/activity`, { headers: getAuthHeaders() }),
                fetchJson(`${API_BASE}/api/keys`, { headers: getAuthHeaders() }),
                fetchJson(`${API_BASE}/api/catalog/purchases`, { headers: getAuthHeaders() })
            ]);

        if (!profile) {
            return false;
        }

        dashboardData = {
            profile: profile.user,
            supportSession: profile.user.supportSession || null,
            stats,
            usage,
            responseTimes,
            statusCodes,
            endpoints,
            activity,
            apiKeys: keys || [],
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
    const loaded = await loadDashboardData();
    if (loaded) {
        updateCharts();
    }
}

function updateUI() {
    renderSupportSessionBanner();
    updateHeader();
    updateStats();
    updatePurchaseSummary();
    updatePurchases();
    updateAPIKeys();
    updateActivity();
    updateEndpoints();
}

function getPurchaseCounts() {
    const purchases = dashboardData.purchases || [];

    return {
        total: purchases.length,
        subscriptions: purchases.filter(
            (purchase) => purchase.purchaseType === 'monthly' || purchase.purchaseType === 'yearly'
        ).length,
        oneTime: purchases.filter((purchase) => purchase.purchaseType === 'one_time').length
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
    return new Date(value).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function isSupportSession() {
    return Boolean(dashboardData.supportSession?.active);
}

function renderSupportSessionBanner() {
    const banner = document.getElementById('supportSessionBanner');
    const title = document.getElementById('supportSessionTitle');
    const message = document.getElementById('supportSessionMessage');
    const returnLink = document.getElementById('supportReturnLink');

    if (!banner) {
        return;
    }

    if (!isSupportSession()) {
        banner.hidden = true;
        document.querySelectorAll('[data-key-action]').forEach((button) => {
            button.disabled = false;
            if (button.dataset.originalLabel) {
                button.textContent = button.dataset.originalLabel;
            }
        });
        return;
    }

    banner.hidden = false;

    if (title) {
        title.textContent = `Supporting ${dashboardData.profile?.name || 'customer workspace'}`;
    }

    if (message) {
        const adminName = dashboardData.supportSession.adminName || 'An admin';
        message.textContent =
            `${adminName} is in a read-only support session. Checkout and API key changes are disabled in this view.`;
    }

    if (returnLink) {
        returnLink.setAttribute('href', '/admin.html');
    }

    document.querySelectorAll('[data-key-action]').forEach((button) => {
        if (!button.dataset.originalLabel) {
            button.dataset.originalLabel = button.textContent;
        }

        button.disabled = true;
        button.textContent = 'Support mode only';
    });
}

function updateHeader() {
    const title = document.getElementById('dashboardWelcome');
    const subtitle = document.getElementById('dashboardSubtitle');
    const { total } = getPurchaseCounts();

    if (title && dashboardData.profile) {
        title.textContent = isSupportSession()
            ? `Support view for ${dashboardData.profile.firstName}`
            : `Welcome back, ${dashboardData.profile.firstName}!`;
    }

    if (subtitle) {
        if (isSupportSession()) {
            subtitle.textContent =
                'You are troubleshooting this buyer workspace in read-only mode. Review purchases, access, and activity without changing billing.';
        } else {
            subtitle.textContent =
                total > 0
                    ? 'Your buyer workspace is ready with product access, subscriptions, and API credentials.'
                    : 'Start by purchasing your first SDK license or API subscription, then manage everything here.';
        }
    }
}

function updateStats() {
    const purchaseCounts = getPurchaseCounts();
    const { stats } = dashboardData;

    document.getElementById('ownedProductsValue').textContent = String(purchaseCounts.total);
    document.getElementById('subscriptionsValue').textContent = String(purchaseCounts.subscriptions);
    document.getElementById('activeKeysValue').textContent = String(dashboardData.apiKeys.length);
    document.getElementById('apiCallsValue').textContent = stats.apiCalls?.toLocaleString() || '0';

    document.getElementById('ownedProductsMeta').textContent =
        purchaseCounts.total > 0
            ? `${purchaseCounts.oneTime} licenses and ${purchaseCounts.subscriptions} subscriptions`
            : 'No active purchases yet';
    document.getElementById('subscriptionsMeta').textContent =
        purchaseCounts.subscriptions > 0
            ? `${purchaseCounts.subscriptions} active recurring products`
            : 'Monthly or yearly plans appear here';
    document.getElementById('activeKeysMeta').textContent =
        dashboardData.apiKeys.length > 0
            ? `${dashboardData.apiKeys.filter((key) => key.type === 'production').length} production keys configured`
            : 'Create and manage credentials';
    document.getElementById('apiCallsMeta').textContent =
        `${stats.successRate || 0}% success rate - ${stats.avgResponseTime || 0}ms average`;
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
                ? `${counts.total} active products across your workspace`
                : 'No active products in this workspace yet';
    }

    if (orderLine) {
        orderLine.textContent = latestPurchase
            ? `${latestPurchase.product.name} - ${formatPurchaseType(latestPurchase.purchaseType)}`
            : 'No completed purchases yet';
    }

    if (nextLine) {
        if (isSupportSession()) {
            nextLine.textContent = 'Use Return to Admin when you are done with customer support.';
        } else {
            nextLine.textContent =
                dashboardData.apiKeys.length > 0
                    ? 'You are ready to integrate from the dashboard.'
                    : counts.total > 0
                      ? 'Create an API key for your next environment.'
                      : 'Browse the marketplace and attach your first product to this account.';
        }
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
                <p>Browse the marketplace to buy a one-time SDK or subscribe to an API and it will appear here immediately.</p>
                <a href="marketplace.html" class="btn-primary">Browse Marketplace</a>
            </div>
        `;
        return;
    }

    purchasesList.innerHTML = dashboardData.purchases
        .map((purchase) => {
            const renewalLine =
                purchase.renewsAt && (purchase.purchaseType === 'monthly' || purchase.purchaseType === 'yearly')
                    ? `Renews ${formatShortDate(purchase.renewsAt)}`
                    : 'Lifetime access';
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
                    <div class="purchase-features">
                        ${(purchase.product.features || [])
                            .slice(0, 3)
                            .map((feature) => `<span>${escapeHtml(feature)}</span>`)
                            .join('')}
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
        })
        .join('');
}

function updateAPIKeys() {
    const keysList = document.getElementById('keysList');
    if (!keysList) {
        return;
    }

    if (!dashboardData.apiKeys.length) {
        keysList.innerHTML = `
            <div class="empty-state-card compact">
                <h3>No API keys yet</h3>
                <p>${
                    isSupportSession()
                        ? 'Support sessions can review keys but cannot create new ones.'
                        : 'Create your first key to connect the products you own to your environments.'
                }</p>
                <button class="btn-primary" type="button" onclick="showCreateKeyModal()" ${isSupportSession() ? 'disabled' : ''}>${isSupportSession() ? 'Support mode only' : 'Create API Key'}</button>
            </div>
        `;
        return;
    }

    keysList.innerHTML = dashboardData.apiKeys
        .map((key) => {
            const created = formatShortDate(key.created);
            const lastUsed = key.lastUsed ? getRelativeTime(new Date(key.lastUsed)) : 'Never used';

            return `
                <div class="key-item" data-key-id="${key.id}">
                    <div class="key-info">
                        <div class="key-topline">
                            <div class="key-name">${escapeHtml(key.name)}</div>
                            <span class="key-type">${escapeHtml(key.type)}</span>
                        </div>
                        <code class="key-value">${escapeHtml(key.key)}</code>
                        <div class="key-meta">
                            <span>Created ${created}</span>
                            <span>Last used ${lastUsed}</span>
                        </div>
                    </div>
                    <div class="key-actions">
                        <button class="btn-secondary btn-sm" onclick="copyKey(this)">Copy</button>
                        <button class="btn-danger btn-sm" onclick="revokeKey('${key.id}', this)">Revoke</button>
                    </div>
                </div>
            `;
        })
        .join('');
}

function updateActivity() {
    const activityList = document.getElementById('recentActivityList');
    if (!activityList) {
        return;
    }

    if (!dashboardData.activity.length) {
        activityList.innerHTML = '<p class="empty-state">No recent workspace activity yet.</p>';
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

function updateEndpoints() {
    const endpointsList = document.getElementById('topEndpointsList');
    if (!endpointsList) {
        return;
    }

    if (!dashboardData.endpoints.length) {
        endpointsList.innerHTML = `
            <div class="empty-state-card compact">
                <h3>No API usage yet</h3>
                <p>Purchased API subscriptions will show usage trends here after your team creates a key and starts integrating.</p>
            </div>
        `;
        return;
    }

    const maxCount = Math.max(...dashboardData.endpoints.map((endpoint) => endpoint.count));

    endpointsList.innerHTML = dashboardData.endpoints
        .map((endpoint) => {
            const percentage = (endpoint.count / maxCount) * 100;
            return `
                <div class="endpoint-item">
                    <div class="endpoint-info">
                        <span class="endpoint-method ${escapeHtml(endpoint.method.toLowerCase())}">${escapeHtml(endpoint.method)}</span>
                        <span class="endpoint-path">${escapeHtml(endpoint.path)}</span>
                    </div>
                    <div class="endpoint-stat">
                        <span class="endpoint-count">${endpoint.count.toLocaleString()}</span>
                        <div class="endpoint-bar" style="width: ${percentage}%;"></div>
                    </div>
                </div>
            `;
        })
        .join('');
}

function initializeEventListeners() {
    const usagePeriod = document.getElementById('usagePeriod');
    const endSupportSessionButton = document.getElementById('endSupportSessionButton');
    const supportReturnLink = document.getElementById('supportReturnLink');

    if (usagePeriod) {
        usagePeriod.addEventListener('change', async (event) => {
            try {
                dashboardData.usage = await fetchJson(`${API_BASE}/api/dashboard/usage?period=${event.target.value}`, {
                    headers: getAuthHeaders()
                });
                updateUsageChart();
            } catch (error) {
                showNotification(error.message || 'Failed to update chart', 'error');
            }
        });
    }

    endSupportSessionButton?.addEventListener('click', exitSupportSession);
    supportReturnLink?.addEventListener('click', (event) => {
        if (!isSupportSession()) {
            return;
        }

        event.preventDefault();
        exitSupportSession();
    });

    document.getElementById('createKeyForm')?.addEventListener('submit', handleCreateKeySubmit);
    document.getElementById('closeCreateKeyModal')?.addEventListener('click', hideCreateKeyModal);
    document.getElementById('cancelCreateKeyButton')?.addEventListener('click', hideCreateKeyModal);
    document.getElementById('copyCreatedKeyButton')?.addEventListener('click', copyCreatedKey);
    document.getElementById('closeRevokeModal')?.addEventListener('click', hideRevokeModal);
    document.getElementById('cancelRevokeButton')?.addEventListener('click', hideRevokeModal);
    document.getElementById('confirmRevokeButton')?.addEventListener('click', confirmRevokeKey);
    document.querySelectorAll('.dashboard-modal').forEach((modal) => {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.hidden = true;
            }
        });
    });
}

function initializeCharts() {
    if (typeof Chart === 'undefined') {
        console.error('Chart.js not loaded');
        return;
    }

    createUsageChart();
    createResponseChart();
    createStatusChart();
}

function createUsageChart() {
    const usageCtx = document.getElementById('usageChart');
    if (!usageCtx) {
        return;
    }

    if (charts.usage) {
        charts.usage.destroy();
    }

    charts.usage = new Chart(usageCtx, {
        type: 'line',
        data: {
            labels: dashboardData.usage?.labels || [],
            datasets: [
                {
                    label: 'API Calls',
                    data: dashboardData.usage?.values || [],
                    borderColor: '#00d9ff',
                    backgroundColor: 'rgba(0, 217, 255, 0.12)',
                    tension: 0.35,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    ticks: { color: '#94a3b8' },
                    grid: { color: 'rgba(255,255,255,0.06)' }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#94a3b8',
                        callback(value) {
                            return value.toLocaleString();
                        }
                    },
                    grid: { color: 'rgba(255,255,255,0.06)' }
                }
            }
        }
    });
}

function createResponseChart() {
    const responseCtx = document.getElementById('responseChart');
    if (!responseCtx) {
        return;
    }

    if (charts.response) {
        charts.response.destroy();
    }

    charts.response = new Chart(responseCtx, {
        type: 'line',
        data: {
            labels: dashboardData.responseTimes?.labels || [],
            datasets: [
                {
                    label: 'Response Time (ms)',
                    data: dashboardData.responseTimes?.values || [],
                    borderColor: '#1de9b6',
                    backgroundColor: 'rgba(29, 233, 182, 0.12)',
                    tension: 0.35,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    ticks: { color: '#94a3b8' },
                    grid: { color: 'rgba(255,255,255,0.06)' }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#94a3b8',
                        callback(value) {
                            return `${value}ms`;
                        }
                    },
                    grid: { color: 'rgba(255,255,255,0.06)' }
                }
            }
        }
    });
}

function createStatusChart() {
    const statusCtx = document.getElementById('statusChart');
    if (!statusCtx) {
        return;
    }

    if (charts.status) {
        charts.status.destroy();
    }

    charts.status = new Chart(statusCtx, {
        type: 'doughnut',
        data: {
            labels: dashboardData.statusCodes?.labels || [],
            datasets: [
                {
                    data: dashboardData.statusCodes?.values || [],
                    backgroundColor: ['#1de9b6', '#00d9ff', '#ffaa00', '#ff3366', '#64748b'],
                    borderWidth: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#94a3b8',
                        padding: 16
                    }
                }
            }
        }
    });
}

function updateCharts() {
    updateUsageChart();
    updateResponseChart();
    updateStatusChart();
}

function updateUsageChart() {
    if (charts.usage && dashboardData.usage) {
        charts.usage.data.labels = dashboardData.usage.labels;
        charts.usage.data.datasets[0].data = dashboardData.usage.values;
        charts.usage.update();
    }
}

function updateResponseChart() {
    if (charts.response && dashboardData.responseTimes) {
        charts.response.data.labels = dashboardData.responseTimes.labels;
        charts.response.data.datasets[0].data = dashboardData.responseTimes.values;
        charts.response.update();
    }
}

function updateStatusChart() {
    if (charts.status && dashboardData.statusCodes) {
        charts.status.data.labels = dashboardData.statusCodes.labels;
        charts.status.data.datasets[0].data = dashboardData.statusCodes.values;
        charts.status.update();
    }
}

function copyKey(button) {
    const keyItem = button.closest('.key-item');
    const keyValue = keyItem.querySelector('.key-value').textContent;

    navigator.clipboard
        .writeText(keyValue)
        .then(() => {
            const originalText = button.textContent;
            button.textContent = 'Copied';
            button.style.background = '#1de9b6';
            button.style.color = '#0a0e27';

            setTimeout(() => {
                button.textContent = originalText;
                button.style.background = '';
                button.style.color = '';
            }, 2000);
        })
        .catch(() => {
            showNotification('Failed to copy key', 'error');
        });
}

function showCreateKeyModal() {
    if (isSupportSession()) {
        showNotification('Support sessions are read-only. Exit support mode before creating keys.', 'error');
        return;
    }

    const modal = document.getElementById('createKeyModal');
    const form = document.getElementById('createKeyForm');
    const createdKeyBox = document.getElementById('createdKeyBox');

    if (!modal || !form) {
        return;
    }

    form.reset();
    createdKeyBox.hidden = true;
    document.getElementById('createdKeyValue').textContent = '';
    modal.hidden = false;
    setTimeout(() => document.getElementById('keyName')?.focus(), 50);
}

function hideCreateKeyModal() {
    const modal = document.getElementById('createKeyModal');
    if (modal) {
        modal.hidden = true;
    }
}

async function handleCreateKeySubmit(event) {
    event.preventDefault();

    const submitButton = document.getElementById('createKeySubmit');
    const name = document.getElementById('keyName').value.trim();
    const type = document.getElementById('keyType').value;

    if (!name) {
        showNotification('Enter a name for this API key', 'error');
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Creating...';

    try {
        const newKey = await fetchJson(`${API_BASE}/api/keys`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ name, type })
        });

        document.getElementById('createdKeyBox').hidden = false;
        document.getElementById('createdKeyValue').textContent = newKey.fullKey;

        dashboardData.apiKeys = await fetchJson(`${API_BASE}/api/keys`, {
            headers: getAuthHeaders()
        });

        const stats = await fetchJson(`${API_BASE}/api/dashboard/stats`, {
            headers: getAuthHeaders()
        });

        dashboardData.stats = stats;
        updateStats();
        updateAPIKeys();
        showNotification('API key created successfully', 'success');
    } catch (error) {
        console.error('Error creating API key:', error);
        showNotification(error.message || 'Failed to create API key', 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Create Key';
    }
}

async function revokeKey(keyId, button) {
    if (isSupportSession()) {
        showNotification('Support sessions are read-only. Exit support mode before revoking keys.', 'error');
        return;
    }

    pendingRevokeKeyId = keyId;
    pendingRevokeButton = button;
    const modal = document.getElementById('confirmRevokeModal');
    if (modal) {
        modal.hidden = false;
    }
}

function hideRevokeModal() {
    const modal = document.getElementById('confirmRevokeModal');
    if (modal) {
        modal.hidden = true;
    }
    pendingRevokeKeyId = '';
    pendingRevokeButton = null;
}

async function confirmRevokeKey() {
    if (!pendingRevokeKeyId) {
        return;
    }

    const keyId = pendingRevokeKeyId;
    const button = pendingRevokeButton;
    const confirmButton = document.getElementById('confirmRevokeButton');
    confirmButton.disabled = true;
    confirmButton.textContent = 'Revoking...';

    try {
        await fetchJson(`${API_BASE}/api/keys/${keyId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        dashboardData.apiKeys = dashboardData.apiKeys.filter((key) => key.id !== keyId);
        updateStats();
        updateAPIKeys();
        showNotification('API key revoked successfully', 'success');
        hideRevokeModal();
    } catch (error) {
        console.error('Error revoking API key:', error);
        showNotification(error.message || 'Failed to revoke API key', 'error');
    } finally {
        confirmButton.disabled = false;
        confirmButton.textContent = 'Revoke Key';
    }
}

function copyCreatedKey() {
    const keyValue = document.getElementById('createdKeyValue')?.textContent || '';
    if (!keyValue) {
        return;
    }

    navigator.clipboard
        .writeText(keyValue)
        .then(() => showNotification('API key copied', 'success'))
        .catch(() => showNotification('Failed to copy key', 'error'));
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
        animation: slideIn 0.3s ease-out;
        font-weight: 700;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

function restoreAdminSessionDirect(target = '/admin.html') {
    const adminToken = window.localStorage.getItem(SUPPORT_ADMIN_TOKEN_KEY);

    if (!adminToken) {
        window.localStorage.removeItem(AUTH_TOKEN_KEY);
        window.localStorage.removeItem(SUPPORT_CONTEXT_KEY);
        window.location.href = '/admin-login.html';
        return false;
    }

    window.localStorage.setItem(AUTH_TOKEN_KEY, adminToken);
    window.localStorage.removeItem(SUPPORT_ADMIN_TOKEN_KEY);
    window.localStorage.removeItem(SUPPORT_CONTEXT_KEY);
    window.location.href = target;
    return true;
}

function exitSupportSession() {
    if (window.ParseForgeSession?.restoreAdminSession) {
        window.ParseForgeSession.restoreAdminSession('/admin.html');
        return;
    }

    restoreAdminSessionDirect('/admin.html');
}
