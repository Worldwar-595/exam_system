# API Documentation — Exam Scheduling & Result Management System

Base URL (local development): `http://localhost:3000/api`

All responses are JSON in the shape:
```json
{ "success": true, "data": ... }
{ "success": false, "error": "message", "details": [ ... ] }
```

Protected endpoints require header: `Authorization: Bearer <JWT>`
(obtained from `/auth/login` or `/auth/register`).

Roles: `admin`, `lecturer`, `student`.

---

## Auth

### POST /auth/register
Create a new account.
- **Auth**: none
- **Body**: `{ "name": "string", "email": "string", "password": "min 8 chars", "role": "admin|lecturer|student" }`
- **Success 201**:
```json
{ "success": true, "data": { "user": { "user_id": 10, "name": "...", "email": "...", "role": "student", "created_at": "..." }, "token": "jwt..." } }
```
- **Errors**: `409` email already exists, `422` validation failed.

### POST /auth/login
- **Auth**: none
- **Body**: `{ "email": "string", "password": "string" }`
- **Success 200**: same shape as register.
- **Errors**: `401` invalid email or password.

### GET /auth/me
- **Auth**: required (any role)
- **Success 200**: `{ "success": true, "data": { "user_id": 1, "name": "...", "email": "...", "role": "admin", "created_at": "..." } }`
- **Errors**: `401` missing/invalid token.

---

## Users `/users`

| Method | Path | Role | Description |
|---|---|---|---|
| GET | /users | admin | List users. Query: `role`, `search`, `sortBy` (name/email/role/created_at), `order` (asc/desc), `page`, `limit` |
| GET | /users/:id | any authenticated | Get a single user |
| PUT | /users/:id | admin, or self | Update name/email/password (role change: admin only) |
| DELETE | /users/:id | admin | Delete a user |

**Sample success (GET /users?page=1&limit=5):**
```json
{
  "success": true,
  "data": [ { "user_id": 1, "name": "Aisha Rahman", "email": "admin@uptm.edu.my", "role": "admin", "created_at": "..." } ],
  "pagination": { "page": 1, "limit": 5, "total": 9, "totalPages": 2 }
}
```
**Errors**: `401` not authenticated, `403` wrong role, `404` user not found, `422` validation failed.

---

## Courses `/courses`

| Method | Path | Role | Description |
|---|---|---|---|
| GET | /courses | any authenticated | List courses. Query: `faculty_id`, `lecturer_id`, `search`, `sortBy` (course_code/course_name/created_at), `order`, `page`, `limit` |
| GET | /courses/:id | any authenticated | Get one course |
| POST | /courses | admin | Create a course |
| PUT | /courses/:id | admin, or lecturer who teaches it | Update a course |
| DELETE | /courses/:id | admin | Delete a course |

**POST /courses body:**
```json
{ "course_code": "SWC3633", "course_name": "Web API Development", "faculty_id": 1, "lecturer_id": 2 }
```
**Sample success 201:**
```json
{ "success": true, "data": { "course_id": 6, "course_code": "SWC3633", "course_name": "Web API Development", "faculty_id": 1, "lecturer_id": 2, "created_at": "..." } }
```
**Errors**: `401`, `403` (non-admin creating), `404`, `422` (bad faculty_id/lecturer_id or missing fields).

---

## Examinations `/examinations`

| Method | Path | Role | Description |
|---|---|---|---|
| GET | /examinations | any authenticated | List exams. Students see only exams for registered courses. Query: `course_id`, `search`, `sortBy` (exam_date/start_time/venue), `order`, `page`, `limit` |
| GET | /examinations/:id | any authenticated | Get one exam |
| GET | /examinations/:id/slip | any authenticated | **Third-party API**: generates a QR-code exam slip via api.qrserver.com |
| POST | /examinations | admin, lecturer | Schedule an exam |
| PUT | /examinations/:id | admin, lecturer who teaches the course | Update an exam |
| DELETE | /examinations/:id | admin | Delete an exam |

