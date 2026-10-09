const express = require('express');
const { body } = require('express-validator');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/role');
const validate = require('../middleware/validate');
const {
  getResults,
  getResultById,
  createResult,
  updateResult,
  deleteResult,
} = require('../controllers/resultController');

const router = express.Router();

router.use(authenticate);

router.get('/', getResults);
router.get('/:id', getResultById);

router.post(
  '/',
  authorize('admin', 'lecturer'),
  [
    body('student_id').isInt().withMessage('student_id must be an integer'),
    body('exam_id').isInt().withMessage('exam_id must be an integer'),
    body('score').isFloat({ min: 0, max: 100 }).withMessage('score must be between 0 and 100'),
  ],
  validate,
  createResult
);

router.put('/:id', authorize('admin', 'lecturer'), updateResult);
router.delete('/:id', authorize('admin'), deleteResult);

module.exports = router;
