const apiProducts = [
    {
        name: 'Identity Verification API',
        slug: 'identity-verification-api',
        language: 'REST',
        version: 'v3.2.0',
        description: 'KYC identity checks with document extraction, biometric match scoring, sanctions screening, and onboarding risk signals.',
        features: ['Document OCR and validation', 'Face match scoring', 'Sanctions and PEP screening', 'Regional fraud rules'],
        badge: 'featured',
        monthlyPrice: 1299,
        yearlyPrice: 12990,
        downloads: 28600,
        rating: 4.9,
        reviews: 412,
        overview: 'Use this API to verify customers before account creation, high-risk payments, or regulated workflow access.',
        endpoints: ['POST /v1/identity/sessions', 'GET /v1/identity/sessions/{id}', 'POST /v1/identity/webhooks/verify'],
        quickStart: `const session = await parseforge.identity.sessions.create({
  customerReference: 'buyer_4921',
  requiredChecks: ['document', 'face_match', 'sanctions'],
  returnUrl: 'https://app.example.com/kyc/complete'
});`,
        responseExample: `{
  "id": "ivs_8k31",
  "status": "requires_input",
  "verificationUrl": "https://verify.parseforge.com/s/ivs_8k31"
}`
    },
    {
        name: 'Places & Geocoding API',
        slug: 'places-geocoding-api',
        language: 'REST',
        version: 'v3.1.4',
        description: 'Forward geocoding, reverse lookup, place search, and address autocomplete for checkout, logistics, and field service products.',
        features: ['Forward and reverse geocoding', 'Address autocomplete', 'Place enrichment', 'Batch normalization'],
        badge: 'bestseller',
        monthlyPrice: 999,
        yearlyPrice: 9990,
        downloads: 34200,
        rating: 4.8,
        reviews: 361,
        overview: 'Use this API anywhere an address must become reliable coordinates, a serviceable region, or a normalized delivery destination.',
        endpoints: ['GET /v1/geo/geocode', 'GET /v1/geo/reverse', 'POST /v1/geo/batch'],
        quickStart: `const match = await parseforge.geo.geocode({
  query: '1600 Amphitheatre Parkway, Mountain View, CA',
  country: 'US'
});`,
        responseExample: `{
  "formattedAddress": "1600 Amphitheatre Pkwy, Mountain View, CA 94043",
  "location": { "lat": 37.422, "lng": -122.084 },
  "confidence": 0.98
}`
    },
    {
        name: 'Invoice OCR API',
        slug: 'invoice-ocr-api',
        language: 'REST',
        version: 'v2.8.0',
        description: 'Extract vendors, totals, taxes, payment terms, and line items from invoices, receipts, and purchase documents.',
        features: ['Line-item extraction', 'Multi-currency totals', 'Vendor normalization', 'Confidence scoring'],
        badge: 'featured',
        monthlyPrice: 1499,
        yearlyPrice: 14990,
        downloads: 18400,
        rating: 4.9,
        reviews: 221,
        overview: 'Use this API to automate accounts payable intake, expense review, procurement uploads, and finance reconciliation queues.',
        endpoints: ['POST /v1/ocr/invoices', 'GET /v1/ocr/invoices/{id}', 'POST /v1/ocr/invoices/{id}/approve'],
        quickStart: `const invoice = await parseforge.ocr.invoices.extract({
  fileUrl: 'https://files.example.com/invoice-1042.pdf',
  locale: 'en-US'
});`,
        responseExample: `{
  "vendor": "Northwind Supplies",
  "total": 1284.42,
  "currency": "USD",
  "lineItems": 12
}`
    },
    {
        name: 'Schema Guard API',
        slug: 'schema-guard-api',
        language: 'REST',
        version: 'v2.0.2',
        description: 'Request validation, schema enforcement, and payload policy checks for internal APIs, partner APIs, and webhook consumers.',
        features: ['JSON schema enforcement', 'Payload policy rules', 'Signed webhook validation', 'Violation logs'],
        badge: '',
        monthlyPrice: 999,
        yearlyPrice: 9990,
        downloads: 12100,
        rating: 4.8,
        reviews: 148,
        overview: 'Use this API as a policy layer for validating incoming JSON before it reaches your production application code.',
        endpoints: ['POST /v1/schema/validate', 'POST /v1/schema/policies', 'GET /v1/schema/violations'],
        quickStart: `const validation = await parseforge.schema.validate({
  schemaId: 'customer-created-v4',
  payload: event.body
});`,
        responseExample: `{
  "valid": false,
  "violations": [{ "path": "$.email", "message": "Invalid email format" }]
}`
    },
    {
        name: 'Transactional Email API',
        slug: 'transactional-email-api',
        language: 'REST',
        version: 'v2.5.1',
        description: 'Send password resets, receipts, onboarding messages, and account alerts with deliverability telemetry.',
        features: ['Template rendering', 'Suppression handling', 'Delivery webhooks', 'Bounce and spam analytics'],
        badge: 'new',
        monthlyPrice: 999,
        yearlyPrice: 9990,
        downloads: 22600,
        rating: 4.8,
        reviews: 294,
        overview: 'Use this API when email is part of the product workflow and your team needs delivery state in the dashboard.',
        endpoints: ['POST /v1/email/send', 'POST /v1/email/templates', 'GET /v1/email/events'],
        quickStart: `await parseforge.email.send({
  to: 'customer@example.com',
  template: 'receipt_paid',
  data: { invoiceId: 'INV-1042' }
});`,
        responseExample: `{
  "messageId": "msg_91s",
  "status": "queued",
  "accepted": ["customer@example.com"]
}`
    },
    {
        name: 'Payment Orchestration API',
        slug: 'payment-orchestration-api',
        language: 'REST',
        version: 'v1.7.0',
        description: 'Create checkout intents, route payment methods, normalize payment events, and reconcile provider outcomes.',
        features: ['Checkout intent routing', 'Provider-normalized events', 'Retry recommendations', 'Settlement reconciliation'],
        badge: 'bestseller',
        monthlyPrice: 1199,
        yearlyPrice: 11990,
        downloads: 17300,
        rating: 4.9,
        reviews: 205,
        overview: 'Use this API to coordinate provider-specific checkout behavior without hard-coding business logic in every client.',
        endpoints: ['POST /v1/payments/intents', 'GET /v1/payments/intents/{id}', 'POST /v1/payments/reconcile'],
        quickStart: `const intent = await parseforge.payments.intents.create({
  amount: 12900,
  currency: 'usd',
  customerId: 'cus_82b'
});`,
        responseExample: `{
  "id": "pfi_91j",
  "status": "requires_confirmation",
  "recommendedProvider": "stripe"
}`
    },
    {
        name: 'Fraud Risk Scoring API',
        slug: 'fraud-risk-scoring-api',
        language: 'REST',
        version: 'v2.3.0',
        description: 'Score signups, orders, payouts, and account changes using device, velocity, payment, and behavioral signals.',
        features: ['Device risk signals', 'Velocity rules', 'Risk score explanations', 'Manual review queues'],
        badge: 'featured',
        monthlyPrice: 1599,
        yearlyPrice: 15990,
        downloads: 15100,
        rating: 4.9,
        reviews: 184,
        overview: 'Use this API to decide when to approve, block, challenge, or send a risky workflow to manual review.',
        endpoints: ['POST /v1/risk/score', 'POST /v1/risk/rules', 'GET /v1/risk/cases/{id}'],
        quickStart: `const risk = await parseforge.risk.score({
  subject: 'order',
  amount: 49900,
  ip: request.ip,
  email: order.email
});`,
        responseExample: `{
  "score": 82,
  "decision": "review",
  "reasons": ["high_velocity", "new_device"]
}`
    },
    {
        name: 'AI Text Gateway API',
        slug: 'ai-text-gateway-api',
        language: 'REST',
        version: 'v1.4.0',
        description: 'Route text generation, summarization, extraction, and moderation through policy-aware model orchestration.',
        features: ['Model routing', 'Prompt templates', 'JSON schema outputs', 'Usage controls'],
        badge: 'new',
        monthlyPrice: 1999,
        yearlyPrice: 19990,
        downloads: 19800,
        rating: 4.8,
        reviews: 232,
        overview: 'Use this API to add AI features while keeping prompts, model routing, usage policy, and output validation centralized.',
        endpoints: ['POST /v1/ai/generate', 'POST /v1/ai/extract', 'GET /v1/ai/usage'],
        quickStart: `const summary = await parseforge.ai.generate({
  template: 'support_summary',
  input: ticket.thread,
  output: { type: 'json' }
});`,
        responseExample: `{
  "id": "gen_f4a",
  "model": "routed-balanced",
  "output": { "summary": "Customer needs plan migration help." }
}`
    },
    {
        name: 'Vector Search API',
        slug: 'vector-search-api',
        language: 'REST',
        version: 'v2.2.1',
        description: 'Managed vector indexing, hybrid search, semantic retrieval, and metadata filtering for AI and knowledge products.',
        features: ['Vector upserts', 'Hybrid search', 'Metadata filters', 'Namespace isolation'],
        badge: 'bestseller',
        monthlyPrice: 1299,
        yearlyPrice: 12990,
        downloads: 16900,
        rating: 4.8,
        reviews: 176,
        overview: 'Use this API to power semantic search, retrieval-augmented generation, recommendation, and internal knowledge lookup flows.',
        endpoints: ['POST /v1/vector/upsert', 'POST /v1/vector/search', 'DELETE /v1/vector/namespaces/{id}'],
        quickStart: `await parseforge.vector.upsert({
  namespace: 'docs',
  id: 'guide_42',
  values: embedding,
  metadata: { plan: 'enterprise' }
});`,
        responseExample: `{
  "matches": [{ "id": "guide_42", "score": 0.94 }],
  "namespace": "docs"
}`
    },
    {
        name: 'Webhook Delivery API',
        slug: 'webhook-delivery-api',
        language: 'REST',
        version: 'v2.6.0',
        description: 'Reliable webhook fan-out with signatures, retries, event logs, replay, and endpoint health tracking.',
        features: ['Signed deliveries', 'Retry policies', 'Replay controls', 'Endpoint health reports'],
        badge: '',
        monthlyPrice: 999,
        yearlyPrice: 9990,
        downloads: 14100,
        rating: 4.8,
        reviews: 169,
        overview: 'Use this API when product events must reach customer systems reliably and your support team needs delivery evidence.',
        endpoints: ['POST /v1/webhooks/events', 'POST /v1/webhooks/endpoints', 'POST /v1/webhooks/replay'],
        quickStart: `await parseforge.webhooks.events.publish({
  type: 'invoice.paid',
  payload: invoice,
  accountId: 'acct_81'
});`,
        responseExample: `{
  "eventId": "evt_1042",
  "deliveries": 3,
  "status": "queued"
}`
    },
    {
        name: 'Feature Flags API',
        slug: 'feature-flags-api',
        language: 'REST',
        version: 'v1.9.3',
        description: 'Manage flags, staged releases, targeting rules, kill switches, and audit history from one API.',
        features: ['Targeting rules', 'Percentage rollouts', 'Kill switches', 'Audit trail'],
        badge: '',
        monthlyPrice: 999,
        yearlyPrice: 9990,
        downloads: 16200,
        rating: 4.7,
        reviews: 158,
        overview: 'Use this API to ship controlled releases and give product, engineering, and support teams shared rollout visibility.',
        endpoints: ['GET /v1/flags/evaluate', 'POST /v1/flags', 'POST /v1/flags/{key}/rollout'],
        quickStart: `const enabled = await parseforge.flags.evaluate({
  key: 'new_checkout',
  userId: user.id,
  attributes: { plan: user.plan }
});`,
        responseExample: `{
  "key": "new_checkout",
  "enabled": true,
  "variant": "treatment"
}`
    },
    {
        name: 'Analytics Events API',
        slug: 'analytics-events-api',
        language: 'REST',
        version: 'v2.1.0',
        description: 'Collect product events, enrich account traits, and query activation, conversion, and retention metrics.',
        features: ['Event ingestion', 'Identity stitching', 'Funnel summaries', 'Warehouse export'],
        badge: 'featured',
        monthlyPrice: 1099,
        yearlyPrice: 10990,
        downloads: 21900,
        rating: 4.8,
        reviews: 247,
        overview: 'Use this API to capture product behavior without building ingestion, enrichment, and dashboard plumbing from scratch.',
        endpoints: ['POST /v1/events/track', 'POST /v1/events/identify', 'GET /v1/events/funnels/{id}'],
        quickStart: `await parseforge.analytics.track({
  userId: user.id,
  event: 'checkout_completed',
  properties: { plan: 'yearly' }
});`,
        responseExample: `{
  "accepted": true,
  "eventId": "evt_a81",
  "ingestedAt": "2026-06-03T16:00:00Z"
}`
    }
];

