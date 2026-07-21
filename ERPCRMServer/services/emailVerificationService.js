const crypto = require('crypto');
const { appPool } = require('../config/db');

/**
 * Email Verification Service
 * 
 * Handles email verification token generation, verification, and resend logic.
 */

const VERIFICATION_TOKEN_EXPIRY_HOURS = parseInt(process.env.VERIFICATION_TOKEN_EXPIRY_HOURS) || 24;
const MAX_RESEND_ATTEMPTS = parseInt(process.env.MAX_RESEND_ATTEMPTS) || 5;
const RESEND_COOLDOWN_MINUTES = parseInt(process.env.RESEND_COOLDOWN_MINUTES) || 5;

/**
 * Generate secure verification token
 */
const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Send Verification Email
 */
const sendVerificationEmail = async (userId, email, req) => {
  // Check if user is already verified
  const userCheck = await appPool.query(
    `SELECT "EmailVerified" FROM "Users" WHERE "UserId" = $1`,
    [userId]
  );

  if (userCheck.rows.length > 0 && userCheck.rows[0].EmailVerified) {
    return {
      success: false,
      message: 'Email is already verified.',
    };
  }

  // Check for existing non-verified token
  const existingToken = await appPool.query(
    `SELECT "VerificationId", "ResendCount", "LastResentAt", "ExpiresAt"
     FROM "EmailVerificationTokens"
     WHERE "UserId" = $1 
       AND "IsVerified" = FALSE
       AND "ExpiresAt" > NOW()
     ORDER BY "CreatedAt" DESC
     LIMIT 1`,
    [userId]
  );

  let verificationToken;
  let tokenRecord;

  if (existingToken.rows.length > 0) {
    tokenRecord = existingToken.rows[0];

    // Check resend cooldown
    if (tokenRecord.LastResentAt) {
      const cooldownEnd = new Date(tokenRecord.LastResentAt);
      cooldownEnd.setMinutes(cooldownEnd.getMinutes() + RESEND_COOLDOWN_MINUTES);
      
      if (new Date() < cooldownEnd) {
        const minutesLeft = Math.ceil((cooldownEnd - new Date()) / (1000 * 60));
        throw new Error(
          `Please wait ${minutesLeft} minute(s) before requesting another verification email.`
        );
      }
    }

    // Check max resend attempts
    if (tokenRecord.ResendCount >= MAX_RESEND_ATTEMPTS) {
      throw new Error(
        `Maximum resend attempts (${MAX_RESEND_ATTEMPTS}) reached. Please contact support.`
      );
    }

    // Update resend count
    verificationToken = generateVerificationToken();
    const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
    
    await appPool.query(
      `UPDATE "EmailVerificationTokens"
       SET "Token" = $1,
           "ResendCount" = "ResendCount" + 1,
           "LastResentAt" = NOW()
       WHERE "VerificationId" = $2`,
      [hashedToken, tokenRecord.VerificationId]
    );
  } else {
    // Create new verification token
    verificationToken = generateVerificationToken();
    const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + VERIFICATION_TOKEN_EXPIRY_HOURS);

    const ip = req?.ip || req?.connection?.remoteAddress || 'Unknown';

    await appPool.query(
      `INSERT INTO "EmailVerificationTokens" 
       ("UserId", "Email", "Token", "ExpiresAt", "IpAddress")
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, email, hashedToken, expiresAt, ip]
    );
  }

  // TODO: Send actual email
  const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;
  
  console.log(`✉️  Email verification link for ${email}:`, verificationLink);

  return {
    success: true,
    message: 'Verification email sent successfully.',
    // Remove in production
    ...(process.env.NODE_ENV === 'development' && { verificationToken, verificationLink }),
  };
};

/**
 * Verify Email Token
 */
const verifyEmail = async (token) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  // Find token
  const result = await appPool.query(
    `SELECT "VerificationId", "UserId", "Email", "IsVerified", "ExpiresAt"
     FROM "EmailVerificationTokens"
     WHERE "Token" = $1
     ORDER BY "CreatedAt" DESC
     LIMIT 1`,
    [hashedToken]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid verification token.');
  }

  const tokenRecord = result.rows[0];

  // Check if already verified
  if (tokenRecord.IsVerified) {
    return {
      success: true,
      message: 'Email is already verified.',
    };
  }

  // Check expiration
  if (new Date(tokenRecord.ExpiresAt) < new Date()) {
    throw new Error('Verification token has expired. Please request a new one.');
  }

  // Mark token as verified
  await appPool.query(
    `UPDATE "EmailVerificationTokens"
     SET "IsVerified" = TRUE,
         "VerifiedAt" = NOW()
     WHERE "VerificationId" = $1`,
    [tokenRecord.VerificationId]
  );

  // Update user email verified status
  await appPool.query(
    `UPDATE "Users"
     SET "EmailVerified" = TRUE,
         "EmailVerifiedAt" = NOW(),
         "Status" = CASE WHEN "Status" = 'pending' THEN 'active' ELSE "Status" END,
         "UpdatedAt" = NOW()
     WHERE "UserId" = $1`,
    [tokenRecord.UserId]
  );

  return {
    success: true,
    message: 'Email verified successfully!',
  };
};

/**
 * Check Email Verification Status
 */
const checkVerificationStatus = async (userId) => {
  const result = await appPool.query(
    `SELECT "EmailVerified", "EmailVerifiedAt", "Email"
     FROM "Users"
     WHERE "UserId" = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error('User not found');
  }

  const user = result.rows[0];

  return {
    isVerified: user.EmailVerified,
    verifiedAt: user.EmailVerifiedAt,
    email: user.Email,
  };
};

/**
 * Resend Verification Email
 */
const resendVerificationEmail = async (email, req) => {
  // Get user by email
  const userResult = await appPool.query(
    `SELECT "UserId", "Email", "EmailVerified"
     FROM "Users"
     WHERE LOWER("Email") = LOWER($1) AND "IsDeleted" = FALSE`,
    [email]
  );

  if (userResult.rows.length === 0) {
    // Don't reveal if email exists
    return {
      success: true,
      message: 'If the email exists and is not verified, a verification link has been sent.',
    };
  }

  const user = userResult.rows[0];

  if (user.EmailVerified) {
    return {
      success: false,
      message: 'Email is already verified.',
    };
  }

  return await sendVerificationEmail(user.UserId, user.Email, req);
};

/**
 * Cleanup expired verification tokens
 */
const cleanupExpiredTokens = async () => {
  const result = await appPool.query(
    `DELETE FROM "EmailVerificationTokens"
     WHERE ("ExpiresAt" < NOW() - INTERVAL '7 days')
        OR ("IsVerified" = TRUE AND "VerifiedAt" < NOW() - INTERVAL '30 days')
     RETURNING "VerificationId"`
  );

  return {
    deletedCount: result.rowCount,
    message: `Cleaned up ${result.rowCount} expired verification tokens`,
  };
};

module.exports = {
  sendVerificationEmail,
  verifyEmail,
  checkVerificationStatus,
  resendVerificationEmail,
  cleanupExpiredTokens,
};
