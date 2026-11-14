import { vi } from 'vitest';
import type { Env } from '../src/env';

export const testEnv: Env = {
  ASSETS: { fetch: async () => new Response('asset') } as unknown as Fetcher,
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'pub-key',
  SUPABASE_SERVICE_ROLE_KEY: 'service-key'
};

export type Route = { status?: number; body?: unknown; raw?: string; throws?: boolean };

// Stubs global fetch; key is the URL pathname. Unknown paths throw (failing the test).
// Call vi.unstubAllGlobals() in afterEach.
export function mockSupabase(routes: Record<string, Route | ((req: Request) => Route)>): { calls: Request[] } {
  const calls: Request[] = [];
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = new Request(input, init);
    calls.push(req);
    const entry = routes[new URL(req.url).pathname];
    if (!entry) throw new Error(`Unmocked fetch: ${req.method} ${req.url}`);
    const route = typeof entry === 'function' ? entry(req) : entry;
    if (route.throws) throw new TypeError('network down');
    const status = route.status ?? 200;
    const text = route.raw ?? (route.body === undefined ? '' : JSON.stringify(route.body));
    // 204/205 responses must not carry a body.
    return new Response(status === 204 || status === 205 ? null : text, { status });
  });
  return { calls };
}
