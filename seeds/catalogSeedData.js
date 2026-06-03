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

const additionalApiProducts = [
    {
        name: 'Stock Market Data API',
        slug: 'stock-market-data-api',
        description: 'Real-time quotes, historical candles, fundamentals, and corporate action feeds for investment products.',
        features: ['Live market quotes', 'Historical candles', 'Corporate actions', 'Ticker fundamentals'],
        badge: 'bestseller',
        monthlyPrice: 1499,
        yearlyPrice: 14990,
        downloads: 27400,
        rating: 4.9,
        reviews: 318,
        resource: 'market-data',
        overview: 'Use this API to power portfolio dashboards, watchlists, brokerage experiences, and financial analysis workflows.'
    },
    {
        name: 'Crypto Rates API',
        slug: 'crypto-rates-api',
        description: 'Spot crypto prices, exchange normalization, token metadata, and wallet balance conversion rates.',
        features: ['Spot prices', 'Exchange normalization', 'Token metadata', 'Balance conversion'],
        badge: '',
        monthlyPrice: 1199,
        yearlyPrice: 11990,
        downloads: 18800,
        rating: 4.8,
        reviews: 207,
        resource: 'crypto-rates',
        overview: 'Use this API to show crypto portfolio values, payment conversion rates, and market movement inside fintech products.'
    },
    {
        name: 'Weather Forecast API',
        slug: 'weather-forecast-api',
        description: 'Hourly, daily, severe weather, and historical climate data for logistics, travel, and field operations.',
        features: ['Hourly forecasts', 'Severe weather alerts', 'Historical climate data', 'Location-aware conditions'],
        badge: 'featured',
        monthlyPrice: 999,
        yearlyPrice: 9990,
        downloads: 33100,
        rating: 4.8,
        reviews: 386,
        resource: 'weather',
        overview: 'Use this API to plan routes, scheduling, operations, and consumer experiences around changing weather conditions.'
    },
    {
        name: 'SMS Messaging API',
        slug: 'sms-messaging-api',
        description: 'Transactional SMS, OTP delivery, sender pooling, delivery receipts, and regional compliance helpers.',
        features: ['OTP delivery', 'Sender pooling', 'Delivery receipts', 'Compliance templates'],
        badge: 'bestseller',
        monthlyPrice: 1299,
        yearlyPrice: 12990,
        downloads: 24200,
        rating: 4.9,
        reviews: 291,
        resource: 'sms',
        overview: 'Use this API to send login codes, delivery updates, appointment reminders, and product-critical SMS alerts.'
    },
    {
        name: 'Voice Calling API',
        slug: 'voice-calling-api',
        description: 'Programmatic calling, call routing, IVR prompts, recordings, and post-call webhook events.',
        features: ['Call routing', 'IVR prompts', 'Call recordings', 'Post-call webhooks'],
        badge: '',
        monthlyPrice: 1399,
        yearlyPrice: 13990,
        downloads: 11600,
        rating: 4.7,
        reviews: 134,
        resource: 'voice',
        overview: 'Use this API to add voice workflows for support, dispatch, verification, and customer communications.'
    },
    {
        name: 'Social Profile Enrichment API',
        slug: 'social-profile-enrichment-api',
        description: 'Normalize social handles, enrich public profile metadata, and detect audience or creator fit signals.',
        features: ['Handle normalization', 'Profile metadata', 'Creator fit signals', 'Audience categories'],
        badge: 'new',
        monthlyPrice: 1199,
        yearlyPrice: 11990,
        downloads: 9700,
        rating: 4.7,
        reviews: 112,
        resource: 'social-profiles',
        overview: 'Use this API to enrich creator, community, CRM, and marketplace profiles with public social context.'
    },
    {
        name: 'E-commerce Product Data API',
        slug: 'ecommerce-product-data-api',
        description: 'Product normalization, price tracking, catalog enrichment, barcode lookup, and merchant metadata.',
        features: ['Catalog enrichment', 'Price tracking', 'Barcode lookup', 'Merchant metadata'],
        badge: 'featured',
        monthlyPrice: 1499,
        yearlyPrice: 14990,
        downloads: 21300,
        rating: 4.8,
        reviews: 244,
        resource: 'commerce-products',
        overview: 'Use this API to enrich product catalogs, compare merchant prices, and keep marketplace listings current.'
    },
    {
        name: 'Shipping Rates API',
        slug: 'shipping-rates-api',
        description: 'Carrier rate comparison, service levels, delivery estimates, label readiness, and surcharge visibility.',
        features: ['Carrier comparisons', 'Delivery estimates', 'Service levels', 'Surcharge visibility'],
        badge: '',
        monthlyPrice: 1299,
        yearlyPrice: 12990,
        downloads: 15100,
        rating: 4.8,
        reviews: 176,
        resource: 'shipping-rates',
        overview: 'Use this API to quote shipment costs during checkout, logistics planning, and seller operations.'
    },
    {
        name: 'Travel Itinerary API',
        slug: 'travel-itinerary-api',
        description: 'Flight, hotel, rental, activity, and traveler timeline normalization for travel planning products.',
        features: ['Flight timeline parsing', 'Hotel stay blocks', 'Activity grouping', 'Traveler notifications'],
        badge: 'new',
        monthlyPrice: 1399,
        yearlyPrice: 13990,
        downloads: 8400,
        rating: 4.7,
        reviews: 91,
        resource: 'travel-itineraries',
        overview: 'Use this API to assemble travel bookings into clean itineraries and operational trip timelines.'
    },
    {
        name: 'Sports Scores API',
        slug: 'sports-scores-api',
        description: 'Live scores, standings, fixtures, player stats, and team metadata for sports media products.',
        features: ['Live scores', 'Fixtures', 'Standings', 'Player stats'],
        badge: '',
        monthlyPrice: 1199,
        yearlyPrice: 11990,
        downloads: 17600,
        rating: 4.8,
        reviews: 199,
        resource: 'sports-scores',
        overview: 'Use this API to power sports dashboards, fan apps, betting companions, and media coverage experiences.'
    },
    {
        name: 'Health Provider Directory API',
        slug: 'health-provider-directory-api',
        description: 'Provider lookup, specialty taxonomy, network participation, location details, and appointment metadata.',
        features: ['Provider lookup', 'Specialty taxonomy', 'Network metadata', 'Location details'],
        badge: 'featured',
        monthlyPrice: 1799,
        yearlyPrice: 17990,
        downloads: 6900,
        rating: 4.8,
        reviews: 74,
        resource: 'health-providers',
        overview: 'Use this API to build care navigation, provider search, eligibility, and appointment routing workflows.'
    },
    {
        name: 'Media Transcoding API',
        slug: 'media-transcoding-api',
        description: 'Video and audio transcoding jobs, thumbnail generation, adaptive output profiles, and webhook status.',
        features: ['Video transcoding', 'Audio extraction', 'Thumbnail generation', 'Adaptive profiles'],
        badge: '',
        monthlyPrice: 1599,
        yearlyPrice: 15990,
        downloads: 10200,
        rating: 4.8,
        reviews: 118,
        resource: 'media-transcoding',
        overview: 'Use this API to prepare uploaded video and audio for playback, previews, moderation, and distribution.'
    },
    {
        name: 'Image Moderation API',
        slug: 'image-moderation-api',
        description: 'Detect unsafe images, brand risks, sensitive content, and policy violations before publishing.',
        features: ['Unsafe image detection', 'Policy categories', 'Brand risk scoring', 'Review queue metadata'],
        badge: 'featured',
        monthlyPrice: 1299,
        yearlyPrice: 12990,
        downloads: 13600,
        rating: 4.8,
        reviews: 153,
        resource: 'image-moderation',
        overview: 'Use this API to moderate uploads for marketplaces, community apps, creator tools, and support workflows.'
    },
    {
        name: 'Threat Intelligence API',
        slug: 'threat-intelligence-api',
        description: 'IP reputation, domain risk, leaked credential signals, malware indicators, and abuse intelligence.',
        features: ['IP reputation', 'Domain risk', 'Credential exposure signals', 'Malware indicators'],
        badge: 'bestseller',
        monthlyPrice: 1899,
        yearlyPrice: 18990,
        downloads: 11800,
        rating: 4.9,
        reviews: 151,
        resource: 'threat-intel',
        overview: 'Use this API to protect signups, logins, payments, and admin actions with current threat context.'
    },
    {
        name: 'Secrets Rotation API',
        slug: 'secrets-rotation-api',
        description: 'Credential rotation schedules, secret age reporting, policy violations, and environment inventory.',
        features: ['Rotation schedules', 'Secret age reporting', 'Policy violations', 'Environment inventory'],
        badge: '',
        monthlyPrice: 1499,
        yearlyPrice: 14990,
        downloads: 7600,
        rating: 4.7,
        reviews: 83,
        resource: 'secrets-rotation',
        overview: 'Use this API to track secret hygiene and automate rotation policy checks across production environments.'
    },
    {
        name: 'Cloud Cost Insights API',
        slug: 'cloud-cost-insights-api',
        description: 'Cloud spend normalization, service allocation, anomaly alerts, and team-level chargeback reporting.',
        features: ['Spend normalization', 'Anomaly alerts', 'Team chargeback', 'Service allocation'],
        badge: 'new',
        monthlyPrice: 1599,
        yearlyPrice: 15990,
        downloads: 8900,
        rating: 4.8,
        reviews: 104,
        resource: 'cloud-costs',
        overview: 'Use this API to expose cloud cost intelligence inside finance, platform, and engineering operations tools.'
    },
    {
        name: 'Database Audit API',
        slug: 'database-audit-api',
        description: 'Database event ingestion, sensitive operation detection, query audit trails, and compliance exports.',
        features: ['Audit event ingestion', 'Sensitive operation detection', 'Query trails', 'Compliance exports'],
        badge: '',
        monthlyPrice: 1699,
        yearlyPrice: 16990,
        downloads: 8200,
        rating: 4.8,
        reviews: 96,
        resource: 'database-audit',
        overview: 'Use this API to centralize database audit events and prepare operational compliance evidence.'
    },
    {
        name: 'Web Scraping Guard API',
        slug: 'web-scraping-guard-api',
        description: 'Fetch pages safely, normalize extracted content, apply robots policy, and detect blocked requests.',
        features: ['Managed fetching', 'Content extraction', 'Robots policy checks', 'Block detection'],
        badge: '',
        monthlyPrice: 1299,
        yearlyPrice: 12990,
        downloads: 14300,
        rating: 4.7,
        reviews: 168,
        resource: 'scraping-guard',
        overview: 'Use this API to collect public web data with operational guardrails and predictable extraction outputs.'
    },
    {
        name: 'PDF Generation API',
        slug: 'pdf-generation-api',
        description: 'Generate invoices, reports, certificates, and statements from HTML templates and structured data.',
        features: ['HTML to PDF', 'Template variables', 'Asset bundling', 'Report delivery'],
        badge: 'bestseller',
        monthlyPrice: 999,
        yearlyPrice: 9990,
        downloads: 23800,
        rating: 4.8,
        reviews: 279,
        resource: 'pdf-generation',
        overview: 'Use this API to create customer-facing documents without maintaining rendering infrastructure.'
    },
    {
        name: 'Calendar Scheduling API',
        slug: 'calendar-scheduling-api',
        description: 'Availability lookup, booking holds, meeting creation, calendar sync, and timezone normalization.',
        features: ['Availability lookup', 'Booking holds', 'Calendar sync', 'Timezone normalization'],
        badge: '',
        monthlyPrice: 999,
        yearlyPrice: 9990,
        downloads: 19100,
        rating: 4.8,
        reviews: 216,
        resource: 'scheduling',
        overview: 'Use this API to add scheduling, booking, and calendar coordination to SaaS and marketplace products.'
    },
    {
        name: 'Push Notifications API',
        slug: 'push-notifications-api',
        description: 'Device registration, audience targeting, campaign delivery, receipt events, and notification analytics.',
        features: ['Device registration', 'Audience targeting', 'Delivery receipts', 'Notification analytics'],
        badge: '',
        monthlyPrice: 999,
        yearlyPrice: 9990,
        downloads: 15400,
        rating: 4.7,
        reviews: 181,
        resource: 'push-notifications',
        overview: 'Use this API to send product notifications to web and mobile users with delivery visibility.'
    },
    {
        name: 'Document Signing API',
        slug: 'document-signing-api',
        description: 'Signature requests, signer identity, audit trails, template fields, and completion webhooks.',
        features: ['Signature requests', 'Signer identity', 'Audit trails', 'Completion webhooks'],
        badge: 'featured',
        monthlyPrice: 1699,
        yearlyPrice: 16990,
        downloads: 9400,
        rating: 4.8,
        reviews: 109,
        resource: 'document-signing',
        overview: 'Use this API to add contract, approval, and consent signature flows to business applications.'
    },
    {
        name: 'Tax Calculation API',
        slug: 'tax-calculation-api',
        description: 'Sales tax, VAT, jurisdiction lookup, exemption handling, and line-item tax estimates for checkout.',
        features: ['Sales tax estimates', 'VAT support', 'Jurisdiction lookup', 'Exemption handling'],
        badge: '',
        monthlyPrice: 1599,
        yearlyPrice: 15990,
        downloads: 12700,
        rating: 4.8,
        reviews: 147,
        resource: 'tax-calculation',
        overview: 'Use this API to calculate order-level taxes before checkout completion and invoice generation.'
    },
    {
        name: 'Company Enrichment API',
        slug: 'company-enrichment-api',
        description: 'Company firmographics, domain matching, employee ranges, funding signals, and industry tags.',
        features: ['Domain matching', 'Firmographics', 'Funding signals', 'Industry tags'],
        badge: 'bestseller',
        monthlyPrice: 1499,
        yearlyPrice: 14990,
        downloads: 18400,
        rating: 4.8,
        reviews: 205,
        resource: 'company-enrichment',
        overview: 'Use this API to enrich CRM records, lead routing, onboarding forms, and account intelligence workflows.'
    },
    {
        name: 'Localization Translation API',
        slug: 'localization-translation-api',
        description: 'Translate product copy, normalize locale strings, detect language, and manage glossary-aware outputs.',
        features: ['Text translation', 'Language detection', 'Glossary support', 'Locale normalization'],
        badge: '',
        monthlyPrice: 1299,
        yearlyPrice: 12990,
        downloads: 16900,
        rating: 4.8,
        reviews: 177,
        resource: 'localization',
        overview: 'Use this API to localize product UI, support content, emails, and marketplace listings.'
    }
];

