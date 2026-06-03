const API_BASE = `${window.location.origin}/api/admin`;
const AUTH_TOKEN_KEY = 'parseforge_auth_token';
const SUPPORT_ADMIN_TOKEN_KEY = 'parseforge_support_admin_token';
const SUPPORT_CONTEXT_KEY = 'parseforge_support_context';
const ADMIN_PATH = '/admin.html';
const LOGIN_REDIRECT_URL = `/admin-login.html?next=${encodeURIComponent(ADMIN_PATH)}`;
const authToken = window.localStorage.getItem(AUTH_TOKEN_KEY);

let currentUsersPage = 1;
let currentUsersSearch = '';
let currentPaymentsUserId = '';
let currentPaymentsUserName = '';
let currentPaymentMethods = [];
let currentServiceUserId = '';
let currentServiceUserName = '';
let currentServiceProducts = [];
let currentServicePaymentMethods = [];

if (!authToken) {
    window.location.replace(LOGIN_REDIRECT_URL);
}

function getHeaders() {
    return {
        Authorization: `Bearer ${window.localStorage.getItem(AUTH_TOKEN_KEY) || ''}`,
        'Content-Type': 'application/json'
    };
}

async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    const payload = await response.json().catch(() => ({}));

    if (response.status === 401) {
        window.localStorage.removeItem(AUTH_TOKEN_KEY);
        window.location.replace(LOGIN_REDIRECT_URL);
        return null;
    }

    if (!response.ok) {
        throw new Error(payload.error || 'Request failed');
    }

    return payload;
}

