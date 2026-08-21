const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for login/authentication endpoints
 * Prevents brute force attacks
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per window
  message: {
    success: false,
    message: 'Too many login attempts from this IP, please try again after 15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: false, // Count successful requests
  skipFailedRequests: false, // Count failed requests
});

/**
 * Rate limiter for general API endpoints
 * Prevents API abuse
 */
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

/**
 * Strict rate limiter for sensitive operations
 * (password reset, email verification, etc.)
 */
const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  message: {
    success: false,
    message: 'Too many attempts, please try again after 1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for file uploads
 * Prevents upload abuse
 */
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 uploads per 15 minutes
  message: {
    success: false,
    message: 'Too many file uploads, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  loginLimiter,
  apiLimiter,
  strictLimiter,
  uploadLimiter
};
