## Table `service_records`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `player_identity_id` | `int8` |  Nullable |
| `npc_identity_id` | `int8` |  Nullable |
| `organization_id` | `int8` |  |
| `current_rank` | `text` |  Nullable |
| `service_status` | `text` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `service_events`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `service_record_id` | `int8` |  |
| `event_type` | `text` |  |
| `occured_at` | `timestamptz` |  |
| `rank` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `notes` | `text` |  Nullable |
| `details` | `jsonb` |  Nullable |
| `recorded_at` | `timestamptz` |  |

## Table `sessions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `timeline` | `text` |  |
| `session_name` | `text` |  |
| `operation` | `text` |  Nullable |
| `description` | `text` |  Nullable |
| `start_at` | `timestamptz` |  |
| `end_at` | `timestamptz` |  Nullable |
| `external_event_id` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `attendance`

Session Attendance Record

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `service_record_id` | `int8` |  |
| `session_id` | `int8` |  |
| `attendance_status` | `attendance_status` |  |
| `notes` | `text` |  Nullable |
| `recorded_at` | `timestamptz` |  |
| `recorded_by` | `text` |  Nullable |

## Custom Types / Enums

### `attendance_status`

`present` | `absent` | `on_leave` | `excused`

