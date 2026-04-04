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
