const API_BASE = window.location.origin;
const AUTH_TOKEN_KEY = 'parseforge_auth_token';
const authToken = window.localStorage.getItem(AUTH_TOKEN_KEY);

if (!authToken) {
    window.location.replace('/login.html');
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
    profile: null
};

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
    console.log('Dashboard initialized');
});

function getAuthHeaders() {
    return {
        Authorization: `Bearer ${window.localStorage.getItem(AUTH_TOKEN_KEY) || ''}`,
        'Content-Type': 'application/json'
    };
}

function handleAuthFailure(response) {
    if (response.status === 401) {
        window.localStorage.removeItem(AUTH_TOKEN_KEY);
        window.location.replace('/login.html');
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

    if (sections.length === 0) {
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
            rootMargin: '-100px 0px -50% 0px'
        }
    );

    sections.forEach((section) => observer.observe(section));
}

async function loadDashboardData() {
    try {
        const [profile, stats, usage, responseTimes, statusCodes, endpoints, activity, keys] = await Promise.all([
            fetchJson(`${API_BASE}/api/auth/me`, { headers: getAuthHeaders() }),
            fetchJson(`${API_BASE}/api/dashboard/stats`, { headers: getAuthHeaders() }),
            fetchJson(`${API_BASE}/api/dashboard/usage?period=7`),
            fetchJson(`${API_BASE}/api/dashboard/response-times`),
            fetchJson(`${API_BASE}/api/dashboard/status-codes`),
            fetchJson(`${API_BASE}/api/dashboard/endpoints`),
            fetchJson(`${API_BASE}/api/dashboard/activity`),
            fetchJson(`${API_BASE}/api/keys`, { headers: getAuthHeaders() })
        ]);

        if (!profile) {
            return false;
        }

        dashboardData = {
            profile: profile.user,
            stats,
            usage,
            responseTimes,
            statusCodes,
            endpoints,
            activity,
            apiKeys: keys
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
        console.log('Dashboard data refreshed');
    }
}

function updateUI() {
    updateHeader();
    updateStats();
    updateAPIKeys();
    updateActivity();
    updateEndpoints();
}

function updateHeader() {
    const title = document.getElementById('dashboardWelcome');

    if (title && dashboardData.profile) {
        title.textContent = `Welcome back, ${dashboardData.profile.firstName}!`;
    }
}

function updateStats() {
    const { stats } = dashboardData;

    document.querySelector('.stat-card:nth-child(1) .stat-value').textContent = stats.apiCalls?.toLocaleString() || '0';
    document.querySelector('.stat-card:nth-child(2) .stat-value').textContent = String(stats.activeKeys || 0);
    document.querySelector('.stat-card:nth-child(3) .stat-value').textContent = `${stats.avgResponseTime || 0}ms`;
    document.querySelector('.stat-card:nth-child(4) .stat-value').textContent = `${stats.successRate || 0}%`;
}

function updateAPIKeys() {
    const keysList = document.getElementById('keysList');
    if (!keysList) {
        return;
    }

    if (!dashboardData.apiKeys.length) {
        keysList.innerHTML = '<p class="empty-state">No API keys yet. Create your first key to start integrating.</p>';
        return;
    }

    keysList.innerHTML = dashboardData.apiKeys
        .map((key) => {
            const created = new Date(key.created).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            const lastUsed = key.lastUsed ? getRelativeTime(new Date(key.lastUsed)) : 'Never used';

            return `
                <div class="key-item" data-key-id="${key.id}">
                    <div class="key-info">
                        <div class="key-name">${key.name}</div>
                        <code class="key-value">${key.key}</code>
                        <div class="key-meta">
                            <span>Created: ${created}</span>
                            <span>Last used: ${lastUsed}</span>
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

    activityList.innerHTML = dashboardData.activity
        .map((activity) => {
            const isSuccess = activity.status >= 200 && activity.status < 300;
            const iconClass = isSuccess ? 'success' : 'error';
            const icon = isSuccess ? 'OK' : 'ERR';
            const timeAgo = getRelativeTime(new Date(activity.timestamp));

            return `
                <div class="activity-item">
                    <div class="activity-icon ${iconClass}">${icon}</div>
                    <div class="activity-info">
                        <div class="activity-title">${activity.method} ${activity.path}</div>
                        <div class="activity-meta">${timeAgo} · ${activity.status} · ${activity.responseTime}ms</div>
                    </div>
                </div>
            `;
        })
        .join('');
}

function updateEndpoints() {
    const endpointsList = document.getElementById('topEndpointsList');
    if (!endpointsList || !dashboardData.endpoints.length) {
        return;
    }

    const maxCount = Math.max(...dashboardData.endpoints.map((endpoint) => endpoint.count));

    endpointsList.innerHTML = dashboardData.endpoints
        .map((endpoint) => {
            const percentage = (endpoint.count / maxCount) * 100;
            return `
                <div class="endpoint-item">
                    <div class="endpoint-info">
                        <span class="endpoint-method ${endpoint.method.toLowerCase()}">${endpoint.method}</span>
                        <span class="endpoint-path">${endpoint.path}</span>
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
    const logoutLink = document.getElementById('logoutLink');

    if (usagePeriod) {
        usagePeriod.addEventListener('change', async (event) => {
            try {
                dashboardData.usage = await fetchJson(`${API_BASE}/api/dashboard/usage?period=${event.target.value}`);
                updateUsageChart();
            } catch (error) {
                showNotification(error.message || 'Failed to update chart', 'error');
            }
        });
    }

    if (logoutLink) {
        logoutLink.addEventListener('click', (event) => {
            event.preventDefault();
            window.localStorage.removeItem(AUTH_TOKEN_KEY);
            window.location.href = '/login.html';
        });
    }
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
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    tension: 0.4,
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
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback(value) {
                            return value.toLocaleString();
                        }
                    }
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
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
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
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback(value) {
                            return `${value}ms`;
                        }
                    }
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
                    backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#94a3b8']
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
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
            button.textContent = 'Copied!';
            button.style.background = '#10b981';

            setTimeout(() => {
                button.textContent = originalText;
                button.style.background = '';
            }, 2000);
        })
        .catch(() => {
            showNotification('Failed to copy key', 'error');
        });
}

