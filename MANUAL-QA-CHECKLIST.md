# ParseForge Manual QA Checklist

Use this checklist for a real browser pass on the live site after storefront, checkout, dashboard, or admin changes.

## Goal

Verify that:
- the public site looks polished on desktop and mobile
- users can browse, filter, and purchase products
- purchased items appear correctly in the dashboard
- admin management still works after frontend and catalog changes

## Devices

Run the full pass on:
- Desktop Chrome at `1440px` width
- Desktop Edge or Firefox at `1280px` width
- Mobile viewport around `390px x 844px`

Recommended spot checks:
- tablet width around `768px`
- long-page scroll behavior
- navigation open/close behavior on mobile

## Core Public Pages

Check these pages visually first:
- `/`
- `/marketplace.html`
- `/sdks.html`
- `/pricing.html`
- `/login.html`
- `/register.html`
- `/admin-login.html`

Verify on each:
- header renders correctly
- no broken spacing or overlapping text
- buttons are readable and clickable
- mobile nav opens and closes cleanly
- no obvious encoding glitches or placeholder text

## Homepage Pass

On `/` verify:
- hero copy looks premium and not cramped
- featured catalog cards render correctly
- CTA buttons route correctly
- trust chips and buyer-path sections stack well on mobile
- no section overflows horizontally

Expected result:
- homepage clearly communicates that SDKs are one-time purchases and APIs are subscriptions

## Marketplace Pass

On `/marketplace.html` verify:
- hero stats render
- curated collection cards appear
- search works
- category filter works
- billing filter works
- price filter works
- sorting works
- empty-state appears correctly for restrictive filters
- cart button appears in the header on marketplace only

For product cards verify:
- badge, pricing, docs link, and CTA are aligned
- ownership state shows correctly for already purchased items
- cards do not break on mobile

For product modal verify:
- features render
- purchase options render
- docs link works
- owned items are clearly marked

## Auth Flow Pass

Test normal user auth:
1. Go to `/login.html`
2. Sign in with a valid user
3. Confirm redirect to `/dashboard.html`

Test registration:
1. Go to `/register.html`
2. Create a new account
3. Confirm redirect into the dashboard

Test admin auth:
1. Go to `/admin-login.html`
2. Sign in with admin credentials
3. Confirm redirect to `/admin.html`

Verify:
- bad credentials show a clear error
- admin login does not drop into user login unintentionally
- logout fully clears session and returns to login

## Purchase Flow Pass

Use a real logged-in test account.

Test one-time SDK purchase:
1. Add a one-time SDK to cart
2. Open checkout
3. Complete simulated Stripe payment
4. Confirm redirect to dashboard

Test subscription API purchase:
1. Add a subscription API to cart
2. Choose monthly or yearly plan
3. Complete simulated Stripe payment
4. Confirm redirect to dashboard

Verify:
- cart total matches selected plan
- checkout modal is usable on mobile
- unauthenticated checkout redirects to login and returns cleanly
- after purchase, the same product shows as owned/subscribed in marketplace

## Dashboard Buyer Workspace Pass

On `/dashboard.html` verify:
- welcome copy is personalized
- buyer summary banner renders
- owned products stat updates
- subscriptions stat updates
- purchases section shows purchased items
- renewal text appears for subscriptions
- one-time licenses show lifetime access
- API key creation still works
- API key revoke still works
- charts render without layout issues
- recent activity section still renders

Expected result:
- dashboard feels like a buyer workspace, not just a raw API console

## Admin Pass

On `/admin.html` verify:
- page loads only for admin users
- overview loads
- products/apis section loads
- create product works
- edit product works
- billing model stays exclusive:
  - product can be `one_time`
  - or `subscription`
  - never both

Verify product creation rules:
- one-time product only shows one-time price
- subscription product only shows monthly/yearly options
- saved product appears correctly in marketplace

## Regression Checks

Quickly retest:
- `/contact.html`
- `/resources.html`
- `/playground.html`
- `/settings.html`
- `/docs.html`

Verify:
- shared header/footer still load
- no missing CSS/JS
- login-protected routes still redirect correctly

## Bug Logging Format

For each issue capture:
- page URL
- device/viewport
- user state: logged out, user, or admin
- exact steps
- expected result
- actual result
- screenshot

## Release Sign-Off

Only consider the pass complete when:
- desktop and mobile storefront both feel polished
- simulated purchase flow succeeds end to end
- purchased items show correctly in dashboard
- admin product management still works
- no critical layout breakages remain
