/**
 * Simple request logging middleware (records method, URL, status, duration).
 * Used alongside morgan in server.js for a documented custom middleware example.
 */
function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const user = req.user ? `${req.user.role}:${req.user.user_id}` : 'anonymous';
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ` +
      `-> ${res.statusCode} (${duration}ms) [${user}]`
    );
  });

  next();
}

module.exports = requestLogger;
