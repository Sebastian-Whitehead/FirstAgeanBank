# Step 15: Complete post-implementation test suite

Run this whole suite after steps 01–14, and again after any later change to `worker/`. It has three parts: the automated suite, a contract-parity diff against PHP, and live end-to-end checks on the preview deployment. Record each result (pass / fail / not run, with a reason) in a copy of the checklist at the bottom, saved as `Claude Plans/cloudflare-migration/test-results-<date>.md`.

## Part A: Automated (Vitest, no network)
`npm test` must pass, with these files present and covering what's listed in their steps:

| File | Covers |
|---|---|
| `scaffold.test.ts` | placeholder 404 (may be removed after step 06) |
| `http.test.ts` | response helpers, phpTrim, codePointLength, form readers |
| `supabase.test.ts` | rpc / auth user / identity lookup, config validation, error mapping, no secret logging |
| `supabase-auth-helpers.test.ts` | username lookup / register / password sign-in |
| `auth.test.ts` | every branch of `currentAuthenticatedPlayer`, status mapping |
| `router.test.ts` | routing, trailing slash, 404, 500, asset passthrough |
| `state.test.ts`, `username-link.test.ts`, `username-login.test.ts` | endpoint contracts |
| `validation.test.ts`, `create-account.test.ts`, `account-action.test.ts` | account name/number rules, error mapper |
| `money.test.ts`, `transfer.test.ts` | amount parsing table, transfer contract |

Also run:
- `npx tsc -p worker` with 0 errors
- `npm run cf:build`, which must succeed

Cross-cutting automated assertions (add them to the relevant files if they're missing):
- Every authenticated endpoint returns 401 with no `Authorization` header and makes **zero** fetch calls.
- Every endpoint that takes a Steam ID sends the **token-derived** Steam ID even when the body contains `steamId`, `p_steam_id` or `p_sender_steam_id`.
- No response body contains the service key, an access token (except `username-login`'s success body), or a stack trace.
- At most 3 outbound fetches per request (spy on the count). This guards the 50-subrequest limit and keeps latency low.

## Part B: Contract parity (local, PHP vs Worker)
Both stacks are running against the same Supabase project: Docker on `:8080` (with the step 13 rewrites) and `cf:dev` on `:8787`. Use a test user's access token, and diff the JSON (status and body) for each case:

| # | Request | Expect |
|---|---|---|
| B1 | `GET /api/state` (valid token) | identical body |
| B2 | `GET /api/state` (no token) | 401 `loggedout` on both |
| B3 | `GET /api/state` (garbage token `Bearer abc`) | 401 `loggedout` on both |
| B4 | `POST /api/username-login` with a wrong password | 401 `invalidcredentials` on both |
| B5 | `POST /api/username-login` with an invalid JSON body | 400 on both |
| B6 | `POST /api/accounts/create` with `accountName` = 41 characters | 422 `invalidaccountname` on both |
| B7 | `POST /api/accounts/action` with `action=freeze` | 422 `invalidaccountaction` on both |
| B8 | `POST /api/transfer` with `amount=5001` | 422 `limitreached` on both |
| B9 | `POST /api/transfer` with `amount=abc` | 422 `invalidamount` on both |

Don't run mutating happy paths in both stacks against the same data. Do those once, in Part C.

## Part C: Live end-to-end on the preview URL
Use the dedicated test users only. Note the starting balances first.

### Auth
- C1 Email + password sign-in → the accounts page loads with the correct name and balances.
- C2 Username + password sign-in → same.
- C3 Wrong password, and an unknown username → the same "username or password is incorrect" message.
- C4 "Continue with Discord" from the home page → signed in (or the expected `identitynotfound` message for a Discord user with no player).
- C5 Signup → Discord link → the account resolves. Requires manual identity linking to be enabled in Supabase. If it isn't, mark this "not run: dashboard setting".
- C6 Signup with a Discord account that has no player identity → the `identitynotfound` message. Known limitation: the pending signup stays stuck (TODO.md).
- C7 Sign out → `/api/state` returns 401, and the UI goes back to the home page.
- C8 Refresh on `/accounts/`, `/accounts/update/`, `/transfer/`, `/activities/` and `/investments/` while signed in → each page loads. An unknown path (`/nope/`) redirects to `/accounts/` (the `App.jsx` catch-all).
- C9 Token expiry: wait for, or force, an expired access token → the client refreshes it, or the user is sent to sign in. There's no 500 either way.
- C10 Password recovery email → the link opens `/reset-password/` on the preview domain, and the new password works. Needs SMTP configured; otherwise mark "not run".

### Accounts
- C11 Create an account named `CF Test` → it appears with balance 0.
- C12 Create a second `CF Test` → "name taken" message.
- C13 Rename `CF Test` to `CF Test 2` → the name updates.
- C14 Try to delete the main account → "main account protected" message.
- C15 Delete `CF Test 2` (balance 0) → it disappears. Recreating `CF Test 2` is allowed (archived-name reuse).
- C16 Try to delete an account with a non-zero balance → "balance not zero" message.

### Transfers
- C17 Transfer 0.01 between your own accounts → both balances change by exactly 0.01, and the activity shows it.
- C18 Transfer more than the balance → "insufficient funds".
- C19 Transfer to a non-existent account number → "recipient not found".
- C20 Transfer 5000.01 → "limit reached". Transfer 0 → "invalid amount".
- C21 Transfer to an archived account → "account archived".
- C22 Double-submit: replay the same transfer request twice with the same `idempotencyKey` (DevTools → "Copy as fetch", run it twice) → money moves only once.
- C23 Transfer to another test player's account → the recipient's balance increases. Check it while signed in as the recipient.

### Authorization and security
- C24 As user A, POST `/api/accounts/action` with user B's account number → `accountnotfound`. B's account is unchanged.
- C25 As user A, POST `/api/transfer` with user B's account as the **source** → it fails, and B's balance is unchanged.
- C26 The bundle secret scan from step 14 check 3 passes.
- C27 `GET /api/state` with a token from a different Supabase project, or a tampered token → 401.
- C28 The response headers on `/api/*` have no `Access-Control-Allow-Origin` (same-origin only).
- C28b `curl -I https://<preview>/` includes `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` and `Referrer-Policy`.

### Platform
- C29 Workers → Metrics after the run: the request count is roughly the number of API calls made, not all page loads (static assets are free).
- C30 There are no CPU-limit errors (Error 1102) in the Worker logs (dashboard → Workers Logs, or `npx wrangler tail` during the run).
- C30b Workers Logs in the dashboard show the `console.error` lines from the failing cases above (C18–C21), and none of them contain tokens, passwords or the service key.

### Docker fallback (kept by user decision)
- C31 `docker compose up --build -d`, sign in at `http://localhost:8080` → `/api/state` returns 200 through the `.htaccess` rewrite, and the accounts page loads.
- C32 On Docker, create and then delete an account (balance 0) → both succeed via `/api/accounts/create` and `/api/accounts/action`.

## Results checklist template
```
| ID | Result | Notes |
|----|--------|-------|
| A  |        | npm test / tsc / cf:build |
| B1 |        | |
...
| C30|        | |
```
