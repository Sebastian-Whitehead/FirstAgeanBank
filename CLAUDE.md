@AGENTS.md

# Claude notes

Read `AGENTS.md` (imported above) first. It is the source of truth for project rules. These are extra working notes.

## Environment
- Windows host; the Bash tool is Git Bash, and PowerShell is also available. The app runs in Docker at `http://localhost:8080`.
- Build: `npm run build` from the repo root (runs `vite build --config frontend/vite.config.js frontend`). There are no automated tests and no linter/type-check step. Vite strips TypeScript in `frontend/src/lib/*.ts` without type-checking, so review TS changes by reading/grepping.
- PHP syntax check (if PHP is available, or inside the container): `php -l <file>`.
- Never run `docker compose down -v`.

## Reference snapshots
- `schema/`: Markdown dump of the live Supabase DB, one file per schema (`auth.md`, `public.md`, `economy.md`, `military.md`). Check here for table/column names before writing SQL, RPCs, or migrations. It's a snapshot; `supabase/migrations/` is the change history.
- `graphify-out/`: graphify knowledge graph of the codebase. Start with `GRAPH_REPORT.md` (communities, core nodes); `graph.json` is the full graph. Use `/graphify` to query or rebuild it. It can be stale after big changes.

## Plan files
- `plan.md`: Supabase Auth + Cloudflare migration plan and its status. Update its status lines when a change affects what it describes.
- `discord-id-removal-plan.md`: plan to remove the manual Discord ID field from signup.
- `TODO.md`: longer-term backlog.

## Auth / identity flow (where to look)
- Frontend auth logic: `frontend/src/lib/auth.ts` (Supabase password signup/login, Discord OAuth sign-in, `linkIdentity` during signup, pending-signup state in `localStorage['fab.pendingSignup']`). `frontend/src/lib/supabaseClient.ts` creates the browser client with the publishable key only.
- Signup UI: `frontend/src/pages/SignupPage.jsx`. Login UI and "Continue with Discord": `frontend/src/pages/HomePage.jsx`.
- Server: `includes/auth.inc.php` validates the Supabase access token, reads the Discord ID from the token user's **verified** `discord` identity, and resolves exactly one `identities_player` row via `supabaseFindPlayersByDiscordId` (`includes/supabase.inc.php`). Never trust a Discord/Steam/player ID sent from the browser.
- `api/state.php` returns the session/player state. `api/username-link.php` and `api/username-login.php` manage the private username→email directory.
- Error codes from PHP map to user messages in `frontend/src/lib/errors.js`.
- Legacy PHP form handlers (for example `includes/signup.inc.php`) are stubs that return 410. Don't revive them.

## Style
- Make small, surgical edits that match the surrounding code. Don't do unrelated cleanup or reformatting.
- Keep README.md and plan.md accurate when behavior they describe changes.