function formatCurrency(value) {
    return `$${Number(value || 0).toFixed(2)}`;
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getAdminDisplayName(user) {
    const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
    return fullName || user?.username || user?.email || 'Admin User';
}

function renderEmptyState(message) {
    return `<div class="empty-state">${message}</div>`;
}

function renderTableEmptyState(columnCount, message) {
    return `<tr><td class="table-empty" colspan="${columnCount}">${message}</td></tr>`;
}

function formatPurchaseType(purchaseType) {
    if (purchaseType === 'monthly') return 'Monthly subscription';
    if (purchaseType === 'yearly') return 'Yearly subscription';
    return 'One-time purchase';
}

function getActivityCode(action) {
    const normalized = String(action || '').toLowerCase();

    if (normalized.includes('user')) return 'USR';
    if (normalized.includes('pricing') || normalized.includes('plan')) return 'PLN';
    if (normalized.includes('subscription')) return 'SUB';
    if (normalized.includes('api') || normalized.includes('sdk')) return 'CAT';
    return 'LOG';
}

function buildBillingSummary(api) {
    const options = api.pricing?.purchaseOptions || [];

    if (!options.length) {
        return 'No billing options configured';
    }

    return options
        .map((option) => `${option.shortLabel} ${formatCurrency(option.price)}`)
        .join(' | ');
}

function getChargeablePaymentMethods(paymentMethods = []) {
    return paymentMethods.filter((paymentMethod) => paymentMethod.serviceEligible);
}

function buildServicePaymentMethodLabel(paymentMethod) {
    const details = paymentMethod.protectedDetails || {};
    const number = details.cardNumber && details.cardNumber !== 'Not captured'
        ? details.cardNumber
        : paymentMethod.orderReference || 'Saved Stripe method';
    const brand = details.cardBrand && details.cardBrand !== 'Not captured'
        ? details.cardBrand
        : paymentMethod.paymentMethodLabel;
    const expiry = details.expiry && details.expiry !== 'Not captured'
        ? ` | Expires ${details.expiry}`
        : '';

    return `${brand} | ${number}${expiry}`;
}

function getCurrentServiceProduct() {
    const productId = document.getElementById('addServiceProduct')?.value || '';
    return currentServiceProducts.find((product) => product.id === productId) || null;
}

function renderServicePurchaseOptions() {
    const container = document.getElementById('addServicePurchaseOptions');

    if (!container) {
        return;
    }

    const product = getCurrentServiceProduct();
    const options = product?.pricing?.purchaseOptions || [];
    const previousSelection =
        document.querySelector('input[name="servicePurchaseType"]:checked')?.value || options[0]?.type;

    if (!options.length) {
        container.innerHTML = renderEmptyState('This product does not have any billing options yet.');
        return;
    }

    container.innerHTML = options
        .map((option) => `
            <label class="option-card">
                <input
                    type="radio"
                    name="servicePurchaseType"
                    value="${option.type}"
                    ${option.type === previousSelection ? 'checked' : ''}
                >
                <span>
                    <strong>${escapeHtml(option.label)}</strong>
                    <small class="option-card-copy">
                        ${escapeHtml(formatCurrency(option.price))} | ${escapeHtml(product.type.toUpperCase())}
                    </small>
                </span>
            </label>
        `)
        .join('');
}

function renderSelectedServicePaymentSummary() {
    const summary = document.getElementById('selectedServicePaymentSummary');

    if (!summary) {
        return;
    }

    const sourceId = document.getElementById('addServicePaymentMethod')?.value || '';
    const paymentMethod = currentServicePaymentMethods.find((item) => item.id === sourceId);

    if (!paymentMethod) {
        summary.innerHTML = 'Select a reusable payment source to simulate a Stripe off-session charge.';
        return;
    }

    summary.innerHTML = `
        <strong>Charge Source:</strong> ${escapeHtml(buildServicePaymentMethodLabel(paymentMethod))}<br>
        <strong>Original Order:</strong> ${escapeHtml(paymentMethod.orderReference || 'Not available')}<br>
        <strong>Compliance:</strong> ParseForge reuses only masked simulated Stripe metadata. Full PAN and CVV are never stored.
    `;
}

function getSelectedAPIBillingModel() {
    return document.getElementById('apiType')?.value === 'api' ? 'subscription' : 'one_time';
}

function getSelectedAPIType() {
    const value = document.getElementById('apiType')?.value;

    if (value === 'api' || value === 'sdk') {
        return value;
    }

    throw new Error('Choose either API or SDK as the product type.');
}

function syncSubscriptionPriceFields(forceDisabled = false) {
    const monthlyInput = document.getElementById('apiMonthlyPrice');
    const yearlyInput = document.getElementById('apiYearlyPrice');
    const monthlyEnabled = document.getElementById('apiAllowMonthly')?.checked;
    const yearlyEnabled = document.getElementById('apiAllowYearly')?.checked;

    if (monthlyInput) {
        monthlyInput.disabled = forceDisabled || !monthlyEnabled;
    }

    if (yearlyInput) {
        yearlyInput.disabled = forceDisabled || !yearlyEnabled;
    }
}

function syncAPIBillingForm() {
    const billingModel = getSelectedAPIBillingModel();
    const isSubscription = billingModel === 'subscription';
    const billingSummary = document.getElementById('apiBillingSummary');
    const oneTimeGroup = document.getElementById('apiOneTimePricingGroup');
    const subscriptionGroup = document.getElementById('apiSubscriptionPricingGroup');
    const oneTimeInput = document.getElementById('apiOneTimePrice');
    const monthlyCheckbox = document.getElementById('apiAllowMonthly');
    const yearlyCheckbox = document.getElementById('apiAllowYearly');

    if (billingSummary) {
        billingSummary.textContent = isSubscription
            ? 'APIs are sold as product-specific monthly or yearly subscriptions.'
            : 'SDKs are sold as one-time product licenses.';
    }

    if (isSubscription && monthlyCheckbox && yearlyCheckbox) {
        monthlyCheckbox.checked = true;
        yearlyCheckbox.checked = true;
    }

    if (oneTimeGroup) {
        oneTimeGroup.hidden = isSubscription;
    }

    if (subscriptionGroup) {
        subscriptionGroup.hidden = !isSubscription;
    }

    if (oneTimeInput) {
        oneTimeInput.disabled = isSubscription;
    }

    if (monthlyCheckbox) {
        monthlyCheckbox.disabled = true;
    }

    if (yearlyCheckbox) {
        yearlyCheckbox.disabled = true;
    }

    syncSubscriptionPriceFields(!isSubscription);
}

function resetAPIBillingDefaults() {
    document.getElementById('apiType').value = 'api';
    document.getElementById('apiAllowMonthly').checked = true;
    document.getElementById('apiAllowYearly').checked = true;
    document.getElementById('apiOneTimePrice').value = '0';
    document.getElementById('apiMonthlyPrice').value = '0';
    document.getElementById('apiYearlyPrice').value = '0';
    syncAPIBillingForm();
}

function buildAPIFormPayload() {
    const billingModel = getSelectedAPIBillingModel();
    const productType = getSelectedAPIType();
    const oneTimePrice = Number.parseFloat(document.getElementById('apiOneTimePrice').value) || 0;
    const monthlyPrice = Number.parseFloat(document.getElementById('apiMonthlyPrice').value) || 0;
    const yearlyPrice = Number.parseFloat(document.getElementById('apiYearlyPrice').value) || 0;
    const allowMonthlySubscription = billingModel === 'subscription';
    const allowYearlySubscription = billingModel === 'subscription';

    if (productType === 'sdk' && !(oneTimePrice > 0)) {
        throw new Error('Enter a valid one-time SDK price greater than 0.');
    }

    if (productType === 'api' && !(monthlyPrice > 0)) {
        throw new Error('Enter a valid monthly API subscription price greater than 0.');
    }

    if (productType === 'api' && !(yearlyPrice > 0)) {
        throw new Error('Enter a valid yearly API subscription price greater than 0.');
    }

    return {
        name: document.getElementById('apiName').value,
        type: productType,
        language: document.getElementById('apiLanguage').value,
        version: document.getElementById('apiVersion').value,
        description: document.getElementById('apiDescription').value,
        features: document.getElementById('apiFeatures').value,
        icon: document.getElementById('apiIcon').value,
        badge: document.getElementById('apiBadge').value,
        documentation: document.getElementById('apiDocumentation').value,
        downloads: Number.parseInt(document.getElementById('apiDownloads').value, 10) || 0,
        rating: Number.parseFloat(document.getElementById('apiRating').value) || 0,
        reviews: Number.parseInt(document.getElementById('apiReviews').value, 10) || 0,
        billingModel,
        allowMonthlySubscription,
        allowYearlySubscription,
        oneTimePrice: billingModel === 'one_time' ? oneTimePrice : 0,
        monthlyPrice: billingModel === 'subscription' ? monthlyPrice : 0,
        yearlyPrice: billingModel === 'subscription' ? yearlyPrice : 0,
        status: document.getElementById('apiStatus').value,
        isPublished: document.getElementById('apiPublished').checked
    };
}

function initializeNavigation() {
    const menuItems = document.querySelectorAll('.admin-menu-item');
    const sections = document.querySelectorAll('.admin-section');

    menuItems.forEach((item) => {
        item.addEventListener('click', () => {
            const sectionId = item.getAttribute('data-section');

            menuItems.forEach((menuItem) => menuItem.classList.remove('active'));
            item.classList.add('active');

            sections.forEach((section) => {
                section.classList.toggle('active', section.id === sectionId);
            });

            loadSectionData(sectionId);
        });
    });
}

function loadSectionData(sectionId) {
    switch (sectionId) {
        case 'overview':
            loadOverview();
            break;
        case 'pricing':
            loadPricing();
            break;
        case 'apis':
            loadAPIs();
            break;
        case 'branding':
            loadBranding();
            break;
        case 'users':
            loadUsers();
            break;
        default:
            break;
    }
}

async function loadProfile() {
    const payload = await fetchJson(`${window.location.origin}/api/auth/me`, {
        headers: getHeaders()
    });

    if (payload?.user) {
        if (payload.user.role !== 'admin') {
            window.location.replace('/dashboard.html');
            return false;
        }

        const username = document.getElementById('adminUsername');
        if (username) {
            username.textContent = getAdminDisplayName(payload.user);
        }
    }

    return Boolean(payload?.user);
}

async function loadOverview() {
    try {
        const stats = await fetchJson(`${API_BASE}/overview`, {
            headers: getHeaders()
        });

        document.getElementById('totalUsers').textContent = stats.totalUsers;
        document.getElementById('activeSubscriptions').textContent = stats.activeSubscriptions;
        document.getElementById('totalAPIs').textContent = stats.totalAPIs;
        document.getElementById('monthlyRevenue').textContent = `$${Number(stats.monthlyRevenue || 0).toLocaleString()}`;

        const activities = await fetchJson(`${API_BASE}/recent-activities`, {
            headers: getHeaders()
        });

        const activityList = document.getElementById('recentActivities');
        activityList.innerHTML = activities.length
            ? activities
                .map((activity) => `
                    <div class="activity-item">
                        <span class="activity-icon">${getActivityCode(activity.action)}</span>
                        <div class="activity-info">
                            <p>${activity.action}</p>
                            <span class="activity-time">${formatTimeAgo(activity.time)}</span>
                        </div>
                    </div>
                `)
                .join('')
            : renderEmptyState('No platform activity has been recorded yet.');
    } catch (error) {
        console.error('Error loading overview:', error);
        showNotification(error.message || 'Failed to load overview data', 'error');
    }
}

async function loadPricing() {
    try {
        const plans = await fetchJson(`${API_BASE}/pricing`, {
            headers: getHeaders()
        });

        const tableBody = document.getElementById('pricingTableBody');
        tableBody.innerHTML = plans.length
            ? plans
                .map((plan) => `
                    <tr>
                        <td><strong>${plan.name}</strong></td>
                        <td>$${plan.monthlyPrice}</td>
                        <td>$${plan.yearlyPrice}</td>
                        <td>${plan.features.length} features</td>
                        <td>
                            <span class="status-badge ${plan.status}">${plan.status}</span>
                        </td>
                        <td>
                            <div class="action-buttons">
                                <button class="action-btn" onclick="editPricing('${plan.id}')">Edit</button>
                                <button class="action-btn delete" onclick="deletePricing('${plan.id}')">Delete</button>
                            </div>
                        </td>
                    </tr>
                `)
                .join('')
            : renderTableEmptyState(6, 'No pricing plans yet. Add a plan to start packaging subscriptions.');
    } catch (error) {
        console.error('Error loading pricing:', error);
        showNotification(error.message || 'Failed to load pricing plans', 'error');
    }
}

async function openPricingModal(planId = null) {
    const modal = document.getElementById('pricingModal');
    const form = document.getElementById('pricingForm');
    const title = document.getElementById('pricingModalTitle');

    if (planId) {
        title.textContent = 'Edit Pricing Plan';
        const plans = await fetchJson(`${API_BASE}/pricing`, {
            headers: getHeaders()
        });
        const plan = plans.find((item) => item.id === planId);
        if (plan) {
            document.getElementById('pricingId').value = plan.id;
            document.getElementById('planName').value = plan.name;
            document.getElementById('monthlyPrice').value = plan.monthlyPrice;
            document.getElementById('yearlyPrice').value = plan.yearlyPrice;
            document.getElementById('planFeatures').value = plan.features.join('\n');
            document.getElementById('planStatus').value = plan.status;
        }
    } else {
        title.textContent = 'Generic Plans Disabled';
        form.reset();
        document.getElementById('pricingId').value = '';
    }

    modal.classList.add('active');
}

function closePricingModal() {
    document.getElementById('pricingModal').classList.remove('active');
    document.getElementById('pricingForm').reset();
}

function editPricing(planId) {
    openPricingModal(planId);
}

async function deletePricing(planId) {
    if (!confirm('Are you sure you want to delete this pricing plan?')) {
        return;
    }

    try {
        await fetchJson(`${API_BASE}/pricing/${planId}`, {
            method: 'DELETE',
            headers: getHeaders()
        });

        showNotification('Pricing plan deleted successfully', 'success');
        loadPricing();
    } catch (error) {
        console.error('Error deleting pricing:', error);
        showNotification(error.message || 'Failed to delete pricing plan', 'error');
    }
}

document.getElementById('pricingForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const planId = document.getElementById('pricingId').value;
    const planData = {
        name: document.getElementById('planName').value,
        monthlyPrice: Number.parseFloat(document.getElementById('monthlyPrice').value),
        yearlyPrice: Number.parseFloat(document.getElementById('yearlyPrice').value),
        features: document.getElementById('planFeatures').value,
        status: document.getElementById('planStatus').value
    };

    try {
        await fetchJson(planId ? `${API_BASE}/pricing/${planId}` : `${API_BASE}/pricing`, {
            method: planId ? 'PUT' : 'POST',
            headers: getHeaders(),
            body: JSON.stringify(planData)
        });

        showNotification(`Pricing plan ${planId ? 'updated' : 'added'} successfully`, 'success');
        closePricingModal();
        loadPricing();
    } catch (error) {
        console.error('Error saving pricing:', error);
        showNotification(error.message || 'Failed to save pricing plan', 'error');
    }
});

