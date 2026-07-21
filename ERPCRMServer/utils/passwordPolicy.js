/**
 * Password Policy Enforcement
 * 
 * Validates password strength and enforces security policies.
 */

// Configuration
const PASSWORD_POLICY = {
  minLength: parseInt(process.env.PASSWORD_MIN_LENGTH) || 8,
  maxLength: parseInt(process.env.PASSWORD_MAX_LENGTH) || 128,
  requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
  requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false',
  requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS !== 'false',
  requireSpecialChars: process.env.PASSWORD_REQUIRE_SPECIAL !== 'false',
  minUppercase: 1,
  minLowercase: 1,
  minNumbers: 1,
  minSpecialChars: 1,
  preventCommonPasswords: true,
  preventUserInfoInPassword: true,
};

// Common weak passwords to reject
const COMMON_PASSWORDS = [
  'password', 'Password123', '12345678', 'qwerty', 'abc123',
  'password1', 'admin', 'letmein', 'welcome', 'monkey',
  '1234567890', 'password123', 'Pass1234', 'admin123'
];

/**
 * Validate password against policy
 */
const validatePassword = (password, userInfo = {}) => {
  const errors = [];

  if (!password || typeof password !== 'string') {
    return {
      valid: false,
      errors: ['Password is required']
    };
  }

  // Check length
  if (password.length < PASSWORD_POLICY.minLength) {
    errors.push(`Password must be at least ${PASSWORD_POLICY.minLength} characters long`);
  }

  if (password.length > PASSWORD_POLICY.maxLength) {
    errors.push(`Password must not exceed ${PASSWORD_POLICY.maxLength} characters`);
  }

  // Check uppercase
  if (PASSWORD_POLICY.requireUppercase) {
    const uppercaseCount = (password.match(/[A-Z]/g) || []).length;
    if (uppercaseCount < PASSWORD_POLICY.minUppercase) {
      errors.push(`Password must contain at least ${PASSWORD_POLICY.minUppercase} uppercase letter(s)`);
    }
  }

  // Check lowercase
  if (PASSWORD_POLICY.requireLowercase) {
    const lowercaseCount = (password.match(/[a-z]/g) || []).length;
    if (lowercaseCount < PASSWORD_POLICY.minLowercase) {
      errors.push(`Password must contain at least ${PASSWORD_POLICY.minLowercase} lowercase letter(s)`);
    }
  }

  // Check numbers
  if (PASSWORD_POLICY.requireNumbers) {
    const numberCount = (password.match(/[0-9]/g) || []).length;
    if (numberCount < PASSWORD_POLICY.minNumbers) {
      errors.push(`Password must contain at least ${PASSWORD_POLICY.minNumbers} number(s)`);
    }
  }

  // Check special characters
  if (PASSWORD_POLICY.requireSpecialChars) {
    const specialCount = (password.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g) || []).length;
    if (specialCount < PASSWORD_POLICY.minSpecialChars) {
      errors.push(`Password must contain at least ${PASSWORD_POLICY.minSpecialChars} special character(s)`);
    }
  }

  // Check against common passwords
  if (PASSWORD_POLICY.preventCommonPasswords) {
    const lowerPassword = password.toLowerCase();
    if (COMMON_PASSWORDS.some(common => lowerPassword.includes(common.toLowerCase()))) {
      errors.push('Password is too common or easily guessable');
    }
  }

  // Check if password contains user information
  if (PASSWORD_POLICY.preventUserInfoInPassword && userInfo) {
    const lowerPassword = password.toLowerCase();
    
    if (userInfo.email) {
      const emailPart = userInfo.email.split('@')[0].toLowerCase();
      if (emailPart.length >= 3 && lowerPassword.includes(emailPart)) {
        errors.push('Password should not contain your email address');
      }
    }

    if (userInfo.name) {
      const nameParts = userInfo.name.toLowerCase().split(' ');
      for (const part of nameParts) {
        if (part.length >= 3 && lowerPassword.includes(part)) {
          errors.push('Password should not contain your name');
        }
      }
    }

    if (userInfo.username) {
      const username = userInfo.username.toLowerCase();
      if (username.length >= 3 && lowerPassword.includes(username)) {
        errors.push('Password should not contain your username');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    strength: calculatePasswordStrength(password)
  };
};

/**
 * Calculate password strength score
 */
const calculatePasswordStrength = (password) => {
  let score = 0;
  
  if (!password) return { score: 0, level: 'Very Weak' };

  // Length bonus
  score += Math.min(password.length * 4, 40);

  // Character variety bonus
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 10;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 15;

  // Pattern penalties
  if (/(.)\1{2,}/.test(password)) score -= 10; // Repeated characters
  if (/^[0-9]+$/.test(password)) score -= 15; // Numbers only
  if (/^[a-zA-Z]+$/.test(password)) score -= 10; // Letters only
  if (/^(123|abc|qwe)/i.test(password)) score -= 10; // Sequential patterns

  // Mixed case bonus
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 5;

  // Length milestones
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;

  // Normalize score to 0-100
  score = Math.max(0, Math.min(100, score));

  // Determine strength level
  let level;
  if (score < 30) level = 'Very Weak';
  else if (score < 50) level = 'Weak';
  else if (score < 70) level = 'Fair';
  else if (score < 85) level = 'Strong';
  else level = 'Very Strong';

  return { score, level };
};

/**
 * Get password policy requirements as human-readable text
 */
const getPasswordPolicyDescription = () => {
  const requirements = [];

  requirements.push(`At least ${PASSWORD_POLICY.minLength} characters long`);
  
  if (PASSWORD_POLICY.requireUppercase) {
    requirements.push('At least 1 uppercase letter');
  }
  
  if (PASSWORD_POLICY.requireLowercase) {
    requirements.push('At least 1 lowercase letter');
  }
  
  if (PASSWORD_POLICY.requireNumbers) {
    requirements.push('At least 1 number');
  }
  
  if (PASSWORD_POLICY.requireSpecialChars) {
    requirements.push('At least 1 special character (!@#$%^&*...)');
  }

  if (PASSWORD_POLICY.preventCommonPasswords) {
    requirements.push('Cannot be a common password');
  }

  if (PASSWORD_POLICY.preventUserInfoInPassword) {
    requirements.push('Cannot contain your name or email');
  }

  return {
    requirements,
    policy: PASSWORD_POLICY
  };
};

/**
 * Generate a random strong password
 */
const generateStrongPassword = (length = 16) => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  let password = '';
  let charSet = uppercase + lowercase + numbers + special;

  // Ensure at least one of each required type
  if (PASSWORD_POLICY.requireUppercase) {
    password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
  }
  if (PASSWORD_POLICY.requireLowercase) {
    password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
  }
  if (PASSWORD_POLICY.requireNumbers) {
    password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }
  if (PASSWORD_POLICY.requireSpecialChars) {
    password += special.charAt(Math.floor(Math.random() * special.length));
  }

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += charSet.charAt(Math.floor(Math.random() * charSet.length));
  }

  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

module.exports = {
  validatePassword,
  calculatePasswordStrength,
  getPasswordPolicyDescription,
  generateStrongPassword,
  PASSWORD_POLICY,
};
