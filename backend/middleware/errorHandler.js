/**
 * Custom application error class so controllers can throw
 * predictable, HTTP-status-aware errors.
 */
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Centralised error-handling middleware.
 * Any error passed to next(err), or thrown inside an async
 * handler wrapped with asyncHandler, ends up here.
 */
function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${req.method} ${req.originalUrl} ->`, err.message);

  // SQLite constraint violations (e.g. UNIQUE, FOREIGN KEY)
  if (err.code && err.code.startsWith('SQLITE_CONSTRAINT')) {
    return res.status(409).json({
      success: false,
      error: 'Database constraint violation. The record may already exist or references invalid data.',
    });
  }

  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Internal server error.' : err.message;

  res.status(statusCode).json({
    success: false,
    error: message,
  });
}

/** Wraps async route handlers so thrown errors reach errorHandler. */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { ApiError, errorHandler, asyncHandler };
