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

Compose builds the React frontend with Node, serves the static React app through Apache, and starts MariaDB. MariaDB retains this app's username/password credentials; Supabase is authoritative for shared player identities, account numbers, balances, and transaction history. The PHP backend calls Supabase using a server-only service-role key. The frontend never receives that key. SteamID64 links the local login to the shared player identity. The Accounts page lists all active player accounts attached to that identity, each with its own account number and balance; transfers let the user choose a source account. Supabase controls account provisioning and initial balances. Existing users can add or update their SteamID from the profile page. To run the containers in the background, use `docker compose up --build -d`.

Before starting the app, create a root `.env` file with your Supabase project URL and **service-role** key:
```
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```
Never use the service-role key in frontend code or commit it. The root `.env` file is git-ignored.

The applied [`supabase/migrations/20261101144736_first_agean_bank_integration.sql`](./supabase/migrations/20261101144736_first_agean_bank_integration.sql) adds server-only RPC functions for identity linking, profile-ID changes, account state, and atomic transfers. The applied [`supabase/migrations/20261101145426_create_player_accounts.sql`](./supabase/migrations/20261101145426_create_player_accounts.sql) adds a server-only RPC for creating additional zero-balance player accounts using Supabase's account-number generator. The [`supabase/migrations/20261101160000_manage_player_accounts.sql`](./supabase/migrations/20261101160000_manage_player_accounts.sql) migration adds server-only account rename and archive RPCs. The [`supabase/migrations/20261101160500_require_player_account.sql`](./supabase/migrations/20261101160500_require_player_account.sql) migration ensures every player retains at least one account. The [`supabase/migrations/20261101161000_archive_player_accounts.sql`](./supabase/migrations/20261101161000_archive_player_accounts.sql) migration adds an archive timestamp, excludes archived accounts from active account state, and preserves their rows for ledger history. The [`supabase/migrations/20261101161200_guard_archived_transaction_actor.sql`](./supabase/migrations/20261101161200_guard_archived_transaction_actor.sql) migration also prevents ledger transactions from referencing archived accounts. The [`supabase/migrations/20261101162500_reuse_archived_account_names.sql`](./supabase/migrations/20261101162500_reuse_archived_account_names.sql) migration allows a name to be reused after its previous account is archived. The [`supabase/migrations/20261101163000_return_active_accounts_in_state.sql`](./supabase/migrations/20261101163000_return_active_accounts_in_state.sql) migration makes the existing account-state RPC return only active accounts, avoiding a redundant account-list request while keeping archived transactions visible in history. The [`supabase/migrations/20261101181600_move_economy_tables_to_economy_schema.sql`](./supabase/migrations/20261101181600_move_economy_tables_to_economy_schema.sql) migration moves the account and transaction tables into the `economy` schema, and [`supabase/migrations/20261101182100_rename_economy_tables.sql`](./supabase/migrations/20261101182100_rename_economy_tables.sql) removes the redundant prefix, naming them `economy.accounts`, `economy.transactions`, and `economy.transactions_entries`, while preserving existing data, functions, and restrictions. The RPC functions remain in `public`; apps accessing the tables through Supabase's Data API must add `economy` to the project's exposed schemas and select it using the `Accept-Profile`/`Content-Profile` headers. The app associates a local bank profile with `identities_player` by SteamID64 and lists every active `economy.accounts` row of type `player` attached to that identity. Players can name additional accounts and move funds between their own accounts using the transfer flow. Account creation does not change existing balances. The Main account cannot be renamed or archived; other accounts can be renamed, while archiving requires at least one other active account and an exactly zero balance. Archived accounts are hidden from active account lists and cannot be used in new transfers; their account data and transaction history remain in Supabase. Other apps using these shared tables should likewise filter active accounts with `archived_at IS NULL` and reject transactions involving archived accounts. Balances and transfer amounts are stored in cents (`$500.00` is `50000`).

For an existing MariaDB volume, apply the default-only migration to ensure any subsequently created local credential records also start at zero. It does not change existing rows:
```
docker compose exec -T db sh -c 'mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" "$MARIADB_DATABASE"' < docker/migrations/005_zero_new_account_balance.sql
```

The database is stored in the `db-data` Docker volume. Legacy activity JSON files remain in `account-data` after import as a backup. To stop the site, run `docker compose down`. **Do not run `docker compose down -v` unless you intend to delete the database and legacy activity files.**

The default database credentials in `docker-compose.yml` are for local development only. You can override `DB_USER`, `DB_PASSWORD`, and `DB_ROOT_PASSWORD` with environment variables before starting Compose. Node/npm are only needed for local frontend development; Docker builds the static React app as part of the web image.

Signup and login ensure the Supabase player identity and its accounts are available, profile changes update the shared identity, and transfers debit the selected owned account and credit the recipient account while appending ledger entries in one Supabase database transaction. MariaDB remains responsible only for this app's local username/password authentication; it is not authoritative for balances or activity.

Supabase ledger entries are timestamped when created. Both sides of a transfer receive their own entry, and activity tables display the date and time.

## Updating
Rebuild and restart the containers after updating the source:
```
docker compose up --build -d
```
The `db-data` and `account-data` volumes are preserved.

When updating an existing database after a schema change, apply its migration once. For the SteamID and Discord ID signup fields, run:
```
docker compose exec -T db sh -c 'mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" "$MARIADB_DATABASE"' < docker/migrations/001_add_signup_platform_ids.sql
```
The migration is safe to run more than once.

Sign-in and signup use usernames only. To allow new users without a stored email value, update an existing database with:
```
docker compose exec -T db sh -c 'mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" "$MARIADB_DATABASE"' < docker/migrations/004_make_email_optional.sql
```
Existing stored values are preserved; new accounts do not need or store an email value.

To convert an existing database to one SteamID-numbered account per user, run:
```
docker compose exec -T db sh -c 'mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" "$MARIADB_DATABASE"' < docker/migrations/002_single_steamid_accounts.sql
```
This updates the legacy MariaDB schema; its balance values are no longer used by the app. Existing users without a SteamID can add it from their profile. Apply `005_zero_new_account_balance.sql` afterward to set the legacy default to zero. Transfers are sent to another player's account number.

To move activity history into the database, first create the activity table and then import the existing JSON files:
```
docker compose exec -T db sh -c 'mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" "$MARIADB_DATABASE"' < docker/migrations/003_create_account_activities.sql
docker compose exec web php /var/www/html/docker/migrations/import_legacy_activities.php
```
The import can be rerun safely for legacy MariaDB data. New signups and transfers use the Supabase economy ledger. The account page shows the five newest entries; the Activities page shows the 15 newest entries.
## How to use

### Sign up
Click on `join us` on the website and fill in the username, password, and account details to sign up. Sign in with your username and password.
Each local login is linked to a Supabase player identity by SteamID64. The Accounts page displays all active player accounts on that identity; account numbers and balances are managed by Supabase. Archiving an account hides it from active account state while preserving transaction history.
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
