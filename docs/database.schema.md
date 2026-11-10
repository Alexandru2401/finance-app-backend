## Table `users`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `username` | `varchar` |  Nullable |
| `email` | `varchar` |  Unique |
| `password` | `varchar` |  |
| `plan_type` | `varchar` |  Nullable |
| `is_active` | `bool` |  |
| `created_at` | `timestamp` |  |
| `user_id` | `uuid` | Primary |
| `language` | `language_code` |  |
| `currency` | `currency_code` |  |

## Table `refresh_tokens`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `token_id` | `uuid` | Primary |
| `user_id` | `uuid` |  Nullable |
| `token` | `varchar` |  |
| `expires_at` | `timestamp` |  |
| `created_at` | `timestamp` |  |

## Table `categories`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `category_id` | `uuid` | Primary |
| `user_id` | `uuid` |  Nullable |
| `type` | `budget_type` |  |
| `name` | `varchar` |  |
| `created_at` | `timestamptz` |  |
| `key` | `varchar` |  Nullable |

## Table `budget_items`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `item_id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `type` | `budget_type` |  |
| `category_id` | `uuid` |  Nullable |
| `amount` | `numeric` |  |
| `date` | `date` |  |
| `notes` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `budget_targets`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `month` | `date` |  |
| `income` | `numeric` |  Nullable |
| `expense` | `numeric` |  Nullable |
| `savings` | `numeric` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Custom Types / Enums

### `language_code`

`ro` | `en`

### `currency_code`

`USD` | `RON` | `EUR`

### `budget_type`

`income` | `expense` | `savings`