const sdkProducts = [
    {
        name: 'Next.js Auth SDK',
        slug: 'nextjs-auth-sdk',
        language: 'Next.js',
        version: 'v3.0.0',
        description: 'Production auth helpers, protected routes, session utilities, and account onboarding flows for Next.js apps.',
        features: ['Route guards', 'Session hooks', 'Passwordless flows', 'Team invitation screens'],
        badge: 'bestseller',
        oneTimePrice: 1499,
        downloads: 24800,
        rating: 4.9,
        reviews: 331,
        overview: 'Use this SDK to add account-aware authentication flows to App Router projects without writing every guard and state hook manually.',
        install: 'npm install @parseforge/nextjs-auth-sdk',
        quickStart: `import { createParseForgeAuth } from '@parseforge/nextjs-auth-sdk';

export const auth = createParseForgeAuth({
  apiKey: process.env.PARSEFORGE_API_KEY,
  redirectAfterLogin: '/dashboard'
});`
    },
    {
        name: 'React Native Payments SDK',
        slug: 'react-native-payments-sdk',
        language: 'React Native',
        version: 'v2.4.0',
        description: 'Native checkout surfaces, payment tokenization helpers, and mobile purchase event tracking.',
        features: ['Native checkout UI', 'Saved payment methods', 'Payment event tracking', 'Failure recovery states'],
        badge: 'featured',
        oneTimePrice: 1799,
        downloads: 15700,
        rating: 4.8,
        reviews: 188,
        overview: 'Use this SDK to create mobile checkout experiences that coordinate product state, receipts, and provider outcomes.',
        install: 'npm install @parseforge/react-native-payments-sdk',
        quickStart: `import { CheckoutSheet } from '@parseforge/react-native-payments-sdk';

<CheckoutSheet
  apiKey={PARSEFORGE_API_KEY}
  intentId={paymentIntent.id}
  onComplete={refreshEntitlements}
/>`
    },
    {
        name: 'Release Channels SDK',
        slug: 'release-channels-sdk',
        language: 'JavaScript',
        version: 'v2.2.1',
        description: 'Feature rollout, staged releases, rollback controls, and environment-aware config delivery for product teams.',
        features: ['Feature flag client', 'Release channels', 'Rollback controls', 'Environment targeting'],
        badge: 'new',
        oneTimePrice: 1299,
        downloads: 12600,
        rating: 4.8,
        reviews: 144,
        overview: 'Use this SDK to separate release decisions from deployments and expose stable rollout controls to product teams.',
        install: 'npm install @parseforge/release-channels-sdk',
        quickStart: `import { createReleaseClient } from '@parseforge/release-channels-sdk';

const releases = createReleaseClient({ apiKey: process.env.PARSEFORGE_API_KEY });
const enabled = await releases.isEnabled('new-dashboard', user);`
    },
    {
        name: 'Python Automation SDK',
        slug: 'python-automation-sdk',
        language: 'Python',
        version: 'v3.1.0',
        description: 'Typed clients, job helpers, queues, and workflow primitives for backend automation and data operations.',
        features: ['Typed API clients', 'Workflow helpers', 'Retry utilities', 'CLI tooling'],
        badge: '',
        oneTimePrice: 999,
        downloads: 13900,
        rating: 4.8,
        reviews: 166,
        overview: 'Use this SDK to script operational workflows, batch jobs, and data maintenance tasks against ParseForge APIs.',
        install: 'pip install parseforge-automation',
        quickStart: `from parseforge_automation import Client

client = Client(api_key=os.environ["PARSEFORGE_API_KEY"])
job = client.jobs.run("sync-customers", payload={"region": "us"})`
    },
    {
        name: 'Node.js API Client SDK',
        slug: 'nodejs-api-client-sdk',
        language: 'Node.js',
        version: 'v4.0.0',
        description: 'Typed Node.js clients for every ParseForge API with retries, pagination helpers, and webhook verification.',
        features: ['Typed resources', 'Retry middleware', 'Pagination helpers', 'Webhook verification'],
        badge: 'featured',
        oneTimePrice: 999,
        downloads: 30100,
        rating: 4.9,
        reviews: 402,
        overview: 'Use this SDK as the standard Node.js integration layer for server applications using multiple ParseForge products.',
        install: 'npm install @parseforge/node-client-sdk',
        quickStart: `import ParseForge from '@parseforge/node-client-sdk';

const parseforge = new ParseForge({ apiKey: process.env.PARSEFORGE_API_KEY });
const products = await parseforge.catalog.listOwnedProducts();`
    },
    {
        name: 'React Checkout SDK',
        slug: 'react-checkout-sdk',
        language: 'React',
        version: 'v2.7.0',
        description: 'Embeddable checkout components, cart state, purchase summary panels, and entitlement confirmation UI.',
        features: ['Checkout components', 'Cart state hooks', 'Entitlement confirmation', 'Receipt UI'],
        badge: 'bestseller',
        oneTimePrice: 1599,
        downloads: 21400,
        rating: 4.9,
        reviews: 286,
        overview: 'Use this SDK to embed a polished purchase flow inside React applications without recreating every checkout state.',
        install: 'npm install @parseforge/react-checkout-sdk',
        quickStart: `import { CheckoutProvider, CheckoutButton } from '@parseforge/react-checkout-sdk';

<CheckoutProvider apiKey={apiKey}>
  <CheckoutButton productSlug="identity-verification-api" />
</CheckoutProvider>`
    },
    {
        name: 'Flutter Identity SDK',
        slug: 'flutter-identity-sdk',
        language: 'Flutter',
        version: 'v1.8.0',
        description: 'Identity verification screens, camera capture helpers, document upload flows, and mobile result callbacks.',
        features: ['Document capture', 'Selfie matching flow', 'Upload progress states', 'Result callbacks'],
        badge: 'new',
        oneTimePrice: 1799,
        downloads: 9300,
        rating: 4.8,
        reviews: 102,
        overview: 'Use this SDK to add mobile KYC capture and verification handoff to Flutter apps with consistent UX states.',
        install: 'flutter pub add parseforge_identity',
        quickStart: `final session = await ParseForgeIdentity.start(
  apiKey: apiKey,
  customerReference: 'buyer_4921',
);`
    },
    {
        name: 'Laravel Webhook SDK',
        slug: 'laravel-webhook-sdk',
        language: 'Laravel',
        version: 'v2.0.0',
        description: 'Webhook signature middleware, event routing, retry-safe handlers, and delivery logs for Laravel products.',
        features: ['Signature middleware', 'Event routing', 'Replay-safe handlers', 'Queue integration'],
        badge: '',
        oneTimePrice: 999,
        downloads: 8700,
        rating: 4.7,
        reviews: 91,
        overview: 'Use this SDK to receive ParseForge events in Laravel without hand-writing signature checks and idempotency controls.',
        install: 'composer require parseforge/laravel-webhook-sdk',
        quickStart: `Route::post('/webhooks/parseforge', ParseForgeWebhookController::class)
  ->middleware('parseforge.signature');`
    },
    {
        name: 'Go Observability SDK',
        slug: 'go-observability-sdk',
        language: 'Go',
        version: 'v1.5.0',
        description: 'Structured logs, request tracing, metric emitters, and service health instrumentation for Go services.',
        features: ['Trace middleware', 'Structured logs', 'Metric emitters', 'Health check helpers'],
        badge: '',
        oneTimePrice: 1199,
        downloads: 11200,
        rating: 4.8,
        reviews: 127,
        overview: 'Use this SDK to instrument Go services consistently before routing telemetry into your existing observability stack.',
        install: 'go get github.com/parseforge/go-observability-sdk',
        quickStart: `pfobs.Configure(pfobs.Config{APIKey: os.Getenv("PARSEFORGE_API_KEY")})
router.Use(pfobs.HTTPMiddleware("checkout-service"))`
    },
    {
        name: 'Swift In-App Purchase SDK',
        slug: 'swift-in-app-purchase-sdk',
        language: 'Swift',
        version: 'v1.6.2',
        description: 'Receipt validation, entitlement sync, restore purchases, and subscription state helpers for iOS apps.',
        features: ['Receipt validation', 'Entitlement sync', 'Restore purchases', 'Subscription state helpers'],
        badge: 'featured',
        oneTimePrice: 1999,
        downloads: 7800,
        rating: 4.8,
        reviews: 88,
        overview: 'Use this SDK to connect App Store purchase state with ParseForge-owned entitlements and customer records.',
        install: 'https://github.com/parseforge/swift-in-app-purchase-sdk',
        quickStart: `let client = ParseForgePurchases(apiKey: apiKey)
let entitlement = try await client.syncReceipt(appStoreReceipt)`
    },
    {
        name: 'Kotlin Offline Sync SDK',
        slug: 'kotlin-offline-sync-sdk',
        language: 'Kotlin',
        version: 'v2.1.0',
        description: 'Offline queues, conflict resolution, background sync, and retry-aware API clients for Android products.',
        features: ['Offline queue', 'Conflict resolution', 'Background sync', 'Retry-aware clients'],
        badge: '',
        oneTimePrice: 1599,
        downloads: 9600,
        rating: 4.8,
        reviews: 112,
        overview: 'Use this SDK when Android apps need durable write queues and consistent sync behavior in poor networks.',
        install: 'implementation("com.parseforge:offline-sync:2.1.0")',
        quickStart: `val sync = ParseForgeSync.create(apiKey = apiKey)
sync.enqueue("customer.updated", payload)`
    },
    {
        name: 'Vue Admin Console SDK',
        slug: 'vue-admin-console-sdk',
        language: 'Vue',
        version: 'v1.9.0',
        description: 'Admin tables, filters, audit panels, and product management components for Vue operations dashboards.',
        features: ['Admin tables', 'Audit panels', 'Filter state', 'Role-aware actions'],
        badge: 'new',
        oneTimePrice: 1299,
        downloads: 7200,
        rating: 4.7,
        reviews: 76,
        overview: 'Use this SDK to build internal product and support consoles with consistent role-aware controls.',
        install: 'npm install @parseforge/vue-admin-console-sdk',
        quickStart: `import { ParseForgeAdminTable } from '@parseforge/vue-admin-console-sdk';

app.use(ParseForgeAdminTable, { apiKey });`
    }
];

