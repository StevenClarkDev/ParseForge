let currentUser = null;
let purchases = [];

function getAuthToken() {
    return localStorage.getItem("parseforge_auth_token");
}

function authHeaders(extra = {}) {
    const token = getAuthToken();
    return {
        ...extra,
        Authorization: `Bearer ${token}`
    };
}

function requireAuth() {
    if (!getAuthToken()) {
        window.location.href = "login.html";
        return false;
    }

    return true;
}

function showNotice(message, type = "success") {
    const notice = document.getElementById("settingsNotice");

    if (!notice) {
        return;
    }

    notice.textContent = message;
    notice.dataset.type = type;
    notice.hidden = false;

    window.clearTimeout(showNotice.hideTimer);
    showNotice.hideTimer = window.setTimeout(() => {
        notice.hidden = true;
    }, 4500);
}

function showTab(button, tabName) {
    document.querySelectorAll(".tab-panel").forEach((panel) => {
        panel.classList.remove("active");
    });

    document.querySelectorAll(".settings-tab").forEach((tab) => {
        tab.classList.remove("active");
    });

    const panel = document.getElementById(`${tabName}-tab`);
    if (panel) {
        panel.classList.add("active");
    }

    button.classList.add("active");
}

function toggleSwitch(element) {
    element.classList.toggle("active");
}

function getInitials(user) {
    const parts = [user?.firstName, user?.lastName].filter(Boolean);
    const source = parts.length ? parts.join(" ") : user?.email || "ParseForge";
    return source
        .split(/[\s@._-]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join("") || "PF";
}

function formatName(user) {
    const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
    return name || user?.email || "Buyer account";
}

function formatMoney(value, currency = "USD") {
    const amount = Number(value || 0);
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: String(currency || "USD").toUpperCase(),
        maximumFractionDigits: amount % 1 === 0 ? 0 : 2
    }).format(amount);
}

function formatDate(value) {
    if (!value) {
        return "Recent";
    }

    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    }).format(new Date(value));
}

function populateProfile(user) {
    const initials = getInitials(user);
    const profileInitials = document.getElementById("profileInitials");
    const memberInitials = document.getElementById("memberInitials");
    const memberName = document.getElementById("memberName");
    const memberRole = document.getElementById("memberRole");

    document.getElementById("firstName").value = user?.firstName || "";
    document.getElementById("lastName").value = user?.lastName || "";
    document.getElementById("email").value = user?.email || "";
    document.getElementById("company").value = user?.company || "";
    document.getElementById("useCase").value = user?.useCase || "";

    if (profileInitials) {
        profileInitials.textContent = initials;
    }

    if (memberInitials) {
        memberInitials.textContent = initials;
    }

    if (memberName) {
        memberName.textContent = formatName(user);
    }

    if (memberRole) {
        memberRole.textContent = `${user?.email || "Buyer"} - Owner`;
    }
}

function getPurchaseProduct(purchase) {
    return purchase.product || purchase.api || purchase.item || {};
}

function getPurchaseAmount(purchase) {
    if (purchase.amountTotal != null) {
        return Number(purchase.amountTotal) / 100;
    }

    if (purchase.amount != null) {
        return Number(purchase.amount);
    }

    if (purchase.price != null) {
        return Number(purchase.price);
    }

    const product = getPurchaseProduct(purchase);
    return Number(product.price || product.oneTimePrice || product.monthlyPrice || product.yearlyPrice || 0);
}

