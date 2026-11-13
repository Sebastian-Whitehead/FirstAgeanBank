## Table `identities_player`

Reference Table for PlayerAlias, and Account IDs

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `created_at` | `timestamptz` |  |
| `alias` | `varchar` |  Nullable |
| `steam_id` | `int8` |  Nullable |
| `discord_id` | `int8` |  Nullable |
| `details` | `jsonb` |  Nullable |

## Table `identities_npc`

containing identity information for non player characters

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `uuid` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |
| `name` | `text` |  Nullable |
| `timeline` | `text` |  Nullable |
| `alive` | `bool` |  Nullable |
| `details` | `jsonb` |  Nullable |

## Table `identities_organizations`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `name` | `text` |  Nullable Unique |
| `organization_type` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `details` | `jsonb` |  Nullable |

## Custom Types / Enums

### `account_type`

`player` | `npc` | `organization` | `system`

