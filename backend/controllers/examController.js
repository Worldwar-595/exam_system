const db = require('../config/db');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');
const { getPagination, getSort } = require('../utils/queryHelper');
const { generateExamSlipQrCode } = require('../utils/qrcode');

// GET /api/examinations -- supports ?course_id=, ?search=, ?sortBy=, ?order=, ?page=, ?limit=
const getExaminations = asyncHandler(async (req, res) => {
  const { course_id, search } = req.query;
  const { page, limit, offset } = getPagination(req.query);
  const { sortBy, order } = getSort(req.query, ['exam_date', 'start_time', 'venue'], 'exam_date');

  const conditions = [];
  const params = [];

  if (course_id) { conditions.push('e.course_id = ?'); params.push(course_id); }
  if (search) { conditions.push('(e.venue LIKE ? OR c.course_name LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }

  // Students only see exams for courses they are registered in.
  if (req.user.role === 'student') {
    conditions.push(
      'e.course_id IN (SELECT course_id FROM student_course_registration WHERE student_id = ?)'
    );
    params.push(req.user.user_id);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const total = db
    .prepare(`SELECT COUNT(*) AS count FROM examinations e JOIN courses c ON c.course_id = e.course_id ${whereClause}`)
    .get(...params).count;

  const rows = db
    .prepare(
      `SELECT e.exam_id, e.exam_date, e.start_time, e.end_time, e.venue,
              c.course_id, c.course_code, c.course_name
       FROM examinations e
       JOIN courses c ON c.course_id = e.course_id
       ${whereClause}
       ORDER BY e.${sortBy} ${order} LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset);

  res.status(200).json({
    success: true,
    data: rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

const getExamById = asyncHandler(async (req, res) => {
  const exam = db
    .prepare(
      `SELECT e.*, c.course_code, c.course_name FROM examinations e
       JOIN courses c ON c.course_id = e.course_id WHERE e.exam_id = ?`
    )
    .get(req.params.id);
  if (!exam) throw new ApiError(404, 'Examination not found.');
  res.status(200).json({ success: true, data: exam });
});

// POST /api/examinations (admin, lecturer)
const createExam = asyncHandler(async (req, res) => {
  const { course_id, exam_date, start_time, end_time, venue } = req.body;

  const course = db.prepare('SELECT * FROM courses WHERE course_id = ?').get(course_id);
  if (!course) throw new ApiError(422, 'course_id does not reference an existing course.');

  if (req.user.role === 'lecturer' && req.user.user_id !== course.lecturer_id) {
    throw new ApiError(403, 'You may only schedule exams for courses you teach.');
  }

  const result = db
    .prepare(
      'INSERT INTO examinations (course_id, exam_date, start_time, end_time, venue, created_by) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(course_id, exam_date, start_time, end_time, venue, req.user.user_id);

  const exam = db.prepare('SELECT * FROM examinations WHERE exam_id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, data: exam });
});

// PUT /api/examinations/:id (admin, lecturer who owns the course)
const updateExam = asyncHandler(async (req, res) => {
  const existing = db.prepare('SELECT * FROM examinations WHERE exam_id = ?').get(req.params.id);
  if (!existing) throw new ApiError(404, 'Examination not found.');

  const course = db.prepare('SELECT * FROM courses WHERE course_id = ?').get(existing.course_id);
  if (req.user.role === 'lecturer' && req.user.user_id !== course.lecturer_id) {
    throw new ApiError(403, 'You may only update exams for courses you teach.');
  }

  const { exam_date, start_time, end_time, venue } = req.body;
  db.prepare(
    'UPDATE examinations SET exam_date = ?, start_time = ?, end_time = ?, venue = ? WHERE exam_id = ?'
  ).run(
    exam_date ?? existing.exam_date,
    start_time ?? existing.start_time,
    end_time ?? existing.end_time,
    venue ?? existing.venue,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM examinations WHERE exam_id = ?').get(req.params.id);
  res.status(200).json({ success: true, data: updated });
});

// DELETE /api/examinations/:id (admin only)
const deleteExam = asyncHandler(async (req, res) => {
  const existing = db.prepare('SELECT exam_id FROM examinations WHERE exam_id = ?').get(req.params.id);
  if (!existing) throw new ApiError(404, 'Examination not found.');
  db.prepare('DELETE FROM examinations WHERE exam_id = ?').run(req.params.id);
  res.status(200).json({ success: true, message: 'Examination deleted.' });
});

// GET /api/examinations/:id/slip -- Third-party API integration (QR Code Generator)
const getExamSlip = asyncHandler(async (req, res) => {
  const exam = db
    .prepare(
      `SELECT e.*, c.course_code, c.course_name FROM examinations e
       JOIN courses c ON c.course_id = e.course_id WHERE e.exam_id = ?`
    )
    .get(req.params.id);
  if (!exam) throw new ApiError(404, 'Examination not found.');

  const studentId = req.user.role === 'student' ? req.user.user_id : req.query.student_id;
  if (!studentId) throw new ApiError(422, 'student_id query parameter is required for staff requests.');

  const registration = db
    .prepare(
      'SELECT * FROM student_course_registration WHERE student_id = ? AND course_id = ?'
    )
    .get(studentId, exam.course_id);
  if (!registration) throw new ApiError(403, 'Student is not registered for this course.');

  const student = db.prepare('SELECT name FROM users WHERE user_id = ?').get(studentId);

  const qr = await generateExamSlipQrCode({
    studentName: student.name,
    courseCode: exam.course_code,
    examDate: exam.exam_date,
    startTime: exam.start_time,
    venue: exam.venue,
  });

  res.status(200).json({
    success: true,
    data: {
      exam,
      student_name: student.name,
      qr_code: qr,
    },
  });
});

module.exports = {
  getExaminations,
  getExamById,
  createExam,
  updateExam,
  deleteExam,
  getExamSlip,
};