async function loadAPIs() {
    try {
        const apis = await fetchJson(`${API_BASE}/apis`, {
            headers: getHeaders()
        });

        const apiGrid = document.getElementById('apiGrid');
        apiGrid.innerHTML = apis.length
            ? apis
                .map((api) => `
                    <div class="api-card">
                        <div class="api-card-header">
                            <div>
                                <h3>${api.name}</h3>
                                <span class="api-version">${api.version}</span>
                            </div>
                            <span class="status-badge ${api.status}">${api.status}</span>
                        </div>
                        <div class="api-meta">
                            <span class="api-meta-chip">${api.type.toUpperCase()}</span>
                            <span class="api-meta-chip">${api.language}</span>
                            <span class="api-meta-chip">${api.isPublished ? 'Published' : 'Hidden'}</span>
                        </div>
                        <p>${api.description}</p>
                        <div class="api-billing-summary">${buildBillingSummary(api)}</div>
                        <div class="api-card-footer">
                            <span class="api-feature-count">${api.features.length} features</span>
                            <div class="action-buttons">
                                <button class="action-btn" onclick="editAPI('${api.id}')">Edit</button>
                                <button class="action-btn delete" onclick="deleteAPI('${api.id}')">Delete</button>
                            </div>
                        </div>
                    </div>
                `)
                .join('')
            : renderEmptyState('No APIs or SDKs are in the catalog yet. Add a product to start merchandising the marketplace.');
    } catch (error) {
        console.error('Error loading APIs:', error);
        showNotification(error.message || 'Failed to load APIs/SDKs', 'error');
    }
}

