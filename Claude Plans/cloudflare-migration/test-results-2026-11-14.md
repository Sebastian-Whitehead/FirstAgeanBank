# Step 15 test results, 2026-11-14

Preview: https://first-aegean-bank.federation-aegean.workers.dev

| ID | Result | Notes |
|----|--------|-------|
| A | pass | `npm test`: 15 files, 217 tests (added `cross-cutting.test.ts`: 401 + zero fetches, <=3 fetches, token-derived Steam ID, no key/token/stack in body). `npx tsc -p worker`: 0 errors. `npm run cf:build`: ok. |
| B1 | pass | Docker and Worker bodies identical (200, same player and accounts) |
| B2 | pass | 401 `loggedout` on both (PHP needs `Accept: application/json`, otherwise it redirects with 302) |
| B3 | pass | 401 `loggedout` on both |
| B4 | pass | 401 `invalidcredentials` on both |
| B5 | pass | 400 `invalidrequest` (Docker; Worker checked earlier) |
| B6-B9 | pass | 422 `invalidaccountname`, `invalidaccountaction`, `limitreached`, `invalidamount` on both. Only difference: PHP escapes slashes in the redirect string; same JSON value. |
| C1-C25 | not run | need a browser and test users |
| C26 | partial | no `service_role` in `dist/`; key-prefix grep and `git grep` not run (key not available to the agent) |
| C27 | partial | `Bearer abc` gives 401; token from another project not tried |
| C28 | pass | no `Access-Control-*` header on `/api/state` |
| C28b | pass | `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy` present on `/` |
| C29, C30, C30b | not run | dashboard |
| C31, C32 | not run | Docker fallback |
| Step 14 | pass | `/`, `/accounts/` 200; `/api/state` 401; unauthenticated POSTs 401; unknown `/api/*` 404; `secret list` shows `SUPABASE_SERVICE_ROLE_KEY` |
| Step 14 manual | not confirmed | Supabase Redirect URL for the workers.dev domain; Workers Metrics static-request check |
| C11-C16 | pass | Worker, real Supabase, `parz1val`: create, duplicate (`accountnametaken`), rename, delete Main (`mainaccountprotected`), delete zero-balance account, archived name reuse, delete funded account (`accountbalancenotzero`). Test accounts deleted afterwards. |
| C17 | pass | 0.01 Main to Savings: balances moved by exactly 0.01 |
| C18-C21 | pass | `insufficientfunds`, `recipientnotfound`, `limitreached` (5000.01), `invalidamount` (0), `accountarchived`. Identical to Docker where compared. Idempotency keys must be UUIDs on both stacks. |
| C22 | pass | same request and key sent twice: 0.25 moved once |
| C24 | partial | another player's account number gives `accountnotfound`; only a nonexistent number was tried, not a second real player |
| C25 | partial | foreign source gives `transferfailed` on both stacks; no second real player's balance checked |
| Funds restored | done | Main 1.00, Savings 1.00 (starting balances) |
| C1, C4, C7, C8 | pass (user, production URL) | Email sign-in, Discord sign-in, sign out and page refreshes all worked, reported by the user after the Supabase Site URL and Redirect URLs were set (step 16). Not independently observed by the agent. |
| Step 16 | done | Docs updated, `workers.dev` URL is production, no custom domain yet. |
