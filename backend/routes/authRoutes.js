// routes/authRoutes.js
const express = require('express');
const { login, logout, register, getCurrentUser } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware'); // Assuming authorize is your role middleware
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Input validation middleware
const validateLogin = [
  body('email').isEmail().withMessage('Please provide a valid email address').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Format errors for ErrorResponse or handle directly
      const messages = errors.array().map(err => err.msg);
      return res.status(400).json({ success: false, message: messages.join('. ') });
      // Or: return next(new ErrorResponse(messages.join('. '), 400));
    }
    next();
  }
];

const validateRegistration = [
    body('username').notEmpty().withMessage('Username is required').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('email').isEmail().withMessage('Please provide a valid email').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('firstName').notEmpty().withMessage('First name is required').trim(),
    body('lastName').notEmpty().withMessage('Last name is required').trim(),
    body('phoneNumber').notEmpty().withMessage('Phone number is required').trim(), // Add more specific phone validation if needed
    body('address').notEmpty().withMessage('Address is required').trim(),
    body('role').isIn(['Admin', 'Teacher', 'Student']).withMessage('Invalid role specified'),
    body('status').optional().isIn(['active', 'inactive', 'suspended', 'pending', 'archived']),
    // Add validation for other fields like middleName, bio if they have constraints
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const messages = errors.array().map(err => err.msg);
            return res.status(400).json({ success: false, message: messages.join('. ') });
        }
        next();
    }
];


router.post('/login', validateLogin, login);
router.post('/logout', protect, logout); // No body to validate generally
router.post('/register', protect, authorize('Admin'), validateRegistration, register);
router.get('/me', protect, getCurrentUser); // No body to validate

module.exports = router;
