const db = require('../config/db');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');
const { getPagination, getSort } = require('../utils/queryHelper');

function calculateGrade(score) {
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

// GET /api/results -- supports ?student_id=, ?exam_id=, ?sortBy=, ?order=, ?page=, ?limit=
const getResults = asyncHandler(async (req, res) => {
  const { student_id, exam_id } = req.query;
  const { page, limit, offset } = getPagination(req.query);
  const { sortBy, order } = getSort(req.query, ['score', 'grade', 'published_at'], 'published_at');

  const conditions = [];
  const params = [];

  if (student_id) { conditions.push('r.student_id = ?'); params.push(student_id); }
  if (exam_id) { conditions.push('r.exam_id = ?'); params.push(exam_id); }

  // Students may only view their own results.
  if (req.user.role === 'student') {
    conditions.push('r.student_id = ?');
    params.push(req.user.user_id);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const total = db
    .prepare(`SELECT COUNT(*) AS count FROM results r ${whereClause}`)
    .get(...params).count;

  const rows = db
    .prepare(
      `SELECT r.result_id, r.score, r.grade, r.published_at,
              u.user_id AS student_id, u.name AS student_name,
              e.exam_id, e.exam_date, c.course_code, c.course_name
       FROM results r
       JOIN users u ON u.user_id = r.student_id
       JOIN examinations e ON e.exam_id = r.exam_id
       JOIN courses c ON c.course_id = e.course_id
       ${whereClause}
       ORDER BY r.${sortBy} ${order} LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset);

  res.status(200).json({
    success: true,
    data: rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

const getResultById = asyncHandler(async (req, res) => {
  const result = db
    .prepare(
      `SELECT r.*, u.name AS student_name, c.course_code, c.course_name
       FROM results r
       JOIN users u ON u.user_id = r.student_id
       JOIN examinations e ON e.exam_id = r.exam_id
       JOIN courses c ON c.course_id = e.course_id
       WHERE r.result_id = ?`
    )
    .get(req.params.id);
  if (!result) throw new ApiError(404, 'Result not found.');

  if (req.user.role === 'student' && req.user.user_id !== result.student_id) {
    throw new ApiError(403, 'You may only view your own results.');
  }

  res.status(200).json({ success: true, data: result });
});

// POST /api/results (admin, lecturer) - publishing a result also creates a notification
const createResult = asyncHandler(async (req, res) => {
  const { student_id, exam_id, score } = req.body;

  const exam = db.prepare('SELECT * FROM examinations WHERE exam_id = ?').get(exam_id);
  if (!exam) throw new ApiError(422, 'exam_id does not reference an existing examination.');

  const student = db
    .prepare("SELECT * FROM users WHERE user_id = ? AND role = 'student'")
    .get(student_id);
  if (!student) throw new ApiError(422, 'student_id must reference an existing student.');

  if (req.user.role === 'lecturer') {
    const course = db.prepare('SELECT * FROM courses WHERE course_id = ?').get(exam.course_id);
    if (req.user.user_id !== course.lecturer_id) {
      throw new ApiError(403, 'You may only publish results for courses you teach.');
    }
  }

  const grade = calculateGrade(score);

  const insertResult = db.transaction(() => {
    const result = db
      .prepare('INSERT INTO results (student_id, exam_id, score, grade) VALUES (?, ?, ?, ?)')
      .run(student_id, exam_id, score, grade);

    db.prepare(
      'INSERT INTO notifications (user_id, message, type, status) VALUES (?, ?, ?, ?)'
    ).run(
      student_id,
      `Your result has been published: Grade ${grade} (${score}/100).`,
      'result_published',
      'sent'
    );

    return result.lastInsertRowid;
  });

  const newId = insertResult();
  const created = db.prepare('SELECT * FROM results WHERE result_id = ?').get(newId);
  res.status(201).json({ success: true, data: created });
});

// PUT /api/results/:id (admin, lecturer)
const updateResult = asyncHandler(async (req, res) => {
  const existing = db.prepare('SELECT * FROM results WHERE result_id = ?').get(req.params.id);
  if (!existing) throw new ApiError(404, 'Result not found.');

  const { score } = req.body;
  const newScore = score ?? existing.score;
  const grade = calculateGrade(newScore);

  db.prepare('UPDATE results SET score = ?, grade = ? WHERE result_id = ?').run(
    newScore, grade, req.params.id
  );

  const updated = db.prepare('SELECT * FROM results WHERE result_id = ?').get(req.params.id);
  res.status(200).json({ success: true, data: updated });
});

// DELETE /api/results/:id (admin only)
const deleteResult = asyncHandler(async (req, res) => {
  const existing = db.prepare('SELECT result_id FROM results WHERE result_id = ?').get(req.params.id);
  if (!existing) throw new ApiError(404, 'Result not found.');
  db.prepare('DELETE FROM results WHERE result_id = ?').run(req.params.id);
  res.status(200).json({ success: true, message: 'Result deleted.' });
});

module.exports = { getResults, getResultById, createResult, updateResult, deleteResult };