**POST /examinations body:**
```json
{ "course_id": 1, "exam_date": "2026-12-01", "start_time": "09:00", "end_time": "11:00", "venue": "Hall C" }
```
**GET /examinations/:id/slip sample success 200:**
```json
{
  "success": true,
  "data": {
    "exam": { "exam_id": 1, "course_code": "SWC3633", "exam_date": "2026-11-10", "start_time": "09:00", "venue": "Hall A, Block 3" },
    "student_name": "Ali Hassan",
    "qr_code": { "qr_image_url": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=...", "content_type": "image/png" }
  }
}
```
**Errors**: `401`, `403` (student not registered / wrong lecturer), `404`, `422` (bad date/time format).

---

## Results `/results`

| Method | Path | Role | Description |
|---|---|---|---|
| GET | /results | any authenticated | List results. Students see only their own. Query: `student_id`, `exam_id`, `sortBy` (score/grade/published_at), `order`, `page`, `limit` |
| GET | /results/:id | any authenticated | Get one result (students: own only) |
| POST | /results | admin, lecturer | Publish a result — auto-calculates grade and creates a notification for the student |
| PUT | /results/:id | admin, lecturer | Update a result's score (grade recalculated) |
| DELETE | /results/:id | admin | Delete a result |

**POST /results body:**
```json
{ "student_id": 4, "exam_id": 1, "score": 82.5 }
```
**Sample success 201:**
```json
{ "success": true, "data": { "result_id": 8, "student_id": 4, "exam_id": 1, "score": 82.5, "grade": "A", "published_at": "..." } }
```
Grading scale: A ≥ 80, B ≥ 70, C ≥ 60, D ≥ 50, F < 50.
**Errors**: `401`, `403`, `404`, `422` (score out of 0–100 range, bad IDs).

---

## Notifications `/notifications`

| Method | Path | Role | Description |
|---|---|---|---|
| GET | /notifications | any authenticated | List own notifications (admin can pass `?user_id=` to view another user's) |
| POST | /notifications | admin, lecturer | Send a manual notification to a user |

**POST /notifications body:**
```json
{ "user_id": 4, "message": "Your exam venue has changed.", "type": "exam_schedule" }
```

---

## System

### GET /health
- **Auth**: none
- **Success 200**: `{ "success": true, "message": "Exam Scheduling & Result Management API is running." }`

---

## HTTP Status Codes Used

| Code | Meaning |
|---|---|
| 200 | Success (GET, PUT, DELETE) |
| 201 | Resource created (POST) |
| 401 | Missing/invalid/expired JWT, or wrong credentials |
| 403 | Authenticated but not authorised for this action (RBAC) |
| 404 | Resource not found |
| 409 | Conflict (duplicate email, DB constraint violation) |
| 422 | Validation failed (see `details` array) |
| 429 | Rate limit exceeded |
| 500 | Unhandled server error |

## Security & Middleware Summary

- **Authentication**: JWT (2-hour expiry), verified in `middleware/auth.js`.
- **Authorization**: role-based access control in `middleware/role.js`, plus ownership checks in controllers (e.g. a lecturer can only edit their own courses/exams; a student can only see their own results).
- **Validation**: `express-validator` rule chains + `middleware/validate.js`.
- **Central error handling**: `middleware/errorHandler.js` catches thrown `ApiError`s and DB constraint errors.
- **Logging**: `morgan` (console) + custom `middleware/logger.js` (structured, includes acting user).
- **Rate limiting**: global limiter (300 req / 15 min) and a stricter `/auth` limiter (20 req / 15 min).
- **HTTP security headers**: `helmet`.
- **API management**: pagination (`page`, `limit`), filtering (`role`, `faculty_id`, `course_id`, `exam_id`, `student_id`), search (`search`), sorting (`sortBy`, `order`) — implemented consistently across list endpoints.
- **Third-party API**: QR Code Generator (api.qrserver.com) for exam slips at `GET /examinations/:id/slip`.
