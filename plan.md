# Supabase Auth and Cloudflare Migration Plan

This plan is split into two workstreams. Supabase Auth changes how users sign in; Cloudflare changes where the frontend and backend run. Existing users are test users only. Their player identities, accounts, balances, and transaction history are already in Supabase; the only data currently held locally that needs replacing is the bank login information. Do not re-import or recreate the existing player/economy data.

## Plan A: Move login to shared Supabase Auth

### 1. Identity and credential decisions

- Use the existing shared Supabase project and Auth service. Do not create another password store.
- Collect a real email address at signup and use Supabase Auth's email/password credentials.
- Let users sign in with either their username or email. Store the username-to-email directory in a private Supabase schema; never store passwords outside Supabase Auth.
- Keep existing `identities_player`, accounts, balances, and transactions unchanged. Do not add an Auth foreign key to the identity table or create duplicate player identities.
- Require Discord OAuth ownership verification during signup. The entered Discord ID must match the verified Discord identity and exactly one existing `identities_player` row.

### 2. Implement Auth and identity resolution

- Use `@supabase/supabase-js` for password signup/sign-in, Discord identity linking, session restore/refresh, sign-out, and password changes.
- Request only the Discord `identify` scope; do not request the Discord email scope.
- Configure Supabase email confirmation/delivery as desired, enable manual identity linking, and allow only the application's configured callback URLs.
- Send Supabase access tokens to the existing PHP API temporarily. The server validates each token with Supabase Auth, reads the verified linked Discord ID, and performs a read-only lookup of the existing player identity.
- Keep all account/economy reads and mutations on the existing server-only `fab_*` RPC paths. Do not write to `identities_player` during signup or login.
- Do not use a local database for application data. Supabase Auth stores credentials, a private Supabase schema stores the username-to-email directory, and the existing Supabase identity/economy data remains authoritative.

### 3. Configure and verify

- Configure the Supabase Discord provider, confirmation policy, Site URL, and local/production signup callback URLs.
- Verify email confirmation, Discord OAuth redirects, and email/password sign-in against the configured Supabase Auth project.
- Test signup with a matching and mismatched Discord ID, an unlinked Discord account, duplicate Discord identity, login, logout, refresh, password change, token expiry, and access to another player's data.
- Verify that identity/economy rows are not changed and the same existing accounts and transaction history remain available.
- Keep server-only service-role credentials out of frontend assets; only the Supabase URL and publishable key may be in the browser bundle.

### Completion criteria

- No application runtime or data storage depends on MariaDB.
- Authenticated requests resolve through the verified Discord identity to exactly one existing player identity; signup/login do not modify identity or economy data.
- Existing account numbers, balances, ledger rows, and activity history remain intact.
- No service-role key or private credential is present in frontend assets or repository history.

## Plan B: Prepare and deploy on Cloudflare Free

### 1. Define the deployment shape

- Host the Vite-built React app on Cloudflare Pages (or Workers Static Assets if a single Worker deployment proves simpler).
- Use TypeScript for Cloudflare Pages Functions/Workers. Prefer Pages Functions for a Pages-hosted app if their routing and local-development behavior meet the API needs.
- Keep Supabase as the database, Auth provider, and economy source of truth. Do not introduce D1 or copy account/transaction records into Cloudflare.
- Use a same-origin `/api/*` interface for the frontend and backend where practical, reducing CORS and cookie complexity.

### 2. Inventory and replace the PHP backend

- Map every route and PHP handler the React app still calls, including state, account creation/rename/archive, profile changes, transfers, signup/login during the Auth transition, and activity/history.
- Define request/response contracts and error behavior for each endpoint before porting it.
- Port required handlers to TypeScript Pages Functions/Workers and use Supabase Auth tokens to identify the caller.
- Preserve the existing `fab_*` RPC flows and database transaction guarantees for account and ledger operations; do not replace them with client-side balance writes or direct service-role table access.
- Replace PHP session assumptions with Supabase token/session handling. Remove MariaDB and Docker-only dependencies from the deployed path once no production route requires them.
- Retain legacy URL behavior with redirects or compatible routes where needed.

### 3. Configure and validate the frontend build

- Configure Pages to install the Node dependencies and run the existing Vite build (`npm run build`), publishing the generated frontend output directory.
- Add SPA fallback/routing configuration and verify direct loads and refreshes on nested routes.
- Keep frontend configuration limited to public values such as the Supabase project URL and publishable key.
- Test production-like preview deployments, API routing, redirects, CORS (if any), and Supabase Auth callback URLs.

### 4. Configure server-side secrets and runtime

- Store the Supabase service-role key only as a Cloudflare Worker/Pages Function secret; never place it in Vite environment variables or static build output.
- Set required public and server-only environment values separately for preview and production.
- Keep Worker CPU work small; use asynchronous network calls for Supabase operations. Confirm the workload fits current Free-plan limits (notably the daily request quota and per-invocation CPU limit) and monitor usage.
- Add bounded request sizes, validation, explicit errors, and appropriate rate limiting for sensitive endpoints.
- Confirm Supabase Free-plan constraints separately, including inactivity pausing, database/storage quotas, Auth email limits, and outbound delivery needs.

### 5. Deploy, cut over, and retain rollback

- Deploy a preview environment first and run the full auth, identity-linking, account, transfer, history, and authorization test matrix against it.
- Verify that frontend bundles contain no private key, protected API routes reject missing/invalid tokens, and a user cannot act on another player's identity or account.
- Configure the production domain and Supabase redirect URLs, then deploy Pages/Functions.
- Cut over only after test-user identity-link checks and end-to-end checks pass. Keep any pre-existing local MariaDB volume offline as a temporary backup until its obsolete rows are reviewed; the app must not mount or access it.
- Monitor Worker errors/CPU/request usage, Supabase Auth and database usage, email delivery, and failed RPCs after launch.

### Completion criteria

- The frontend and all required API routes work without Apache, PHP, or a production MariaDB dependency.
- Cloudflare deployment uses only public browser configuration and server-side secrets.
- Authenticated requests are resolved to the correct shared player identity, while existing Supabase accounts and ledger protections continue to work.
- Preview and production builds, nested-route refreshes, authentication redirects, and critical account/transfer flows pass.

## Suggested order

1. Configure Supabase email Auth and Discord OAuth for the existing project.
2. Implement and validate email/username sign-in and read-only identity resolution locally.
3. Inventory the API contract and port backend endpoints to TypeScript Functions/Workers.
4. Deploy a Cloudflare preview and verify Auth plus all account/ledger behaviors.
5. Cut over, verify each test account's identity link, and retire local credential authentication after a stable rollback window.
