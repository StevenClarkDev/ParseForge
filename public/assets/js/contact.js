function toggleFaq(item) {
    item.classList.toggle("open");
}

function handleContactSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;

    alert(
        `Thank you, ${name}! Your message has been sent. We'll respond to ${email} within 24 hours.`,
    );

    form.reset();
}
