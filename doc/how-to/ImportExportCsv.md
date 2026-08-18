# How-To: Backup, Restore & Migrate via CSV

This guide explains how to export your entire reading collection to standard CSV for offline backups, and how to bulk import data from external spreadsheets or existing reading logs.

---

## 📤 Exporting Your Library

### Via Web Dashboard
1. Open the web app at your deployment URL or `http://localhost:3000`.
2. Click the **Export** button in the top navigation bar (or navigate directly to `/api/export`).
3. Your browser will download a timestamped CSV file (e.g. `reading-tracker-export-2026-08-18.csv`).

### Security & Sanitization
* All exported text fields are automatically sanitized to prevent **CSV Formula Injection** (`=`, `+`, `-`, `@` triggers are escaped with prepended single quotes).

---

## 📥 Importing Data from CSV

### Supported CSV Format
Your CSV file should include standard header names. The importer is flexible and recognizes multiple variations of column names:

| Standard Column | Supported Aliases | Type | Example |
| :--- | :--- | :--- | :--- |
| `title` | `Title`, `Name`, `Book Title` | String (Required) | *The King in Yellow* |
| `author` | `Author`, `Writer` | String | *Robert W. Chambers* |
| `status` | `Status`, `Reading Status` | Enum | `Reading`, `Completed`, `Plan to Read`, `On Hold`, `Dropped` |
| `progress` | `Progress`, `Current Unit`, `Current Page` | Integer | `30` |
| `total_units` | `Total Units`, `Total Pages`, `Total Chapters` | Integer | `203` |
| `unit_type` | `Unit Type`, `Unit` | String | `pages`, `chapters`, `volumes`, `words` |
| `rating` | `Rating`, `Score` | Number | `4.5` (0.5 to 5.0) |
| `genre_tags` | `Tags`, `Genres`, `Genre` | String (Comma-separated) | `Horror, Classic, Supernatural` |
| `is_favorite` | `Favorite`, `Fav` | Boolean | `true`, `false`, `1`, `0` |
| `date_started` | `Date Started`, `Start Date` | ISO Date | `2026-08-01` |
| `date_finished` | `Date Finished`, `Finish Date` | ISO Date | `2026-08-18` |

---

### Executing Bulk Import

1. Click the **Import** button in the top navigation bar.
2. Select your `.csv` file.
3. Review the preview dialog showing total valid entries detected.
4. Click **Confirm Import**.
5. The importer performs batch upsert operations against the database and reports success counts.
