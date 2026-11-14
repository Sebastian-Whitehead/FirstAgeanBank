# Step 08: `POST /api/username-link` (port of `api/username-link.php`)

## File: `worker/src/endpoints/username-link.ts`, registered as `'/api/username-link'`

## Behaviour (match the PHP, in this order)
1. A method other than `POST` → `methodNotAllowed('POST', 'Use POST to save the username.')`. Do this **before** auth.
2. `requirePlayer`. If it returns a `Response`, return it.
3. `registerAuthUsername(env, player.username, player.email)`
   - `SupabaseRequestError` → 503 `{error:'usernameunavailable', message:'Could not save your username.'}`
4. `false` → 409 `{error:'usernametaken', message:'That username is already in use.'}`
5. `true` → 200 `{success:true}`

The request body is ignored. The username and email come only from the verified token user (step 05).

## Tests to write: `worker/test/username-link.test.ts`
- `GET` → 405 with `Allow: POST`, and no fetch is made.
- POST without auth → 401.
- POST with `discordrequired` → 403.
- POST, RPC `[{success:true}]` → 200 `{success:true}`. The RPC body is `{p_username:'player1', p_email:'p@x.co'}`.
- An uppercase token email `'P@X.CO'` is sent as `'p@x.co'`.
- The RPC returns `[{success:false}]` → 409 `usernametaken`.
- RPC 500 → 503 `usernameunavailable`.
- RPC `[]` (unexpected shape) → 503 `usernameunavailable`.
- A POST body containing `{"username":"evil"}` is ignored, and the RPC still gets `player1`.
- A user with an invalid metadata username → the RPC gets `discord-<id>`. This is PHP parity; document it as current behaviour.

## Acceptance checks
- `npm test` passes. `npx tsc -p worker` is clean.
