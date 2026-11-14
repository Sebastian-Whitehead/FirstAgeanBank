# Step 06: Worker entry and router

## Goal
Replace the placeholder `worker/src/index.ts` with a tiny router for `/api/*`. Endpoint handlers are added in steps 07–12. Each step adds a single line to the route table.

## File: `worker/src/index.ts`

```ts
import type { Env } from './env';
import { errorResponse } from './http';

type Handler = (request: Request, env: Env) => Promise<Response>;

// Steps 07-12 add entries here, e.g. '/api/state': handleState
const routes: Record<string, Handler> = {};

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    const handler = routes[pathname.replace(/\/+$/, '')]; // tolerate one trailing slash
    if (!handler) {
      if (pathname.startsWith('/api/')) return errorResponse(404, 'notfound', 'Not found.');
      return env.ASSETS.fetch(request); // safety net; run_worker_first only sends /api/* here
    }
    try {
      return await handler(request, env);
    } catch (error) {
      console.error('Unhandled API error', error instanceof Error ? error.message : 'unknown');
      return errorResponse(500, 'servererror', 'The request could not be completed.');
    }
  }
} satisfies ExportedHandler<Env>;
```

Rules:
- Method checks happen **inside** each handler (to match the PHP 405 bodies), not in the router.
- Don't add CORS headers. The app is same-origin.
- Note: `servererror` isn't in `frontend/src/lib/errors.js`. That's fine, because `requestJson` throws on 5xx and shows `message`.

## Tests to write: `worker/test/router.test.ts`
- `/api/unknown` → 404 `{error:'notfound'}`.
- `/api/` → 404.
- A non-API path such as `/accounts/` is passed to `env.ASSETS.fetch` (use a stub that returns `new Response('asset')`).
- Register a temporary test route (export `routes` for tests, or make a `createRouter(routes)` factory, whichever is simpler):
  - `/api/test` and `/api/test/` both reach the handler
  - a handler that throws gives 500 `servererror`, and the thrown message isn't in the response body
- The query string doesn't affect matching (`/api/test?x=1`).

## Acceptance checks
- `npm test` passes. `npx tsc -p worker` is clean.
- `npm run cf:dev`: `curl -i localhost:8787/api/nope` → 404 JSON, and `/accounts/` still serves HTML.
