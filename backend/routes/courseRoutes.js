const express = require('express');
const { body } = require('express-validator');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/role');
const validate = require('../middleware/validate');
const {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
} = require('../controllers/courseController');

const router = express.Router();

router.use(authenticate);

router.get('/', getCourses);
router.get('/:id', getCourseById);

router.post(
  '/',
  authorize('admin'),
  [
    body('course_code').trim().notEmpty().withMessage('course_code is required'),
    body('course_name').trim().notEmpty().withMessage('course_name is required'),
    body('faculty_id').isInt().withMessage('faculty_id must be an integer'),
    body('lecturer_id').isInt().withMessage('lecturer_id must be an integer'),
  ],
  validate,
  createCourse
);

router.put('/:id', authorize('admin', 'lecturer'), updateCourse);
router.delete('/:id', authorize('admin'), deleteCourse);

module.exports = router;
