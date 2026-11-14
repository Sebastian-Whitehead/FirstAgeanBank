# Step 05: Authenticated player resolution

## Goal
Port `currentAuthenticatedPlayer()` and `requireAuthenticatedPlayer()` from `includes/auth.inc.php`. This is the security boundary. Port it line for line and don't simplify the checks. The player is resolved **only** from the verified Discord identity on the Supabase token, never from request input.

## File: `worker/src/auth.ts`

```ts
export class AuthError extends Error {
  constructor(message: string, public code: AuthErrorCode) { super(message); }
}
export type AuthErrorCode = 'loggedout' | 'supabaseunavailable' | 'discordrequired'
  | 'identitynotfound' | 'identityambiguous' | 'identityunavailable';

export interface Player {
  username: string; email: string; firstname: string; steamId: string; discordId: string;
}

export async function currentAuthenticatedPlayer(request: Request, env: Env): Promise<Player>
export async function requirePlayer(request: Request, env: Env): Promise<Player | Response>
// Returns the Player, or a ready-made error Response (the caller returns it immediately).
```

### `currentAuthenticatedPlayer`: exact rules (in order)
1. Read the `Authorization` header. It must match `/^Bearer\s+([A-Za-z0-9._~-]+)$/i`, otherwise `AuthError('Sign in is required.', 'loggedout')`.
2. `supabaseAuthUser(env, token)`. A `SupabaseRequestError` becomes `AuthError('The authentication service is unavailable.', 'supabaseunavailable')`. A `null` result becomes `AuthError('The session is invalid or expired.', 'loggedout')`.
3. `email = user.email`. It's valid if it's a string that passes the email check from step 04.
   `username = user.user_metadata?.username`. It's valid if it's a string matching `/^[a-z0-9]{1,64}$/`.
4. `identities = user.identities ?? []`. If it isn't an array, throw `AuthError('Discord verification is required.', 'discordrequired')`.
5. Take the first identity where `provider === 'discord'` and `identity_data` is a plain object, and `identity_data.sub ?? identity_data.id` is a string or a number (an integer in PHP; accept `Number.isInteger`). `discordId = String(candidate)`. Keep that `identity_data`.
6. If there's no Discord ID, or it doesn't match `/^[0-9]{17,19}$/`, throw `discordrequired`.
7. If the email is invalid, use `identity_data.email` when it's a valid email, otherwise `''`.
8. If the username is invalid, set `username = 'discord-' + discordId`.
9. `supabaseFindPlayersByDiscordId`. A `SupabaseRequestError` becomes `AuthError('The shared identity service is unavailable.', 'supabaseunavailable')`.
10. 0 rows → `AuthError('No existing player identity is linked to this Discord account.', 'identitynotfound')`.
    More than 1 row → `console.error(...)`, then `AuthError('The player identity lookup was ambiguous.', 'identityambiguous')`.
11. `steamId = typeof row.steam_id === 'string' ? row.steam_id : ''` and `stored = typeof row.discord_id === 'string' ? row.discord_id : ''`.
    If `steamId` doesn't match `/^[0-9]{17}$/` or `stored !== discordId`, throw `AuthError('The existing player identity is incomplete.', 'identityunavailable')`.
    These values are strings because step 03 selects them with `::text` (the columns are `int8`, which is larger than 2^53). If a row ever has a `number` here, treat it as `identityunavailable` rather than converting it, because a converted number may already be rounded.
12. `firstname` = `row.alias` if it's a non-empty string, else `identity_data.global_name` if it's a string, else `identity_data.username` if it's a string, else `username`.
13. Return `{ username, email, firstname, steamId, discordId }`.

### `requirePlayer`: status mapping (from `requireAuthenticatedPlayer`)
- `loggedout` → 401
- `identitynotfound`, `discordrequired` → 403
- everything else → 503
- body `{ error: code, message }` (use `errorResponse`)
- Any non-`AuthError` exception propagates (the router turns it into a 500, step 06).

## Tests to write: `worker/test/auth.test.ts`
Build a fixture `authUser(overrides)` returning a valid user with `email 'p@x.co'`, `user_metadata.username 'player1'`, and one Discord identity with `sub '123456789012345678'`, `global_name 'Glob'`. Also a `playerRow(overrides)` with `steam_id '76561198000000001'`, `discord_id '123456789012345678'`, `alias 'Alias'`.

Header handling:
- No header → 401 `loggedout`, and **no** fetch is made.
- `Basic abc` → 401. `Bearer ` (empty) → 401. `Bearer a b` → 401. `bearer tok.en-1_~` is accepted (case-insensitive).

Auth user:
- `/auth/v1/user` 401 → 401 `loggedout`.
- `/auth/v1/user` 500 → 503 `supabaseunavailable`.
- A network throw → 503 `supabaseunavailable`.

Discord identity:
- `identities: 'x'` → 403 `discordrequired`.
- `identities: []` → 403 `discordrequired`.
- Only a `email` provider identity → 403.
- A Discord `sub` of `'123'` (too short) → 403.
- A Discord `sub` that's a 20-digit string → 403.
- The `sub` is missing but `id: '123456789012345678'` (a string) → accepted. The Supabase Auth API sends Discord IDs as strings. The PHP also accepted ints, but a JS number above 2^53 is already rounded, so the port accepts numbers only when `Number.isSafeInteger` (which in practice fails the 17–19 digit check → `discordrequired`).
- A lookup row with `steam_id` as a JSON **number** → 503 `identityunavailable`.
- Two Discord identities → the first valid one is used.

Fallbacks:
- Invalid metadata username (`'Bad Name'`) → `username === 'discord-123456789012345678'`.
- Missing email plus `identity_data.email 'd@x.co'` → `email === 'd@x.co'`.
- Missing email with no identity email → `email === ''` (still succeeds).

Player lookup:
- `[]` → 403 `identitynotfound`.
- Two rows → 503 `identityambiguous`.
- Lookup 500 → 503 `supabaseunavailable`.
- `steam_id '123'` → 503 `identityunavailable`.
- `discord_id` different from the token's → 503 `identityunavailable`.
- `steam_id: null` → 503 `identityunavailable`.

firstname:
- With the alias → `'Alias'`. Empty alias → `'Glob'`. No alias and no global_name, but `identity_data.username 'du'` → `'du'`. None of these → the username.

Trust boundary:
- A request carrying `?steamId=...`, an `X-Steam-Id` header, or form fields still resolves the Steam ID from the lookup row only.

## Acceptance checks
- `npm test` passes. `npx tsc -p worker` is clean.
- Compare this file with `includes/auth.inc.php` side by side. Every branch in the PHP has a test above.