function showCreateKeyModal() {
    const name = prompt('Enter API key name:');
    if (!name) {
        return;
    }

    const type = confirm('Create production key? Click Cancel for a test key.') ? 'production' : 'test';
    createAPIKey(name, type);
}

async function createAPIKey(name, type) {
    try {
        const newKey = await fetchJson(`${API_BASE}/api/keys`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ name, type })
        });

        alert(`API key created.\n\n${newKey.fullKey}\n\nCopy it now. It will only be shown once.`);

        dashboardData.apiKeys = await fetchJson(`${API_BASE}/api/keys`, {
            headers: getAuthHeaders()
        });

        const stats = await fetchJson(`${API_BASE}/api/dashboard/stats`, {
            headers: getAuthHeaders()
        });

        dashboardData.stats = stats;
        updateAPIKeys();
        updateStats();
        showNotification('API key created successfully', 'success');
    } catch (error) {
        console.error('Error creating API key:', error);
        showNotification(error.message || 'Failed to create API key', 'error');
    }
}

async function revokeKey(keyId, button) {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
        return;
    }

    try {
        await fetchJson(`${API_BASE}/api/keys/${keyId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        const keyItem = button.closest('.key-item');
        keyItem.style.opacity = '0';
        setTimeout(() => keyItem.remove(), 300);

        dashboardData.apiKeys = dashboardData.apiKeys.filter((key) => key.id !== keyId);
        dashboardData.stats.activeKeys = dashboardData.apiKeys.length;
        updateStats();
        showNotification('API key revoked successfully', 'success');
    } catch (error) {
        console.error('Error revoking API key:', error);
        showNotification(error.message || 'Failed to revoke API key', 'error');
    }
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
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#6366f1'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
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
