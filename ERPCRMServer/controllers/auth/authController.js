'use strict';

/**
 * Auth Controller
 *
 * Handles: register, login, logout, refreshToken, forgotPassword,
 *          resetPassword, verifyEmail, resendVerification,
 *          changePassword, logoutAll, unlockAccount, getMe
 *
 * Integrates with existing: tokenUtils, authService, auditLogService,
 *                           loginHistoryService, email utility.
 */

const bcrypt         = require('bcryptjs');
const crypto         = require('crypto');
const { validationResult } = require('express-validator');
const { appPool }    = require('../../config/db');
const { generateTokens, verifyRefreshToken, revokeRefreshToken, revokeAllUserTokens }
                     = require('../../utils/tokenUtils');
const { sendEmail, isEmailConfigured } = require('../../utils/email');
const { logLoginAttempt, logLogout }   = require('../../services/loginHistoryService');
const { logAuthEvent, logPermissionChange } = require('../../services/auditLogService');
const { ROLE_IDS } = require('../../config/roleConfig');

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const MAX_FAILED_ATTEMPTS    = parseInt(process.env.MAX_FAILED_ATTEMPTS)    || 5;
const LOCK_DURATION_MINUTES  = parseInt(process.env.LOCK_DURATION_MINUTES)  || 30;
const RESET_TOKEN_EXPIRES_MS = parseInt(process.env.RESET_TOKEN_EXPIRES_MS) || 60 * 60 * 1000; // 1 h
const VERIFY_TOKEN_EXPIRES_MS = parseInt(process.env.VERIFY_TOKEN_EXPIRES_MS) || 24 * 60 * 60 * 1000; // 24 h

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Return validation errors as 422 or call next. */
const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ message: 'Validation failed', errors: errors.array() });
  }
  return null;
};

/** Extract device / IP info from request. */
const extractDevice = (req) => {
  const ua  = req.headers['user-agent'] || 'Unknown';
  const ip  = req.ip || req.connection?.remoteAddress || '0.0.0.0';
  const fwd = req.headers['x-forwarded-for'];
  const realIp = fwd ? fwd.split(',')[0].trim() : ip;

  let browser = 'Unknown', os = 'Unknown', deviceType = 'desktop';
  if (/chrome/i.test(ua) && !/edge/i.test(ua)) browser = 'Chrome';
  else if (/firefox/i.test(ua))  browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/edge/i.test(ua))     browser = 'Edge';

  if (/windows/i.test(ua))       os = 'Windows';
  else if (/macintosh/i.test(ua)) os = 'MacOS';
  else if (/linux/i.test(ua) && !/android/i.test(ua)) os = 'Linux';
  else if (/android/i.test(ua))  os = 'Android';
  else if (/iphone|ipad/i.test(ua)) os = 'iOS';

  if (/mobile/i.test(ua))        deviceType = 'mobile';
  else if (/tablet|ipad/i.test(ua)) deviceType = 'tablet';

  const deviceId = crypto.createHash('sha256')
    .update(`${ua}${realIp}`)
    .digest('hex')
    .substring(0, 32);

  return { userAgent: ua, ip: realIp, browser, os, deviceType, deviceId };
};

/** Generate a cryptographically safe URL-safe token. */
const generateSecureToken = () => crypto.randomBytes(32).toString('hex');

/** Build a safe user object for API responses (no password). */
const sanitizeUser = (u) => ({
  UserId:        u.UserId,
  Name:          u.Name,
  Email:         u.Email,
  RoleId:        u.RoleId,
  RoleName:      u.RoleName  || null,
  CompanyId:     u.CompanyId || null,
  UserTypeId:    u.UserTypeId || null,
  EmailVerified: u.EmailVerified,
  Status:        u.Status,
  LastLoginAt:   u.LastLoginAt || null,
});