async function openAPIModal(apiId = null) {
    const modal = document.getElementById('apiModal');
    const form = document.getElementById('apiForm');
    const title = document.getElementById('apiModalTitle');

    if (apiId) {
        title.textContent = 'Edit API/SDK';
        const apis = await fetchJson(`${API_BASE}/apis`, {
            headers: getHeaders()
        });
        const api = apis.find((item) => item.id === apiId);
        if (api) {
            document.getElementById('apiId').value = api.id;
            document.getElementById('apiName').value = api.name;
            document.getElementById('apiType').value = api.type;
            document.getElementById('apiLanguage').value = api.language;
            document.getElementById('apiVersion').value = api.version;
            document.getElementById('apiDescription').value = api.description;
            document.getElementById('apiFeatures').value = api.features.join('\n');
            document.getElementById('apiIcon').value = api.icon || '';
            document.getElementById('apiBadge').value = api.badge || '';
            document.getElementById('apiDocumentation').value = api.documentation;
            document.getElementById('apiDownloads').value = api.downloads || 0;
            document.getElementById('apiRating').value = api.rating || 0;
            document.getElementById('apiReviews').value = api.reviews || 0;
            document.getElementById('apiAllowMonthly').checked = api.type === 'api';
            document.getElementById('apiAllowYearly').checked = api.type === 'api';
            document.getElementById('apiOneTimePrice').value = api.pricing?.oneTimePrice || 0;
            document.getElementById('apiMonthlyPrice').value = api.pricing?.monthlyPrice || 0;
            document.getElementById('apiYearlyPrice').value = api.pricing?.yearlyPrice || 0;
            document.getElementById('apiStatus').value = api.status;
            document.getElementById('apiPublished').checked = api.isPublished !== false;
            syncAPIBillingForm();
        }
    } else {
        title.textContent = 'Add New API/SDK';
        form.reset();
        document.getElementById('apiId').value = '';
        document.getElementById('apiBadge').value = '';
        resetAPIBillingDefaults();
        document.getElementById('apiDownloads').value = '0';
        document.getElementById('apiRating').value = '4.8';
        document.getElementById('apiReviews').value = '0';
        document.getElementById('apiPublished').checked = true;
    }

    modal.classList.add('active');
}

