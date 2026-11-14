# Graph Report - FirstAgeanBank  (2026-11-12)

## Corpus Check
- Corpus is ~21,653 words - fits in a single context window. You may not need a graph.

## Summary
- 353 nodes · 645 edges · 38 communities (14 shown, 24 thin omitted)
- Extraction: 87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS · INFERRED: 81 edges (avg confidence: 0.9)
- Token cost: 123,347 input · 0 output

## Community Hubs (Navigation)
- React Pages & Layout
- Supabase Economy RPCs
- Project Docs & Plans
- Supabase Auth Schema
- PHP Auth & Supabase API
- Frontend Auth & Session
- Legacy Assets & Ledger Concepts
- Frontend Build Config
- Docker Compose Config
- Economy & Military Schema
- Investments Widgets
- Password Visibility Icons
- Island Imagery & Logo
- Roleplay Notice
- Username Directory RPCs
- Legacy Account Activities
- Stocks Table
- Auth Custom OAuth Providers
- Auth Schema Migrations

## God Nodes (most connected - your core abstractions)
1. `react` - 20 edges
2. `useSession()` - 19 edges
3. `messageForError()` - 19 edges
4. `getSupabaseClient()` - 17 edges
5. `AppLayout()` - 16 edges
6. `Message()` - 15 edges
7. `AccountsPage()` - 13 edges
8. `auth.users table` - 13 edges
9. `react-router-dom` - 12 edges
10. `SignupPage()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `assets/users Folder Placeholder` --conceptually_related_to--> `Gull-le-Belle 1.0.0 Changelog`  [AMBIGUOUS]
  assets/users/delete.txt → changelog.txt
- `Never Trust Browser-Sent Discord/Steam/Player IDs` --semantically_similar_to--> `Verified Discord ID to Single identities_player Resolution`  [INFERRED] [semantically similar]
  CLAUDE.md → Claude Plans/plan.md
- `Gull-le-Belle 1.0.0 Changelog` --references--> `Legacy 404 Not Found Page`  [INFERRED]
  changelog.txt → assets/error-html/404.html
- `First Agean Bank Vite HTML Shell` --conceptually_related_to--> `Fictional Role-play Acknowledgement`  [INFERRED]
  frontend/index.html → README.md
- `Never Trust Browser-Sent Discord/Steam/Player IDs` --rationale_for--> `Plan: Remove Manual Discord ID Field from Signup`  [INFERRED]
  CLAUDE.md → Claude Plans/discord-id-removal-plan.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Supabase Economy Ledger Protections** — readme_fab_rpcs, readme_economy_schema, readme_account_archiving, readme_atomic_transfers, readme_service_role_key [INFERRED 0.85]
- **Legacy Gull-le-Belle Features** — changelog_gull_le_belle_1_0_0, readme_setup_json, readme_download_button, assets_error_html_404_not_found_page [INFERRED 0.85]
- **Arma island silhouettes in shared blue brand style** — assets_png_altis_silhouette_image, assets_png_malden_silhouette_image, assets_png_stratis_silhouette_image [INFERRED 0.85]
- **Password visibility toggle icon set** — assets_png_visibility_black_18dp_1x_outline_visibility_black_18dp_icon, assets_png_visibility_black_18dp_2x_outline_visibility_black_18dp_icon, assets_png_visibility_off_black_18dp_1x_outline_visibility_off_black_18dp_icon, assets_png_visibility_off_black_18dp_2x_outline_visibility_off_black_18dp_icon, assets_svg_visibility_black_18dp_icon [INFERRED 0.75]
- **Economy double-entry ledger** — schema_economy_accounts, schema_economy_transactions, schema_economy_transactions_entries [INFERRED 0.95]
- **Shared identity owners (player/npc/organization)** — schema_public_identities_player, schema_public_identities_npc, schema_public_identities_organizations, schema_public_account_type [INFERRED 0.85]
- **Auth MFA subsystem** — schema_auth_mfa_factors, schema_auth_mfa_challenges, schema_auth_mfa_amr_claims, schema_auth_mfa_recovery_code_sets, schema_auth_mfa_recovery_codes [INFERRED 0.85]
- **Pending Signup Discord Linking Flow** — claude_plans_discord_id_removal_plan_beginsignup, claude_plans_discord_id_removal_plan_continuependingsignup, claude_plans_discord_id_removal_plan_finishpendingsignup, claude_plans_discord_id_removal_plan_completependingsignup, claude_plans_discord_id_removal_plan_pending_signup_key [EXTRACTED 1.00]
- **Server-Side Trust Boundary (verified identity, secrets, RPCs)** — claude_never_trust_browser_ids, claude_plans_plan_verified_discord_identity_resolution, claude_plans_plan_fab_rpc_paths, claude_plans_plan_service_role_secret [INFERRED 0.85]

## Communities (38 total, 24 thin omitted)

### Community 0 - "React Pages & Layout"
Cohesion: 0.14
Nodes (32): App(), AppLayout(), PrivateRoutes(), ActivityTable(), Footer(), Message(), Brand(), Navigation() (+24 more)

### Community 1 - "Supabase Economy RPCs"
Cohesion: 0.08
Nodes (20): public.fab_ensure_player_account(), public.fab_get_player_account(), public.fab_transfer(), public.fab_update_player_identity(), public.fab_create_player_account(), public.fab_delete_player_account(), public.fab_rename_player_account(), public.fab_delete_player_account() (+12 more)

### Community 2 - "Project Docs & Plans"
Cohesion: 0.09
Nodes (28): Auth / Identity Flow Map, CLAUDE.md Claude Notes, Dev Environment (Windows, Docker, Vite build), Legacy PHP Form Handlers Return 410, Plan: Remove Manual Discord ID Field from Signup, beginSignup (auth.ts), completePendingSignup (auth.ts), continuePendingSignup (auth.ts) (+20 more)

### Community 3 - "Supabase Auth Schema"
Cohesion: 0.08
Nodes (33): aal_level enum, auth.audit_log_entries table, code_challenge_method enum, factor_status enum, factor_type enum, auth.flow_state table, auth.instances table, auth.mfa_amr_claims table (+25 more)

### Community 4 - "PHP Auth & Supabase API"
Cohesion: 0.10
Nodes (16): AuthenticatedPlayerException, currentAuthenticatedPlayer(), requireAuthenticatedPlayer(), createExternalPlayerAccount(), deleteExternalPlayerAccount(), renameExternalPlayerAccount(), finishRequest(), isJsonRequest() (+8 more)

### Community 5 - "Frontend Auth & Session"
Cohesion: 0.19
Nodes (25): SessionProvider(), requestJson(), beginSignup(), completePendingSignup(), continuePendingSignup(), discordIdForUser(), finishPendingSignup(), isEmailIdentifier() (+17 more)

### Community 6 - "Legacy Assets & Ledger Concepts"
Cohesion: 0.09
Nodes (27): Legacy 404 Not Found Page, assets/users Folder Placeholder, Gull-le-Belle 1.0.0 Changelog, First Agean Bank Vite HTML Shell, Account Archiving (archived_at), Atomic Transfers with Ledger Entries, Balances Stored in Cents, Experimental Download Button (+19 more)

### Community 7 - "Frontend Build Config"
Cohesion: 0.13
Nodes (17): dependencies, react@^19.1.0, react-dom@^19.1.0, react-router-dom@^7.18.4, @supabase/supabase-js@^2.119.0, devDependencies, vite@^6.3.5, @vitejs/plugin-react@^4.7.0 (+9 more)

### Community 8 - "Docker Compose Config"
Cohesion: 0.13
Nodes (14): VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_URL, args, context, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, name (+6 more)

### Community 9 - "Economy & Military Schema"
Cohesion: 0.22
Nodes (13): auth.identities table, economy.accounts table, economy.transactions table, economy.transactions_entries table, military.attendance table, attendance_status enum, military.service_events table, military.service_records table (+5 more)

### Community 10 - "Investments Widgets"
Cohesion: 0.25
Nodes (9): TradingViewWidget(), WidgetCard(), heatmap, hotlists, InvestmentsPage(), marketTabs, overview, screener (+1 more)

### Community 11 - "Password Visibility Icons"
Cohesion: 0.31
Nodes (9): Clear (X) Icon 18dp 1x, Material Design Icons, Clear (X) Icon 18dp 2x, Visibility (Show Password) Icon 18dp 1x, Password Visibility Toggle, Visibility (Show Password) Icon 18dp 2x, Visibility Off (Hide Password) Icon 18dp 1x, Visibility Off (Hide Password) Icon 18dp 2x (+1 more)

### Community 12 - "Island Imagery & Logo"
Cohesion: 0.40
Nodes (5): Altis Island Silhouette (blue map shape), First Agean Bank Logo (renders blank/white, likely white-on-transparent), Arma Island Silhouette Set (bank branch/region imagery), Malden Island Silhouette (blue map shape), Stratis Island Silhouette (blue map shape)

### Community 14 - "Username Directory RPCs"
Cohesion: 0.83
Nodes (3): private.auth_username_directory, public.fab_get_auth_email_for_username(), public.fab_register_auth_username()

## Ambiguous Edges - Review These
- `assets/users Folder Placeholder` → `Gull-le-Belle 1.0.0 Changelog`  [AMBIGUOUS]
  assets/users/delete.txt · relation: conceptually_related_to
- `economy.stocks table` → `stock_volatility enum`  [AMBIGUOUS]
  schema/economy.md · relation: references

## Knowledge Gaps
- **49 isolated node(s):** `Investments Page with TradingView Widgets`, `Supabase Publishable Key (frontend)`, `Supabase Manual Identity Linking`, `Private Username-to-Email Directory`, `Balances Stored in Cents` (+44 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 120 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `React Pages & Layout` to `Investments Widgets`, `Roleplay Notice`, `Frontend Build Config`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `Investments Page with TradingView Widgets`, `Supabase Publishable Key (frontend)`, `Supabase Manual Identity Linking` to the rest of the system?**
  _49 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `React Pages & Layout` be split into smaller, more focused modules?**
  _Cohesion score 0.13642960812772134 - nodes in this community are weakly interconnected._
- **Why does `auth.users table` connect `Supabase Auth Schema` to `Economy & Military Schema`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Should `Supabase Economy RPCs` be split into smaller, more focused modules?**
  _Cohesion score 0.08170731707317073 - nodes in this community are weakly interconnected._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `assets/users Folder Placeholder` and `Gull-le-Belle 1.0.0 Changelog`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `economy.stocks table` and `stock_volatility enum`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._