const additionalSdkProducts = [
    {
        name: 'Angular Dashboard SDK',
        slug: 'angular-dashboard-sdk',
        language: 'Angular',
        description: 'Reusable dashboard shells, data tables, charts, and role-aware admin panels for Angular apps.',
        features: ['Dashboard shell', 'Data tables', 'Chart widgets', 'Role-aware panels'],
        badge: '',
        oneTimePrice: 1299,
        downloads: 8200,
        rating: 4.7,
        reviews: 86,
        install: 'npm install @parseforge/angular-dashboard-sdk',
        overview: 'Use this SDK to assemble Angular operations dashboards without rebuilding table, filter, and chart patterns.'
    },
    {
        name: 'Svelte Commerce SDK',
        slug: 'svelte-commerce-sdk',
        language: 'Svelte',
        description: 'Cart state, product cards, checkout steps, and purchase confirmation components for Svelte apps.',
        features: ['Cart state', 'Product cards', 'Checkout steps', 'Purchase confirmation'],
        badge: 'new',
        oneTimePrice: 1299,
        downloads: 6200,
        rating: 4.7,
        reviews: 61,
        install: 'npm install @parseforge/svelte-commerce-sdk',
        overview: 'Use this SDK to add a polished commerce surface to Svelte storefronts and product portals.'
    },
    {
        name: 'Express API Gateway SDK',
        slug: 'express-api-gateway-sdk',
        language: 'Node.js',
        description: 'Express middleware for API keys, rate limits, request logging, and entitlement checks.',
        features: ['API key middleware', 'Rate limits', 'Request logging', 'Entitlement checks'],
        badge: 'featured',
        oneTimePrice: 1499,
        downloads: 17800,
        rating: 4.8,
        reviews: 214,
        install: 'npm install @parseforge/express-api-gateway-sdk',
        overview: 'Use this SDK to protect Express APIs with production access rules and buyer entitlements.'
    },
    {
        name: 'Django SaaS Starter SDK',
        slug: 'django-saas-starter-sdk',
        language: 'Python',
        description: 'Django accounts, billing hooks, team models, audit logs, and product entitlement helpers.',
        features: ['Team accounts', 'Billing hooks', 'Audit logs', 'Entitlement helpers'],
        badge: 'bestseller',
        oneTimePrice: 1799,
        downloads: 9600,
        rating: 4.8,
        reviews: 121,
        install: 'pip install parseforge-django-saas',
        overview: 'Use this SDK to start Django SaaS products with account, billing, and entitlement basics already wired.'
    },
    {
        name: 'Rails Billing SDK',
        slug: 'rails-billing-sdk',
        language: 'Ruby',
        description: 'Rails billing models, checkout controllers, receipt pages, and subscription state helpers.',
        features: ['Billing models', 'Checkout controllers', 'Receipt pages', 'Subscription helpers'],
        badge: '',
        oneTimePrice: 1499,
        downloads: 7100,
        rating: 4.7,
        reviews: 79,
        install: 'bundle add parseforge-rails-billing',
        overview: 'Use this SDK to integrate product purchases and subscriptions into Rails applications.'
    },
    {
        name: 'Java Spring Client SDK',
        slug: 'java-spring-client-sdk',
        language: 'Java',
        description: 'Spring Boot clients, auth interceptors, retry policies, and typed resources for ParseForge APIs.',
        features: ['Spring clients', 'Auth interceptors', 'Retry policies', 'Typed resources'],
        badge: '',
        oneTimePrice: 1199,
        downloads: 10400,
        rating: 4.8,
        reviews: 118,
        install: 'implementation("com.parseforge:spring-client-sdk:1.0.0")',
        overview: 'Use this SDK to integrate ParseForge APIs into Java and Spring Boot services with consistent request handling.'
    },
    {
        name: 'C# .NET Client SDK',
        slug: 'dotnet-client-sdk',
        language: '.NET',
        description: 'Typed .NET clients, dependency injection setup, webhook verification, and resilient HTTP policies.',
        features: ['Typed clients', 'DI setup', 'Webhook verification', 'HTTP resilience'],
        badge: 'featured',
        oneTimePrice: 1199,
        downloads: 11200,
        rating: 4.8,
        reviews: 132,
        install: 'dotnet add package ParseForge.Client',
        overview: 'Use this SDK to connect ASP.NET and worker services to ParseForge APIs with first-class .NET patterns.'
    },
    {
        name: 'Rust Data Pipeline SDK',
        slug: 'rust-data-pipeline-sdk',
        language: 'Rust',
        description: 'Batch ingestion, streaming transforms, schema checks, and resilient delivery for Rust data services.',
        features: ['Batch ingestion', 'Streaming transforms', 'Schema checks', 'Resilient delivery'],
        badge: 'new',
        oneTimePrice: 1599,
        downloads: 5200,
        rating: 4.7,
        reviews: 54,
        install: 'cargo add parseforge-data-pipeline',
        overview: 'Use this SDK to build high-throughput data ingestion and transformation services in Rust.'
    },
    {
        name: 'PHP Commerce SDK',
        slug: 'php-commerce-sdk',
        language: 'PHP',
        description: 'Commerce checkout helpers, purchase records, webhook handlers, and entitlement views for PHP apps.',
        features: ['Checkout helpers', 'Purchase records', 'Webhook handlers', 'Entitlement views'],
        badge: '',
        oneTimePrice: 999,
        downloads: 8800,
        rating: 4.7,
        reviews: 92,
        install: 'composer require parseforge/php-commerce-sdk',
        overview: 'Use this SDK to add ParseForge commerce flows to PHP storefronts, portals, and admin systems.'
    },
    {
        name: 'iOS Analytics SDK',
        slug: 'ios-analytics-sdk',
        language: 'Swift',
        description: 'Event tracking, identity traits, offline queueing, and privacy-aware analytics for iOS apps.',
        features: ['Event tracking', 'Identity traits', 'Offline queueing', 'Privacy controls'],
        badge: '',
        oneTimePrice: 1399,
        downloads: 7900,
        rating: 4.8,
        reviews: 88,
        install: 'https://github.com/parseforge/ios-analytics-sdk',
        overview: 'Use this SDK to capture reliable iOS product analytics while respecting privacy and offline states.'
    },
    {
        name: 'Android Analytics SDK',
        slug: 'android-analytics-sdk',
        language: 'Kotlin',
        description: 'Android event tracking, screen analytics, offline buffering, and lifecycle-aware identity sync.',
        features: ['Event tracking', 'Screen analytics', 'Offline buffering', 'Lifecycle identity sync'],
        badge: '',
        oneTimePrice: 1399,
        downloads: 8400,
        rating: 4.8,
        reviews: 94,
        install: 'implementation("com.parseforge:android-analytics:1.0.0")',
        overview: 'Use this SDK to capture Android product behavior with durable queues and lifecycle-aware context.'
    },
    {
        name: 'Unity Game Services SDK',
        slug: 'unity-game-services-sdk',
        language: 'Unity',
        description: 'Player profiles, inventory sync, purchase receipts, and event telemetry for Unity games.',
        features: ['Player profiles', 'Inventory sync', 'Receipt handling', 'Event telemetry'],
        badge: 'new',
        oneTimePrice: 1999,
        downloads: 6100,
        rating: 4.7,
        reviews: 63,
        install: 'https://github.com/parseforge/unity-game-services-sdk',
        overview: 'Use this SDK to connect Unity games to product accounts, inventory, purchases, and telemetry.'
    },
    {
        name: 'Shopify App SDK',
        slug: 'shopify-app-sdk',
        language: 'JavaScript',
        description: 'Embedded app authentication, product sync, billing hooks, and admin UI helpers for Shopify apps.',
        features: ['Embedded auth', 'Product sync', 'Billing hooks', 'Admin UI helpers'],
        badge: 'bestseller',
        oneTimePrice: 1799,
        downloads: 13200,
        rating: 4.8,
        reviews: 156,
        install: 'npm install @parseforge/shopify-app-sdk',
        overview: 'Use this SDK to build Shopify apps with embedded admin flows and product-aware billing behavior.'
    },
    {
        name: 'WordPress Plugin SDK',
        slug: 'wordpress-plugin-sdk',
        language: 'PHP',
        description: 'WordPress settings pages, license checks, REST handlers, and customer portal blocks.',
        features: ['Settings pages', 'License checks', 'REST handlers', 'Portal blocks'],
        badge: '',
        oneTimePrice: 999,
        downloads: 11800,
        rating: 4.7,
        reviews: 127,
        install: 'composer require parseforge/wordpress-plugin-sdk',
        overview: 'Use this SDK to ship WordPress plugins with licensing, settings, and customer account features.'
    },
    {
        name: 'Chrome Extension SDK',
        slug: 'chrome-extension-sdk',
        language: 'JavaScript',
        description: 'Extension auth, secure storage, background messaging, and product entitlement checks.',
        features: ['Extension auth', 'Secure storage', 'Background messaging', 'Entitlement checks'],
        badge: '',
        oneTimePrice: 1199,
        downloads: 7600,
        rating: 4.7,
        reviews: 81,
        install: 'npm install @parseforge/chrome-extension-sdk',
        overview: 'Use this SDK to build browser extensions with secure account state and purchase-aware capabilities.'
    },
    {
        name: 'Electron Desktop SDK',
        slug: 'electron-desktop-sdk',
        language: 'Electron',
        description: 'Desktop auth, update prompts, license activation, and secure IPC helpers for Electron apps.',
        features: ['Desktop auth', 'License activation', 'Update prompts', 'Secure IPC helpers'],
        badge: 'featured',
        oneTimePrice: 1599,
        downloads: 6800,
        rating: 4.8,
        reviews: 74,
        install: 'npm install @parseforge/electron-desktop-sdk',
        overview: 'Use this SDK to connect desktop apps to account licensing, product updates, and secure local workflows.'
    },
    {
        name: 'CLI Tooling SDK',
        slug: 'cli-tooling-sdk',
        language: 'Node.js',
        description: 'Command parsing, auth flows, config files, update checks, and telemetry for developer CLIs.',
        features: ['Command parsing', 'Auth flows', 'Config files', 'Update checks'],
        badge: '',
        oneTimePrice: 999,
        downloads: 14700,
        rating: 4.8,
        reviews: 161,
        install: 'npm install @parseforge/cli-tooling-sdk',
        overview: 'Use this SDK to build developer-facing command line tools with account and update workflows included.'
    },
    {
        name: 'Terraform Provider SDK',
        slug: 'terraform-provider-sdk',
        language: 'Go',
        description: 'Provider scaffolding, resource schemas, import helpers, and acceptance test patterns.',
        features: ['Provider scaffolding', 'Resource schemas', 'Import helpers', 'Acceptance tests'],
        badge: 'new',
        oneTimePrice: 1799,
        downloads: 5400,
        rating: 4.7,
        reviews: 48,
        install: 'go get github.com/parseforge/terraform-provider-sdk',
        overview: 'Use this SDK to build Terraform providers for internal platforms and commercial infrastructure products.'
    },
    {
        name: 'Kubernetes Operator SDK',
        slug: 'kubernetes-operator-sdk',
        language: 'Go',
        description: 'Controller scaffolding, CRD templates, reconciliation helpers, and deployment manifests.',
        features: ['Controller scaffolding', 'CRD templates', 'Reconciliation helpers', 'Deployment manifests'],
        badge: 'featured',
        oneTimePrice: 1999,
        downloads: 7200,
        rating: 4.8,
        reviews: 82,
        install: 'go get github.com/parseforge/kubernetes-operator-sdk',
        overview: 'Use this SDK to create Kubernetes operators with production reconciliation and deployment conventions.'
    },
    {
        name: 'GraphQL Client SDK',
        slug: 'graphql-client-sdk',
        language: 'TypeScript',
        description: 'Typed GraphQL clients, cache policies, persisted query helpers, and request tracing.',
        features: ['Typed clients', 'Cache policies', 'Persisted queries', 'Request tracing'],
        badge: '',
        oneTimePrice: 1199,
        downloads: 13900,
        rating: 4.8,
        reviews: 143,
        install: 'npm install @parseforge/graphql-client-sdk',
        overview: 'Use this SDK to connect TypeScript apps to GraphQL APIs with typed requests and reliable cache behavior.'
    },
    {
        name: 'OpenAPI Generator SDK',
        slug: 'openapi-generator-sdk',
        language: 'TypeScript',
        description: 'OpenAPI parsing, client generation, schema linting, and documentation publishing utilities.',
        features: ['OpenAPI parsing', 'Client generation', 'Schema linting', 'Docs publishing'],
        badge: 'bestseller',
        oneTimePrice: 1499,
        downloads: 16600,
        rating: 4.8,
        reviews: 189,
        install: 'npm install @parseforge/openapi-generator-sdk',
        overview: 'Use this SDK to turn API specifications into clients, lint checks, and documentation workflows.'
    },
    {
        name: 'Web Components UI SDK',
        slug: 'web-components-ui-sdk',
        language: 'Web Components',
        description: 'Framework-agnostic UI components for pricing cards, account status, docs gates, and checkout actions.',
        features: ['Pricing cards', 'Account status', 'Docs gates', 'Checkout actions'],
        badge: '',
        oneTimePrice: 1299,
        downloads: 9300,
        rating: 4.7,
        reviews: 98,
        install: 'npm install @parseforge/web-components-ui-sdk',
        overview: 'Use this SDK to embed ParseForge-aware UI in any web stack using standards-based components.'
    },
    {
        name: 'Data Visualization SDK',
        slug: 'data-visualization-sdk',
        language: 'React',
        description: 'Charts, metric cards, comparison tables, and exportable analytics views for React dashboards.',
        features: ['Charts', 'Metric cards', 'Comparison tables', 'Analytics exports'],
        badge: '',
        oneTimePrice: 1299,
        downloads: 12500,
        rating: 4.8,
        reviews: 134,
        install: 'npm install @parseforge/data-visualization-sdk',
        overview: 'Use this SDK to add polished analytics surfaces to buyer, admin, and operations dashboards.'
    },
    {
        name: 'Notification Center SDK',
        slug: 'notification-center-sdk',
        language: 'React',
        description: 'Inbox UI, unread state, preference controls, and real-time notification rendering for web apps.',
        features: ['Inbox UI', 'Unread state', 'Preferences', 'Realtime rendering'],
        badge: '',
        oneTimePrice: 1199,
        downloads: 10100,
        rating: 4.8,
        reviews: 119,
        install: 'npm install @parseforge/notification-center-sdk',
        overview: 'Use this SDK to add an account-aware notification center to SaaS dashboards and customer portals.'
    },
    {
        name: 'AI Agent Tools SDK',
        slug: 'ai-agent-tools-sdk',
        language: 'TypeScript',
        description: 'Tool calling wrappers, permission scopes, audit logs, and structured outputs for AI agents.',
        features: ['Tool wrappers', 'Permission scopes', 'Audit logs', 'Structured outputs'],
        badge: 'new',
        oneTimePrice: 1999,
        downloads: 11300,
        rating: 4.8,
        reviews: 129,
        install: 'npm install @parseforge/ai-agent-tools-sdk',
        overview: 'Use this SDK to give AI agents governed access to product actions, tools, and auditable workflows.'
    }
];

