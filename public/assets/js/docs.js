const AUTH_TOKEN_KEY = 'parseforge_auth_token';

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getProductAnchor(product) {
    return product.slug || product.id;
}

function formatPurchaseAccess(product) {
    const purchaseTypes = product.access?.purchaseTypes || product.ownership?.purchaseTypes || [];

    if (purchaseTypes.includes('monthly')) {
        return 'Monthly API subscription';
    }

    if (purchaseTypes.includes('yearly')) {
        return 'Yearly API subscription';
    }

    return 'One-time SDK license';
}

function buildApiReference(product) {
    const resource = String(product.slug || product.name || 'product')
        .replace(/-api$/, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    return `
        <div class="endpoint-card">
            <div class="endpoint-header">
                <span class="http-method get">GET</span>
                <code>/v1/${escapeHtml(resource)}</code>
            </div>
            <p>Retrieve records for ${escapeHtml(product.name)} using an active API key from your dashboard.</p>
        </div>
        <div class="endpoint-card">
            <div class="endpoint-header">
                <span class="http-method post">POST</span>
                <code>/v1/${escapeHtml(resource)}</code>
            </div>
            <p>Create or process a request through ${escapeHtml(product.name)}.</p>
        </div>
    `;
}

function buildSdkReference(product) {
    const packageName = product.slug || 'parseforge-sdk';

    return `
        <h2>Installation</h2>
        <div class="code-block">
            <div class="code-block-header">
                <span>Package install</span>
                <button class="copy-btn" type="button" onclick="copyCode(this)">Copy</button>
            </div>
            <pre><code>npm install @parseforge/${escapeHtml(packageName)}</code></pre>
        </div>
        <h2>Quick Start</h2>
        <div class="code-block">
            <div class="code-block-header">
                <span>JavaScript</span>
                <button class="copy-btn" type="button" onclick="copyCode(this)">Copy</button>
            </div>
            <pre><code>import { createClient } from '@parseforge/${escapeHtml(packageName)}';

const client = createClient({
  apiKey: process.env.PARSEFORGE_API_KEY
});

const result = await client.run({
  environment: 'production'
});

console.log(result);</code></pre>
        </div>
    `;
}

function renderInlineMarkdown(value) {
    return escapeHtml(value)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

function renderDocumentationContent(documentation) {
    const source = String(documentation || '').trim();

    if (!source || source.startsWith('/')) {
        return '';
    }

    const lines = source.split(/\r?\n/);
    let html = '';
    let listItems = [];
    let codeLines = [];
    let inCodeBlock = false;
    let codeLabel = 'Example';

    function flushList() {
        if (!listItems.length) {
            return;
        }

        html += `<ul>${listItems.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join('')}</ul>`;
        listItems = [];
    }

    function flushCode() {
        if (!codeLines.length) {
            return;
        }

        html += `
            <div class="code-block">
                <div class="code-block-header">
                    <span>${escapeHtml(codeLabel)}</span>
                    <button class="copy-btn" type="button" onclick="copyCode(this)">Copy</button>
                </div>
                <pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>
            </div>
        `;
        codeLines = [];
        codeLabel = 'Example';
    }

    lines.forEach((rawLine) => {
        const line = rawLine.trimEnd();

        if (line.startsWith('```')) {
            if (inCodeBlock) {
                flushCode();
                inCodeBlock = false;
                return;
            }

            flushList();
            inCodeBlock = true;
            codeLabel = line.replace(/^```/, '').trim() || 'Example';
            return;
        }

        if (inCodeBlock) {
            codeLines.push(rawLine);
            return;
        }

        const trimmed = line.trim();
        if (!trimmed) {
            flushList();
            return;
        }

        if (trimmed.startsWith('### ')) {
            flushList();
            html += `<h3>${renderInlineMarkdown(trimmed.slice(4))}</h3>`;
            return;
        }

        if (trimmed.startsWith('## ')) {
            flushList();
            html += `<h2>${renderInlineMarkdown(trimmed.slice(3))}</h2>`;
            return;
        }

        if (trimmed.startsWith('- ')) {
            listItems.push(trimmed.slice(2));
            return;
        }

        flushList();
        html += `<p>${renderInlineMarkdown(trimmed)}</p>`;
    });

    flushList();
    flushCode();

    return html;
}

function buildProductDocs(product) {
    const anchor = getProductAnchor(product);
    const isApi = product.type === 'api';
    const productDocumentation = renderDocumentationContent(product.documentation);

    return `
        <section class="doc-section product-doc-section" id="${escapeHtml(anchor)}">
            <div class="docs-product-heading">
                <span class="docs-access-kicker">${escapeHtml(formatPurchaseAccess(product))}</span>
                <h1>${escapeHtml(product.name)}</h1>
                <p>${escapeHtml(product.description)}</p>
            </div>

            <div class="info-box">
                <strong>Access:</strong> ${escapeHtml(formatPurchaseAccess(product))}
                ${product.access?.renewsAt ? `<br><strong>Renews:</strong> ${escapeHtml(new Date(product.access.renewsAt).toLocaleDateString())}` : ''}
            </div>

            <h2>What is included</h2>
            <ul>
                ${(product.features || []).map((feature) => `<li>${escapeHtml(feature)}</li>`).join('')}
            </ul>

            <h2>Authentication</h2>
            <p>Use an API key from your buyer dashboard when calling APIs or activating SDK packages.</p>
            <div class="code-block">
                <div class="code-block-header">
                    <span>Request header</span>
                    <button class="copy-btn" type="button" onclick="copyCode(this)">Copy</button>
                </div>
                <pre><code>Authorization: Bearer YOUR_PARSEFORGE_API_KEY</code></pre>
            </div>

            ${isApi ? buildApiReference(product) : buildSdkReference(product)}

            ${productDocumentation ? `<div class="product-documentation-body">${productDocumentation}</div>` : ''}
        </section>
    `;
}

function renderDocs(documents) {
    const nav = document.getElementById('docsProductNav');
    const state = document.getElementById('docsState');
    const content = document.getElementById('docsContent');
    const requestedProduct = new URLSearchParams(window.location.search).get('product');

    if (!documents.length) {
        nav.innerHTML = '<li><span class="docs-nav-placeholder">No purchased docs yet</span></li>';
        state.innerHTML = `
            <div class="empty-state-card">
                <h3>No documentation unlocked yet</h3>
                <p>Purchase an API subscription or one-time SDK license to unlock its documentation.</p>
                <a href="/marketplace" class="btn-primary">Browse Marketplace</a>
            </div>
        `;
        content.innerHTML = '';
        return;
    }

    nav.innerHTML = documents
        .map((product) => {
            const anchor = getProductAnchor(product);
            return `<li><a href="#${escapeHtml(anchor)}">${escapeHtml(product.name)}</a></li>`;
        })
        .join('');

    state.hidden = true;
    content.innerHTML = documents.map((product) => buildProductDocs(product)).join('');

    const target = documents.find((product) => getProductAnchor(product) === requestedProduct);
    if (target) {
        window.setTimeout(() => {
            document.getElementById(getProductAnchor(target))?.scrollIntoView({ block: 'start' });
        }, 50);
    }
}

async function loadPurchasedDocs() {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
        const next = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
        window.location.href = `/login.html?next=${next}`;
        return;
    }

    try {
        const response = await fetch('/api/catalog/docs', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            window.localStorage.removeItem(AUTH_TOKEN_KEY);
            const next = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
            window.location.href = `/login.html?next=${next}`;
            return;
        }

        const payload = await response.json();
        if (!response.ok) {
            throw new Error(payload.error || 'Unable to load purchased documentation');
        }

        renderDocs(payload.documents || []);
    } catch (error) {
        document.getElementById('docsState').innerHTML = `
            <div class="warning-box">
                <strong>Documentation unavailable:</strong> ${escapeHtml(error.message)}
            </div>
        `;
    }
}

function copyCode(button) {
    const codeBlock = button.closest('.code-block');
    const code = codeBlock.querySelector('code').textContent;

    navigator.clipboard.writeText(code).then(() => {
        const originalText = button.textContent;
        button.textContent = 'Copied';

        setTimeout(() => {
            button.textContent = originalText;
        }, 2000);
    });
}

document.addEventListener('DOMContentLoaded', loadPurchasedDocs);
