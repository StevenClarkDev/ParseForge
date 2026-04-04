const API_BASE = `${window.location.origin}/api/admin`;
const AUTH_TOKEN_KEY = 'parseforge_auth_token';
const authToken = window.localStorage.getItem(AUTH_TOKEN_KEY);

if (!authToken) {
    window.location.replace('/login.html');
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

    if (response.status === 401 || response.status === 403) {
        window.localStorage.removeItem(AUTH_TOKEN_KEY);
        window.location.replace('/login.html');
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

function buildBillingSummary(api) {
    const options = api.pricing?.purchaseOptions || [];

    if (!options.length) {
        return 'No billing options configured';
    }

    return options
        .map((option) => `${option.shortLabel} ${formatCurrency(option.price)}`)
        .join(' | ');
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
        const username = document.getElementById('adminUsername');
        if (username) {
            username.textContent = `${payload.user.firstName} ${payload.user.lastName}`;
        }
    }
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
        activityList.innerHTML = activities
            .map((activity) => `
                <div class="activity-item">
                    <span class="activity-icon">LOG</span>
                    <div class="activity-info">
                        <p>${activity.action}</p>
                        <span class="activity-time">${formatTimeAgo(activity.time)}</span>
                    </div>
                </div>
            `)
            .join('');
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
        tableBody.innerHTML = plans
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
            .join('');
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
        title.textContent = 'Add Pricing Plan';
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
        apiGrid.innerHTML = apis
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
            .join('');
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
            document.getElementById('apiAllowOneTime').checked = Boolean(api.pricing?.allowOneTimePurchase);
            document.getElementById('apiAllowMonthly').checked = Boolean(api.pricing?.allowMonthlySubscription);
            document.getElementById('apiAllowYearly').checked = Boolean(api.pricing?.allowYearlySubscription);
            document.getElementById('apiOneTimePrice').value = api.pricing?.oneTimePrice || 0;
            document.getElementById('apiMonthlyPrice').value = api.pricing?.monthlyPrice || 0;
            document.getElementById('apiYearlyPrice').value = api.pricing?.yearlyPrice || 0;
            document.getElementById('apiStatus').value = api.status;
            document.getElementById('apiPublished').checked = api.isPublished !== false;
        }
    } else {
        title.textContent = 'Add New API/SDK';
        form.reset();
        document.getElementById('apiId').value = '';
        document.getElementById('apiBadge').value = '';
        document.getElementById('apiAllowOneTime').checked = true;
        document.getElementById('apiAllowMonthly').checked = true;
        document.getElementById('apiAllowYearly').checked = true;
        document.getElementById('apiOneTimePrice').value = '0';
        document.getElementById('apiMonthlyPrice').value = '0';
        document.getElementById('apiYearlyPrice').value = '0';
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
    const apiData = {
        name: document.getElementById('apiName').value,
        type: document.getElementById('apiType').value,
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
        allowOneTimePurchase: document.getElementById('apiAllowOneTime').checked,
        allowMonthlySubscription: document.getElementById('apiAllowMonthly').checked,
        allowYearlySubscription: document.getElementById('apiAllowYearly').checked,
        oneTimePrice: Number.parseFloat(document.getElementById('apiOneTimePrice').value) || 0,
        monthlyPrice: Number.parseFloat(document.getElementById('apiMonthlyPrice').value) || 0,
        yearlyPrice: Number.parseFloat(document.getElementById('apiYearlyPrice').value) || 0,
        status: document.getElementById('apiStatus').value,
        isPublished: document.getElementById('apiPublished').checked
    };

    try {
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
        editor.style.display = 'block';
        editor.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Error loading content:', error);
        showNotification(error.message || 'Failed to load content', 'error');
    }
}

function closeContentEditor() {
    document.getElementById('contentEditor').style.display = 'none';
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
        const data = await fetchJson(`${API_BASE}/users?page=${page}&limit=10&search=${encodeURIComponent(search)}`, {
            headers: getHeaders()
        });

        const tableBody = document.getElementById('usersTableBody');
        tableBody.innerHTML = data.users
            .map((user) => `
                <tr>
                    <td><code style="color: var(--neon-green);">${user.id}</code></td>
                    <td><strong>${user.name}</strong></td>
                    <td>${user.email}</td>
                    <td><span style="text-transform: capitalize;">${user.plan}</span></td>
                    <td>
                        <span class="status-badge ${user.status}">${user.status}</span>
                    </td>
                    <td>${formatDate(user.joined)}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn" onclick="editUser('${user.id}')">Edit</button>
                            <button class="action-btn delete" onclick="deleteUser('${user.id}')">Delete</button>
                        </div>
                    </td>
                </tr>
            `)
            .join('');

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

document.getElementById('userSearch')?.addEventListener('input', (event) => {
    loadUsers(1, event.target.value);
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
        animation: slideInRight 0.3s ease;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOutRight {
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

document.addEventListener('DOMContentLoaded', async () => {
    initializeNavigation();
    await loadProfile();
    await loadOverview();
});
