# Library Backup & CSV Migration

Procedures for exporting library data to CSV for backups and importing external reading records.

---

## Exporting Library Data

### Web Interface
1. In the web dashboard navigation, click **Export** (or fetch `/api/export`).
2. The browser downloads a timestamped CSV file: `reading-tracker-export-<DATE>.csv`.

> [!NOTE]
> **CSV Formula Injection Defense**: All exported string fields are automatically sanitized. Leading characters matching `=`, `+`, `-`, or `@` are escaped with prepended single quotes so opening exports in Excel or Google Sheets cannot execute external formulas.

---

## Importing CSV Records

### Column Schema & Aliases

The importer recognizes standard column names and common third-party spreadsheet headers:

| Field | Recognized Headers | Type | Example |
| :--- | :--- | :--- | :--- |
| `title` | `Title`, `Name`, `Book Title` | String (Required) | *The King in Yellow* |
| `author` | `Author`, `Writer` | String | *Robert W. Chambers* |
| `status` | `Status`, `Reading Status` | Enum | `Reading`, `Completed`, `Plan to Read` |
| `progress` | `Progress`, `Current Unit`, `Current Page` | Numeric | `30` |
| `total_units` | `Total Units`, `Total Pages`, `Total Chapters` | Numeric | `203` |
| `unit_type` | `Unit Type`, `Unit` | String | `pages`, `chapters`, `volumes` |
| `rating` | `Rating`, `Score` | Numeric | `4.5` (0.5 – 5.0) |
| `genre_tags` | `Tags`, `Genres`, `Genre` | String (Comma-separated) | `Horror, Classic` |
| `is_favorite` | `Favorite`, `Fav` | Boolean | `true`, `false`, `1`, `0` |
| `date_started` | `Date Started`, `Start Date` | ISO 8601 Date | `2026-08-01` |
| `date_finished` | `Date Finished`, `Finish Date` | ISO 8601 Date | `2026-08-18` |

---

## Execution

1. In the web navigation bar, click **Import**.
2. Select your `.csv` file.
3. Review the parsed record preview.
4. Click **Confirm Import** to perform the batch upsert against the database.
