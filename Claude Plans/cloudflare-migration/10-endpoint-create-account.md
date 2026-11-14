# Step 10: `POST /api/accounts/create` (port of `includes/create-account.inc.php`)

## Files
- `worker/src/validation.ts` (new, shared with step 11):
  ```ts
  export function parseAccountName(raw: string | null): string | null
  // null if raw is null; name = phpTrim(raw); valid if 1 <= codePointLength(name) <= 40; return name or null
  export function parseAccountNumber(raw: string | null): string | null
  // null if raw is null; n = phpTrim(raw); valid if n !== '' and UTF-8 byte length <= 128 (PHP strlen); return n or null
  export const STEAM_ID = /^[0-9]{17}$/;
  ```
- `worker/src/endpoints/create-account.ts`, registered as `'/api/accounts/create'`

## Behaviour
1. A method other than `POST` → `methodNotAllowed('POST', 'Use POST to create an account.')`. PHP had no method check, so this is new and harmless.
2. `requirePlayer`. If it returns a `Response`, return it. In PHP, auth runs before everything else, and the 401/403/503 responses are the same JSON as in step 05.
3. The PHP's `create-account-submit` marker check is **dropped**. The frontend always sends it, so ignore it.
4. If `player.steamId` doesn't match `STEAM_ID` → `formResult('/accounts/?error=steamidrequired', 'steamidrequired')`. This is defensive; step 05 already guarantees it.
5. `form = await readForm(request)`. A `null` form is treated as an empty form.
6. `name = parseAccountName(formString(form, 'accountName'))`. `null` → `formResult('/accounts/?error=invalidaccountname', 'invalidaccountname')`.
7. `supabaseRpc(env, 'fab_create_player_account', { p_steam_id, p_account_name: name })`
8. Error mapping for a `SupabaseRequestError` `e`. Put it in a shared function, `mapAccountError(e)`, in `validation.ts`, because step 11 extends it:
   - `e.supabaseMessage === 'account_name_taken'` → `accountnametaken`
   - `e.supabaseMessage === 'invalid_account_name'` → `invalidaccountname`
   - otherwise `e.supabaseCode === '23505'` **and** `e.supabaseMessage` contains `accounts_player_name_unique` → `accountnametaken`
   - otherwise → `supabaseunavailable`
   - respond with `formResult('/accounts/?error=' + code, code)`
9. Success → `formResult('/accounts/?account=created')`

## Tests to write
`worker/test/validation.test.ts`:
- `parseAccountName`: `null` → `null`, `'   '` → `null`, `' Savings '` → `'Savings'`, 40 code points → ok, 41 → `null`, 40 emoji (80 UTF-16 units) → ok, `' x'` → kept with the NBSP (phpTrim parity).
- `parseAccountNumber`: `''` → `null`, 128 ASCII bytes → ok, 129 → `null`, 64 × `'é'` (128 bytes) → ok, 65 × `'é'` → `null`.

`worker/test/create-account.test.ts` (send `FormData` bodies, valid auth via fixtures):
- `GET` → 405.
- No auth → 401 `loggedout`, and no RPC call.
- Missing `accountName` → 422 `invalidaccountname`, and no RPC call.
- `accountName` of 41 characters → 422 `invalidaccountname`.
- Happy path → 200 `{success:true, error:null, redirect:'/accounts/?account=created'}`. The RPC body is `{p_steam_id:'76561198000000001', p_account_name:'Savings'}` (trimmed).
- The RPC 400 with message `account_name_taken` → 422 `accountnametaken`.
- The RPC 400 with message `invalid_account_name` → 422 `invalidaccountname`.
- The RPC 409 with code `23505` and message `duplicate key value violates unique constraint "accounts_player_name_unique"` → 422 `accountnametaken`.
- Code `23505` with a different constraint → 422 `supabaseunavailable`.
- RPC 500 → 422 `supabaseunavailable`. That's PHP parity: `finishRequest` always returns 422 on error.
- A `steamId` form field is ignored, and the RPC uses the token's player.

## Acceptance checks
- `npm test` passes. `npx tsc -p worker` is clean.
