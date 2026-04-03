function showSDK(button, sdk) {
    document.querySelectorAll(".sdk-content").forEach((content) => {
        content.classList.remove("active");
    });

    document.querySelectorAll(".sdk-tab").forEach((tab) => {
        tab.classList.remove("active");
    });

    document.getElementById(`sdk-${sdk}`).classList.add("active");
    button.classList.add("active");
}
