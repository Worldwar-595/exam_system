const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/auth');
const { register, login, me } = require('../controllers/authController');

const router = express.Router();

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('name is required'),
    body('email').isEmail().withMessage('a valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('password must be at least 8 characters'),
    body('role').isIn(['admin', 'lecturer', 'student']).withMessage('role must be admin, lecturer or student'),
  ],
  validate,
  register
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('a valid email is required'),
    body('password').notEmpty().withMessage('password is required'),
  ],
  validate,
  login
);

router.get('/me', authenticate, me);

module.exports = router;
