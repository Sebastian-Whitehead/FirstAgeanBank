# Documentation
## About
A fake banking website for scambaiting copied as close to Kitboga's , "Gull and Bull", as possible.

This is a role-play (RP) fork of the original project, adapted for fictional in-character use.

## Disclaimer
This fictional role-play project is intended for local scambaiting and personal use only. Do not present it as a real financial institution or collect real financial information.

On first visit, the site displays a required acknowledgement explaining that all balances and transactions are fictional role-play data and that no real money is held or transferred. The acknowledgement is remembered in the browser.

## Features
* Fake bank account sign up
* Transfer between accounts
* Authenticated Investments page with TradingView market widgets
* Session inactivity timeout (15 minutes)
* Recent activities
* React frontend for public, account, transfer, activity, profile, and investment pages

The React application is organized by responsibility: route-level pages live in `frontend/src/pages`, shared UI in `frontend/src/components`, and session/API helpers in `frontend/src/contexts` and `frontend/src/lib`. `frontend/src/main.jsx` is the small application entry point; routes are composed in `frontend/src/App.jsx`.

## How to setup
### Requirements
- Docker Desktop (or Docker Engine) with Docker Compose.

### Start the site
1. Clone or download this repository.
2. From the repository folder, run:
   ```
   docker compose up --build
   ```
