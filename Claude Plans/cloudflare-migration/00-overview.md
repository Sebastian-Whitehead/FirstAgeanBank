# Cloudflare migration: overview and index

Goal: replace the Apache + PHP backend with a single TypeScript Cloudflare Worker that serves the built React app as static assets and handles `/api/*`. The app must run on the Cloudflare **Workers Free** plan. Supabase stays the source of truth for auth, identity, and economy data. Nothing about the data model changes.

Read `AGENTS.md` and `CLAUDE.md` first. Each step file below is self-contained and sized for one focused session. Do the steps in order. Don't start a step until the previous step's acceptance checks pass.

## Why PHP has to go

Cloudflare Workers run JavaScript/TypeScript natively, Python and Rust as first-class languages, and other languages only via WebAssembly or compile-to-JS. There is no PHP runtime, and Cloudflare Pages has none either. The PHP files in `api/` and `includes/` can't be deployed as-is.

## Workers Free plan restrictions that shape this design

| Limit (Free) | Value | Effect on this app |
|---|---|---|
| Requests to the Worker | 100,000 / day (resets 00:00 UTC) | Fine for an RP app. Static asset requests don't count (see below). |
| Burst rate | 1,000 requests / minute | Fine. |
| CPU time per request | 10 ms (time spent waiting on `fetch` doesn't count) | Handlers only parse small JSON and call Supabase. Don't bundle heavy libraries or do crypto/JWT verification loops in the Worker. |
| Subrequests (outbound `fetch`) per request | 50 | The worst case is 3 (auth user + identity lookup + one RPC). |
| Static asset requests | Free and unlimited when they don't invoke the Worker | Use `run_worker_first: ["/api/*"]` so only API calls invoke the Worker. |
| Worker script size | 3 MB compressed (verify) | Tiny. Don't add `@supabase/supabase-js` to the Worker; raw `fetch` is enough. |
| Static assets | max 25 MiB per file, 20,000 files (verify) | Only upload what the app uses (see step 01). Don't upload `assets/mp4`, zips, etc. |
| Memory | 128 MB (verify) | Fine. |
| Runtime APIs | Web-standard APIs only (`fetch`, `Request`, `Response`, `FormData`, `crypto`); no filesystem, no PHP sessions, no `node:*` unless `nodejs_compat` is enabled | All server state comes from Supabase. Secrets come from Worker env bindings. |

The rows marked "verify" come from memory. Check them on the official limits page before the deploy step. Sources: [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [Pages Functions routing / static requests](https://developers.cloudflare.com/pages/functions/routing/), [Workers languages](https://developers.cloudflare.com/workers/languages/).

## Target architecture

- **One Worker with Static Assets.** We use this rather than Pages + Functions. It's Cloudflare's current recommended path, it gives one deploy and one config file, and it has the same free static-asset behaviour.
- `wrangler.jsonc` at the repo root:
  - `assets.directory: "./dist"`
  - `assets.not_found_handling: "single-page-application"`, which replaces the `.htaccess` SPA rewrites
  - `assets.run_worker_first: ["/api/*"]`
  - `main: "worker/src/index.ts"`
- Worker code lives in `worker/src/`, and its tests live in `worker/test/`.
- Supabase is called with raw `fetch`, mirroring `includes/supabase.inc.php`. The service-role key is a Worker **secret** and is never sent to the browser.
- The frontend keeps using `requestJson` / `submitForm` from `frontend/src/lib/api.js`. Only the URLs change (step 13).

## Endpoint map (PHP → Worker)

| Old path (PHP) | New path (Worker) | Method | Auth | Step |
|---|---|---|---|---|
| `/api/state.php` | `/api/state` | GET | Bearer | 07 |
| `/api/username-link.php` | `/api/username-link` | POST | Bearer | 08 |
| `/api/username-login.php` | `/api/username-login` | POST (JSON body) | none | 09 |
| `/includes/create-account.inc.php` | `/api/accounts/create` | POST (form) | Bearer | 10 |
| `/includes/account-action.inc.php` | `/api/accounts/action` | POST (form) | Bearer | 11 |
| `/includes/transfer.inc.php` | `/api/transfer` | POST (form) | Bearer | 12 |
| `login.inc.php`, `logout.inc.php`, `update.inc.php`, `signup.inc.php` (410 stubs) | dropped | – | – | – |

**Response contracts stay byte-for-byte compatible** with the PHP JSON responses (same status codes, same `error` codes, same field names). The error codes are mapped to messages in `frontend/src/lib/errors.js`, and that file must not need changes.

## Conventions every step follows

- TypeScript, ES modules, no `any` in exported signatures.
- The env type lives in `worker/src/env.ts`:
  ```ts
  export interface Env {
    ASSETS: Fetcher;
    SUPABASE_URL: string;
    SUPABASE_PUBLISHABLE_KEY: string;
    SUPABASE_SERVICE_ROLE_KEY: string; // secret
  }
  ```
- Handlers have the signature `(request: Request, env: Env) => Promise<Response>`.
- Log with `console.error(...)`. Never log access tokens, passwords, or the service key.
- Tests use **Vitest** in the Node environment (Node 22 has `fetch`, `Request`, `Response` and `FormData`). Supabase is faked by stubbing global `fetch` with the helper from step 03. Tests never call the real Supabase.
- Each step has **Tests to write** (unit tests created during the step) and **Acceptance checks** (run once the step is implemented). Step 15 is the complete post-implementation test suite.

## Steps

| # | File | Summary |
|---|---|---|
| 01 | [01-scaffold-worker.md](01-scaffold-worker.md) | Tooling, wrangler config, asset staging, test runner |
| 02 | [02-http-helpers.md](02-http-helpers.md) | JSON responses, PHP-compatible trim, form/JSON body readers |
| 03 | [03-supabase-client.md](03-supabase-client.md) | `supabaseRpc`, `supabaseAuthUser`, identity lookup, fetch mock helper |
| 04 | [04-supabase-auth-helpers.md](04-supabase-auth-helpers.md) | Username directory RPCs and password sign-in |
| 05 | [05-authenticated-player.md](05-authenticated-player.md) | Port `currentAuthenticatedPlayer` / `requireAuthenticatedPlayer` |
| 06 | [06-router.md](06-router.md) | Worker entry and `/api/*` routing |
| 07 | [07-endpoint-state.md](07-endpoint-state.md) | `GET /api/state` |
| 08 | [08-endpoint-username-link.md](08-endpoint-username-link.md) | `POST /api/username-link` |
| 09 | [09-endpoint-username-login.md](09-endpoint-username-login.md) | `POST /api/username-login` |
| 10 | [10-endpoint-create-account.md](10-endpoint-create-account.md) | `POST /api/accounts/create` |
| 11 | [11-endpoint-account-action.md](11-endpoint-account-action.md) | `POST /api/accounts/action` |
| 12 | [12-endpoint-transfer.md](12-endpoint-transfer.md) | `POST /api/transfer` |
| 13 | [13-frontend-switch.md](13-frontend-switch.md) | Point the React app at the new paths |

Remaining: 
| 14 | [14-deploy-preview.md](14-deploy-preview.md) | Secrets, Supabase redirect URLs, first deploy |
| 15 | [15-full-test-suite.md](15-full-test-suite.md) | Complete post-implementation test suite (automated + live) |
| 16 | [16-cutover-and-cleanup.md](16-cutover-and-cleanup.md) | Production cutover, docs update; PHP/Docker kept as fallback |

## Don't change

- `supabase/migrations/`, `docker/migrations/`, and the `fab_*` RPCs. The Worker calls the same RPCs with the same parameters.
- Identity/economy data. Signup and login stay read-only on `identities_player`.
- `frontend/src/lib/errors.js` codes.

## Decisions (user, 2026-11-13)

1. **Domain:** undecided. A domain may be available, but that isn't confirmed. Deploy to `*.workers.dev` first (step 14). Attaching a custom domain is an optional part of step 16, to be done once the user confirms one.
2. **After cutover:** **keep** the PHP files, `Dockerfile`, `docker-compose.yml` and `.htaccess` (with the step 13 rewrites) as a working local fallback. Step 16 doesn't delete them.
3. **Dev dependencies:** approved. Add whatever the steps need (`wrangler`, `vitest`, `typescript`, `@cloudflare/workers-types`).
4. **Rate limiting:** rely on Supabase Auth's own rate limits for now. Don't add a Cloudflare rule. Recorded as a TODO for later.