function withApiDefaults(product, index) {
    const label = product.resource || product.slug.replace(/-api$/, '');
    const operationName = label
        .split('-')
        .map((part, partIndex) =>
            partIndex === 0 ? part : `${part.charAt(0).toUpperCase()}${part.slice(1)}`,
        )
        .join('');

    return {
        language: 'REST',
        version: `v${2 + (index % 3)}.${index % 9}.${index % 4}`,
        endpoints: [
            `GET /v1/${label}`,
            `POST /v1/${label}`,
            `GET /v1/${label}/{id}`
        ],
        quickStart: `const result = await parseforge.${operationName}.create({
  reference: 'demo_${index + 1}',
  environment: 'production'
});`,
        responseExample: `{
  "id": "${label}_demo_${index + 1}",
  "status": "processed",
  "confidence": 0.97
}`,
        ...product
    };
}

function withSdkDefaults(product, index) {
    return {
        version: `v${1 + (index % 3)}.${index % 8}.${index % 5}`,
        quickStart: `const client = createParseForgeClient({
  apiKey: process.env.PARSEFORGE_API_KEY,
  package: '${product.slug}'
});

await client.activate({
  environment: 'production'
});`,
        ...product
    };
}

apiProducts.push(...additionalApiProducts.map(withApiDefaults));
sdkProducts.push(...additionalSdkProducts.map(withSdkDefaults));

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