3. Open [http://localhost:8080](http://localhost:8080).

Compose builds the React frontend with Node and serves the static app and PHP API through Apache; it does not run a local database. Supabase stores authentication, the username-to-email directory, player identities, accounts, balances, and transaction history. Signup collects an email address and username; login accepts either. Discord OAuth verifies the player's existing Discord identity, and the PHP API resolves it read-only to the existing Supabase player row. Signup and login do not create or update identity rows. The PHP backend uses a server-only service-role key for identity lookups and existing `fab_*` RPCs; the frontend never receives that key. The Accounts page lists all active player accounts attached to that identity, each with its own account number and balance; transfers let the user choose a source account. To run the containers in the background, use `docker compose up --build -d`.

Before starting the app, create a root `.env` file with the Supabase project URL, **publishable** key, and **service-role** key:
```
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```
The publishable key is embedded in the frontend build and is not a secret. Never use the service-role key in frontend code or commit it. The root `.env` file is git-ignored.

In the Supabase dashboard, enable Discord as an Auth provider, configure its OAuth credentials and email delivery/confirmation settings, enable manual identity linking, and add the local and production signup callback URLs to the Auth redirect allowlist. Manual linking is required because signup creates the email/password user first, then links the verified Discord identity to that same Supabase Auth user. The hosted project's default SMTP is restricted to pre-authorized team addresses and is best-effort; configure custom SMTP to reliably send signup confirmation and password recovery email to users. Repeating signup for an existing unconfirmed address does not resend its email; use the signup page's **Resend confirmation email** action instead. The app requests only Discord's `identify` scope, not the email scope. Supabase Auth stores the submitted email. A private Supabase schema stores the username-to-email mapping needed for username sign-in; browser roles cannot access the table or its RPCs.

The applied [`supabase/migrations/20261101144736_first_agean_bank_integration.sql`](./supabase/migrations/20261101144736_first_agean_bank_integration.sql) adds server-only RPC functions for identity linking, profile-ID changes, account state, and atomic transfers. The applied [`supabase/migrations/20261101145426_create_player_accounts.sql`](./supabase/migrations/20261101145426_create_player_accounts.sql) adds a server-only RPC for creating additional zero-balance player accounts using Supabase's account-number generator. The [`supabase/migrations/20261101160000_manage_player_accounts.sql`](./supabase/migrations/20261101160000_manage_player_accounts.sql) migration adds server-only account rename and archive RPCs. The [`supabase/migrations/20261101160500_require_player_account.sql`](./supabase/migrations/20261101160500_require_player_account.sql) migration ensures every player retains at least one account. The [`supabase/migrations/20261101161000_archive_player_accounts.sql`](./supabase/migrations/20261101161000_archive_player_accounts.sql) migration adds an archive timestamp, excludes archived accounts from active account state, and preserves their rows for ledger history. The [`supabase/migrations/20261101161200_guard_archived_transaction_actor.sql`](./supabase/migrations/20261101161200_guard_archived_transaction_actor.sql) migration also prevents ledger transactions from referencing archived accounts. The [`supabase/migrations/20261101162500_reuse_archived_account_names.sql`](./supabase/migrations/20261101162500_reuse_archived_account_names.sql) migration allows a name to be reused after its previous account is archived. The [`supabase/migrations/20261101163000_return_active_accounts_in_state.sql`](./supabase/migrations/20261101163000_return_active_accounts_in_state.sql) migration makes the existing account-state RPC return only active accounts, avoiding a redundant account-list request while keeping archived transactions visible in history. The [`supabase/migrations/20261101181600_move_economy_tables_to_economy_schema.sql`](./supabase/migrations/20261101181600_move_economy_tables_to_economy_schema.sql) migration moves the account and transaction tables into the `economy` schema, and [`supabase/migrations/20261101182100_rename_economy_tables.sql`](./supabase/migrations/20261101182100_rename_economy_tables.sql) removes the redundant prefix, naming them `economy.accounts`, `economy.transactions`, and `economy.transactions_entries`, while preserving existing data, functions, and restrictions.

The RPC functions remain in `public` and are executable by the service role only. The PHP backend calls these RPCs with the server-only service-role key; it does not query the economy tables directly, and the key is never sent to the frontend. Other apps accessing the tables directly through Supabase's Data API must add `economy` to the project's exposed schemas and select it using the `Accept-Profile`/`Content-Profile` headers. The app resolves the verified Discord ID from the Supabase Auth token to one existing `identities_player` row, then lists that identity's active `economy.accounts` rows of type `player`. Players can name additional accounts and move funds between their own accounts using the transfer flow. Account creation does not change existing balances. The Main account cannot be renamed or archived; other accounts can be renamed, while archiving requires at least one other active account and an exactly zero balance. Archived accounts are hidden from active account lists and cannot be used in new transfers; their account data and transaction history remain in Supabase. Other apps using these shared tables should likewise filter active accounts with `archived_at IS NULL` and reject transactions involving archived accounts. Balances and transfer amounts are stored in cents (`$500.00` is `50000`).

Signup and login use Supabase Auth and require a verified Discord identity that already matches one existing `identities_player` row. The server validates the Supabase access token and reads the identity by Discord ID; it does not create or update player identities. Profile IDs are read-only in this app. Transfers debit the selected owned account and credit the recipient account while appending ledger entries in one Supabase database transaction. No application data is stored in a local database.

The previous local MariaDB volume is not mounted or used by the app. It is being left offline as a temporary backup; it may contain obsolete user and activity rows and is not imported into or used instead of the current Supabase identity/economy data. Keep that volume until you decide it is safe to remove it. Node/npm are only needed for local frontend development; Docker builds the static React app as part of the web image.

Supabase ledger entries are timestamped when created. Both sides of a transfer receive their own entry, and activity tables display the date and time.

## Updating
Rebuild and restart the containers after updating the source:
```
docker compose up --build -d
```
The Supabase migrations, including the private username directory, are versioned in `supabase/migrations/`. No local database migration or volume is required to run the app.
## How to use

### Sign up
Choose a username, email address, and password, enter the Discord ID already present on your player identity, then authorize the Discord connection. Confirm your email if Supabase requires it. The app checks that the OAuth-verified Discord ID matches the entered ID and exactly one existing player identity. Sign in using either your username or email and password.
The Accounts page displays active player accounts on that existing identity; account numbers and balances are managed by Supabase. Archiving an account hides it from active account state while preserving transaction history.
### Transaction history
Recent activities are read from `economy.transactions` and `economy.transactions_entries` in Supabase.
### Painful load
Moved to [Painful_Load](https://github.com/lahrence/Painful-Load).

### Optional archives
The `Search_Spoof` extension and `Gull-le-Belle-records` archive are not included in this public fork.

## Extra
The site is available only on the local computer at [http://localhost:8080](http://localhost:8080).

## Experimental Features and Details
* **Download button** When enabled (by going into 'setup.json' and changing `downloadButton` to true), users can have a custom button that, when clicked, downloads a file of their choosing.
* **setup.json** setup.json is a new JSON file used to enable/disable editable features (very short list at the moment).
