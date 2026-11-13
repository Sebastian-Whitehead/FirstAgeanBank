## Table `accounts`

table containing all economy driven accounts that can be transferred between

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `account_type` | `account_type` |  Nullable |
| `account_number` | `text` |  Unique |
| `account_name` | `text` |  Nullable |
| `player_identity_id` | `int8` |  Nullable |
| `npc_identity_id` | `int8` |  Nullable Unique |
| `organization_id` | `int8` |  Nullable Unique |
| `system_key` | `text` |  Nullable |
| `money` | `int8` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `archived_at` | `timestamptz` |  Nullable |

## Table `transactions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `idempotency_key` | `text` |  Unique |
| `transaction_type` | `text` |  |
| `reference_id` | `text` |  Nullable |
| `actor_account_id` | `int8` |  Nullable |
| `actor_label` | `text` |  Nullable |
| `description` | `text` |  Nullable |
| `reversal_of_transaction_id` | `uuid` |  Nullable Unique |
| `created_at` | `timestamptz` |  |

## Table `transactions_entries`

describes the balance change for one account

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `transaction_id` | `uuid` |  |
| `account_id` | `int8` |  |
| `money_delta` | `int8` |  |

## Table `stocks`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `ticker` | `text` | Primary Unique |
| `company_name` | `text` |  |
| `market_cap` | `text` |  |
| `sector` | `text` |  |
| `investor_rating` | `text` |  |
| `investment_style` | `text` |  |
| `pricing_volatility` | `text` |  |
| `current_price` | `numeric` |  |
| `investor_confidence_factor` | `int4` |  |
| `news_sentiment_factor` | `int4` |  |
| `innovation_factor` | `int4` |  |
| `trading_demand_factor` | `int4` |  |
| `liquidity_factor` | `int4` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `investor_confidence_weight` | `numeric` |  |
| `news_sentiment_weight` | `numeric` |  |
| `innovation_weight` | `numeric` |  |
| `trading_demand_weight` | `numeric` |  |
| `liquidity_weight` | `numeric` |  |

## Custom Types / Enums

### `stock_volatility`

`Low` | `Normal` | `Stable` | `High` | `Extreme`

