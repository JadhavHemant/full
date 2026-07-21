'use strict';

/**
 * Auth Routes  — mounted at /api/auth
 *
 * Public endpoints:
 *   POST   /api/auth/register
 *   POST   /api/auth/login
 *   POST   /api/auth/refresh
 *   POST   /api/auth/forgot-password
 *   POST   /api/auth/reset-password
 *   GET    /api/auth/verify-email?token=<token>
 *   POST   /api/auth/resend-verification
 *
 * Authenticated endpoints:
 *   POST   /api/auth/logout
 *   POST   /api/auth/logout-all
 *   POST   /api/auth/change-password
 *   GET    /api/auth/me
 *   POST   /api/auth/unlock/:userId     (SuperAdmin / CompanyAdmin)
 */

const express      = require('express');
const rateLimit    = require('express-rate-limit');
const { verifyAccessToken } = require('../../middlewares/authMiddleware');
const {
  register,
  login,
  logout,
  logoutAll,
  refreshToken,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  changePassword,
  unlockAccount,
  getMe,
} = require('../../controllers/auth/authController');

const {
  getLoginHistory,
  getActiveSessions,
  revokeSession,
  getFailedLogins,
  getSuspiciousLogins,
  getLoginStats,
} = require('../../controllers/auth/loginHistoryController');

const {
  validateRegister,
  validateLogin,
  validateRefreshToken,
  validateForgotPassword,
  validateResetPassword,
  validateVerifyEmail,
  validateResendVerification,
  validateChangePassword,
  validateUnlockAccount,
} = require('../../validators/authValidators');

const router = express.Router();

// ── Rate limiters ─────────────────────────────────────────────────────────────

const isDev = process.env.NODE_ENV !== 'production';

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 200 : 5,
  message: 'Too many attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDev ? 100 : 3,
  message: 'Too many email requests. Please wait before trying again.',
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Public routes ─────────────────────────────────────────────────────────────

router.post('/register',              validateRegister,           register);
router.post('/login',                 strictLimiter, validateLogin, login);
router.post('/refresh',               validateRefreshToken,       refreshToken);
router.post('/forgot-password',       strictLimiter, emailLimiter, validateForgotPassword, forgotPassword);
router.post('/reset-password',        strictLimiter, validateResetPassword,   resetPassword);
router.get( '/verify-email',          validateVerifyEmail,        verifyEmail);
router.post('/resend-verification',   emailLimiter, validateResendVerification, resendVerification);

// ── Authenticated routes ──────────────────────────────────────────────────────

router.post('/logout',         verifyAccessToken, logout);
router.post('/logout-all',     verifyAccessToken, logoutAll);
router.post('/change-password',verifyAccessToken, validateChangePassword, changePassword);
router.get( '/me',             verifyAccessToken, getMe);
router.post('/unlock/:userId', verifyAccessToken, validateUnlockAccount, unlockAccount);

// ── Login history / sessions ──────────────────────────────────────────────────

router.get('/login-history',              verifyAccessToken, getLoginHistory);
router.get('/login-history/failed',       verifyAccessToken, getFailedLogins);
router.get('/login-history/suspicious',   verifyAccessToken, getSuspiciousLogins);
router.get('/login-history/stats',        verifyAccessToken, getLoginStats);
router.get('/active-sessions',            verifyAccessToken, getActiveSessions);
router.delete('/sessions/:tokenId',       verifyAccessToken, revokeSession);

module.exports = router;
