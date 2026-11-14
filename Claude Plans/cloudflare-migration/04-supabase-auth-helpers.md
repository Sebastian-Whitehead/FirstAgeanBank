# Step 04: Username directory and password sign-in helpers

## Goal
Port `supabaseGetAuthEmailForUsername`, `supabaseRegisterAuthUsername` and `supabasePasswordSignIn` from `includes/supabase.inc.php`. Add them to `worker/src/supabase.ts`.

## Functions

```ts
export async function getAuthEmailForUsername(env: Env, username: string): Promise<string | null>
```
- `supabaseRpc(env, 'fab_get_auth_email_for_username', { p_username: username })`
- The result must be an array of length 0 or 1, otherwise throw `SupabaseRequestError('Supabase returned an unexpected username lookup response.')`.
- `[]` returns `null`.
- `[row]`: `row.email` must be a string matching a basic email check (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`), otherwise throw. Return the email.

```ts
export async function registerAuthUsername(env: Env, username: string, email: string): Promise<boolean>
```
- `supabaseRpc(env, 'fab_register_auth_username', { p_username: username, p_email: email.toLowerCase() })`
- The result must be an array of exactly 1 row, and `row.success` must be a boolean, otherwise throw. Return `row.success`.

```ts
export async function passwordSignIn(env: Env, email: string, password: string):
  Promise<{ access_token: string; refresh_token: string } | null>
```
- Publishable key and a valid URL are required (same rule as `supabaseAuthUser`).
- `POST {base}/auth/v1/token?grant_type=password` with headers `apikey: <publishable>`, `Content-Type: application/json`, `Accept: application/json`, body `{ email, password }`, and the 12 s timeout.
- 400 or 401 returns `null` (wrong credentials).
- Any other non-2xx, a network error, invalid JSON, or a missing string `access_token`/`refresh_token` throws `SupabaseRequestError`.
- Return **only** `{ access_token, refresh_token }`, not the full session.
- Never log the password or the tokens.

## Tests to write: `worker/test/supabase-auth-helpers.test.ts`
`getAuthEmailForUsername`:
- It sends `p_username` to `/rest/v1/rpc/fab_get_auth_email_for_username`.
- `[]` → `null`, and `[{email:'a@b.co'}]` → `'a@b.co'`.
- Two rows throw, `[{email:'nope'}]` throws, `null` (empty 200 body) throws, and `{}` throws.

`registerAuthUsername`:
- The email is sent lowercased (`'A@B.CO'` → `'a@b.co'`).
- `[{success:true}]` → `true`, and `[{success:false}]` → `false`.
- `[]` throws, `[{success:'yes'}]` throws, and two rows throw.

`passwordSignIn`:
- It sends the publishable key, not the service key, and the URL has `grant_type=password`.
- 400 → `null`, 401 → `null`, and 500 throws.
- 200 without `refresh_token` throws.
- 200 with a full session including extra fields returns an object with exactly the two token keys.
- A `console.error` spy never receives the password string.

## Acceptance checks
- `npm test` passes. `npx tsc -p worker` is clean.
