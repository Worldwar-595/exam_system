# Exam Scheduling & Result Management System — SWC3633 Web API Development

A Secure RESTful Web API for managing examination schedules, registrations, and results,
built for the SWC3633 project (Exam Scheduling & Result Management scenario).

## 1. System Overview

**Purpose:** replace manual exam-scheduling processes with a RESTful API that lets
administrators and lecturers manage courses, examinations and results, while students
view their timetable, download an exam slip, and check published results.

**Users:**
- **Administrator** — full control: manage users, courses, exams, results.
- **Lecturer** — manage exams/results for the courses they teach.
- **Student** — view registered courses, exam schedule, results, and get a QR exam slip.

**Technology stack:**
- Backend: Node.js, Express.js
- Database: SQLite (via `better-sqlite3`) — schema is portable to MySQL/PostgreSQL with
  minor type changes (see `backend/database/schema.sql` comments)
- Auth: JWT (`jsonwebtoken`) + `bcryptjs` password hashing
- Validation: `express-validator`
- Security: `helmet`, `express-rate-limit`, RBAC middleware
- Third-party API: QR Code Generator (api.qrserver.com) for exam slips
- Frontend: vanilla HTML/CSS/JS reference client (each student should adapt/rebuild
  their own frontend against the same API per the project brief)

**Architecture:**
```
frontend (HTML/JS)  --->  REST API (Express)  --->  SQLite database
                             |
                             +--> JWT auth + RBAC middleware
                             +--> validation + error-handling middleware
                             +--> rate limiting, logging, security headers
                             +--> QR Code Generator API (third-party)
```

## 2. Repository Structure

```
exam-system/
├── backend/
│   ├── config/db.js            # DB connection, auto-creates schema+seed on first run
│   ├── database/
│   │   ├── schema.sql          # DDL — 7 related tables
│   │   └── seed.sql            # DML — 5+ sample records per table
│   ├── middleware/              # auth, role (RBAC), validate, errorHandler, logger
│   ├── controllers/             # business logic per resource
│   ├── routes/                  # Express routers per resource
│   ├── utils/                   # qrcode.js (3rd-party API), queryHelper.js
│   ├── server.js                # app entry point
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
├── docs/
│   ├── API_DOCUMENTATION.md     # every endpoint documented
│   ├── ERD.md                   # Mermaid ERD + relationship notes
│   └── Postman_collection.json  # importable Postman collection
└── README.md                    # this file
```

## 3. Setup & Run Instructions

**Requirements:** Node.js 18+.

```bash
cd backend
npm install
cp .env.example .env      # edit JWT_SECRET before any real deployment
npm start                 # runs on http://localhost:3000
```

On first run, `config/db.js` automatically executes `database/schema.sql` then
`database/seed.sql` to create `database/exam_system.db` with sample data.
To reset to a clean seeded state at any time:

```bash
npm run resetdb
```

**Run the frontend:** open `frontend/index.html` directly in a browser (or serve it
with any static file server), while the backend is running on port 3000.

> **Troubleshooting `npm install`:** `better-sqlite3` compiles a small native module
> on install and needs normal internet access (to download from
> nodejs.org/GitHub). If it fails behind a restrictive firewall/proxy, either retry
> on unrestricted internet, or swap it for the pure-JS `sql.js` package.

**Demo accounts** (password for all: `Password123!`):
| Role | Email |
|---|---|
| Admin | admin@uptm.edu.my |
| Lecturer | kumar@uptm.edu.my |
| Lecturer | wong@uptm.edu.my |
| Student | ali@student.uptm.edu.my |

**Testing with Postman:** import `docs/Postman_collection.json`. Run "Login as Admin"
and "Login as Student" first — their tests auto-save `{{admin_token}}` /
`{{student_token}}` collection variables used by every other request.

## 4. Database Design

See `docs/ERD.md` for the full ERD and relationship notes, and
`backend/database/schema.sql` / `seed.sql` for the DDL/DML.

7 related tables: `users`, `faculties`, `courses`, `student_course_registration`,
`examinations`, `results`, `notifications`. Primary/foreign keys, `UNIQUE` and `CHECK`
constraints, and cascading deletes are used throughout for data integrity.

## 5. RESTful API

4 core resources (`/users`, `/courses`, `/examinations`, `/results`) plus
`/auth` and `/notifications`. Full CRUD, JSON responses, appropriate HTTP status
codes, RESTful URI conventions, validation and error handling — see
`docs/API_DOCUMENTATION.md`.

## 6. Security & Advanced Features (mapped to rubric A4)

| Requirement | Implementation |
|---|---|
| Authentication | JWT, 2-hour expiry (`middleware/auth.js`) |
| Role-based access control | `middleware/role.js` + ownership checks in controllers (e.g. lecturers only manage their own courses; students only see their own results) |
| Request validation middleware | `express-validator` + `middleware/validate.js` |
| Centralised error-handling middleware | `middleware/errorHandler.js` (`ApiError` class + SQLite constraint mapping) |
| Logging middleware | `morgan` + custom `middleware/logger.js` |
| Rate limiting | `express-rate-limit` — global (300/15min) and stricter on `/auth` (20/15min) |
| Pagination / Filtering / Search / Sorting | implemented on every list endpoint via `utils/queryHelper.js` |
| Third-party API | QR Code Generator (api.qrserver.com) — `GET /examinations/:id/slip` (`utils/qrcode.js`) |
| No secrets exposed | `.env` is git-ignored; `.env.example` provided as a template |

## 7. API Testing & Documentation

`docs/Postman_collection.json` contains a success and an error request for every
endpoint (401/403/404/409/422 cases included).
