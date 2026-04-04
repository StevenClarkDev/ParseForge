let isYearly = false;

function toggleBilling(toggle) {
    isYearly = !isYearly;
    toggle.classList.toggle("active");

    document.querySelectorAll(".price-amount").forEach((element) => {
        const monthly = element.dataset.monthly;
        const yearly = element.dataset.yearly;

        if (monthly && yearly) {
            element.textContent = isYearly ? yearly : monthly;
        }
    });

    document.getElementById("billing-period").textContent = isYearly ? "annually" : "monthly";
    document.querySelectorAll(".billing-period-text").forEach((element) => {
        element.textContent = isYearly ? "annually" : "monthly";
    });
}
