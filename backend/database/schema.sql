-- ============================================================
-- SWC3633 Web API Development
-- Exam Scheduling & Result Management System
-- Database Schema (DDL)
-- Engine: SQLite (portable; equivalent MySQL notes in comments)
-- ============================================================

PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS results;
DROP TABLE IF EXISTS examinations;
DROP TABLE IF EXISTS student_course_registration;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS faculties;
DROP TABLE IF EXISTS users;

-- 1. USERS (Administrator, Lecturer, Student)
CREATE TABLE users (
    user_id       INTEGER PRIMARY KEY AUTOINCREMENT,
    name          VARCHAR(100)  NOT NULL,
    email         VARCHAR(150)  NOT NULL UNIQUE,
    password_hash VARCHAR(255)  NOT NULL,
    role          VARCHAR(20)   NOT NULL CHECK (role IN ('admin','lecturer','student')),
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. FACULTIES (supporting entity)
CREATE TABLE faculties (
    faculty_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    faculty_name  VARCHAR(150) NOT NULL UNIQUE
);

-- 3. COURSES
CREATE TABLE courses (
    course_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    course_code   VARCHAR(20)  NOT NULL UNIQUE,
    course_name   VARCHAR(150) NOT NULL,
    faculty_id    INTEGER      NOT NULL,
    lecturer_id   INTEGER      NOT NULL,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id)  REFERENCES faculties(faculty_id)  ON DELETE RESTRICT,
    FOREIGN KEY (lecturer_id) REFERENCES users(user_id)         ON DELETE RESTRICT
);

-- 4. STUDENT_COURSE_REGISTRATION (many-to-many: students <-> courses)
CREATE TABLE student_course_registration (
    registration_id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id       INTEGER  NOT NULL,
    course_id        INTEGER  NOT NULL,
    registered_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (student_id, course_id),
    FOREIGN KEY (student_id) REFERENCES users(user_id)   ON DELETE CASCADE,
    FOREIGN KEY (course_id)  REFERENCES courses(course_id) ON DELETE CASCADE
);

-- 5. EXAMINATIONS (includes venue instead of a separate table, per scenario option)
CREATE TABLE examinations (
    exam_id       INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id     INTEGER      NOT NULL,
    exam_date     DATE         NOT NULL,
    start_time    TIME         NOT NULL,
    end_time      TIME         NOT NULL,
    venue         VARCHAR(100) NOT NULL,
    created_by    INTEGER      NOT NULL,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id)  REFERENCES courses(course_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(user_id)     ON DELETE RESTRICT
);

-- 6. RESULTS
CREATE TABLE results (
    result_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id    INTEGER      NOT NULL,
    exam_id       INTEGER      NOT NULL,
    score         DECIMAL(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
    grade         VARCHAR(2)   NOT NULL,
    published_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (student_id, exam_id),
    FOREIGN KEY (student_id) REFERENCES users(user_id)        ON DELETE CASCADE,
    FOREIGN KEY (exam_id)    REFERENCES examinations(exam_id) ON DELETE CASCADE
);

-- 7. NOTIFICATIONS
CREATE TABLE notifications (
    notification_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          INTEGER      NOT NULL,
    message          VARCHAR(255) NOT NULL,
    type             VARCHAR(30)  NOT NULL DEFAULT 'exam_schedule',
    status           VARCHAR(20)  NOT NULL DEFAULT 'sent',
    sent_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Helpful indexes
CREATE INDEX idx_courses_lecturer ON courses(lecturer_id);
CREATE INDEX idx_exam_course      ON examinations(course_id);
CREATE INDEX idx_results_student  ON results(student_id);
CREATE INDEX idx_results_exam     ON results(exam_id);