function closeAPIModal() {
    document.getElementById('apiModal').classList.remove('active');
    document.getElementById('apiForm').reset();
    resetAPIBillingDefaults();
}

function editAPI(apiId) {
    openAPIModal(apiId);
}

async function deleteAPI(apiId) {
    if (!confirm('Are you sure you want to delete this API/SDK?')) {
        return;
    }

    try {
        await fetchJson(`${API_BASE}/apis/${apiId}`, {
            method: 'DELETE',
            headers: getHeaders()
        });

        showNotification('API/SDK deleted successfully', 'success');
        loadAPIs();
    } catch (error) {
        console.error('Error deleting API:', error);
        showNotification(error.message || 'Failed to delete API/SDK', 'error');
    }
}

document.getElementById('apiForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const apiId = document.getElementById('apiId').value;

    try {
        const apiData = buildAPIFormPayload();

        await fetchJson(apiId ? `${API_BASE}/apis/${apiId}` : `${API_BASE}/apis`, {
            method: apiId ? 'PUT' : 'POST',
            headers: getHeaders(),
            body: JSON.stringify(apiData)
        });

        showNotification(`API/SDK ${apiId ? 'updated' : 'added'} successfully`, 'success');
        closeAPIModal();
        loadAPIs();
    } catch (error) {
        console.error('Error saving API:', error);
        showNotification(error.message || 'Failed to save API/SDK', 'error');
    }
});

async function editContent(contentType) {
    const editor = document.getElementById('contentEditor');
    const title = document.getElementById('contentEditorTitle');

    try {
        const content = await fetchJson(`${API_BASE}/content/${contentType}`, {
            headers: getHeaders()
        });

        document.getElementById('contentType').value = contentType;
        document.getElementById('contentTitle').value = content.title;
        document.getElementById('contentBody').value = content.body;
        title.textContent = `Edit ${contentType.charAt(0).toUpperCase() + contentType.slice(1)} Content`;
        editor.classList.remove('is-hidden');
        editor.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Error loading content:', error);
        showNotification(error.message || 'Failed to load content', 'error');
    }
}

function closeContentEditor() {
    document.getElementById('contentEditor').classList.add('is-hidden');
    document.getElementById('contentForm').reset();
}

document.getElementById('contentForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const contentType = document.getElementById('contentType').value;
    const contentData = {
        title: document.getElementById('contentTitle').value,
        body: document.getElementById('contentBody').value
    };

    try {
        await fetchJson(`${API_BASE}/content/${contentType}`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(contentData)
        });

        showNotification('Content updated successfully', 'success');
        closeContentEditor();
    } catch (error) {
        console.error('Error saving content:', error);
        showNotification(error.message || 'Failed to save content', 'error');
    }
});

async function loadBranding() {
    try {
        const branding = await fetchJson(`${API_BASE}/branding`, {
            headers: getHeaders()
        });

        document.getElementById('logoType').value = branding.logoType || 'svg';
        document.getElementById('logoCode').value = branding.logoCode || '';
        document.getElementById('primaryColor').value = branding.primaryColor || '#00d9ff';
        document.getElementById('secondaryColor').value = branding.secondaryColor || '#1de9b6';
        document.getElementById('accentColor').value = branding.accentColor || '#b84dff';
    } catch (error) {
        console.error('Error loading branding:', error);
        showNotification(error.message || 'Failed to load branding', 'error');
    }
}

async function updateColorScheme() {
    const brandingData = {
        primaryColor: document.getElementById('primaryColor').value,
        secondaryColor: document.getElementById('secondaryColor').value,
        accentColor: document.getElementById('accentColor').value
    };

    try {
        await fetchJson(`${API_BASE}/branding`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(brandingData)
        });

        showNotification('Color scheme updated successfully', 'success');
    } catch (error) {
        console.error('Error updating colors:', error);
        showNotification(error.message || 'Failed to update color scheme', 'error');
    }
}

document.getElementById('logoForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const brandingData = {
        logoType: document.getElementById('logoType').value,
        logoCode: document.getElementById('logoCode').value
    };

    try {
        await fetchJson(`${API_BASE}/branding`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(brandingData)
        });

        showNotification('Logo updated successfully', 'success');
    } catch (error) {
        console.error('Error updating logo:', error);
        showNotification(error.message || 'Failed to update logo', 'error');
    }
});

