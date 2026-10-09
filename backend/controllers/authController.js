const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const JWT_EXPIRES_IN = '2h';

function signToken(user) {
  return jwt.sign(
    { user_id: user.user_id, name: user.name, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  const existing = db.prepare('SELECT user_id FROM users WHERE email = ?').get(email);
  if (existing) throw new ApiError(409, 'A user with this email already exists.');

  const allowedRoles = ['admin', 'lecturer', 'student'];
  if (!allowedRoles.includes(role)) {
    throw new ApiError(422, `role must be one of: ${allowedRoles.join(', ')}`);
  }

  const password_hash = bcrypt.hashSync(password, 10);

  const result = db
    .prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
    .run(name, email, password_hash, role);

  const user = db
    .prepare('SELECT user_id, name, email, role, created_at FROM users WHERE user_id = ?')
    .get(result.lastInsertRowid);

  const token = signToken(user);
  res.status(201).json({ success: true, data: { user, token } });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) throw new ApiError(401, 'Invalid email or password.');

  const validPassword = bcrypt.compareSync(password, user.password_hash);
  if (!validPassword) throw new ApiError(401, 'Invalid email or password.');

  const token = signToken(user);
  const { password_hash, ...safeUser } = user;

  res.status(200).json({ success: true, data: { user: safeUser, token } });
});

// GET /api/auth/me
const me = asyncHandler(async (req, res) => {
  const user = db
    .prepare('SELECT user_id, name, email, role, created_at FROM users WHERE user_id = ?')
    .get(req.user.user_id);
  if (!user) throw new ApiError(404, 'User not found.');
  res.status(200).json({ success: true, data: user });
});

module.exports = { register, login, me };
