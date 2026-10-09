const { validationResult } = require('express-validator');

/**
 * Runs after express-validator rule chains on a route.
 * If any rule failed, responds 422 with a list of field errors.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      error: 'Validation failed.',
      details: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

module.exports = validate;