function populateBilling(items) {
    const paymentTitle = document.getElementById("savedPaymentTitle");
    const paymentMeta = document.getElementById("savedPaymentMeta");
    const historyBody = document.getElementById("billingHistoryBody");
    const owned = items.filter((purchase) => purchase.status !== "failed" && purchase.status !== "cancelled");

    if (paymentTitle && paymentMeta) {
        if (owned.length) {
            paymentTitle.textContent = "Payment method saved after checkout";
            paymentMeta.textContent = "Future eligible purchases can reuse the Stripe customer payment method.";
        } else {
            paymentTitle.textContent = "No saved payment method yet";
            paymentMeta.textContent = "Complete checkout for an API or SDK to create your buyer profile.";
        }
    }

    if (!historyBody) {
        return;
    }

    if (!items.length) {
        historyBody.innerHTML = `<tr><td colspan="4" class="table-empty">No purchases are attached to this account yet.</td></tr>`;
        return;
    }

    historyBody.innerHTML = items
        .slice()
        .sort((a, b) => new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0))
        .slice(0, 12)
        .map((purchase) => {
            const product = getPurchaseProduct(purchase);
            const productName = product.name || purchase.productName || "ParseForge product";
            const amount = getPurchaseAmount(purchase);
            const status = purchase.status || "active";
            const currency = purchase.currency || product.currency || "USD";

            return `
                <tr>
                    <td>${formatDate(purchase.createdAt || purchase.updatedAt)}</td>
                    <td>${productName}</td>
                    <td>${formatMoney(amount, currency)}</td>
                    <td><span class="status-badge paid">${status}</span></td>
                </tr>
            `;
        })
        .join("");
}

async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(payload.error || payload.message || "Request failed");
    }

    return payload;
}

async function loadSettings() {
    if (!requireAuth()) {
        return;
    }

    try {
        const [mePayload, purchasePayload] = await Promise.all([
            fetchJson("/api/auth/me", { headers: authHeaders() }),
            fetchJson("/api/catalog/purchases", { headers: authHeaders() })
        ]);

        currentUser = mePayload.user || mePayload;
        purchases = Array.isArray(purchasePayload.purchases)
            ? purchasePayload.purchases
            : Array.isArray(purchasePayload)
                ? purchasePayload
                : [];

        populateProfile(currentUser);
        populateBilling(purchases);
    } catch (error) {
        if (/token|unauthorized|forbidden/i.test(error.message)) {
            localStorage.removeItem("parseforge_auth_token");
            window.location.href = "login.html";
            return;
        }

        showNotice(error.message || "Settings could not be loaded.", "error");
        populateBilling([]);
    }
}

async function saveProfile() {
    if (!currentUser?._id && !currentUser?.id) {
        showNotice("Account profile is still loading.", "error");
        return;
    }

    const userId = currentUser._id || currentUser.id;
    const payload = {
        firstName: document.getElementById("firstName").value.trim(),
        lastName: document.getElementById("lastName").value.trim(),
        company: document.getElementById("company").value.trim(),
        useCase: document.getElementById("useCase").value.trim()
    };

    try {
        const result = await fetchJson(`/api/users/${userId}`, {
            method: "PUT",
            headers: authHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify(payload)
        });

        currentUser = result.user || { ...currentUser, ...payload };
        populateProfile(currentUser);
        showNotice("Profile updated.");
    } catch (error) {
        showNotice(error.message || "Profile could not be updated.", "error");
    }
}

async function changePassword() {
    if (!currentUser?._id && !currentUser?.id) {
        showNotice("Account profile is still loading.", "error");
        return;
    }

    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (newPassword.length < 8) {
        showNotice("New password must be at least 8 characters.", "error");
        return;
    }

    if (newPassword !== confirmPassword) {
        showNotice("New passwords do not match.", "error");
        return;
    }

    try {
        await fetchJson(`/api/users/${currentUser._id || currentUser.id}/password`, {
            method: "PUT",
            headers: authHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({ currentPassword, newPassword })
        });

        document.getElementById("currentPassword").value = "";
        document.getElementById("newPassword").value = "";
        document.getElementById("confirmPassword").value = "";
        showNotice("Password updated.");
    } catch (error) {
        showNotice(error.message || "Password could not be updated.", "error");
    }
}

document.addEventListener("DOMContentLoaded", loadSettings);
