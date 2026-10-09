const express = require('express');
const { body } = require('express-validator');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/role');
const validate = require('../middleware/validate');
const {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
} = require('../controllers/userController');

const router = express.Router();

router.use(authenticate);

router.get('/', authorize('admin'), getUsers);
router.get('/:id', getUserById);

router.put(
  '/:id',
  [
    body('email').optional().isEmail().withMessage('a valid email is required'),
    body('password').optional().isLength({ min: 8 }).withMessage('password must be at least 8 characters'),
    body('role').optional().isIn(['admin', 'lecturer', 'student']).withMessage('invalid role'),
  ],
  validate,
  updateUser
);

router.delete('/:id', authorize('admin'), deleteUser);

module.exports = router;
