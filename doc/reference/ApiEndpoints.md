# API Reference: REST Endpoints

REST API endpoints provided by the Next.js backend (`apps/web`).

---

## Authentication

Endpoints require authentication via one of the following methods:

* **Session Cookie**: `reading_tracker_session` (Signed HttpOnly JWT)
* **API Key Header**: `x-api-key: <APP_PASSWORD>`
* **Bearer Token**: `Authorization: Bearer <APP_PASSWORD>`

> [!TIP]
> For quick terminal testing or automation scripts, pass the `x-api-key: <APP_PASSWORD>` header:
> ```bash
> curl -H "x-api-key: your_password" http://localhost:3000/api/books
> ```

---

## Books

### `GET /api/books`
Lists library books.

* **Query Parameters**:
  * `trash` *(optional)*: Pass `trash=1` to list soft-deleted records.
* **Response**: `200 OK`
  ```json
  {
    "books": [
      {
        "id": "fc0fbb94-00f5-4072-b3cd-59d273267f39",
        "title": "The Metamorphosis",
        "type": "Novella",
        "unit_type": "pages",
        "progress_structure": "single",
        "author": "Franz Kafka",
        "status": "Completed",
        "rating": 3.5,
        "progress": 67,
        "total_units": 67,
        "is_favorite": true,
        "is_ongoing": false,
        "date_started": "2026-07-07",
        "date_finished": "2026-07-15",
        "updated_at": "2026-07-15T12:00:00.000Z"
      }
    ]
  }
  ```

---

### `POST /api/books`
Creates a book record.

* **Request Body**:
  ```json
  {
    "title": "The King in Yellow",
    "type": "Novel",
    "unit_type": "pages",
    "author": "Robert W. Chambers",
    "status": "Reading",
    "progress": 30,
    "total_units": 203,
    "date_started": "2026-08-01"
  }
  ```
* **Response**: `201 Created`

---

### `PATCH /api/books/[id]`
Updates book metadata or reading status.

* **Path Parameters**:
  * `id` *(UUID)*: Book record identifier.
* **Request Body**:
  ```json
  {
    "progress": 35,
    "rating": 4.5,
    "is_favorite": true
  }
  ```
* **Flags**:
  * `{ "restore": true }`: Restores a soft-deleted book from trash.
* **Response**: `200 OK`

---

### `DELETE /api/books/[id]`
Deletes a book record.

* **Query Parameters**:
  * `permanent` *(optional)*: Pass `permanent=1` for hard deletion; otherwise, sets `deleted_at` (soft delete).
* **Response**: `200 OK`

---

## Reading Logs

### `POST /api/books/[id]/log`
Records an atomic reading session update.

* **Request Body**:
  ```json
  {
    "to_progress": 45,
    "note": "Finished Chapter 3"
  }
  ```
* **Response**: `200 OK`
  ```json
  {
    "entry_id": "uuid",
    "from_progress": 30,
    "to_progress": 45,
    "pace": 15.0
  }
  ```

## Reading Journeys

### `GET /api/books/[id]/journeys`
Lists all reading journeys (past completed reads and active re-reads) for a book.

* **Response**: `200 OK`
  ```json
  {
    "journeys": [
      {
        "id": "uuid",
        "book_id": "uuid",
        "journey_index": 2,
        "status": "reading",
        "date_started": "2026-08-15T00:00:00Z",
        "date_finished": null,
        "rating": null
      },
      {
        "id": "uuid",
        "book_id": "uuid",
        "journey_index": 1,
        "status": "completed",
        "date_started": "2026-05-01T00:00:00Z",
        "date_finished": "2026-05-20T00:00:00Z",
        "rating": 5.0
      }
    ]
  }
  ```

---

### `POST /api/books/[id]/journeys`
Starts a re-read cycle. Closes any active journey, creates the new journey (`journey_index = reread_count + 1`), resets book progress to 0, and increments `reread_count`.

* **Response**: `201 Created`
  ```json
  {
    "journey": { "id": "uuid", "journey_index": 2, "status": "reading" },
    "book": { "id": "uuid", "progress": 0, "status": "Reading", "reread_count": 1 }
  }
  ```

---

## Settings & Utilities

* `GET /api/settings` — Returns user display preferences and goals.
* `PATCH /api/settings` — Updates settings (rating style, reading goals, density).
* `GET /api/export` — Downloads sanitized library CSV.
* `POST /api/import` — Bulk imports multipart/form-data CSV.
