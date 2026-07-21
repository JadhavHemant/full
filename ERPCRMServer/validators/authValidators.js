'use strict';

/**
 * Auth Validators
 * Uses express-validator to validate every auth endpoint request.
 * Imported by authRoutes and used as middleware arrays.
 */

const { body, param, query } = require('express-validator');

// ─────────────────────────────────────────────────────────────────────────────
// Reusable field rules
// ─────────────────────────────────────────────────────────────────────────────

const passwordRules = () =>
  body('password')
    .isString()
    .withMessage('Password must be a string')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/)
    .withMessage('Password must contain at least one special character');

const emailRules = (field = 'email') =>
  body(field)
    .isEmail()
    .withMessage('Valid email address is required')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email must not exceed 255 characters');

// ─────────────────────────────────────────────────────────────────────────────
// Validators per endpoint
// ─────────────────────────────────────────────────────────────────────────────

const validateRegister = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2 and 255 characters'),
  emailRules('email'),
  passwordRules(),
  body('mobileNumber')
    .optional({ nullable: true })
    .matches(/^[+]?[\d\s\-().]{7,20}$/)
    .withMessage('Invalid mobile number format'),
  body('companyId')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('companyId must be a positive integer'),
  body('roleId')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('roleId must be a positive integer'),
];

const validateLogin = [
  emailRules('email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  body('rememberMe')
    .optional()
    .isBoolean()
    .withMessage('rememberMe must be a boolean'),
];

const validateRefreshToken = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
    .isString()
    .withMessage('Refresh token must be a string'),
];

const validateForgotPassword = [
  emailRules('email'),
];

const validateResetPassword = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required')
    .isString()
    .withMessage('Reset token must be a string'),
  passwordRules(),
  body('confirmPassword')
    .notEmpty()
    .withMessage('Confirm password is required')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
];

const validateVerifyEmail = [
  query('token')
    .notEmpty()
    .withMessage('Verification token is required')
    .isString()
    .withMessage('Verification token must be a string'),
];

const validateResendVerification = [
  emailRules('email'),
];

const validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isString()
    .withMessage('New password must be a string')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('New password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('New password must contain at least one lowercase letter')
    .matches(/[0-9]/)
    .withMessage('New password must contain at least one number')
    .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/)
    .withMessage('New password must contain at least one special character')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must differ from current password');
      }
      return true;
    }),
  body('confirmPassword')
    .notEmpty()
    .withMessage('Confirm password is required')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
];

const validateUnlockAccount = [
  param('userId')
    .isInt({ min: 1 })
    .withMessage('userId must be a positive integer'),
];

module.exports = {
  validateRegister,
  validateLogin,
  validateRefreshToken,
  validateForgotPassword,
  validateResetPassword,
  validateVerifyEmail,
  validateResendVerification,
  validateChangePassword,
  validateUnlockAccount,
};
