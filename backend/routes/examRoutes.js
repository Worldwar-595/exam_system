const express = require('express');
const { body } = require('express-validator');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/role');
const validate = require('../middleware/validate');
const {
  getExaminations,
  getExamById,
  createExam,
  updateExam,
  deleteExam,
  getExamSlip,
} = require('../controllers/examController');

const router = express.Router();

router.use(authenticate);

router.get('/', getExaminations);
router.get('/:id', getExamById);
router.get('/:id/slip', getExamSlip); // Third-party API: QR code exam slip

router.post(
  '/',
  authorize('admin', 'lecturer'),
  [
    body('course_id').isInt().withMessage('course_id must be an integer'),
    body('exam_date').isISO8601().withMessage('exam_date must be a valid date (YYYY-MM-DD)'),
    body('start_time').matches(/^\d{2}:\d{2}$/).withMessage('start_time must be HH:MM'),
    body('end_time').matches(/^\d{2}:\d{2}$/).withMessage('end_time must be HH:MM'),
    body('venue').trim().notEmpty().withMessage('venue is required'),
  ],
  validate,
  createExam
);

router.put('/:id', authorize('admin', 'lecturer'), updateExam);
router.delete('/:id', authorize('admin'), deleteExam);

module.exports = router;
