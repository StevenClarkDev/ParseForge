function filterResources(button, category) {
    document.querySelectorAll(".resources-tabs button").forEach((tabButton) => {
        tabButton.classList.remove("active");
    });

    button.classList.add("active");

    // Placeholder until resource filtering is backed by real data/state.
    console.log("Filtering by:", category);
}

function handleNewsletterSubmit(event) {
    event.preventDefault();
    alert("Thank you for subscribing! Check your email for confirmation.");
}
