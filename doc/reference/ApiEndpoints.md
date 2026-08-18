# Technical Reference: REST API Endpoints

This document provides the authoritative technical reference for all REST API endpoints provided by the Next.js serverless backend (`apps/web`).

---

## 🔒 Authentication

All API endpoints (except `/api/auth/login`) require authentication via one of three methods:

1. **Session Cookie**: Signed HttpOnly JWT cookie (`reading_tracker_session`).
2. **API Key Header**: `x-api-key: <APP_PASSWORD>`
3. **Bearer Token**: `Authorization: Bearer <APP_PASSWORD>`

---

## 📚 Books Endpoints

### `GET /api/books`
Returns active library books or soft-deleted items in the trash.

* **Query Parameters**:
  * `trash` *(optional, string)*: Set `trash=1` to list soft-deleted items.
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
Creates a new book entry.

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
Updates an existing book's metadata or progression.

* **Path Parameters**:
  * `id` *(UUID)*: Book identifier.
* **Request Body** *(Partial)*:
  ```json
  {
    "progress": 35,
    "rating": 4.5,
    "is_favorite": true
  }
  ```
* **Special Flags**:
  * `{ "restore": true }`: Restores a soft-deleted book from trash.
* **Response**: `200 OK`

---

### `DELETE /api/books/[id]`
Soft-deletes a book (moves to trash) or permanently removes it.

* **Query Parameters**:
  * `permanent` *(optional)*: Set `permanent=1` for hard deletion.
* **Response**: `200 OK`

---

## 📝 Reading Logs Endpoints

### `POST /api/books/[id]/log`
Records an atomic reading session advancement.

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
    "entry_id": "uuid-of-new-log",
    "from_progress": 30,
    "to_progress": 45,
    "pace": 15.0
  }
  ```

---

## ⚙️ Settings & Import/Export

* `GET /api/settings` — Returns user display preferences and goals.
* `PATCH /api/settings` — Updates settings (rating style, reading goals, density).
* `GET /api/export` — Downloads sanitized library CSV.
* `POST /api/import` — Bulk imports multipart/form-data CSV.
