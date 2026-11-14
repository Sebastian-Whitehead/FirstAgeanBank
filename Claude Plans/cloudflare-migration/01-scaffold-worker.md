# Step 01: Scaffold the Worker, asset staging, and test runner

## Goal
Add the tooling so that `npm run cf:build` produces a `dist/` folder Cloudflare can serve, `npm run cf:dev` runs it locally, and `npm test` runs Vitest. There's no API logic yet. Don't touch the PHP or Docker files.

## Files to add or change
1. `package.json` (devDependencies and scripts)
   - devDependencies: `wrangler`, `vitest`, `typescript`, `@cloudflare/workers-types`. Pin exact current versions with `npm install -D`.
   - scripts (keep the existing `build`):
     ```json
     "cf:build": "npm run build && node scripts/stage-cf-assets.mjs",
     "cf:dev": "npm run cf:build && wrangler dev",
     "cf:deploy": "npm run cf:build && wrangler deploy",
     "test": "vitest run"
     ```
2. `scripts/stage-cf-assets.mjs`: a Node script using only `node:fs`. It must:
   - delete `dist/` if it exists, then create it
   - copy `assets/react/` → `dist/assets/react/` (recursive)
   - copy `assets/react/index.html` → `dist/index.html`
   - copy `assets/png/` → `dist/assets/png/` (the frontend references `/assets/png/first-aegean-bank.png`)
   - exit non-zero with a clear message if `assets/react/index.html` is missing ("run npm run build first")
   - copy `cloudflare/_headers` → `dist/_headers` (see item 10)
   - Do **not** copy `assets/mp4`, `assets/users`, zips, or anything else. Before finishing the step, grep `frontend/` for other `/assets/` paths and add any that are referenced.
   - Use `fs.cpSync(src, dst, { recursive: true })`.
3. `wrangler.jsonc` at the repo root:
   ```jsonc
   {
     "name": "first-aegean-bank",
     "main": "worker/src/index.ts",
     "compatibility_date": "<today's date, YYYY-MM-DD>",
     "assets": {
       "directory": "./dist",
       "binding": "ASSETS",
       "not_found_handling": "single-page-application",
       "run_worker_first": ["/api/*"]
     },
     "observability": { "enabled": true },
     "vars": {
       "SUPABASE_URL": "",
       "SUPABASE_PUBLISHABLE_KEY": ""
     }
   }
   ```
   `SUPABASE_SERVICE_ROLE_KEY` is not in this file. It's a secret, set in step 14.
   `observability` turns on Workers Logs, so `console.error` output is kept and searchable in the dashboard rather than only visible live through `wrangler tail`. Check the Free-plan log allowance on the official docs and note it in `00-overview.md`.
4. `worker/src/env.ts`: the `Env` interface from the overview.
5. `worker/src/index.ts`: a placeholder that step 06 replaces:
   ```ts
   import type { Env } from './env';
   export default {
     async fetch(request: Request, env: Env): Promise<Response> {
       return Response.json({ error: 'notfound', message: 'Not found.' }, { status: 404 });
     }
   } satisfies ExportedHandler<Env>;
   ```
6. `worker/tsconfig.json`: `"types": ["@cloudflare/workers-types"]`, `"module": "ESNext"`, `"moduleResolution": "Bundler"`, `"strict": true`, `"noEmit": true`, include `src` and `test`.
7. `vitest.config.ts` at the root: `test: { include: ['worker/test/**/*.test.ts'], environment: 'node' }`.
8. `.dev.vars.example`: `SUPABASE_URL=`, `SUPABASE_PUBLISHABLE_KEY=`, `SUPABASE_SERVICE_ROLE_KEY=` (no values).
9. `.gitignore`: add `/dist/`, `.dev.vars`, and `.wrangler/`.
10. `cloudflare/_headers`: security headers for static asset responses. Cloudflare reads `_headers` from the assets directory and doesn't serve the file itself.
    ```
    /*
      X-Content-Type-Options: nosniff
      X-Frame-Options: DENY
      Referrer-Policy: strict-origin-when-cross-origin
    ```
    - Don't add a `Content-Security-Policy` yet. The TradingView widget and Supabase need allowlisting, and a wrong CSP breaks the app. That's a separate, later task.
    - `_headers` applies **only** to static asset responses, not to Worker (`/api/*`) responses. The API returns JSON with an explicit content type, so that's acceptable.

### Local env
- `wrangler dev` reads Worker env from `.dev.vars` (copy the example and fill it in from the existing `.env`).
- The frontend still needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` at **build** time. Vite's root is `frontend/`, so put them in `frontend/.env.local` (already ignored by `.env.*`), or export them in the shell.

## Tests to write
`worker/test/scaffold.test.ts`:
- Importing `worker/src/index.ts` and calling `fetch(new Request('http://x/api/anything'), env)` returns 404 JSON `{ error: 'notfound' }`.

## Acceptance checks
1. `npm test` passes.
2. `npm run cf:build` succeeds, and `dist/index.html`, `dist/assets/react/assets/*.js` and `dist/assets/png/first-aegean-bank.png` exist.
3. `npx tsc -p worker` reports no errors.
4. `npm run cf:dev`, then:
   - `curl -i http://localhost:8787/` returns 200 with HTML
   - `curl -i http://localhost:8787/accounts/` returns 200 with the same HTML (SPA fallback)
   - `curl -i http://localhost:8787/assets/png/first-aegean-bank.png` returns 200 `image/png`
   - `curl -i http://localhost:8787/api/state` returns 404 JSON from the Worker
   - `curl -I http://localhost:8787/` includes `X-Frame-Options: DENY` and `X-Content-Type-Options: nosniff`
   - `curl -i http://localhost:8787/_headers` doesn't return the file's contents (it returns the SPA HTML or a 404)
5. `git status` doesn't show `dist/`, `.dev.vars` or `.wrangler/`.
6. Docker still works: `docker compose up --build -d`, and `http://localhost:8080/` returns 200.
