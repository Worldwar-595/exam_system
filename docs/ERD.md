# Entity Relationship Diagram

Exam Scheduling & Result Management System — 7 related tables.

```mermaid
erDiagram
    USERS ||--o{ COURSES : "teaches (lecturer_id)"
    USERS ||--o{ STUDENT_COURSE_REGISTRATION : "registers (student_id)"
    USERS ||--o{ EXAMINATIONS : "creates (created_by)"
    USERS ||--o{ RESULTS : "receives (student_id)"
    USERS ||--o{ NOTIFICATIONS : "receives (user_id)"
    FACULTIES ||--o{ COURSES : "offers"
    COURSES ||--o{ STUDENT_COURSE_REGISTRATION : "has"
    COURSES ||--o{ EXAMINATIONS : "scheduled for"
    EXAMINATIONS ||--o{ RESULTS : "produces"

    USERS {
        int user_id PK
        varchar name
        varchar email UK
        varchar password_hash
        varchar role "admin|lecturer|student"
        datetime created_at
    }
    FACULTIES {
        int faculty_id PK
        varchar faculty_name UK
    }
    COURSES {
        int course_id PK
        varchar course_code UK
        varchar course_name
        int faculty_id FK
        int lecturer_id FK
        datetime created_at
    }
    STUDENT_COURSE_REGISTRATION {
        int registration_id PK
        int student_id FK
        int course_id FK
        datetime registered_at
    }
    EXAMINATIONS {
        int exam_id PK
        int course_id FK
        date exam_date
        time start_time
        time end_time
        varchar venue
        int created_by FK
        datetime created_at
    }
    RESULTS {
        int result_id PK
        int student_id FK
        int exam_id FK
        decimal score
        varchar grade
        datetime published_at
    }
    NOTIFICATIONS {
        int notification_id PK
        int user_id FK
        varchar message
        varchar type
        varchar status
        datetime sent_at
    }
```

## Relationship Notes

- **USERS → COURSES** (1:M): a lecturer teaches many courses; a course has one lecturer.
- **USERS ↔ COURSES via STUDENT_COURSE_REGISTRATION** (M:N): a student registers for many courses; a course has many students.
- **COURSES → EXAMINATIONS** (1:M): a course can have multiple scheduled examinations.
- **EXAMINATIONS → RESULTS** (1:M): each exam produces one result per registered student (`UNIQUE(student_id, exam_id)` prevents duplicates).
- **USERS → NOTIFICATIONS** (1:M): a user receives many notifications (schedule alerts, result-published alerts).
- **FACULTIES → COURSES** (1:M): a faculty offers many courses.

## Data Integrity

- All foreign keys enforced with `PRAGMA foreign_keys = ON` (SQLite) / standard `FOREIGN KEY ... REFERENCES` (MySQL/PostgreSQL equivalent).
- `UNIQUE` constraints: `users.email`, `courses.course_code`, `faculties.faculty_name`, `(student_id, course_id)` on registrations, `(student_id, exam_id)` on results.
- `CHECK` constraints: `users.role` restricted to enum, `results.score` restricted to 0–100.
- Cascading deletes on dependent join/child tables (registrations, exams-under-course, results-under-exam, notifications-under-user) so removing a parent record does not orphan rows.
