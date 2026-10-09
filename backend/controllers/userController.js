const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');
const { getPagination, getSort } = require('../utils/queryHelper');

// GET /api/users  (admin only) -- supports ?role=, ?search=, ?sortBy=, ?order=, ?page=, ?limit=
const getUsers = asyncHandler(async (req, res) => {
  const { role, search } = req.query;
  const { page, limit, offset } = getPagination(req.query);
  const { sortBy, order } = getSort(req.query, ['name', 'email', 'role', 'created_at'], 'user_id');

  const conditions = [];
  const params = [];

  if (role) {
    conditions.push('role = ?');
    params.push(role);
  }
  if (search) {
    conditions.push('(name LIKE ? OR email LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const total = db
    .prepare(`SELECT COUNT(*) AS count FROM users ${whereClause}`)
    .get(...params).count;

  const rows = db
    .prepare(
      `SELECT user_id, name, email, role, created_at FROM users
       ${whereClause} ORDER BY ${sortBy} ${order} LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset);

  res.status(200).json({
    success: true,
    data: rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// GET /api/users/:id
const getUserById = asyncHandler(async (req, res) => {
  const user = db
    .prepare('SELECT user_id, name, email, role, created_at FROM users WHERE user_id = ?')
    .get(req.params.id);
  if (!user) throw new ApiError(404, 'User not found.');
  res.status(200).json({ success: true, data: user });
});

// PUT /api/users/:id (admin only, or self)
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email, password, role } = req.body;

  const existing = db.prepare('SELECT * FROM users WHERE user_id = ?').get(id);
  if (!existing) throw new ApiError(404, 'User not found.');

  if (req.user.role !== 'admin' && req.user.user_id !== Number(id)) {
    throw new ApiError(403, 'You may only update your own profile.');
  }
  if (role && req.user.role !== 'admin') {
    throw new ApiError(403, 'Only an admin may change a user role.');
  }

  const newName = name ?? existing.name;
  const newEmail = email ?? existing.email;
  const newRole = role ?? existing.role;
  const newHash = password ? bcrypt.hashSync(password, 10) : existing.password_hash;

  db.prepare(
    'UPDATE users SET name = ?, email = ?, password_hash = ?, role = ? WHERE user_id = ?'
  ).run(newName, newEmail, newHash, newRole, id);

  const updated = db
    .prepare('SELECT user_id, name, email, role, created_at FROM users WHERE user_id = ?')
    .get(id);
  res.status(200).json({ success: true, data: updated });
});

// DELETE /api/users/:id (admin only)
const deleteUser = asyncHandler(async (req, res) => {
  const existing = db.prepare('SELECT user_id FROM users WHERE user_id = ?').get(req.params.id);
  if (!existing) throw new ApiError(404, 'User not found.');

  db.prepare('DELETE FROM users WHERE user_id = ?').run(req.params.id);
  res.status(200).json({ success: true, message: 'User deleted.' });
});

module.exports = { getUsers, getUserById, updateUser, deleteUser };
