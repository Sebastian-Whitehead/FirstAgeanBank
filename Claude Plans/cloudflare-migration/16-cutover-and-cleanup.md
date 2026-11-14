# Step 16: Production cutover and docs update (PHP/Docker kept as fallback)

User decision (2026-11-13): **keep** the PHP backend and the Docker setup as a working local fallback. This step doesn't delete `api/`, `includes/`, `.htaccess`, `Dockerfile`, `docker-compose.yml` or `docker/`.

## Prerequisites
- Step 15 has a results file with every A/B/C item marked pass, or "not run" with a reason the user has accepted.

## Cutover
1. **Domain (optional, only once the user confirms one).** The user hasn't picked a domain yet. Without one, production is the `*.workers.dev` URL from step 14. If a domain is confirmed and its DNS is on Cloudflare, go to the Cloudflare dashboard → Workers → first-aegean-bank → Settings → Domains & Routes → add the custom domain. Then add `https://<domain>/**` to the Supabase Redirect URLs.
2. Supabase → Authentication → URL Configuration:
   - Site URL → the production URL (the custom domain if one was added, otherwise the `workers.dev` URL)
   - Redirect URLs: keep the production URL(s), `http://localhost:8787/**`, **and** `http://localhost:8080/**`, which is needed for the Docker fallback
3. Run C1, C2, C4, C7, C8 and C17 from step 15 against the production URL.

## Keeping the fallback working
- The step 13 `.htaccess` rewrites stay, so the Docker app works with the current frontend paths.
- `Dockerfile` already builds the frontend itself, so no change is needed.
- Accept that endpoint logic now exists twice (PHP and TypeScript). Any later endpoint change must either be made in both places or marked in `worker/` as "Worker only; PHP fallback is stale". Add this rule to `AGENTS.md`.
- Step 15 items C31 and C32 cover the fallback. Re-run them after any change to the frontend API paths.

## Docs to update
- `AGENTS.md`:
  - Project overview: production runs as a TypeScript Cloudflare Worker (`worker/`) serving the React build. PHP + Docker remain as a local fallback.
  - Key directories: add `worker/src/` and `worker/test/`. Mark `includes/` and `api/` as the fallback backend.
  - Build and validation: add `npm test`, `npx tsc -p worker`, `npm run cf:dev` and `npm run cf:deploy`. Keep the Docker sections.
  - The duplicate-logic rule from the section above.
- `CLAUDE.md`: in the environment section, note that the primary local server is `wrangler dev` on `:8787` and Docker on `:8080` is the fallback. Update the "no automated tests" line to `npm test`. Add `worker/src/auth.ts` alongside `includes/auth.inc.php` in the auth flow pointers.
- `README.md`: add the Cloudflare run/deploy instructions, and keep the Docker instructions marked as the fallback.
- `Claude Plans/plan.md`: mark the Plan B steps done, with dates.
- `TODO.md`: add "Decide on a custom domain for the Cloudflare deployment" (if still open) and "Consider a Cloudflare rate-limit rule for `/api/username-login` (currently relies on Supabase Auth limits)".

## Tests
- `grep -rn "\.php" frontend/src worker/` → nothing.
- `npm test`, `npx tsc -p worker` and `npm run cf:build` pass.
- `npm run cf:deploy`, then re-run C1, C8, C17 and C24 on production.
- Fallback: `docker compose up --build -d`. Sign in at `http://localhost:8080`, and confirm `/api/state` returns 200 and the accounts page loads.

## Rollback
- Worker: `npx wrangler rollback` to the previous version (Cloudflare keeps previous Worker versions).
- Full fallback: run the Docker app locally (`docker compose up --build -d`). It's still intact and uses the same Supabase data.
