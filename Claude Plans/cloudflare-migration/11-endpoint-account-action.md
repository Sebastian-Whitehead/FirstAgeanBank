# Step 11: `POST /api/accounts/action` (port of `includes/account-action.inc.php`)

Handles the `rename` and `delete` actions. `delete` archives the account in Supabase via `fab_delete_player_account`, and the archive behaviour and triggers stay in the database.

## File: `worker/src/endpoints/account-action.ts`, registered as `'/api/accounts/action'`

## Behaviour (order matters, match the PHP)
1. A method other than `POST` → `methodNotAllowed('POST', 'Use POST to manage an account.')`.
2. `requirePlayer`. If it returns a `Response`, return it.
3. Drop the `account-action-submit` marker check (same as step 10).
4. If the Steam ID doesn't match `STEAM_ID` → `formResult('/accounts/?error=steamidrequired', 'steamidrequired')`.
5. `form = await readForm(request)` (`null` means an empty form). `action = formString(form, 'action') ?? ''`.
6. `accountNumber = parseAccountNumber(formString(form, 'accountNumber'))`. `null` → `formResult('/accounts/?error=invalidaccountnumber', 'invalidaccountnumber')`.
   This check comes **before** the action check, which is PHP order.
7. `action === 'rename'`:
   - `name = parseAccountName(formString(form, 'accountName'))`. `null` → `invalidaccountname`.
   - `supabaseRpc(env, 'fab_rename_player_account', { p_steam_id, p_account_number: accountNumber, p_account_name: name })`
8. `action === 'delete'`:
   - `supabaseRpc(env, 'fab_delete_player_account', { p_steam_id, p_account_number: accountNumber })`
9. Any other action → `formResult('/accounts/?error=invalidaccountaction', 'invalidaccountaction')`.
10. Error mapping: extend `mapAccountError` from step 10 so that it also covers these. Don't write a second mapper. Step 10's behaviour must not change for its codes:
    - `invalid_account_name` → `invalidaccountname`
    - `account_name_taken` → `accountnametaken`
    - `account_balance_not_zero` → `accountbalancenotzero`
    - `last_player_account` → `lastplayeraccount`
    - `main_account_protected` or `main_account_immutable` → `mainaccountprotected`
    - `account_not_found` or `player_identity_unavailable` → `accountnotfound`
    - `23505` + `accounts_player_name_unique` → `accountnametaken`
    - otherwise → `supabaseunavailable`

    Check: in the PHP, create-account only mapped the first two plus `23505`. If create ever got e.g. `last_player_account`, PHP would return `supabaseunavailable` and the shared mapper would return `lastplayeraccount`. The create RPC can't raise those, so sharing is safe. Note this in a one-line comment.
11. Success → `formResult('/accounts/?account=' + action + 'd')`, which gives `renamed` or `deleted`.

## Tests to write: `worker/test/account-action.test.ts`
- `GET` → 405. No auth → 401.
- Missing `accountNumber` → 422 `invalidaccountnumber`, even when `action` is invalid (order check).
- `accountNumber` of `'   '` → 422 `invalidaccountnumber`.
- `action: 'freeze'` with a valid number → 422 `invalidaccountaction`, and no RPC call.
- Missing `action` → 422 `invalidaccountaction`.
- Rename happy path → 200 `redirect '/accounts/?account=renamed'`. The RPC body has a trimmed number and name.
- Rename with an invalid name (41 characters) → 422 `invalidaccountname`, and no RPC call.
- Delete happy path → 200 `redirect '/accounts/?account=deleted'`. The RPC is `fab_delete_player_account` with `{p_steam_id, p_account_number}`.
- One test per mapping row in item 10 (8 tests), for example a delete with message `account_balance_not_zero` → 422 `accountbalancenotzero`.
- RPC 500 → 422 `supabaseunavailable`.
- Ownership: the RPC always gets the **token** player's Steam ID. A form `p_steam_id`/`steamId` field is ignored. That another player's account number gets rejected is enforced by the RPC (`account_not_found`) and covered in step 15's live tests.
- Step 10's tests still pass with the extended mapper.

## Acceptance checks
- `npm test` passes, including steps 02–10. `npx tsc -p worker` is clean.
