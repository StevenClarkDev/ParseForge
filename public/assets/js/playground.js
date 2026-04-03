let currentEndpoint = { method: "GET", path: "/api/users", title: "Get all users" };

document.getElementById("baseUrl").value = window.location.origin;
document.getElementById("apiKey").value =
    window.localStorage.getItem("parseforge_auth_token") || "";

function loadEndpoint(button, method, path, title) {
    currentEndpoint = { method, path, title };

    document.querySelector(".playground-header .method-badge").textContent = method;
    document.querySelector(".playground-header .method-badge").className =
        `method-badge ${method.toLowerCase()}`;
    document.getElementById("endpoint-title").textContent = path;

    document.getElementById("paramsSection").style.display = method === "GET" ? "block" : "none";
    document.getElementById("bodySection").style.display = ["POST", "PUT"].includes(method)
        ? "block"
        : "none";
    document.getElementById("responseSection").style.display = "none";

    document
        .querySelectorAll(".endpoint-btn")
        .forEach((endpointButton) => endpointButton.classList.remove("active"));
    button.classList.add("active");
}

function addParam() {
    const paramsList = document.getElementById("paramsList");
    const row = document.createElement("div");
    row.className = "param-row";
    row.innerHTML = `
        <input type="checkbox" checked>
        <input type="text" placeholder="Key">
        <input type="text" placeholder="Value">
        <button class="btn-sm" style="padding: 0.25rem 0.5rem;" onclick="this.parentElement.remove()">X</button>
    `;
    paramsList.appendChild(row);
}

async function executeRequest() {
    const btn = document.querySelector(".execute-btn");
    btn.disabled = true;
    btn.innerHTML = "<span>...</span><span>Sending...</span>";

    const baseUrl = document.getElementById("baseUrl").value;
    const apiKey = document.getElementById("apiKey").value;
    let url = baseUrl + currentEndpoint.path;

    if (currentEndpoint.method === "GET") {
        const params = [];
        document.querySelectorAll("#paramsList .param-row").forEach((row) => {
            const checkbox = row.querySelector('input[type="checkbox"]');
            if (checkbox.checked) {
                const key = row.querySelectorAll('input[type="text"]')[0].value;
                const value = row.querySelectorAll('input[type="text"]')[1].value;
                if (key) {
                    params.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
                }
            }
        });
        if (params.length) {
            url += `?${params.join("&")}`;
        }
    }

    const options = {
        method: currentEndpoint.method,
        headers: {
            "Content-Type": "application/json",
        },
    };

    if (apiKey) {
        options.headers.Authorization = `Bearer ${apiKey}`;
    }

    if (["POST", "PUT"].includes(currentEndpoint.method)) {
        const body = document.getElementById("requestBody").value;
        if (body) {
            options.body = body;
        }
    }

    const startTime = Date.now();

    try {
        const response = await fetch(url, options);
        const data = await response.json();
        const endTime = Date.now();

        if (response.ok && data.token) {
            window.localStorage.setItem("parseforge_auth_token", data.token);
            document.getElementById("apiKey").value = data.token;
        }

        document.getElementById("responseSection").style.display = "block";
        document.getElementById("responseStatus").textContent =
            `${response.status} ${response.statusText}`;
        document.getElementById("responseTime").textContent = `${endTime - startTime}ms`;
        document.getElementById("responseSize").textContent = `${JSON.stringify(data).length} bytes`;
        document.getElementById("responseBody").textContent = JSON.stringify(data, null, 2);

        document.getElementById("responseSection").scrollIntoView({ behavior: "smooth" });
    } catch (error) {
        document.getElementById("responseSection").style.display = "block";
        document.getElementById("responseStatus").textContent = "Error";
        document.getElementById("responseTime").textContent = "-";
        document.getElementById("responseSize").textContent = "-";
        document.getElementById("responseBody").textContent = `Error: ${error.message}`;
    }

    btn.disabled = false;
    btn.innerHTML = "<span>&gt;</span><span>Send Request</span>";
}

function copyResponse() {
    const responseText = document.getElementById("responseBody").textContent;
    navigator.clipboard.writeText(responseText).then(() => {
        const btn = document.querySelector(".copy-response-btn");
        btn.textContent = "Copied!";
        setTimeout(() => {
            btn.textContent = "Copy";
        }, 2000);
    });
}
