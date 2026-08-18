# Database Schema Reference

PostgreSQL tables, constraints, triggers, and RPC functions in the Paperback ecosystem.

---

## Tables

### `public.books`
Primary book catalog records.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `PRIMARY KEY, DEFAULT gen_random_uuid()` | Record UUID |
| `title` | `text` | `NOT NULL` | Book title |
| `type` | `text` | `DEFAULT 'Novel'` | Publication type (Novel, Light Novel, Manga) |
| `unit_type` | `text` | `DEFAULT 'pages'` | Tracked unit (pages, chapters, volumes) |
| `progress_structure`| `text` | `DEFAULT 'single'` | `single` or `volume_chapter` |
| `progress` | `numeric` | `CHECK (progress >= 0)` | Current reading position |
| `total_units` | `numeric` | `CHECK (total_units >= 0)` | Total units (null if ongoing) |
| `parent_progress` | `numeric` | `CHECK (parent_progress >= 0)`| Current volume (multi-tier) |
| `parent_total` | `numeric` | `CHECK (parent_total >= 0)` | Total volumes (multi-tier) |
| `latest_units` | `numeric` | `CHECK (latest_units >= 0)` | Latest released unit count (ongoing) |
| `is_ongoing` | `boolean` | `DEFAULT false` | Ongoing serialization flag |
| `is_favorite` | `boolean` | `DEFAULT false` | Favorite status |
| `status` | `text` | `NOT NULL, DEFAULT 'Plan to Read'`| Reading status |
| `rating` | `numeric` | `CHECK (rating >= 0.5 AND rating <= 5)`| User rating score |
| `reading_pace` | `numeric` | | Calculated velocity (`units/week`) |
| `created_at` | `timestamptz`| `DEFAULT now()` | Creation timestamp |
| `updated_at` | `timestamptz`| `DEFAULT now()` | Last modified timestamp |
| `deleted_at` | `timestamptz`| `DEFAULT null` | Soft-delete timestamp (Trash) |

> [!NOTE]
> Books in the Trash carry a non-null `deleted_at` timestamp. Standard library queries filter active books with `WHERE deleted_at IS NULL`.

---

### `public.reading_log`
Historical reading session advancements.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `PRIMARY KEY, DEFAULT gen_random_uuid()` | Session entry UUID |
| `book_id` | `uuid` | `REFERENCES books(id) ON DELETE CASCADE`| Target book |
| `from_progress` | `numeric` | `NOT NULL` | Unit position before session |
| `to_progress` | `numeric` | `NOT NULL` | Unit position after session |
| `note` | `text` | | Optional session note |
| `logged_at` | `timestamptz`| `DEFAULT now()` | Session timestamp |

---

## Triggers & Functions

### `set_updated_at()` Trigger (Migration v11)
Maintains row modification timestamps.
* **Favorite Flag Preservation**: If only `is_favorite` changes, `updated_at` is preserved to prevent shelf order churn.
* **Explicit Timestamp Respect**: If caller supplies a custom `updated_at` (e.g. historical restore or sync), it is preserved.

### `record_progress()` RPC (Migration v09)
Executes atomic session logging:
1. Locks the target book row (`FOR UPDATE`).
2. Updates `books.progress`.
3. Inserts a row into `reading_log`.
4. Computes historical reading pace and writes `books.reading_pace`.
