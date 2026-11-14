# Step 14: Configure Cloudflare and deploy a preview

Most of this step needs the user's Cloudflare and Supabase dashboards. Agents should prepare the commands and checklists and let the user run the account-level actions. Never paste secrets into files that git tracks.

## Prerequisites
- Steps 01–13 are done, and `npm test` passes.
- Decisions in `00-overview.md`: deploy to `workers.dev` (no custom domain yet), and add no rate-limit rule.

## Tasks
1. **Login:** the user runs `npx wrangler login` (it opens a browser).
2. **Public vars:** set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in `wrangler.jsonc` `vars`. These values are public, and the frontend bundle already contains them.
3. **Secret:** the user runs `npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY` and pastes the key at the prompt. Don't put it in `wrangler.jsonc`, `.dev.vars.example`, or any `VITE_*` variable.
4. **Frontend build env:** `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` must be set when `npm run cf:build` runs (in `frontend/.env.local` or the shell). If Workers Builds (git-connected CI) is used later, set them as build variables in the dashboard.
5. **Deploy:** `npm run cf:deploy`. Note the `https://first-aegean-bank.<subdomain>.workers.dev` URL.
6. **Supabase Auth URL config** (dashboard → Authentication → URL Configuration):
   - add `https://first-aegean-bank.<subdomain>.workers.dev/**` to Redirect URLs
   - leave Site URL alone until cutover (step 16)
   - Discord provider: no change. The Discord app's redirect URI points at Supabase, not at this app.
7. **Free-plan guardrails:**
   - Confirm on the official limits page that the "verify" rows in `00-overview.md` are still current.
   - Confirm static requests don't invoke the Worker: load `/` and `/assets/...`, then check Workers → Metrics. The request count should only rise for `/api/*` calls.
8. **Rate limiting:** skipped by the user's decision. Supabase Auth's own limits apply. Don't add a rule.

## Tests to write
None (configuration step).

## Acceptance checks
1. `curl -i https://<preview>/` → 200 HTML. `curl -i https://<preview>/accounts/` → 200 HTML.
2. `curl -i https://<preview>/api/state` → 401 `{"error":"loggedout",...}`. This proves the Worker runs and is reading the secrets path.
3. The secret isn't exposed: download the main JS bundle (`curl https://<preview>/assets/react/assets/index-*.js`) and grep it for the first 12 characters of the service-role key and for `service_role`. Both must be absent. Also run `git grep` for the key prefix and expect no matches.
4. `npx wrangler secret list` shows `SUPABASE_SERVICE_ROLE_KEY`.
5. Then run the full live suite in step 15 against the preview URL.