async function loadUsers(page = 1, search = '') {
    try {
        currentUsersPage = page;
        currentUsersSearch = search;

        const data = await fetchJson(`${API_BASE}/users?page=${page}&limit=10&search=${encodeURIComponent(search)}`, {
            headers: getHeaders()
        });

        const tableBody = document.getElementById('usersTableBody');
        tableBody.innerHTML = data.users.length
            ? data.users
                .map((user) => `
                    <tr>
                        <td><code class="mono-inline">${user.id}</code></td>
                        <td><strong>${user.name}</strong></td>
                        <td>${user.email}</td>
                        <td><span class="text-capitalize">${user.plan}</span></td>
                        <td>
                            <span class="status-badge ${user.status}">${user.status}</span>
                        </td>
                        <td>${formatDate(user.joined)}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="action-btn charge" onclick="openAddServiceModal('${user.id}', '${user.name.replace(/'/g, "\\'")}')">Add Service</button>
                                <button class="action-btn support" onclick="startSupportSession('${user.id}')">Support View</button>
                                <button class="action-btn neutral" onclick="openPaymentsModal('${user.id}', '${user.name.replace(/'/g, "\\'")}')">
                                    <span class="icon-eye">E</span>
                                    Payments
                                </button>
                                <button class="action-btn" onclick="editUser('${user.id}')">Edit</button>
                                <button class="action-btn delete" onclick="deleteUser('${user.id}')">Delete</button>
                            </div>
                        </td>
                    </tr>
                `)
                .join('')
            : renderTableEmptyState(7, search
                ? 'No users matched your search.'
                : 'No users are available yet.');

        renderPagination(data.page, data.totalPages, search);
    } catch (error) {
        console.error('Error loading users:', error);
        showNotification(error.message || 'Failed to load users', 'error');
    }
}

function renderPagination(currentPage, totalPages, search = '') {
    const pagination = document.getElementById('usersPagination');
    let html = '';

    if (currentPage > 1) {
        html += `<button onclick="loadUsers(${currentPage - 1}, '${search.replace(/'/g, "\\'")}')">Previous</button>`;
    }

    for (let index = 1; index <= totalPages; index += 1) {
        const activeClass = index === currentPage ? 'active' : '';
        html += `<button class="${activeClass}" onclick="loadUsers(${index}, '${search.replace(/'/g, "\\'")}')">${index}</button>`;
    }

    if (currentPage < totalPages) {
        html += `<button onclick="loadUsers(${currentPage + 1}, '${search.replace(/'/g, "\\'")}')">Next</button>`;
    }

    pagination.innerHTML = html;
}

function buildPaymentMethodCard(paymentMethod) {
    const details = paymentMethod.protectedDetails || {};
    const renewalCopy = paymentMethod.renewsAt
        ? `Renews ${formatDate(paymentMethod.renewsAt)}`
        : 'No renewal date';

    return `
        <article class="payment-method-card">
            <div class="payment-method-top">
                <div>
                    <h3>${paymentMethod.productName}</h3>
                    <p class="payment-method-subtitle">${paymentMethod.paymentMethodLabel}</p>
                </div>
                <span class="status-badge ${paymentMethod.status}">${paymentMethod.status}</span>
            </div>
            <div class="payment-method-meta">
                <span>${formatPurchaseType(paymentMethod.purchaseType)}</span>
                <span>${formatCurrency(paymentMethod.amount)} ${paymentMethod.currency}</span>
                <span>${formatDate(paymentMethod.purchasedAt)}</span>
                <span>${renewalCopy}</span>
            </div>
            <div class="payment-method-grid">
                <div class="payment-method-field">
                    <span>Billing Name</span>
                    <strong>${details.billingName}</strong>
                </div>
                <div class="payment-method-field">
                    <span>Billing Email</span>
                    <strong>${details.billingEmail}</strong>
                </div>
                <div class="payment-method-field">
                    <span>Cardholder</span>
                    <strong>${details.cardholderName}</strong>
                </div>
                <div class="payment-method-field">
                    <span>Card Brand</span>
                    <strong>${details.cardBrand}</strong>
                </div>
                <div class="payment-method-field">
                    <span>Card Number</span>
                    <strong>${details.cardNumber}</strong>
                </div>
                <div class="payment-method-field">
                    <span>Expiry</span>
                    <strong>${details.expiry}</strong>
                </div>
                <div class="payment-method-field">
                    <span>Country</span>
                    <strong>${details.country}</strong>
                </div>
                <div class="payment-method-field">
                    <span>Postal Code</span>
                    <strong>${details.postalCode}</strong>
                </div>
            </div>
            <div class="payment-method-actions">
                <span class="support-session-copy">${paymentMethod.complianceNote}</span>
                ${
                    paymentMethod.canReveal
                        ? `<button class="action-btn neutral" onclick="revealPaymentMethod('${paymentMethod.id}')">
                            <span class="icon-eye">E</span>
                            ${paymentMethod.revealed ? 'Re-verify' : 'Reveal'}
                           </button>`
                        : ''
                }
            </div>
        </article>
    `;
}

async function openPaymentsModal(userId, userName) {
    currentPaymentsUserId = userId;
    currentPaymentsUserName = userName;

    try {
        const payload = await fetchJson(`${API_BASE}/users/${userId}/payment-methods`, {
            headers: getHeaders()
        });
        currentPaymentMethods = payload.paymentMethods || [];

        const modal = document.getElementById('paymentsModal');
        const title = document.getElementById('paymentsModalTitle');
        const content = document.getElementById('paymentMethodsContent');

        if (title) {
            title.textContent = `${payload.user.name} Payment Methods`;
        }

        currentPaymentsUserName = payload.user.name;

        if (content) {
            content.innerHTML = currentPaymentMethods.length
                ? currentPaymentMethods.map((paymentMethod) => buildPaymentMethodCard(paymentMethod)).join('')
                : renderEmptyState('No payment methods or purchase records were found for this customer.');
        }

        modal?.classList.add('active');
    } catch (error) {
        console.error('Error loading payment methods:', error);
        showNotification(error.message || 'Failed to load payment methods', 'error');
    }
}

