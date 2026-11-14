# Step 13: Point the React app at the Worker paths

## Goal
Change the six API URLs in the frontend. This is a path change only. Nothing else in the frontend changes, because the response shapes are identical.

## Edits
| File | Old | New |
|---|---|---|
| `frontend/src/contexts/SessionContext.jsx` | `/api/state.php` | `/api/state` |
| `frontend/src/lib/auth.ts` (2 places) | `/api/state.php` | `/api/state` |
| `frontend/src/lib/auth.ts` | `/api/username-login.php` | `/api/username-login` |
| `frontend/src/lib/auth.ts` | `/api/username-link.php` | `/api/username-link` |
| `frontend/src/pages/AccountsPage.jsx` | `/includes/create-account.inc.php` | `/api/accounts/create` |
| `frontend/src/pages/AccountsPage.jsx` | `/includes/account-action.inc.php` | `/api/accounts/action` |
| `frontend/src/pages/TransferPage.jsx` | `/includes/transfer.inc.php` | `/api/transfer` |

Verify the list first with `grep -rn "\.php" frontend/src`. After the edit, that grep must return nothing.

### Keep Docker working until cutover (step 16)
The Docker/Apache app would 404 on the new paths. Add Apache rewrites to `.htaccess` so the old stack keeps working with the new frontend until it's retired. Put them **above** the SPA rule:
```apache
RewriteRule ^api/state/?$ /api/state.php [L,QSA]
RewriteRule ^api/username-login/?$ /api/username-login.php [L,QSA]
RewriteRule ^api/username-link/?$ /api/username-link.php [L,QSA]
RewriteRule ^api/accounts/create/?$ /includes/create-account.inc.php [L,QSA]
RewriteRule ^api/accounts/action/?$ /includes/account-action.inc.php [L,QSA]
RewriteRule ^api/transfer/?$ /includes/transfer.inc.php [L,QSA]
```
Check that the `Authorization` header still reaches PHP through the rewrite (`docker/apache-react.conf` sets `HTTP_AUTHORIZATION`; `auth.inc.php` also reads `REDIRECT_HTTP_AUTHORIZATION`).

## Tests
There are no frontend unit tests in this repo. Validate manually.

## Acceptance checks
1. `grep -rn "\.php" frontend/src` → no results.
2. `npm run build` succeeds.
3. **Worker stack** (`npm run cf:dev`, at `http://localhost:8787`). In the browser, with DevTools open on the Network tab:
   - Sign in with username + password → `POST /api/username-login` 200, then `GET /api/state` 200, and the accounts page renders balances.
   - Sign in with email + password → `GET /api/state` 200.
   - Create an account, rename it, and delete it (balance 0) → each returns 200 and the list updates.
   - Transfer 0.01 between two of your own accounts → 200, and the balances change by exactly 0.01.
   - Refresh on `/accounts/` and `/transfer/` → the page loads (SPA fallback).
4. **Docker stack** (`docker compose up --build -d`, at `http://localhost:8080`): repeat the sign-in and the accounts page load, and confirm `/api/state` returns 200 through the rewrite.
5. Supabase Auth redirect allowlist: add `http://localhost:8787/**` so OAuth and password recovery work on the Worker dev server. Ask the user to do this in the dashboard if you don't have access.
