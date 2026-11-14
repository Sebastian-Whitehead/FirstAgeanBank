# Step 07: `GET /api/state` (port of `api/state.php`)

## File: `worker/src/endpoints/state.ts`, registered as `'/api/state'`

## Behaviour (match `api/state.php`)
1. `requirePlayer`. If it returns a `Response`, return it.
2. `supabaseRpc(env, 'fab_get_player_account', { p_steam_id: player.steamId, p_limit: 15 })`.
   - `SupabaseRequestError` → 503 `{error:'supabaseunavailable', message:'Unable to load account state.'}`
3. A `null` result → 503 `{error:'identityunavailable', message:'Unable to load account state.'}`
4. `accounts = result.accounts ?? []`. If it isn't an array → 503 `supabaseunavailable` (same message).
5. Return 200:
   ```json
   {
     "authenticated": true,
     "user": {
       "username": "...", "firstname": "...", "lastname": "",
       "accounts": [{ "accountNumber": "...", "name": "...", "type": "...", "balance": 12.34 }],
       "steamId": "...", "discordId": "..."
     },
     "activities": []
   }
   ```
   - `name = account.account_name ?? ''`
   - `balance = Math.trunc(Number(account.money)) / 100`. PHP uses `(int)$money / 100`. Keep the number type.
   - `activities = result.activities ?? []`, passed through untouched.
   - The PHP doesn't check the HTTP method. Accept any method (parity), or restrict to GET. Choose **GET only, 405 otherwise** and note it.

## Tests to write: `worker/test/state.test.ts`
Use the step 05 fixtures for a valid auth user and player.
- Happy path: the RPC returns two accounts (`money 123456` and `money 0`, one with `account_name null`) plus an activities array.
  - status 200 and the exact body: balances `1234.56` and `0`, `name ''` for the null name, `lastname ''`, and the activities passed through.
  - the RPC body equals `{p_steam_id:'76561198000000001', p_limit:15}`
- A missing `accounts` key → `accounts: []`.
- `accounts: 'x'` → 503 `supabaseunavailable`.
- RPC empty body (`null`) → 503 `identityunavailable`.
- RPC 500 → 503 `supabaseunavailable`.
- No auth header → 401 `loggedout`, and the RPC isn't called.
- `identitynotfound` → 403, and the RPC isn't called.
- `POST` → 405.

## Acceptance checks
- `npm test` passes. `npx tsc -p worker` is clean.
- `npm run cf:dev` with real `.dev.vars`. In a browser, sign in on the Docker app, copy the access token from DevTools (`localStorage` Supabase session), then `curl -H "Authorization: Bearer <token>" localhost:8787/api/state`. The JSON should equal `curl ... localhost:8080/api/state.php` (diff the two outputs).