// ─────────────────────────────────────────────────────────────────────────────
// register
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Creates a new user account and sends an email verification link.
 * Only SuperAdmin or CompanyAdmin may set arbitrary roles.
 * A self-registration always gets the Employee role.
 */
const register = async (req, res) => {
  const err = handleValidation(req, res);
  if (err !== null) return;

  const {
    name, email, password,
    mobileNumber, companyId, roleId,
    departmentId, designationId,
  } = req.body;

  const normalizedEmail = email.trim().toLowerCase();
  const device = extractDevice(req);

  try {
    // Duplicate email check
    const existing = await appPool.query(
      `SELECT "UserId" FROM "Users" WHERE LOWER("Email") = $1 AND "IsDeleted" = FALSE`,
      [normalizedEmail]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'Email is already registered' });
    }

    // Resolve role: authenticated callers may specify a role, otherwise default Employee
    const requestingUser = req.user;
    let resolvedRoleId = ROLE_IDS.EMPLOYEE;
    if (roleId) {
      if (!requestingUser) {
        return res.status(403).json({ message: 'Role assignment requires authentication' });
      }
      const requestingRoleId = requestingUser.roleId || requestingUser.RoleId;
      // Only SuperAdmin / CompanyAdmin can assign roles
      if (requestingRoleId !== ROLE_IDS.SUPERADMIN && requestingRoleId !== ROLE_IDS.ADMIN) {
        return res.status(403).json({ message: 'You do not have permission to assign roles' });
      }
      // Cannot assign a role ≥ your own (except SuperAdmin)
      if (requestingRoleId !== ROLE_IDS.SUPERADMIN && parseInt(roleId) <= requestingRoleId) {
        return res.status(403).json({ message: 'Cannot assign a role equal to or higher than your own' });
      }
      resolvedRoleId = parseInt(roleId);
    }

    // Resolve company
    let resolvedCompanyId = companyId ? parseInt(companyId) : null;
    if (requestingUser && requestingUser.roleId !== ROLE_IDS.SUPERADMIN) {
      // Non-SuperAdmin can only create users in their own company
      const userCompanyId = requestingUser.companyId || requestingUser.CompanyId;
      if (resolvedCompanyId && resolvedCompanyId !== userCompanyId) {
        return res.status(403).json({ message: 'Cross-company user creation is not allowed' });
      }
      resolvedCompanyId = userCompanyId || resolvedCompanyId;
    }

    const hash = await bcrypt.hash(password, 12);
    const verifyToken = generateSecureToken();
    const verifyExpires = new Date(Date.now() + VERIFY_TOKEN_EXPIRES_MS);

    const result = await appPool.query(`
      INSERT INTO "Users"
        ("Name", "Email", "Password", "MobileNumber", "RoleId", "CompanyId",
         "DepartmentId", "DesignationId", "IsActive", "IsDeleted",
         "EmailVerified", "Status", "VerificationToken", "VerificationTokenExpires",
         "PasswordChangedAt", "CreatedAt", "UpdatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, FALSE,
              FALSE, 'pending_verification', $9, $10, NOW(), NOW(), NOW())
      RETURNING "UserId", "Name", "Email", "RoleId", "CompanyId", "EmailVerified", "Status"
    `, [
      name.trim(), normalizedEmail, hash, mobileNumber || null,
      resolvedRoleId, resolvedCompanyId,
      departmentId ? parseInt(departmentId) : null,
      designationId ? parseInt(designationId) : null,
      verifyToken, verifyExpires,
    ]);

    const newUser = result.rows[0];

    // Send verification email (non-blocking — failure does not abort registration)
    if (isEmailConfigured()) {
      const verifyUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email?token=${verifyToken}`;
      sendEmail({
        to: normalizedEmail,
        subject: 'Verify your email address',
        html: `<p>Hi ${name},</p>
               <p>Click the link below to verify your email address:</p>
               <p><a href="${verifyUrl}">${verifyUrl}</a></p>
               <p>This link expires in 24 hours.</p>`,
      }).catch((e) => console.error('Verification email failed:', e.message));
    }

    await logAuthEvent({
      userId:    newUser.UserId,
      action:    'REGISTER',
      entityType: 'User',
      entityId:  newUser.UserId,
      newValue:  { email: normalizedEmail, roleId: resolvedRoleId },
      ipAddress: device.ip,
      userAgent: device.userAgent,
    });

    return res.status(201).json({
      message: 'Account created. Please check your email to verify your account.',
      user:    sanitizeUser(newUser),
    });
  } catch (e) {
    console.error('Register error:', e);
    return res.status(500).json({ message: 'Server error during registration' });
  }
};


// ─────────────────────────────────────────────────────────────────────────────
// login
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 */
const login = async (req, res) => {
  const err = handleValidation(req, res);
  if (err !== null) return;

  const { email, password, rememberMe = false } = req.body;
  const normalizedEmail = email.trim().toLowerCase();
  const device = extractDevice(req);

  try {
    // Fetch user with role name
    const result = await appPool.query(`
      SELECT u."UserId", u."Name", u."Email", u."Password", u."RoleId",
             u."CompanyId", u."UserTypeId", u."Status", u."IsActive",
             u."EmailVerified", u."FailedLoginAttempts", u."LockedUntil",
             u."RefreshTokenVersion", u."HierarchyLevel",
             r."RoleName"
      FROM "Users" u
      LEFT JOIN "Roles" r ON r."Id" = u."RoleId"
      WHERE LOWER(u."Email") = $1
        AND COALESCE(u."IsDeleted", FALSE) = FALSE
      LIMIT 1
    `, [normalizedEmail]);

    if (result.rows.length === 0) {
      await logLoginAttempt({
        email: normalizedEmail, loginStatus: 'failed',
        ipAddress: device.ip, userAgent: device.userAgent,
        failureReason: 'User not found',
      });
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Account lock check
    if (user.LockedUntil && new Date(user.LockedUntil) > new Date()) {
      const minutes = Math.ceil((new Date(user.LockedUntil) - new Date()) / 60000);
      await logLoginAttempt({
        userId: user.UserId, email: normalizedEmail, loginStatus: 'locked',
        ipAddress: device.ip, userAgent: device.userAgent,
        failureReason: 'Account locked',
      });
      return res.status(423).json({
        message: `Account locked. Try again in ${minutes} minute(s).`,
        lockedUntil: user.LockedUntil,
      });
    }

    // Status checks
    if (user.Status === 'suspended') {
      await logLoginAttempt({
        userId: user.UserId, email: normalizedEmail, loginStatus: 'suspended',
        ipAddress: device.ip, userAgent: device.userAgent,
        failureReason: 'Account suspended',
      });
      return res.status(403).json({ message: 'Account suspended. Contact your administrator.' });
    }
    if (user.Status === 'inactive' || !user.IsActive) {
      return res.status(403).json({ message: 'Account is inactive. Contact your administrator.' });
    }

    // Email verification enforcement (opt-in via env var)
    if (process.env.REQUIRE_EMAIL_VERIFICATION === 'true' && !user.EmailVerified) {
      return res.status(403).json({
        message: 'Please verify your email address before logging in.',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    // Password check
    const passwordOk = await bcrypt.compare(password, user.Password);
    if (!passwordOk) {
      // Increment failed attempts and maybe lock
      const newAttempts = (user.FailedLoginAttempts || 0) + 1;
      const lockUntil   = newAttempts >= MAX_FAILED_ATTEMPTS
        ? new Date(Date.now() + LOCK_DURATION_MINUTES * 60000)
        : null;

      await appPool.query(`
        UPDATE "Users"
        SET "FailedLoginAttempts" = $1,
            "LockedUntil"         = $2,
            "UpdatedAt"           = NOW()
        WHERE "UserId" = $3
      `, [newAttempts, lockUntil, user.UserId]);

      await logLoginAttempt({
        userId: user.UserId, email: normalizedEmail, loginStatus: 'failed',
        ipAddress: device.ip, userAgent: device.userAgent,
        deviceId: device.deviceId,
        failureReason: 'Invalid password',
      });

      const remaining = MAX_FAILED_ATTEMPTS - newAttempts;
      const msg = remaining > 0
        ? `Invalid email or password. ${remaining} attempt(s) remaining.`
        : `Account locked for ${LOCK_DURATION_MINUTES} minutes due to too many failed attempts.`;
      return res.status(401).json({ message: msg });
    }

    // Success — reset counters and record login
    const sessionId = crypto.randomBytes(16).toString('hex');
    await appPool.query(`
      UPDATE "Users"
      SET "FailedLoginAttempts" = 0,
          "LockedUntil"         = NULL,
          "LastLoginAt"         = NOW(),
          "LastLoginIP"         = $1,
          "LastLoginDevice"     = $2,
          "RememberMe"          = $3,
          "UpdatedAt"           = NOW()
      WHERE "UserId" = $4
    `, [device.ip, device.userAgent, rememberMe, user.UserId]);

    // Check if 2FA is enabled for this user
    const twoFAResult = await appPool.query(
      `SELECT "IsEnabled" FROM "User2FA" WHERE "UserId" = $1 AND "IsEnabled" = TRUE`,
      [user.UserId]
    );

    if (twoFAResult.rows.length > 0) {
      // 2FA is enabled — do not issue tokens yet, require 2FA verification
      await logLoginAttempt({
        userId: user.UserId, email: normalizedEmail, loginStatus: '2fa_required',
        ipAddress: device.ip, userAgent: device.userAgent,
        deviceId: device.deviceId, deviceType: device.deviceType,
        browser: device.browser, sessionId,
      });

      return res.status(200).json({
        message: '2FA verification required',
        requires2FA: true,
        userId: user.UserId,
        sessionId,
      });
    }

    // 2FA not enabled — issue tokens directly
    const tokens = await generateTokens(user);

    await logLoginAttempt({
      userId: user.UserId, email: normalizedEmail, loginStatus: 'success',
      ipAddress: device.ip, userAgent: device.userAgent,
      deviceId: device.deviceId, deviceType: device.deviceType,
      browser: device.browser, sessionId,
    });

    await logAuthEvent({
      userId: user.UserId, action: 'LOGIN',
      entityType: 'User', entityId: user.UserId,
      ipAddress: device.ip, userAgent: device.userAgent,
    });

    return res.status(200).json({
      message: 'Login successful',
      ...tokens,
      user: sanitizeUser(user),
      sessionId,
    });
  } catch (e) {
    console.error('Login error:', e);
    return res.status(500).json({ message: 'Server error during login' });
  }
};


// ─────────────────────────────────────────────────────────────────────────────
// logout
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/logout
 * Revokes the current refresh token (single device).
 */
const logout = async (req, res) => {
  try {
    const { refreshToken, sessionId } = req.body;
    const userId  = req.user?.userId || req.user?.UserId;
    const device  = extractDevice(req);

    if (refreshToken) {
      // Decode JTI without full verification to find the DB record
      const jwt = require('jsonwebtoken');
      try {
        const decoded = jwt.decode(refreshToken);
        if (decoded?.jti) {
          await revokeRefreshToken(decoded.jti);
        }
      } catch (_) { /* token may be malformed — still proceed */ }
    }

    if (sessionId) {
      await logLogout(sessionId);
    }

    await logAuthEvent({
      userId, action: 'LOGOUT',
      entityType: 'User', entityId: userId,
      ipAddress: device.ip, userAgent: device.userAgent,
    });

    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (e) {
    console.error('Logout error:', e);
    return res.status(500).json({ message: 'Server error during logout' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// logoutAll
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/logout-all
 * Revokes ALL refresh tokens for the authenticated user (all devices).
 */
const logoutAll = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.UserId;
    const device = extractDevice(req);

    await revokeAllUserTokens(userId);

    // Bump RefreshTokenVersion to invalidate any tokens not tracked in DB
    await appPool.query(`
      UPDATE "Users"
      SET "RefreshTokenVersion" = COALESCE("RefreshTokenVersion", 0) + 1,
          "UpdatedAt"           = NOW()
      WHERE "UserId" = $1
    `, [userId]);

    await logAuthEvent({
      userId, action: 'LOGOUT_ALL',
      entityType: 'User', entityId: userId,
      ipAddress: device.ip, userAgent: device.userAgent,
    });

    return res.status(200).json({ message: 'Logged out from all devices' });
  } catch (e) {
    console.error('Logout-all error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// refreshToken
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/refresh
 * Rotates the refresh token — issues new access + refresh pair.
 */
const refreshToken = async (req, res) => {
  const err = handleValidation(req, res);
  if (err !== null) return;

  const { refreshToken: token } = req.body;

  try {
    const payload = await verifyRefreshToken(token);
    if (!payload) {
      return res.status(403).json({ message: 'Invalid or expired refresh token' });
    }

    const userResult = await appPool.query(`
      SELECT u."UserId", u."Email", u."UserTypeId", u."RoleId",
             u."CompanyId", u."HierarchyLevel", u."Status", u."IsActive",
             u."RefreshTokenVersion", r."RoleName"
      FROM "Users" u
      LEFT JOIN "Roles" r ON r."Id" = u."RoleId"
      WHERE u."UserId" = $1 AND COALESCE(u."IsDeleted", FALSE) = FALSE
      LIMIT 1
    `, [payload.userId]);

    if (!userResult.rows.length) {
      return res.status(403).json({ message: 'User not found' });
    }

    const user = userResult.rows[0];
    if (user.Status === 'suspended' || !user.IsActive) {
      return res.status(403).json({ message: 'Account is no longer active' });
    }

    // Rotate: revoke old, issue new
    await revokeRefreshToken(payload.jti);
    const tokens = await generateTokens(user);

    return res.status(200).json({
      ...tokens,
      expiresIn: 900, // 15 minutes
    });
  } catch (e) {
    console.error('Token refresh error:', e);
    return res.status(403).json({ message: 'Token refresh failed' });
  }
};


// ─────────────────────────────────────────────────────────────────────────────
// forgotPassword
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/forgot-password
 * Sends a password-reset email. Always returns 200 to prevent email enumeration.
 */
const forgotPassword = async (req, res) => {
  const err = handleValidation(req, res);
  if (err !== null) return;

  const normalizedEmail = req.body.email.trim().toLowerCase();
  const device = extractDevice(req);

  // Always respond 200 regardless of whether email exists
  const SUCCESS_MSG = 'If that email is registered, a password reset link has been sent.';

  try {
    const result = await appPool.query(`
      SELECT "UserId", "Name", "Email", "IsActive", "Status"
      FROM "Users"
      WHERE LOWER("Email") = $1 AND COALESCE("IsDeleted", FALSE) = FALSE
      LIMIT 1
    `, [normalizedEmail]);

    if (!result.rows.length) {
      return res.status(200).json({ message: SUCCESS_MSG });
    }

    const user = result.rows[0];
    if (!user.IsActive || user.Status === 'suspended') {
      return res.status(200).json({ message: SUCCESS_MSG });
    }

    const resetToken   = generateSecureToken();
    const resetExpires = new Date(Date.now() + RESET_TOKEN_EXPIRES_MS);

    await appPool.query(`
      UPDATE "Users"
      SET "ResetPasswordToken"   = $1,
          "ResetPasswordExpires" = $2,
          "UpdatedAt"            = NOW()
      WHERE "UserId" = $3
    `, [resetToken, resetExpires, user.UserId]);

    // Also insert into PasswordResets table for FK-auditable trail
    await appPool.query(`
      INSERT INTO "PasswordResets" ("UserId", "Token", "ExpiresAt", "CreatedAt")
      VALUES ($1, $2, $3, NOW())
    `, [user.UserId, resetToken, resetExpires]);

    if (isEmailConfigured()) {
      const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
      sendEmail({
        to: normalizedEmail,
        subject: 'Password Reset Request',
        html: `<p>Hi ${user.Name},</p>
               <p>You requested a password reset. Click the link below (valid for 1 hour):</p>
               <p><a href="${resetUrl}">${resetUrl}</a></p>
               <p>If you did not request this, ignore this email.</p>`,
      }).catch((e) => console.error('Password reset email failed:', e.message));
    }

    await logAuthEvent({
      userId: user.UserId, action: 'FORGOT_PASSWORD',
      entityType: 'User', entityId: user.UserId,
      ipAddress: device.ip, userAgent: device.userAgent,
    });

    return res.status(200).json({ message: SUCCESS_MSG });
  } catch (e) {
    console.error('Forgot password error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// resetPassword
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/reset-password
 */
const resetPassword = async (req, res) => {
  const err = handleValidation(req, res);
  if (err !== null) return;

  const { token, password } = req.body;
  const device = extractDevice(req);

  try {
    const result = await appPool.query(`
      SELECT "UserId", "Name", "Email", "ResetPasswordExpires"
      FROM "Users"
      WHERE "ResetPasswordToken" = $1
        AND "ResetPasswordExpires" > NOW()
        AND COALESCE("IsDeleted", FALSE) = FALSE
      LIMIT 1
    `, [token]);

    if (!result.rows.length) {
      return res.status(400).json({ message: 'Reset token is invalid or has expired' });
    }

    const user = result.rows[0];
    const hash = await bcrypt.hash(password, 12);

    await appPool.query(`
      UPDATE "Users"
      SET "Password"             = $1,
          "ResetPasswordToken"   = NULL,
          "ResetPasswordExpires" = NULL,
          "PasswordChangedAt"    = NOW(),
          "FailedLoginAttempts"  = 0,
          "LockedUntil"          = NULL,
          "UpdatedAt"            = NOW()
      WHERE "UserId" = $2
    `, [hash, user.UserId]);

    // Revoke all refresh tokens — force re-login everywhere
    await revokeAllUserTokens(user.UserId);

    await logAuthEvent({
      userId: user.UserId, action: 'PASSWORD_RESET',
      entityType: 'User', entityId: user.UserId,
      ipAddress: device.ip, userAgent: device.userAgent,
    });

    return res.status(200).json({ message: 'Password reset successful. Please log in.' });
  } catch (e) {
    console.error('Reset password error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};


// ─────────────────────────────────────────────────────────────────────────────
// verifyEmail
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/auth/verify-email?token=<token>
 */
const verifyEmail = async (req, res) => {
  const err = handleValidation(req, res);
  if (err !== null) return;

  const { token } = req.query;
  const device    = extractDevice(req);

  try {
    const result = await appPool.query(`
      SELECT "UserId", "Name", "Email", "EmailVerified", "VerificationTokenExpires"
      FROM "Users"
      WHERE "VerificationToken" = $1
        AND COALESCE("IsDeleted", FALSE) = FALSE
      LIMIT 1
    `, [token]);

    if (!result.rows.length) {
      return res.status(400).json({ message: 'Verification token is invalid' });
    }

    const user = result.rows[0];

    if (user.EmailVerified) {
      return res.status(200).json({ message: 'Email is already verified' });
    }

    if (user.VerificationTokenExpires && new Date(user.VerificationTokenExpires) < new Date()) {
      return res.status(400).json({
        message: 'Verification token has expired. Please request a new verification email.',
        code: 'TOKEN_EXPIRED',
      });
    }

    await appPool.query(`
      UPDATE "Users"
      SET "EmailVerified"           = TRUE,
          "EmailVerifiedAt"         = NOW(),
          "VerificationToken"       = NULL,
          "VerificationTokenExpires"= NULL,
          "Status"                  = CASE WHEN "Status" = 'pending_verification' THEN 'active' ELSE "Status" END,
          "UpdatedAt"               = NOW()
      WHERE "UserId" = $1
    `, [user.UserId]);

    await logAuthEvent({
      userId: user.UserId, action: 'EMAIL_VERIFIED',
      entityType: 'User', entityId: user.UserId,
      ipAddress: device.ip, userAgent: device.userAgent,
    });

    return res.status(200).json({ message: 'Email verified successfully. You may now log in.' });
  } catch (e) {
    console.error('Email verification error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// resendVerification
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/resend-verification
 * Rate-limited by express-rate-limit at route level.
 */
const resendVerification = async (req, res) => {
  const err = handleValidation(req, res);
  if (err !== null) return;

  const normalizedEmail = req.body.email.trim().toLowerCase();
  const device = extractDevice(req);

  // Always respond 200 to prevent enumeration
  const MSG = 'If your account exists and is unverified, a new verification email has been sent.';

  try {
    const result = await appPool.query(`
      SELECT "UserId", "Name", "Email", "EmailVerified"
      FROM "Users"
      WHERE LOWER("Email") = $1 AND COALESCE("IsDeleted", FALSE) = FALSE
      LIMIT 1
    `, [normalizedEmail]);

    if (!result.rows.length || result.rows[0].EmailVerified) {
      return res.status(200).json({ message: MSG });
    }

    const user       = result.rows[0];
    const newToken   = generateSecureToken();
    const newExpires = new Date(Date.now() + VERIFY_TOKEN_EXPIRES_MS);

    await appPool.query(`
      UPDATE "Users"
      SET "VerificationToken"        = $1,
          "VerificationTokenExpires" = $2,
          "UpdatedAt"                = NOW()
      WHERE "UserId" = $3
    `, [newToken, newExpires, user.UserId]);

    if (isEmailConfigured()) {
      const verifyUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email?token=${newToken}`;
      sendEmail({
        to: normalizedEmail,
        subject: 'Verify your email address',
        html: `<p>Hi ${user.Name},</p>
               <p>Here is your new verification link (valid for 24 hours):</p>
               <p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
      }).catch((e) => console.error('Resend verification email failed:', e.message));
    }

    await logAuthEvent({
      userId: user.UserId, action: 'RESEND_VERIFICATION',
      entityType: 'User', entityId: user.UserId,
      ipAddress: device.ip, userAgent: device.userAgent,
    });

    return res.status(200).json({ message: MSG });
  } catch (e) {
    console.error('Resend verification error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};


// ─────────────────────────────────────────────────────────────────────────────
// changePassword
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/change-password  (authenticated)
 */
const changePassword = async (req, res) => {
  const err = handleValidation(req, res);
  if (err !== null) return;

  const { currentPassword, newPassword } = req.body;
  const userId = req.user?.userId || req.user?.UserId;
  const device = extractDevice(req);

  try {
    const result = await appPool.query(`
      SELECT "UserId", "Password"
      FROM "Users"
      WHERE "UserId" = $1 AND COALESCE("IsDeleted", FALSE) = FALSE
      LIMIT 1
    `, [userId]);

    if (!result.rows.length) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = result.rows[0];
    const currentOk = await bcrypt.compare(currentPassword, user.Password);
    if (!currentOk) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    const hash = await bcrypt.hash(newPassword, 12);

    await appPool.query(`
      UPDATE "Users"
      SET "Password"          = $1,
          "PasswordChangedAt" = NOW(),
          "UpdatedAt"         = NOW()
      WHERE "UserId" = $2
    `, [hash, userId]);

    // Revoke all refresh tokens except the current session — user must re-auth on other devices
    await revokeAllUserTokens(userId);

    await logAuthEvent({
      userId, action: 'PASSWORD_CHANGE',
      entityType: 'User', entityId: userId,
      ipAddress: device.ip, userAgent: device.userAgent,
    });

    return res.status(200).json({ message: 'Password changed successfully. Please log in again.' });
  } catch (e) {
    console.error('Change password error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// unlockAccount
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/unlock/:userId  (SuperAdmin / CompanyAdmin only)
 */
const unlockAccount = async (req, res) => {
  const err = handleValidation(req, res);
  if (err !== null) return;

  const targetUserId  = parseInt(req.params.userId, 10);
  const requestingUser = req.user;
  const device        = extractDevice(req);

  try {
    const requestingRoleId = requestingUser?.roleId || requestingUser?.RoleId;
    if (requestingRoleId !== ROLE_IDS.SUPERADMIN && requestingRoleId !== ROLE_IDS.ADMIN) {
      return res.status(403).json({ message: 'Only administrators can unlock accounts' });
    }

    const result = await appPool.query(`
      SELECT "UserId", "Name", "Email", "CompanyId"
      FROM "Users"
      WHERE "UserId" = $1 AND COALESCE("IsDeleted", FALSE) = FALSE
      LIMIT 1
    `, [targetUserId]);

    if (!result.rows.length) {
      return res.status(404).json({ message: 'User not found' });
    }

    const target = result.rows[0];

    // CompanyAdmin can only unlock users in their own company
    if (requestingRoleId === ROLE_IDS.ADMIN) {
      const adminCompany = requestingUser.companyId || requestingUser.CompanyId;
      if (target.CompanyId !== adminCompany) {
        return res.status(403).json({ message: 'You can only unlock users in your own company' });
      }
    }

    await appPool.query(`
      UPDATE "Users"
      SET "FailedLoginAttempts" = 0,
          "LockedUntil"         = NULL,
          "Status"              = CASE WHEN "Status" = 'suspended' THEN 'active' ELSE "Status" END,
          "UpdatedAt"           = NOW()
      WHERE "UserId" = $1
    `, [targetUserId]);

    await logAuthEvent({
      userId: requestingUser.userId || requestingUser.UserId,
      action: 'ACCOUNT_UNLOCKED',
      entityType: 'User', entityId: targetUserId,
      newValue: { unlockedBy: requestingUser.userId, targetEmail: target.Email },
      ipAddress: device.ip, userAgent: device.userAgent,
    });

    return res.status(200).json({ message: `Account for ${target.Email} has been unlocked` });
  } catch (e) {
    console.error('Unlock account error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// getMe  (authenticated)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  const userId = req.user?.userId || req.user?.UserId;
  try {
    const result = await appPool.query(`
      SELECT u."UserId", u."Name", u."Email", u."MobileNumber",
             u."RoleId", u."CompanyId", u."UserTypeId",
             u."Status", u."IsActive", u."EmailVerified",
             u."EmailVerifiedAt", u."LastLoginAt", u."LastLoginIP",
             u."PasswordChangedAt", u."CreatedAt",
             u."ProfileImage", u."HierarchyLevel",
             r."RoleName",
             c."CompanyName"
      FROM "Users" u
      LEFT JOIN "Roles" r ON r."Id" = u."RoleId"
      LEFT JOIN "Companies" c ON c."Id" = u."CompanyId"
      WHERE u."UserId" = $1 AND COALESCE(u."IsDeleted", FALSE) = FALSE
      LIMIT 1
    `, [userId]);

    if (!result.rows.length) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ user: result.rows[0] });
  } catch (e) {
    console.error('Get me error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
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
};
