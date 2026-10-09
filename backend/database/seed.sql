-- ============================================================
-- SWC3633 Web API Development
-- Exam Scheduling & Result Management System
-- Sample Data (DML) — minimum 5 records per table
-- Demo password for ALL seeded accounts: Password123!
-- (bcrypt hash below is that password, cost factor 10)
-- ============================================================

-- USERS (1 admin, 2 lecturers, 6 students = 9 rows)
INSERT INTO users (name, email, password_hash, role) VALUES
('Aisha Rahman',   'admin@uptm.edu.my',      '$2b$10$GFctHHYZKHHySfQ.T59b6.o65o7liU5/cG69gHNTsq9end4SOi8C2', 'admin'),
('Dr. Kumar Selvam','kumar@uptm.edu.my',     '$2b$10$GFctHHYZKHHySfQ.T59b6.o65o7liU5/cG69gHNTsq9end4SOi8C2', 'lecturer'),
('Dr. Wong Mei Ling','wong@uptm.edu.my',     '$2b$10$GFctHHYZKHHySfQ.T59b6.o65o7liU5/cG69gHNTsq9end4SOi8C2', 'lecturer'),
('Ali Hassan',      'ali@student.uptm.edu.my','$2b$10$GFctHHYZKHHySfQ.T59b6.o65o7liU5/cG69gHNTsq9end4SOi8C2', 'student'),
('Siti Noraini',    'siti@student.uptm.edu.my','$2b$10$GFctHHYZKHHySfQ.T59b6.o65o7liU5/cG69gHNTsq9end4SOi8C2', 'student'),
('Ravi Chandran',   'ravi@student.uptm.edu.my','$2b$10$GFctHHYZKHHySfQ.T59b6.o65o7liU5/cG69gHNTsq9end4SOi8C2', 'student'),
('Nur Aina',        'aina@student.uptm.edu.my','$2b$10$GFctHHYZKHHySfQ.T59b6.o65o7liU5/cG69gHNTsq9end4SOi8C2', 'student'),
('Tan Wei Jie',     'weijie@student.uptm.edu.my','$2b$10$GFctHHYZKHHySfQ.T59b6.o65o7liU5/cG69gHNTsq9end4SOi8C2', 'student'),
('Farah Izzati',    'farah@student.uptm.edu.my','$2b$10$GFctHHYZKHHySfQ.T59b6.o65o7liU5/cG69gHNTsq9end4SOi8C2', 'student');

-- FACULTIES
INSERT INTO faculties (faculty_name) VALUES
('Faculty of Computing and Information Technology'),
('Faculty of Business and Accountancy'),
('Faculty of Engineering'),
('Faculty of Applied Sciences'),
('Faculty of Design and Architecture');

-- COURSES (lecturer_id references users 2 and 3)
INSERT INTO courses (course_code, course_name, faculty_id, lecturer_id) VALUES
('SWC3633', 'Web API Development',              1, 2),
('SWC3013', 'Database Systems',                 1, 3),
('SWC2023', 'Object-Oriented Programming',       1, 2),
('SWC3103', 'Mobile Application Development',    1, 3),
('SWC3223', 'Cloud Computing Fundamentals',      1, 2);

-- STUDENT_COURSE_REGISTRATION (student_id 4-9, course_id 1-5)
INSERT INTO student_course_registration (student_id, course_id) VALUES
(4, 1), (4, 2), (5, 1), (5, 3),
(6, 1), (6, 4), (7, 1), (7, 5),
(8, 2), (9, 1);

-- EXAMINATIONS
INSERT INTO examinations (course_id, exam_date, start_time, end_time, venue, created_by) VALUES
(1, '2026-11-10', '09:00', '11:00', 'Hall A, Block 3', 1),
(2, '2026-11-12', '14:00', '16:00', 'Hall B, Block 3', 1),
(3, '2026-11-14', '09:00', '10:30', 'Room 2.05, Block 2', 1),
(4, '2026-11-17', '14:00', '16:00', 'Hall A, Block 3', 1),
(5, '2026-11-19', '09:00', '11:00', 'Room 3.01, Block 4', 1);

-- RESULTS (student_id, exam_id)
INSERT INTO results (student_id, exam_id, score, grade) VALUES
(4, 1, 82.50, 'A'),
(5, 1, 67.00, 'B'),
(6, 1, 55.50, 'C'),
(7, 1, 91.00, 'A'),
(4, 2, 74.00, 'B'),
(8, 2, 60.00, 'C'),
(6, 4, 45.00, 'D');

-- NOTIFICATIONS
INSERT INTO notifications (user_id, message, type, status) VALUES
(4, 'Your exam for SWC3633 is scheduled on 2026-11-10, Hall A, Block 3.', 'exam_schedule', 'sent'),
(5, 'Your exam for SWC3633 is scheduled on 2026-11-10, Hall A, Block 3.', 'exam_schedule', 'sent'),
(6, 'Your exam for SWC3103 is scheduled on 2026-11-17, Hall A, Block 3.', 'exam_schedule', 'sent'),
(4, 'Your result for SWC3633 has been published: Grade A.', 'result_published', 'sent'),
(7, 'Your result for SWC3633 has been published: Grade A.', 'result_published', 'sent');
