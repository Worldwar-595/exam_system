require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const requestLogger = require('./middleware/logger');
const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const courseRoutes = require('./routes/courseRoutes');
const examRoutes = require('./routes/examRoutes');
const resultRoutes = require('./routes/resultRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Security middleware ----------
app.use(helmet());
app.use(cors());

// API management: rate limiting (protects auth + general API from abuse)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please try again later.' },
});
app.use(globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many auth attempts. Please try again later.' },
});

// ---------- Core middleware ----------
app.use(express.json());
app.use(morgan('dev'));       // console request log (library)
app.use(requestLogger);      // custom structured request logger (middleware requirement)

// ---------- Health check ----------
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Exam Scheduling & Result Management API is running.' });
});

// ---------- Routes ----------
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/examinations', examRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/notifications', notificationRoutes);

// ---------- 404 handler ----------
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// ---------- Centralised error handler (must be last) ----------
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`\n🚀 Exam Scheduling & Result Management API running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health\n`);
});

module.exports = app;