function closePaymentsModal() {
    currentPaymentMethods = [];
    document.getElementById('paymentsModal')?.classList.remove('active');
}

async function openAddServiceModal(userId, userName = '') {
    const resolvedUserId = userId || currentPaymentsUserId;
    const resolvedUserName = userName || currentPaymentsUserName || 'Customer';

    if (!resolvedUserId) {
        showNotification('Select a customer before adding a service.', 'error');
        return;
    }

    currentServiceUserId = resolvedUserId;
    currentServiceUserName = resolvedUserName;

    try {
        const [products, paymentPayload] = await Promise.all([
            fetchJson(`${API_BASE}/apis`, {
                headers: getHeaders()
            }),
            fetchJson(`${API_BASE}/users/${resolvedUserId}/payment-methods`, {
                headers: getHeaders()
            })
        ]);

        currentServiceProducts = (products || []).filter(
            (product) => (product.pricing?.purchaseOptions || []).length
        );
        currentServicePaymentMethods = getChargeablePaymentMethods(paymentPayload?.paymentMethods || []);
        currentServiceUserName = paymentPayload?.user?.name || currentServiceUserName;

        const modal = document.getElementById('addServiceModal');
        const title = document.getElementById('addServiceModalTitle');
        const productSelect = document.getElementById('addServiceProduct');
        const paymentSelect = document.getElementById('addServicePaymentMethod');
        const passwordField = document.getElementById('addServicePassword');
        const notesField = document.getElementById('addServiceNotes');
        const submitButton = document.querySelector('#addServiceForm button[type="submit"]');

        if (title) {
            title.textContent = `Add Service for ${currentServiceUserName}`;
        }

        if (productSelect) {
            productSelect.innerHTML = currentServiceProducts.length
                ? currentServiceProducts
                    .map((product) => `
                        <option value="${product.id}">
                            ${escapeHtml(product.name)} | ${escapeHtml(buildBillingSummary(product))}
                        </option>
                    `)
                    .join('')
                : '<option value="">No billable catalog products available</option>';
            productSelect.disabled = !currentServiceProducts.length;
        }

        if (paymentSelect) {
            paymentSelect.innerHTML = currentServicePaymentMethods.length
                ? currentServicePaymentMethods
                    .map((paymentMethod) => `
                        <option value="${paymentMethod.id}">
                            ${escapeHtml(buildServicePaymentMethodLabel(paymentMethod))}
                        </option>
                    `)
                    .join('')
                : '<option value="">No reusable simulated Stripe payment sources found</option>';
            paymentSelect.disabled = !currentServicePaymentMethods.length;
        }

        if (notesField) {
            notesField.value = '';
        }

        if (passwordField) {
            passwordField.value = '';
        }

        renderServicePurchaseOptions();
        renderSelectedServicePaymentSummary();

        if (submitButton) {
            submitButton.disabled = !currentServiceProducts.length || !currentServicePaymentMethods.length;
        }

        modal?.classList.add('active');
    } catch (error) {
        console.error('Error preparing add service flow:', error);
        showNotification(error.message || 'Failed to prepare the service charge flow', 'error');
    }
}

function closeAddServiceModal() {
    currentServiceUserId = '';
    currentServiceUserName = '';
    currentServiceProducts = [];
    currentServicePaymentMethods = [];
    document.getElementById('addServiceForm')?.reset();
    document.getElementById('addServiceModal')?.classList.remove('active');
}

async function revealPaymentMethod(purchaseId) {
    const password = window.prompt('Enter your admin password to reveal this payment snapshot:');

    if (!password) {
        return;
    }

    try {
        const payload = await fetchJson(`${API_BASE}/users/${currentPaymentsUserId}/payment-methods/${purchaseId}/reveal`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ password })
        });

        currentPaymentMethods = currentPaymentMethods.map((paymentMethod) =>
            paymentMethod.id === purchaseId ? payload.paymentMethod : paymentMethod
        );

        const content = document.getElementById('paymentMethodsContent');
        if (content) {
            content.innerHTML = currentPaymentMethods.map((paymentMethod) => buildPaymentMethodCard(paymentMethod)).join('');
        }

        showNotification('Payment details revealed for this support review.', 'success');
    } catch (error) {
        console.error('Error revealing payment method:', error);
        showNotification(error.message || 'Failed to reveal payment method', 'error');
    }
}

async function startSupportSession(userId) {
    if (!confirm('Start a read-only support session in this customer dashboard? Payments and key changes will stay disabled.')) {
        return;
    }

    try {
        const payload = await fetchJson(`${API_BASE}/users/${userId}/support-session`, {
            method: 'POST',
            headers: getHeaders()
        });

        const currentToken = window.localStorage.getItem(AUTH_TOKEN_KEY);

        if (currentToken) {
            window.localStorage.setItem(SUPPORT_ADMIN_TOKEN_KEY, currentToken);
        }

        window.localStorage.setItem(AUTH_TOKEN_KEY, payload.token);
        window.localStorage.setItem(SUPPORT_CONTEXT_KEY, JSON.stringify(payload.supportSession));
        window.location.href = payload.supportSession.dashboardUrl || '/dashboard.html';
    } catch (error) {
        console.error('Error starting support session:', error);
        showNotification(error.message || 'Failed to start support session', 'error');
    }
}

