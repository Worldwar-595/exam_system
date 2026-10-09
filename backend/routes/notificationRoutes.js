const express = require('express');
const { body } = require('express-validator');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/role');
const validate = require('../middleware/validate');
const { getNotifications, createNotification } = require('../controllers/notificationController');

const router = express.Router();

router.use(authenticate);

router.get('/', getNotifications);

router.post(
  '/',
  authorize('admin', 'lecturer'),
  [
    body('user_id').isInt().withMessage('user_id must be an integer'),
    body('message').trim().notEmpty().withMessage('message is required'),
  ],
  validate,
  createNotification
);

module.exports = router;
