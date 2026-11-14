# Prompt for the implementing model

Copy everything below the line into a new session. Set `STEPS` on the first line to the range you want done in that session. Two or three steps per session works best. Run steps 14 and 16 with the user present, because they need dashboard access.

---

STEPS: 01–03

You're implementing part of a planned migration in this repository, from a PHP backend to a TypeScript Cloudflare Worker. The plan is already written and decided. Your job is to carry out the steps listed in `STEPS` above, exactly as written, verify each one, and report back. Don't redesign the plan.

## Read these first, in this order
1. `AGENTS.md`: project rules (a fictional fake-bank RP app; Supabase is the source of truth; never expose the service-role key; surgical changes only).
2. `CLAUDE.md`: environment notes (Windows host, Git Bash and PowerShell available, the Docker app on `http://localhost:8080`, and never run `docker compose down -v`).
3. `Claude Plans/cloudflare-migration/00-overview.md`: the architecture, the Free-plan limits, the endpoint map, the conventions every step follows, and the user's decisions. **Those decisions are final.**
4. The step file(s) for your `STEPS`, in `Claude Plans/cloudflare-migration/NN-*.md`. Each one says what to build, the exact rules, the tests to write, and the acceptance checks.
5. If you're working on step 15 or later, also read the earlier step files you need. Their test lists are referenced.

## Where to find the information you'll need
| You need | Look in |
|---|---|
| The exact behaviour to port (validation order, error codes, status codes) | The PHP originals: `includes/supabase.inc.php`, `includes/auth.inc.php`, `includes/http-response.inc.php`, `api/state.php`, `api/username-link.php`, `api/username-login.php`, `includes/create-account.inc.php`, `includes/account-action.inc.php`, `includes/transfer.inc.php`, `includes/external-db-sync.inc.php`. **The step file wins** where it deliberately differs (and says so). Otherwise match the PHP. |
| Table and column names and types | `schema/public.md` (`identities_player`; `steam_id` and `discord_id` are `int8`), `schema/economy.md` (accounts, transactions), `schema/auth.md` |
| RPC parameters and return shapes, and the error codes the RPCs raise | `supabase/migrations/*.sql` (search for `fab_`) |
| How the frontend calls the API and reads responses | `frontend/src/lib/api.js` (`requestJson`, `submitForm`), `frontend/src/lib/auth.ts`, `frontend/src/contexts/SessionContext.jsx`, `frontend/src/pages/AccountsPage.jsx`, `frontend/src/pages/TransferPage.jsx` |
| Error code → user message | `frontend/src/lib/errors.js`. It must not need changes. |
| Current routing and Apache config | `.htaccess`, `docker/apache-react.conf`, `Dockerfile`, `docker-compose.yml` |
| Cloudflare APIs and config keys | The official docs at developers.cloudflare.com (Workers, Static Assets, wrangler configuration). Check a config key there before using it, rather than guessing. |
| Background on the auth design | `Claude Plans/plan.md` |

## Rules
- Do only the steps in `STEPS`. Before starting a step, confirm that the previous step's acceptance checks pass (`npm test`, `npx tsc -p worker`). If they don't, stop and report rather than building on a broken base.
- Follow each step's spec literally: function names, file paths, error codes, check order. Where the spec says "match the PHP", read the PHP and match it.
- Security boundary: the player and Steam ID come **only** from the verified Supabase token → Discord identity → `identities_player` lookup. Never read a player, Steam or Discord ID from the request body, query or headers.
- Money: integer cents only. Never use `parseFloat` for amounts.
- Secrets: the service-role key is only ever read from the Worker env. Never put it in code, in `wrangler.jsonc`, in `VITE_*` variables, or in logs. Never log passwords or access tokens.
- Tests never call the real Supabase. Use the `mockSupabase` helper from step 03.
- Don't change: `supabase/migrations/`, `docker/migrations/`, the `fab_*` RPCs, identity/economy data, or `frontend/src/lib/errors.js`. Don't delete PHP or Docker files; the user is keeping them as a fallback.
- Keep the diff to what the step needs. No unrelated refactors, reformatting, or extra features.
- Don't commit or push unless the user asks. Never run `docker compose down -v`.
- If the spec is ambiguous, contradicts the PHP in a way the step doesn't call out, or needs a decision only the user can make, **stop and ask**. Don't guess. In particular, ask before any step needs Cloudflare or Supabase dashboard access, `wrangler login`, or secrets (step 13 item 5, steps 14 and 16).

## How to work on each step
1. Read the step file and the PHP/frontend files it references.
2. Write the code, then the tests listed under "Tests to write". Every listed test case should exist.
3. Run the step's acceptance checks: always `npm test` and `npx tsc -p worker`, plus whatever else the step lists. Run the commands; don't assume they'd pass.
4. If a check can't run here (for example, it needs real `.dev.vars` credentials or a browser), say so explicitly, and don't mark it passed.
5. Move to the next step in `STEPS` only once the current one is green.

## When you're done, report
For each step: the files added or changed, the test count, and the result of each acceptance check (pass / fail / not run, with the reason). Also report:
- any place you deliberately differed from the PHP, and why
- any spec ambiguity you resolved, and how
- anything the user needs to do (dashboard settings, secrets, credentials)
- the next step to run