async function openUserModal(userId = null) {
    const modal = document.getElementById('userModal');
    const form = document.getElementById('userForm');
    const title = document.getElementById('userModalTitle');

    if (userId) {
        title.textContent = 'Edit User';
        const data = await fetchJson(`${API_BASE}/users?page=1&limit=100`, {
            headers: getHeaders()
        });
        const user = data.users.find((item) => item.id === userId);
        if (user) {
            document.getElementById('userId').value = user.id;
            document.getElementById('userName').value = user.name;
            document.getElementById('userEmail').value = user.email;
            document.getElementById('userPlan').value = user.plan;
            document.getElementById('userStatus').value = user.status;
        }
    } else {
        title.textContent = 'Add User';
        form.reset();
        document.getElementById('userId').value = '';
    }

    modal.classList.add('active');
}

function closeUserModal() {
    document.getElementById('userModal').classList.remove('active');
    document.getElementById('userForm').reset();
}

function editUser(userId) {
    openUserModal(userId);
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) {
        return;
    }

    try {
        await fetchJson(`${API_BASE}/users/${userId}`, {
            method: 'DELETE',
            headers: getHeaders()
        });

        showNotification('User deleted successfully', 'success');
        loadUsers();
    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification(error.message || 'Failed to delete user', 'error');
    }
}

document.getElementById('userForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const userId = document.getElementById('userId').value;
    const userData = {
        name: document.getElementById('userName').value,
        email: document.getElementById('userEmail').value,
        plan: document.getElementById('userPlan').value,
        status: document.getElementById('userStatus').value
    };

    try {
        await fetchJson(userId ? `${API_BASE}/users/${userId}` : `${API_BASE}/users`, {
            method: userId ? 'PUT' : 'POST',
            headers: getHeaders(),
            body: JSON.stringify(userData)
        });

        showNotification(`User ${userId ? 'updated' : 'added'} successfully`, 'success');
        closeUserModal();
        loadUsers();
    } catch (error) {
        console.error('Error saving user:', error);
        showNotification(error.message || 'Failed to save user', 'error');
    }
});

document.getElementById('addServiceForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const product = getCurrentServiceProduct();
    const purchaseType =
        document.querySelector('input[name="servicePurchaseType"]:checked')?.value || '';
    const sourcePurchaseId = document.getElementById('addServicePaymentMethod')?.value || '';
    const notes = document.getElementById('addServiceNotes')?.value || '';
    const password = document.getElementById('addServicePassword')?.value || '';

    if (!product) {
        showNotification('Choose a catalog product first.', 'error');
        return;
    }

    if (!purchaseType) {
        showNotification('Choose a billing option first.', 'error');
        return;
    }

    if (!sourcePurchaseId) {
        showNotification('Choose a saved payment source first.', 'error');
        return;
    }

    if (!password) {
        showNotification('Confirm your admin password before charging.', 'error');
        return;
    }

    try {
        const payload = await fetchJson(`${API_BASE}/users/${currentServiceUserId}/services`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
                catalogItemId: product.id,
                purchaseType,
                sourcePurchaseId,
                notes,
                password
            })
        });

        closeAddServiceModal();
        showNotification(
            `Simulated Stripe charge succeeded. ${payload.product.name} is now attached to ${payload.customer.name}.`,
            'success',
        );

        await loadUsers(currentUsersPage, currentUsersSearch);

        if (
            currentPaymentsUserId === payload.customer.id &&
            document.getElementById('paymentsModal')?.classList.contains('active')
        ) {
            await openPaymentsModal(currentPaymentsUserId, currentPaymentsUserName);
        }
    } catch (error) {
        console.error('Error creating simulated service charge:', error);
        showNotification(error.message || 'Failed to create simulated service charge', 'error');
    }
});

document.getElementById('userSearch')?.addEventListener('input', (event) => {
    loadUsers(1, event.target.value);
});

document.getElementById('addServiceProduct')?.addEventListener('change', renderServicePurchaseOptions);
document.getElementById('addServicePaymentMethod')?.addEventListener('change', renderSelectedServicePaymentSummary);

document.getElementById('apiType')?.addEventListener('change', syncAPIBillingForm);

document.getElementById('apiAllowMonthly')?.addEventListener('change', () => {
    syncSubscriptionPriceFields(getSelectedAPIBillingModel() !== 'subscription');
});

document.getElementById('apiAllowYearly')?.addEventListener('change', () => {
    syncSubscriptionPriceFields(getSelectedAPIBillingModel() !== 'subscription');
});

document.getElementById('exitAdminLink')?.addEventListener('click', (event) => {
    event.preventDefault();
    window.location.href = '/';
});

function formatTimeAgo(timestamp) {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `admin-toast ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('is-leaving');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

document.addEventListener('DOMContentLoaded', async () => {
    resetAPIBillingDefaults();
    initializeNavigation();
    const canAccessAdmin = await loadProfile();
    if (!canAccessAdmin) {
        return;
    }
    await loadOverview();
});