function buildApiDocumentation(product) {
    return `## Overview
${product.overview}

## Authentication
- Use the Authorization: Bearer YOUR_PARSEFORGE_API_KEY header for every request.
- Create production and test keys from the buyer dashboard after purchase.
- Rotate keys from the dashboard when a team member leaves or an environment is replaced.

## Core Endpoints
${product.endpoints.map((endpoint) => `- ${endpoint}`).join('\n')}

## Quick Start
\`\`\`JavaScript
${product.quickStart}
\`\`\`

## Response Example
\`\`\`JSON
${product.responseExample}
\`\`\`

## Production Notes
- Send idempotency keys on write requests so retries cannot create duplicate work.
- Store returned identifiers with your local records for audit, support, and replay.
- Subscribe to product webhooks when the workflow can complete asynchronously.
- Treat confidence, risk, and status fields as decision inputs rather than hidden implementation details.

## Error Handling
- 400 means validation failed and the request should be corrected before retrying.
- 401 means the API key is missing, revoked, or attached to an account without this product.
- 402 means the product subscription is inactive or the purchased entitlement expired.
- 429 means the account is above its fair-use envelope; retry with exponential backoff.
- 5xx errors are safe to retry with idempotency keys.
`;
}

function buildSdkDocumentation(product) {
    return `## Overview
${product.overview}

## Installation
\`\`\`bash
${product.install}
\`\`\`

## Activation
- Use a dashboard API key after purchase to activate the SDK in production.
- Keep keys on the server when the SDK runs in trusted backend environments.
- Use environment-specific keys for development, staging, and production.

## Quick Start
\`\`\`${product.language}
${product.quickStart}
\`\`\`

## Package Contents
${product.features.map((feature) => `- ${feature}`).join('\n')}

## Release Guidance
- Pin the major version in production and test minor upgrades in staging first.
- Keep entitlement checks server-side for sensitive workflows.
- Use the dashboard ownership view to confirm which team purchased the package.
- Store implementation notes in your repository so future maintainers know why this SDK is present.

## Support Checklist
- Include SDK version, runtime version, and request identifiers in support tickets.
- Reproduce issues with a test key before sending production records.
- Rotate keys immediately if a client bundle or repository accidentally exposes a secret.
`;
}

