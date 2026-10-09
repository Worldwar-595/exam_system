const db = require('../config/db');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');
const { getPagination } = require('../utils/queryHelper');

// GET /api/notifications - a user sees their own; admin can see all via ?user_id=
const getNotifications = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);

  let targetUserId = req.user.user_id;
  if (req.user.role === 'admin' && req.query.user_id) {
    targetUserId = req.query.user_id;
  }

  const total = db
    .prepare('SELECT COUNT(*) AS count FROM notifications WHERE user_id = ?')
    .get(targetUserId).count;

  const rows = db
    .prepare(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY sent_at DESC LIMIT ? OFFSET ?'
    )
    .all(targetUserId, limit, offset);

  res.status(200).json({
    success: true,
    data: rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// POST /api/notifications (admin, lecturer)
const createNotification = asyncHandler(async (req, res) => {
  const { user_id, message, type } = req.body;

  const user = db.prepare('SELECT user_id FROM users WHERE user_id = ?').get(user_id);
  if (!user) throw new ApiError(422, 'user_id does not reference an existing user.');

  const result = db
    .prepare('INSERT INTO notifications (user_id, message, type, status) VALUES (?, ?, ?, ?)')
    .run(user_id, message, type || 'general', 'sent');

  const notification = db
    .prepare('SELECT * FROM notifications WHERE notification_id = ?')
    .get(result.lastInsertRowid);

  res.status(201).json({ success: true, data: notification });
});

module.exports = { getNotifications, createNotification };
