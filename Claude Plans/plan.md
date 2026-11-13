# Supabase Auth and Cloudflare Migration Plan

This plan is split into two workstreams. Supabase Auth changes how users sign in; Cloudflare changes where the frontend and backend run. Existing users are test users only. Their player identities, accounts, balances, and transaction history are already in Supabase. Do not re-import or recreate the existing player/economy data.

## Current status (2026-11-11)

- Plan A's local implementation is complete and pushed on `feature/supabase-auth-cloudflare`. The React app uses Supabase Auth for email/password signup, username-or-email/password login, Discord OAuth sign-in, session management, password changes, and password recovery. A private Supabase username directory supports username login.
- PHP validates Supabase access tokens and resolves the verified Discord ID read-only to exactly one existing player identity. Existing identity and economy data were not migrated, recreated, or modified by this work.
- The app no longer runs MariaDB. At the user's request, the stopped legacy container and `gulllebelle_db-data` Docker volume were removed on 2026-11-11; its legacy rows were not imported.
- Supabase dashboard configuration and full end-to-end auth verification remain. Manual identity linking was reported disabled; verify/enable it before resuming the email-signup-to-Discord-link flow. Confirm the local/production redirect allowlist and SMTP delivery, then test recovery and both sign-in methods. A Discord OAuth login that is not linked to the existing Auth user may create a separate Auth user; do not assume it merges accounts.
- Plan B (Cloudflare deployment) has not started. The app still uses Apache/PHP locally.

## Plan A: Move login to shared Supabase Auth

### 1. Identity and credential decisions

- Use the existing shared Supabase project and Auth service; do not create another password store. **Implemented.**
- Signup collects email, username, display name, and password in Supabase Auth. Password login accepts username or email; a private Supabase directory maps usernames to emails. **Implemented.**
- Keep existing `identities_player`, accounts, balances, and transactions unchanged. Do not add an Auth foreign key or create duplicate player identities. **Implemented as a read-only identity lookup.**
- Signup verifies the OAuth-verified Discord ID against exactly one existing `identities_player` row (no manual Discord ID entry). The home page also offers direct Discord OAuth sign-in, resolved against that existing player identity. **Implemented; end-to-end verification remains.**

### 2. Implement Auth and identity resolution

- Use `@supabase/supabase-js` for password signup/sign-in, Discord OAuth/linking, session restore/refresh, sign-out, password changes, and password recovery. **Implemented.**
- Discord identity linking requests `identify`; direct Discord OAuth sign-in requests `identify email`. **Implemented.**
- Send Supabase access tokens to the PHP API. The server validates each token with Supabase Auth, reads the verified Discord ID, and performs a read-only lookup of the existing player identity. **Implemented.**
- Keep account/economy reads and mutations on the existing server-only `fab_*` RPC paths. Signup and login do not write to `identities_player`. **Implemented.**
- Do not use a local database for application data. Supabase Auth stores credentials, a private Supabase schema stores the username-to-email directory, and Supabase remains authoritative for player/economy data. **Implemented.**

### 3. Configure and verify

- [ ] Confirm Discord provider configuration, manual identity linking, Auth redirect allowlist, and Site URL in the Supabase dashboard. Manual linking was previously reported disabled.
- [ ] Confirm SMTP delivery and test email confirmation and password recovery using the configured project.
- [ ] Complete end-to-end tests for email/username login, Discord OAuth, signup linking with a Discord account that does / does not map to a player identity, logout, refresh, password update/reset, token expiry, and unauthorized player access.
- [x] Keep service-role credentials server-side; only the Supabase URL and publishable key are used by the browser.
- [x] Build the frontend, lint PHP auth/API handlers, and smoke-test local routes and sign-in UI. These do not replace the pending live Auth tests above.

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
- Cut over only after test-user identity-link checks and end-to-end checks pass. The obsolete local MariaDB container and volume were removed; do not expect or recreate them.
- Monitor Worker errors/CPU/request usage, Supabase Auth and database usage, email delivery, and failed RPCs after launch.

### Completion criteria

- The frontend and all required API routes work without Apache, PHP, or a production MariaDB dependency.
- Cloudflare deployment uses only public browser configuration and server-side secrets.
- Authenticated requests are resolved to the correct shared player identity, while existing Supabase accounts and ledger protections continue to work.
- Preview and production builds, nested-route refreshes, authentication redirects, and critical account/transfer flows pass.

## Suggested order

1. Finish Supabase dashboard setup and end-to-end verification for the implemented local Auth flows.
2. Inventory the API contract and port PHP endpoints to TypeScript Functions/Workers.
3. Deploy a Cloudflare preview and verify Auth plus all account/ledger behaviors.
4. Configure production callbacks and cut over only after each test account's identity link and critical flows pass.
