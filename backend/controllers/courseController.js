const db = require('../config/db');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');
const { getPagination, getSort } = require('../utils/queryHelper');

// GET /api/courses -- supports ?faculty_id=, ?lecturer_id=, ?search=, ?sortBy=, ?order=, ?page=, ?limit=
const getCourses = asyncHandler(async (req, res) => {
  const { faculty_id, lecturer_id, search } = req.query;
  const { page, limit, offset } = getPagination(req.query);
  const { sortBy, order } = getSort(
    req.query,
    ['course_code', 'course_name', 'created_at'],
    'course_id'
  );

  const conditions = [];
  const params = [];

  if (faculty_id) { conditions.push('c.faculty_id = ?'); params.push(faculty_id); }
  if (lecturer_id) { conditions.push('c.lecturer_id = ?'); params.push(lecturer_id); }
  if (search) {
    conditions.push('(c.course_name LIKE ? OR c.course_code LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const total = db
    .prepare(`SELECT COUNT(*) AS count FROM courses c ${whereClause}`)
    .get(...params).count;

  const rows = db
    .prepare(
      `SELECT c.course_id, c.course_code, c.course_name, c.faculty_id,
              f.faculty_name, c.lecturer_id, u.name AS lecturer_name, c.created_at
       FROM courses c
       JOIN faculties f ON f.faculty_id = c.faculty_id
       JOIN users u ON u.user_id = c.lecturer_id
       ${whereClause}
       ORDER BY c.${sortBy} ${order} LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset);

  res.status(200).json({
    success: true,
    data: rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

const getCourseById = asyncHandler(async (req, res) => {
  const course = db
    .prepare(
      `SELECT c.*, f.faculty_name, u.name AS lecturer_name
       FROM courses c
       JOIN faculties f ON f.faculty_id = c.faculty_id
       JOIN users u ON u.user_id = c.lecturer_id
       WHERE c.course_id = ?`
    )
    .get(req.params.id);
  if (!course) throw new ApiError(404, 'Course not found.');
  res.status(200).json({ success: true, data: course });
});

// POST /api/courses (admin only)
const createCourse = asyncHandler(async (req, res) => {
  const { course_code, course_name, faculty_id, lecturer_id } = req.body;

  const faculty = db.prepare('SELECT faculty_id FROM faculties WHERE faculty_id = ?').get(faculty_id);
  if (!faculty) throw new ApiError(422, 'faculty_id does not reference an existing faculty.');

  const lecturer = db
    .prepare("SELECT user_id FROM users WHERE user_id = ? AND role = 'lecturer'")
    .get(lecturer_id);
  if (!lecturer) throw new ApiError(422, 'lecturer_id must reference an existing lecturer.');

  const result = db
    .prepare(
      'INSERT INTO courses (course_code, course_name, faculty_id, lecturer_id) VALUES (?, ?, ?, ?)'
    )
    .run(course_code, course_name, faculty_id, lecturer_id);

  const course = db.prepare('SELECT * FROM courses WHERE course_id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, data: course });
});

// PUT /api/courses/:id (admin or the assigned lecturer)
const updateCourse = asyncHandler(async (req, res) => {
  const existing = db.prepare('SELECT * FROM courses WHERE course_id = ?').get(req.params.id);
  if (!existing) throw new ApiError(404, 'Course not found.');

  if (req.user.role === 'lecturer' && req.user.user_id !== existing.lecturer_id) {
    throw new ApiError(403, 'You may only update courses you teach.');
  }

  const { course_code, course_name, faculty_id, lecturer_id } = req.body;
  db.prepare(
    'UPDATE courses SET course_code = ?, course_name = ?, faculty_id = ?, lecturer_id = ? WHERE course_id = ?'
  ).run(
    course_code ?? existing.course_code,
    course_name ?? existing.course_name,
    faculty_id ?? existing.faculty_id,
    lecturer_id ?? existing.lecturer_id,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM courses WHERE course_id = ?').get(req.params.id);
  res.status(200).json({ success: true, data: updated });
});

// DELETE /api/courses/:id (admin only)
const deleteCourse = asyncHandler(async (req, res) => {
  const existing = db.prepare('SELECT course_id FROM courses WHERE course_id = ?').get(req.params.id);
  if (!existing) throw new ApiError(404, 'Course not found.');
  db.prepare('DELETE FROM courses WHERE course_id = ?').run(req.params.id);
  res.status(200).json({ success: true, message: 'Course deleted.' });
});

module.exports = { getCourses, getCourseById, createCourse, updateCourse, deleteCourse };
