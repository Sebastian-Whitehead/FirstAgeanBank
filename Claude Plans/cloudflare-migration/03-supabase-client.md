# Step 03: Supabase client (RPC, auth user, identity lookup) and the fetch mock

## Goal
Port `supabaseRpc`, `supabaseAuthUser` and `supabaseFindPlayersByDiscordId` from `includes/supabase.inc.php` to TypeScript, with the same validation and error behaviour. Also add the shared test helper that fakes Supabase.

## File: `worker/src/supabase.ts`

```ts
export class SupabaseRequestError extends Error {
  constructor(message: string, public supabaseCode = '', public supabaseMessage = '') { super(message); }
}

function baseUrl(env: Env): string
// rtrim '/' from env.SUPABASE_URL. Throw SupabaseRequestError('Supabase is not configured.') unless:
// the URL parses with new URL(), protocol is https:, OR protocol is http: AND hostname is 'localhost' or '127.0.0.1'.

export async function supabaseRpc(env: Env, fn: string, params: Record<string, unknown>): Promise<unknown | null>
export async function supabaseAuthUser(env: Env, accessToken: string): Promise<AuthUser | null>
export async function supabaseFindPlayersByDiscordId(env: Env, discordId: string): Promise<PlayerRow[]>
```

### `supabaseRpc`: behaviour (match the PHP)
- Throw a plain `Error` if `fn` doesn't match `/^[a-z][a-z0-9_]*$/`.
- Throw `SupabaseRequestError('Supabase is not configured.')` if the service key is empty or the URL is invalid.
- `POST {base}/rest/v1/rpc/{fn}` with headers `apikey: <service key>`, `Authorization: Bearer <service key>`, `Content-Type: application/json`, `Accept: application/json`, and body `JSON.stringify(params)`.
- Timeout: `signal: AbortSignal.timeout(12000)`. A network error or timeout throws `SupabaseRequestError('Supabase is unavailable.')`. Log with `console.error`.
- An empty body is `null`. A non-empty body that isn't JSON throws `'Supabase returned an invalid response.'`.
- A status outside 2xx throws `SupabaseRequestError('Supabase request failed.', body.code ?? '', body.message ?? 'request error')`. Log the function name, status and code.
- A 2xx response returns `null` for an empty body, otherwise the parsed value. If the parsed value isn't an object or array, throw `'Supabase returned an unexpected response.'`.

### `supabaseAuthUser`
- Requires `SUPABASE_PUBLISHABLE_KEY` and a valid URL (same rule), otherwise throws `'Supabase Auth is not configured.'`.
- `GET {base}/auth/v1/user` with headers `apikey: <publishable key>`, `Authorization: Bearer <accessToken>`, `Accept: application/json`, and the 12 s timeout.
- 401 or 403 returns `null`. Any other non-2xx, a network error, invalid JSON, or a missing string `id` throws `SupabaseRequestError`.
- `AuthUser` is a loose type: `{ id: string; email?: unknown; user_metadata?: Record<string, unknown>; identities?: unknown }`.

### `supabaseFindPlayersByDiscordId`
- Service key required.
- `GET {base}/rest/v1/identities_player?discord_id=eq.<id>&select=alias,steam_id::text,discord_id::text&limit=2`. Build the query with `URLSearchParams`.
  - **The `::text` casts are required.** `steam_id` and `discord_id` are `int8` (see `schema/public.md`), and SteamID64/Discord IDs exceed 2^53. Without the cast, PostgREST returns JSON numbers and `JSON.parse` silently rounds them. That corrupts the Steam ID and breaks the Discord ID match. PHP didn't have this problem because it has 64-bit ints. The cast keeps the response keys as `steam_id` and `discord_id`.
- Non-2xx throws `'Supabase identity lookup failed.'`. Invalid JSON, or a body that isn't an array, throws.
- Returns `PlayerRow[]` where `PlayerRow = { alias?: unknown; steam_id?: unknown; discord_id?: unknown }`.

## File: `worker/test/helpers.ts` (shared by every later step)

```ts
export const testEnv: Env  // SUPABASE_URL 'https://test.supabase.co', keys 'pub-key' / 'service-key', ASSETS stub
export type Route = { status?: number; body?: unknown; raw?: string; throws?: boolean };
export function mockSupabase(routes: Record<string, Route | ((req: Request) => Route)>): { calls: Request[] }
// Stubs globalThis.fetch with vi.stubGlobal. The key is the pathname (e.g. '/auth/v1/user',
// '/rest/v1/identities_player', '/rest/v1/rpc/fab_transfer', '/auth/v1/token').
// An unknown path fails the test. Records every request in `calls`.
// Call vi.unstubAllGlobals() in afterEach.
```

## Tests to write: `worker/test/supabase.test.ts`
`supabaseRpc`:
- A bad function name (`'Fab'`, `'a-b'`, `''`) throws before any fetch.
- Empty `SUPABASE_URL`, an `ftp://` URL, `http://example.com` and an empty service key all throw "not configured".
- `http://localhost:54321` and `http://127.0.0.1` are accepted.
- It sends the correct URL, method, both auth headers using the **service** key, and a JSON body.
- 200 with `[{"a":1}]` returns the array, and 204 with an empty body returns `null`.
- 200 with the body `"text"` (a JSON string) throws "unexpected response".
- 400 with `{"code":"P0004","message":"insufficient"}` throws, and the error has `supabaseCode === 'P0004'` and `supabaseMessage === 'insufficient'`.
- 500 with a non-JSON body throws "invalid response".
- A fetch rejection (`throws: true`) throws "Supabase is unavailable."

`supabaseAuthUser`:
- It sends the **publishable** key as `apikey` and the user token as Bearer.
- 401 → `null`, 403 → `null`.
- 500 throws, 200 without `id` throws, and 200 with `{id:'u1'}` returns the object.

`supabaseFindPlayersByDiscordId`:
- The decoded query string (`url.searchParams.get(...)`) has `discord_id` = `eq.123`, `select` = `alias,steam_id::text,discord_id::text`, and `limit` = `2`.
- A row returned as `{"steam_id":"76561198000000001","discord_id":"123456789012345678"}` comes back with exactly those strings (no number conversion anywhere).
- 200 `[]` returns `[]`, 200 `{}` throws, and 500 throws.

Also check that no log line written with `console.error` contains the service key or the access token. Spy on `console.error`.

## Acceptance checks
- `npm test` passes. `npx tsc -p worker` is clean.
- The secrets check: `grep -rn "service-key" worker/src` finds nothing (it should only appear in tests).