function toApiCatalogItem(product) {
    return {
        name: product.name,
        slug: product.slug,
        type: 'api',
        language: product.language,
        version: product.version,
        description: product.description,
        documentation: buildApiDocumentation(product),
        features: product.features,
        icon: '</>',
        badge: product.badge,
        billingModel: 'subscription',
        allowOneTimePurchase: false,
        allowMonthlySubscription: true,
        allowYearlySubscription: true,
        oneTimePrice: 0,
        monthlyPrice: product.monthlyPrice,
        yearlyPrice: product.yearlyPrice,
        downloads: product.downloads,
        rating: product.rating,
        reviews: product.reviews,
        isPublished: true,
        status: 'stable'
    };
}

function toSdkCatalogItem(product) {
    return {
        name: product.name,
        slug: product.slug,
        type: 'sdk',
        language: product.language,
        version: product.version,
        description: product.description,
        documentation: buildSdkDocumentation(product),
        features: product.features,
        icon: '{ }',
        badge: product.badge,
        billingModel: 'one_time',
        allowOneTimePurchase: true,
        allowMonthlySubscription: false,
        allowYearlySubscription: false,
        oneTimePrice: product.oneTimePrice,
        monthlyPrice: 0,
        yearlyPrice: 0,
        downloads: product.downloads,
        rating: product.rating,
        reviews: product.reviews,
        isPublished: true,
        status: 'stable'
    };
}

const curatedCatalogItems = [
    ...apiProducts.map(toApiCatalogItem),
    ...sdkProducts.map(toSdkCatalogItem)
];

const legacyCatalogSlugs = ['users-api', 'nodejs-sdk', 'python-sdk', 'data-api'];
const legacyCatalogKeywords = ['test', 'demo', 'sample', 'placeholder', 'mock', 'temp'];
const curatedCatalogSlugs = curatedCatalogItems.map((item) => item.slug);

function isLegacyTestCatalogItem(item) {
    const slug = String(item.slug || '').toLowerCase();
    const name = String(item.name || '').toLowerCase();

    if (curatedCatalogSlugs.includes(slug)) {
        return false;
    }

    if (legacyCatalogSlugs.includes(slug)) {
        return true;
    }

    return legacyCatalogKeywords.some((keyword) => slug.includes(keyword) || name.includes(keyword));
}

module.exports = {
    curatedCatalogItems,
    curatedCatalogSlugs,
    legacyCatalogSlugs,
    isLegacyTestCatalogItem
};
