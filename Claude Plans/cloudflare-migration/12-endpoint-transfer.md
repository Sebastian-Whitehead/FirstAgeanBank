# Step 12: `POST /api/transfer` (port of `includes/transfer.inc.php`)

This step moves money (fake, but ledger-backed). Port the amount parsing **exactly**, and test it exhaustively. Use only integer cent arithmetic. Never use `parseFloat`.

## Files
- `worker/src/money.ts`:
  ```ts
  export type AmountResult = { ok: true; cents: number } | { ok: false; error: 'invalidamount' | 'limitreached' };
  export function parseTransferAmount(raw: string | null): AmountResult
  ```
- `worker/src/endpoints/transfer.ts`, registered as `'/api/transfer'`

## `parseTransferAmount`: exact PHP rules, in order
1. `raw` is `null`, or doesn't match `/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,2})?$/` → `invalidamount`. **No trim**: PHP doesn't trim the amount.
2. Split on the first `.` into `dollarsText` and `fraction` (which may be missing).
3. If `dollarsText.length > 4` **or** `parseInt(dollarsText, 10) > 5000` → `limitreached`.
4. `cents = parseInt(dollarsText, 10) * 100 + parseInt((fraction ?? '').padEnd(2, '0'), 10)`. `padEnd` of `''` gives `'00'`, which is 0.
5. `cents <= 0` → `invalidamount`.
6. `cents > 500000` → `limitreached`.
7. Return `{ ok: true, cents }`.

## Endpoint behaviour (order matters)
1. A method other than `POST` → `methodNotAllowed('POST', 'Use POST to transfer.')`.
2. `requirePlayer`. If it returns a `Response`, return it.
3. Drop the `transfer-submit` marker check.
4. `fail(code)` = `formResult('/transfer/?error=' + code, code)`
5. If the sender Steam ID doesn't match `STEAM_ID` → `fail('steamidrequired')`.
6. `form = await readForm(request)` (`null` means an empty form).
7. `source = parseAccountNumber(formString(form, 'sourceAccountNumber'))`. `null` → `fail('invalidaccountnumber')`.
8. `dest = parseAccountNumber(formString(form, 'destinationAccountNumber'))`. `null` → `fail('invalidaccountnumber')`.
9. `amount = parseTransferAmount(formString(form, 'amount'))`. If it isn't ok → `fail(amount.error)`.
10. `key = phpTrim(formString(form, 'idempotencyKey') ?? '').toLowerCase()`. A `null` form value (missing) → `fail('transferfailed')`. A key that doesn't match `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/` → `fail('transferfailed')`.
11. `supabaseRpc(env, 'fab_transfer', { p_sender_steam_id, p_sender_account_number: source, p_recipient_account_number: dest, p_amount: amount.cents, p_idempotency_key: key })`
12. Error mapping:
    - `SupabaseRequestError` with `supabaseMessage === 'account_archived'` → `accountarchived`
    - otherwise by `supabaseCode`: `P0002` → `recipientnotfound`, `P0003` → `invalidaccounts`, `P0004` → `insufficientfunds`, anything else → `transferfailed`
    - any other thrown error → `transferfailed`. Log it, and don't let it reach the router's 500.
13. Success → `formResult('/accounts/?transfer=success')`

## Tests to write
`worker/test/money.test.ts`: a table-driven test with `[input, expected]` pairs.

| input | expected |
|---|---|
| `null` | invalidamount |
| `''` | invalidamount |
| `'0'` | invalidamount (0 cents) |
| `'0.00'` | invalidamount |
| `'0.01'` | 1 |
| `'0.1'` | 10 |
| `'1'` | 100 |
| `'1.5'` | 150 |
| `'1.05'` | 105 |
| `'12.34'` | 1234 |
| `'4999.99'` | 499999 |
| `'5000'` | 500000 |
| `'5000.00'` | 500000 |
| `'5000.01'` | limitreached |
| `'5001'` | limitreached |
| `'9999'` | limitreached |
| `'10000'` | limitreached (more than 4 digits) |
| `'99999999999999999999'` | limitreached |
| `'01'` | invalidamount (leading zero) |
| `'00.5'` | invalidamount |
| `'1.'` | invalidamount |
| `'.5'` | invalidamount |
| `'1.234'` | invalidamount |
| `'-1'` | invalidamount |
| `'+1'` | invalidamount |
| `' 1'` / `'1 '` | invalidamount (no trim) |
| `'1e3'` | invalidamount |
| `'1,00'` | invalidamount |
| `'٣'` (Arabic-Indic digit) | invalidamount |
| `'1\n'` | invalidamount. **Watch out:** PHP `$` matches before a trailing newline, so PHP would accept `'1\n'`. The JS regex rejects it. That's a safe tightening; keep the JS behaviour and note it. |

`worker/test/transfer.test.ts` (valid auth via fixtures, `FormData` bodies; `validForm()` builds a source `'A1'`, dest `'B2'`, amount `'10.50'`, and key `crypto.randomUUID()`):
- `GET` → 405. No auth → 401.
- Missing source → 422 `invalidaccountnumber`, `redirect '/transfer/?error=invalidaccountnumber'`.
- Missing dest → 422 `invalidaccountnumber`.
- A bad amount (`'abc'`) → 422 `invalidamount`, and no RPC call.
- Amount `'5001'` → 422 `limitreached`.
- Missing key → 422 `transferfailed`. Key `'not-a-uuid'` → 422 `transferfailed`.
- An uppercase UUID with spaces around it is accepted and sent lowercased and trimmed.
- Order: a missing source **and** a bad amount → `invalidaccountnumber` (the source is checked first).
- Happy path → 200 `{success:true, error:null, redirect:'/accounts/?transfer=success'}`. The RPC body equals `{p_sender_steam_id:'76561198000000001', p_sender_account_number:'A1', p_recipient_account_number:'B2', p_amount:1050, p_idempotency_key:<key>}`, and `p_amount` is a JSON **integer**.
- RPC errors: message `account_archived` (any code) → `accountarchived`. `P0002` → `recipientnotfound`. `P0003` → `invalidaccounts`. `P0004` → `insufficientfunds`. `P0001` → `transferfailed`. 500 → `transferfailed`. A network throw → `transferfailed`.
- The sender Steam ID always comes from the token. A `p_sender_steam_id` form field is ignored.

## Acceptance checks
- `npm test` passes (all steps). `npx tsc -p worker` is clean.
- Read `money.ts` next to `includes/transfer.inc.php` lines 39–55 and confirm the order of checks is identical.
