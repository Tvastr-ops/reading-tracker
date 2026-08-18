# Technical Reference: Database Schema

This document outlines the PostgreSQL database schema, tables, triggers, and functions used across the Paperback Reading Tracker ecosystem.

---

## 🗄️ Tables

### 1. `public.books`
Primary repository of user reading entries.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `PRIMARY KEY, DEFAULT gen_random_uuid()` | Unique book identifier |
| `title` | `text` | `NOT NULL` | Work title |
| `type` | `text` | `DEFAULT 'Novel'` | Publication type (Novel, Light Novel, Manga, etc.) |
| `unit_type` | `text` | `DEFAULT 'pages'` | Unit measured (pages, chapters, volumes, words) |
| `progress_structure`| `text` | `DEFAULT 'single'` | `single` or `volume_chapter` |
| `progress` | `numeric` | `CHECK (progress >= 0)` | Current reading progress unit |
| `total_units` | `numeric` | `CHECK (total_units >= 0)` | Total units in work (null if ongoing) |
| `parent_progress` | `numeric` | `CHECK (parent_progress >= 0)`| Current volume (multi-tier) |
| `parent_total` | `numeric` | `CHECK (parent_total >= 0)` | Total volumes (multi-tier) |
| `latest_units` | `numeric` | `CHECK (latest_units >= 0)` | Current released units for ongoing serials |
| `is_ongoing` | `boolean` | `DEFAULT false` | Ongoing serialization flag |
| `is_favorite` | `boolean` | `DEFAULT false` | User favorite bookmark flag |
| `status` | `text` | `NOT NULL, DEFAULT 'Plan to Read'`| Reading status |
| `rating` | `numeric` | `CHECK (rating >= 0.5 AND rating <= 5)`| Rating score |
| `reading_pace` | `numeric` | | Real-time calculated velocity (`units/week`)|
| `created_at` | `timestamptz`| `DEFAULT now()` | Creation timestamp |
| `updated_at` | `timestamptz`| `DEFAULT now()` | Last modified timestamp |
| `deleted_at` | `timestamptz`| `DEFAULT null` | Soft delete timestamp (Trash) |

---

### 2. `public.reading_log`
Historical audit trail of all reading advancement sessions.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `PRIMARY KEY, DEFAULT gen_random_uuid()` | Log entry ID |
| `book_id` | `uuid` | `REFERENCES books(id) ON DELETE CASCADE`| Associated book |
| `from_progress` | `numeric` | `NOT NULL` | Unit before session |
| `to_progress` | `numeric` | `NOT NULL` | Unit after session |
| `note` | `text` | | Optional session reflection |
| `logged_at` | `timestamptz`| `DEFAULT now()` | Timestamp of reading session |

---

## ⚡ Triggers & Functions

### `set_updated_at()` Trigger (Migration v11)
Maintains `updated_at` timestamps on row modification.
* **Smart Favorite Rule**: If only `is_favorite` is toggled and zero content fields changed, `updated_at` is preserved to keep shelf ordering undisturbed.
* **Explicit Timestamp Rule**: If caller passes a custom `updated_at` (e.g. sync or historical restore), it is preserved.

### `record_progress()` RPC (Migration v09)
Performs atomic advancement:
1. Acquires a row lock on the target book (`FOR UPDATE`).
2. Updates `books.progress`.
3. Inserts a timestamped row into `reading_log`.
4. Recalculates full-history reading velocity and updates `books.reading_pace`.
