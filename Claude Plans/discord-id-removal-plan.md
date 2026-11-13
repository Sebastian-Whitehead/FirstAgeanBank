# Plan: Remove the manual Discord ID field from signup

**Status: Complete** (2026-11-13). Frontend changes are in; the build passes and no `discordid` references remain in `frontend/src` outside `discordIdForUser`.

## Goal

The signup form currently asks the user to type their Discord user ID, then runs Discord OAuth (`linkIdentity`) and checks that the OAuth-verified ID matches what they typed. The typed value adds nothing: the PHP API already resolves the player from the **OAuth-verified** Discord ID on the Supabase token (`includes/auth.inc.php`), never from user input. Remove the field and all code that carries/compares the typed ID. Use only the Discord ID from the OAuth identity.

Read `AGENTS.md` first. Keep the change surgical; do not touch identity/economy data, PHP auth resolution, or Supabase migrations.

## Current flow (for reference)

1. `frontend/src/pages/SignupPage.jsx` `submit()` reads `uid`, `email`, `pwd`, `displayName`, `discordid` and calls `beginSignup(username, email, password, displayName, discordId)`.
2. `frontend/src/lib/auth.ts` `beginSignup()`:
   - validates `discordId` against `/^[0-9]{17,19}$/`
   - stores `{ username, email, discordId }` in `localStorage['fab.pendingSignup']`
   - calls `client.auth.signUp(...)`; if no session (email confirmation needed) returns `false`
   - otherwise calls `continuePendingSignup(..., discordId)` then `finishPendingSignup(..., discordId)`
3. `continuePendingSignup()`: checks the authed user matches pending username/email; if the user's linked Discord ID **equals** the typed ID, proceed; if a **different** one is linked, throw; if none, call `linkIdentity({ provider: 'discord', scopes: 'identify', redirectTo: /signup/ })` and redirect.
4. `finishPendingSignup()`: re-checks user, throws `'Discord verification did not match the ID entered during signup.'` if linked ID ≠ typed ID, then calls `/api/state.php` (server resolves the player from the verified Discord ID → `identitynotfound` etc. on failure), then `/api/username-link.php`, then clears the pending key.
5. On returning to `/signup/` (after email confirmation or the Discord OAuth redirect), `completePendingSignup()` reads the pending entry and repeats steps 3–4 with `pending.discordId`.

## Changes

### 1. `frontend/src/pages/SignupPage.jsx`
- Delete the `Discord ID` `<label>`/`<input name="discordid">` (line ~88).
- Replace the `<small>` hint (line ~89) with something like: "After creating your account, Discord will ask you to authorize the link. The Discord account you authorize must already be linked to your player identity."
- Remove `formData.get('discordid')` from the `beginSignup(...)` call.
- The intro `<p className="muted">` copy ("...then verify the Discord account already linked to your player identity.") is still accurate; optionally reword to "then connect the Discord account already linked to your player identity."

### 2. `frontend/src/lib/auth.ts`
- `beginSignup`: drop the `discordId` parameter and its regex validation. Store only `{ username, email }` in `pendingSignupKey`. Call `continuePendingSignup(client, normalizedUsername, normalizedEmail)` and `finishPendingSignup(client, normalizedUsername, normalizedEmail)`.
- `continuePendingSignup`: drop the `discordId` parameter. New logic after the username/email match check:
  - if `discordIdForUser(data.user)` is non-null → `return true` (already linked; the server decides whether it maps to a player).
  - else → the existing `linkIdentity` branch, unchanged (keep the "manual linking is disabled" error message).
  - Remove the "already linked to a different Discord account" throw — there is no typed ID to differ from.
  - Optional but recommended: in the `linkError` handling, if the message indicates the Discord identity is already linked to another user (Supabase returns an `identity_already_exists`-style error, e.g. when the user previously used "Continue with Discord" on the home page, which creates a separate Auth user), throw a clear message: "That Discord account is already attached to another sign-in. Sign in with Discord from the home page instead." Check `linkError.code === 'identity_already_exists'` and/or the message text; don't over-engineer.
- `finishPendingSignup`: drop the `discordId` parameter. Replace the mismatch check with: if `discordIdForUser(data.user)` is `null`, throw `new Error('Discord verification did not complete. Please try connecting Discord again.')`. Keep the `/api/state.php` → `playerLookupError` → `registerUsernameEmail()` → clear-pending sequence unchanged.
- `completePendingSignup`: change the parsed type to `{ username: string; email: string }` and stop passing `pending.discordId`. Old pending entries in users' browsers that still contain `discordId` are harmless (the extra field is ignored), so no migration is needed. Add a light guard: if `typeof pending.username !== 'string' || typeof pending.email !== 'string'`, clear the key and throw the existing "could not be read. Please start again." error.
- `discordIdForUser` stays as is (still used).

### 3. `frontend/src/lib/errors.js`
- `invaliddiscordid` is no longer produced by anything (no PHP or frontend code emits it after this change). Leave it unless you confirm with a grep that it's unused; removing it is optional.

### 4. Docs
- `README.md` line ~65 ("Choose a username... enter the Discord ID already present on your player identity... checks that the OAuth-verified Discord ID matches the entered ID and exactly one existing player identity"): rewrite to say the user authorizes Discord and the app checks that the OAuth-verified Discord ID matches exactly one existing player identity. Don't mention typing an ID.
- `plan.md` (the Supabase/Cloudflare migration plan) section "1. Identity and credential decisions", bullet starting "Signup verifies the entered Discord ID against...": update to "Signup verifies the OAuth-verified Discord ID against exactly one existing `identities_player` row (no manual Discord ID entry)." Also in section 3, change the test item "signup linking with matching/mismatched IDs" to "signup linking with a Discord account that does / does not map to a player identity".

## Do NOT change
- `includes/auth.inc.php`, `includes/supabase.inc.php`, `api/state.php`: server-side resolution already uses only the verified Discord ID from the token. No backend change is needed.
- The home-page "Continue with Discord" flow (`signInWithDiscord`, `HomePage.jsx`).
- `ProfilePage.jsx` (displays `user.discordId` from the server, which is fine).
- Anything under `supabase/migrations/` or `docker/migrations/`.

## Known limitations (out of scope, mention in the summary but don't fix)
- If Discord links successfully but maps to no player identity (`identitynotfound`), the Supabase Auth user keeps that Discord identity and the pending signup stays in `localStorage`, so revisiting `/signup/` shows the same error. This was true before the change as well.
- The `discordrequired` error on password login says "Open signup to continue linking", but `completePendingSignup` only resumes when a `fab.pendingSignup` entry exists in that browser. Same as before.
- Manual identity linking must be enabled in the Supabase dashboard for the signup link step to work (see `plan.md` status).

## Validation
1. `npm run build` from the repo root. It must succeed. Vite strips TS types without type-checking, so also re-read `auth.ts` to confirm no leftover `discordId` references in the signup functions: `grep -n "discordId" frontend/src/lib/auth.ts` should only hit `discordIdForUser` and its internals.
2. `grep -rn "discordid" frontend/src` should return nothing.
3. If Docker is available: `docker compose up --build`, open `http://localhost:8080/signup/`, and confirm the form renders without the Discord ID field and submit isn't blocked by a hidden required input. A full end-to-end signup needs the Supabase dashboard configured (manual linking, redirect allowlist, SMTP). If it isn't, say so rather than claiming it was tested.
4. Do not run `docker compose down -v`.

## Commit
Branch: `feature/supabase-auth-cloudflare` (current). One commit, e.g. "Remove manual Discord ID entry from signup". Only commit if the user asks.
