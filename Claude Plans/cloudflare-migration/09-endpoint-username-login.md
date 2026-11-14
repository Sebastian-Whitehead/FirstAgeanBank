# Step 09: `POST /api/username-login` (port of `api/username-login.php`)

This endpoint takes a password. Don't log the request body.

## File: `worker/src/endpoints/username-login.ts`, registered as `'/api/username-login'`

## Behaviour (match the PHP, in this order)
1. A method other than `POST` → `methodNotAllowed('POST', 'Use POST for username sign-in.')`.
2. Size limit: if the `Content-Length` header is greater than 4096 → 413 `{error:'invalidrequest', message:'The sign-in request is too large.'}`. Then read `await request.text()`. If the text's byte length (`new TextEncoder().encode(text).length`) is greater than 4096, return the same 413. The header can be missing or wrong, so check both.
3. `JSON.parse`. On failure → 400 `{error:'invalidrequest', message:'Invalid sign-in request.'}`.
4. `username = typeof input?.username === 'string' ? phpTrim(input.username).toLowerCase() : ''`
   `password = typeof input?.password === 'string' ? input.password : ''`
   - PHP order is `strtolower(trim(x))`. The result is the same either way.
   - If the input isn't a plain object (for example an array or `null`), both are `''`.
5. Reject with 400 `{error:'invalidrequest', message:'Enter a valid username and password.'}` unless:
   `username` matches `/^[a-z0-9]{1,64}$/`, `password !== ''`, and the password's **byte** length is at most 1024. PHP `strlen` counts bytes, so use `TextEncoder`.
6. `getAuthEmailForUsername`. `SupabaseRequestError` → 503 `{error:'authunavailable', message:'Sign-in is temporarily unavailable.'}`.
   A `null` result → 401 `{error:'invalidcredentials', message:'The username or password is incorrect.'}`
7. `passwordSignIn(env, email, password)`. `SupabaseRequestError` → 503 `authunavailable`. A `null` result → 401 `invalidcredentials`.
8. 200 `{access_token, refresh_token}`

The "unknown username" and "wrong password" cases must give an identical status and body, so usernames can't be enumerated.

## Tests to write: `worker/test/username-login.test.ts`
- `GET` → 405.
- The `Content-Length: 5000` header → 413, and the body isn't parsed.
- A 5000-byte body without a `Content-Length` header → 413.
- Body `not json` → 400 `Invalid sign-in request.`
- Body `[]`, `null` or `"str"` → 400 `Enter a valid username and password.`
- `{username:'  Player1 ', password:'pw'}` → the lookup RPC gets `p_username:'player1'`.
- Username `'bad name'`, `'a_b'`, `''`, or 65 characters → 400, and no fetch is made.
- Username exactly 64 characters → accepted.
- `password: ''` → 400. `password: 123` (a number) → 400.
- A 1024-byte password → accepted. 1025 bytes → 400. 513 × `'é'` (1026 bytes) → 400.
- Lookup `[]` → 401 `invalidcredentials`.
- Lookup ok, then token 400 → 401 `invalidcredentials`, with the **same body** as the unknown-user case (assert deep equality).
- Lookup 500 → 503 `authunavailable`. Token 500 → 503 `authunavailable`.
- Happy path → 200 with exactly `{access_token, refresh_token}`. The token request got `email` from the lookup and the original password.
- A `console.error` spy never receives the password.

## Acceptance checks
- `npm test` passes. `npx tsc -p worker` is clean.
- `cf:dev` with real `.dev.vars`: `curl -X POST -H 'Content-Type: application/json' -d '{"username":"<test user>","password":"<pw>"}' localhost:8787/api/username-login` returns tokens. A wrong password returns 401.
