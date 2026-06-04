function normalizeSettingsSidebar() {
    const sidebarMenu = document.querySelector(".dashboard-sidebar .sidebar-menu");

    if (!sidebarMenu) {
        return;
    }

    const items = [
        { href: "dashboard.html#overview", code: "OV", label: "Overview" },
        { href: "dashboard.html#purchases", code: "BY", label: "Purchases" },
        { href: "dashboard.html#documents", code: "DC", label: "Documents" },
        { href: "dashboard.html#billing", code: "BL", label: "Billing" },
        { href: "settings.html", code: "ST", label: "Settings", active: true }
    ];

    sidebarMenu.innerHTML = items
        .map(
            (item) => `
                <a href="${item.href}" class="menu-item${item.active ? " active" : ""}">
                    <span>${item.code}</span> ${item.label}
                </a>
            `
        )
        .join("");
}

document.addEventListener("DOMContentLoaded", normalizeSettingsSidebar);

function showTab(button, tabName) {
    document.querySelectorAll(".tab-panel").forEach((panel) => {
        panel.classList.remove("active");
    });

    document.querySelectorAll(".settings-tab").forEach((tab) => {
        tab.classList.remove("active");
    });

    document.getElementById(`${tabName}-tab`).classList.add("active");
    button.classList.add("active");
}

function toggleSwitch(element) {
    element.classList.toggle("active");
}

function saveProfile() {
    alert("Profile updated successfully!");
}

function changePassword() {
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (newPassword !== confirmPassword) {
        alert("Passwords do not match!");
        return;
    }

    alert("Password updated successfully!");
}
