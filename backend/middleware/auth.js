const jwt = require('jsonwebtoken');

/**
 * Authentication middleware.
 * Expects: Authorization: Bearer <token>
 * On success attaches req.user = { user_id, role, name, email }
 */
function authenticate(req, res, next) {
  const header = req.headers['authorization'];

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Missing or malformed Authorization header. Expected: Bearer <token>',
    });
  }

  const token = header.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_change_me');
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token.',
    });
  }
}

module.exports = authenticate;
