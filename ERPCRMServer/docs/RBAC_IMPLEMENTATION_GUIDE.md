# Enterprise RBAC System Implementation Guide

## Overview

This document describes the complete Authentication, Authorization, and RBAC (Role-Based Access Control) system implemented for the ERP/CRM application.

## Architecture

### Database Schema

#### Core Authentication Tables

**Users Table Extensions:**
- `PasswordChangedAt` - Track password changes
- `FailedLoginAttempts` - Count failed login attempts
- `LockedUntil` - Account lock timestamp
- `LastLoginIP` - Last successful login IP
- `LastLoginDevice` - Device information
- `RefreshTokenVersion` - Token rotation version
- `RememberMe` - Extended session flag
- `Status` - Account status (active, inactive, locked, suspended, pending)
- `EmailVerifiedAt` - Email verification timestamp
- `PasswordResetRequired` - Force password reset flag
- `TwoFactorEnabled` - 2FA status
- `TwoFactorSecret` - 2FA secret key

#### RBAC Tables

1. **Modules** - System modules/features (75+ modules)
   - Products, Inventory, Sales, CRM, HR, Finance, etc.
   
2. **Permissions** - Granular permissions (300+ permissions)
   - Actions: create, read, update, delete, approve, export, import
   
3. **UserRoles** - User-to-role assignments
   - Supports multiple roles per user
   - Company-scoped assignments
   
4. **RolePermissions** - Role-to-permission mappings
   - Grant/revoke permissions
   - Audit trail
   
5. **Menus** - Navigation menu items (60+ menus)
   - Hierarchical structure
   - Permission-based visibility
   
6. **MenuPermissions** - Role-to-menu mappings
   - Control menu visibility per role

#### Security Tables

1. **RefreshTokens** - JWT refresh token storage
   - Token rotation support
   - Device tracking
   - Revocation capability
   
2. **EmailVerificationTokens** - Email verification
   - Resend limits and cooldown
   - Expiration tracking
   
3. **LoginHistory** - Comprehensive login tracking
   - Success/failure tracking
   - Device and location info
   - Suspicious pattern detection

## Features

### Authentication

✅ **Login**
- Email/password authentication
- Device fingerprinting
- Failed attempt tracking
- Account locking (5 attempts, 30-minute lock)
- Remember me functionality
- Session management

✅ **Token Management**
- JWT access tokens (15 minutes)
- Refresh tokens (7 days / 30 days with remember me)
- Token rotation
- Token revocation
- Logout from all devices

✅ **Password Management**
- Forgot password with email
- Reset password with token
- Change password
- Password policy enforcement:
  - Minimum 8 characters
  - Uppercase, lowercase, numbers, special chars
  - No common passwords
  - No user info in password
- Password strength calculation
- Password history (prevent reuse)

✅ **Email Verification**
- Send verification email
- Verify email with token
- Resend verification (with cooldown)
- Account activation on verification

### Authorization

✅ **Role-Based Access Control (RBAC)**
- 20 predefined roles with hierarchical structure
- Database-driven permissions (no hardcoding)
- Granular permission checking
- Module-level access control
- Menu-based navigation control

✅ **Permission Types**
- `create` - Create new records
- `read` - View records
- `update` - Edit records
- `delete` - Delete records
- `approve` - Approve workflows
- `export` - Export data
- `import` - Import data
- `view` - View dashboards/reports
- `print` - Print documents
- `manage` - Full management access
- `assign` - Assign to users

✅ **Middleware Utilities**
- `requirePermission(key)` - Check specific permission
- `requireModuleAccess(module, action)` - Check module access
- `requireAnyPermission([keys])` - Check any of multiple permissions
- `requireAllPermissions([keys])` - Check all permissions
- `enforceCompanyIsolation()` - Multi-tenant data isolation
- `requireOwnership(field)` - User ownership verification
- `enforceRoleHierarchy()` - Prevent privilege escalation

### Security Features

✅ **Account Protection**
- Account locking after failed attempts
- Suspicious login detection
- IP address tracking
- Device fingerprinting
- Session management

✅ **Audit Logging**
- Authentication events
- Permission changes
- Data modifications
- Role assignments
- Login history

✅ **Login History Tracking**
- All login attempts (success/failure)
- Device and browser information
- IP addresses
- Suspicious pattern detection
- Session duration tracking

## Roles and Permissions

### Role Hierarchy

1. **Super Admin (ID: 1)** - Full system access
2. **Company Admin (ID: 2)** - Company-wide management
3. **Branch Manager (ID: 3)** - Branch operations
4. **Inventory Manager (ID: 4)** - Inventory & procurement
5. **Store Keeper (ID: 5)** - Stock operations
6. **Purchase Manager (ID: 6)** - Procurement with approvals
7. **Purchase Executive (ID: 7)** - Procurement operations
8. **Sales Manager (ID: 8)** - Sales & CRM management
9. **Sales Executive (ID: 9)** - Sales operations
10. **Production Manager (ID: 10)** - Production oversight
11. **Production Supervisor (ID: 11)** - Production operations
12. **Production Operator (ID: 12)** - Production execution
13. **Quality Manager (ID: 13)** - Quality control
14. **Quality Inspector (ID: 14)** - Quality inspections
15. **Finance Manager (ID: 15)** - Financial oversight
16. **Accountant (ID: 16)** - Financial operations
17. **CRM Manager (ID: 17)** - Full CRM access
18. **CRM Executive (ID: 18)** - CRM operations
19. **HR Manager (ID: 19)** - HR management
20. **Employee (ID: 20)** - Limited access

### Permission Inheritance

- Permissions are explicitly assigned to roles
- No automatic inheritance (prevents security issues)
- Super Admin bypasses all permission checks
- Company Admin has full access within their company

## API Endpoints

### Authentication Endpoints

```
POST   /api/users/login                 - Login
POST   /api/users/register              - Register new user
POST   /api/users/logout                - Logout (revoke refresh token)
POST   /api/users/logout-all            - Logout from all devices
POST   /api/token/refresh-token         - Refresh access token
POST   /api/users/forgot-password       - Request password reset
POST   /api/users/reset-password        - Reset password with token
POST   /api/users/change-password       - Change password (authenticated)
POST   /api/users/verify-email          - Verify email with token
POST   /api/users/resend-verification   - Resend verification email
GET    /api/users/sessions              - Get active sessions
DELETE /api/users/sessions/:id          - Revoke specific session
```

### RBAC Management Endpoints

```
GET    /api/permissions                 - Get all permissions
GET    /api/permissions/user/:userId    - Get user permissions
GET    /api/permissions/role/:roleId    - Get role permissions
POST   /api/permissions/assign          - Assign permission to role
DELETE /api/permissions/revoke          - Revoke permission from role

GET    /api/menus                       - Get all menus
GET    /api/menus/user                  - Get user's menus (hierarchical)
POST   /api/menus/assign                - Assign menu to role

GET    /api/modules                     - Get all modules
GET    /api/modules/user                - Get user's accessible modules

GET    /api/roles                       - Get all roles
GET    /api/roles/:id                   - Get role details
POST   /api/roles                       - Create role
PUT    /api/roles/:id                   - Update role
DELETE /api/roles/:id                   - Delete role

GET    /api/audit-logs                  - Get audit logs (filtered)
GET    /api/audit-logs/stats            - Get audit statistics

GET    /api/login-history               - Get login history
GET    /api/login-history/suspicious    - Get suspicious logins
GET    /api/login-history/failed        - Get failed login attempts
```

## Usage Examples

### Protect Routes with Permissions

```javascript
const { requirePermission } = require('./middlewares/permissionMiddleware');

// Require specific permission
router.post('/products', 
  verifyAccessToken,
  requirePermission('products.create'),
  createProduct
);

// Require module access
router.get('/products', 
  verifyAccessToken,
  requireModuleAccess('products', 'read'),
  getProducts
);

// Require any of multiple permissions
router.post('/orders', 
  verifyAccessToken,
  requireAnyPermission(['salesOrders.create', 'purchaseOrders.create']),
  createOrder
);

// Enforce company isolation
router.get('/company-data', 
  verifyAccessToken,
  enforceCompanyIsolation,
  getCompanyData
);
```

### Check Permissions in Controllers

```javascript
const { hasPermission } = require('./services/rbac/permissionService');

async function updateUser(req, res) {
  const userId = req.user.UserId;
  
  // Check if user has permission
  const canUpdate = await hasPermission(userId, 'users.update');
  
  if (!canUpdate) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  
  // Process update
  // ...
}
```

### Validate Password

```javascript
const { validatePassword } = require('./utils/passwordPolicy');

function registerUser(req, res) {
  const { password, email, name } = req.body;
  
  // Validate password against policy
  const validation = validatePassword(password, { email, name });
  
  if (!validation.valid) {
    return res.status(400).json({ 
      message: 'Password does not meet requirements',
      errors: validation.errors,
      strength: validation.strength
    });
  }
  
  // Proceed with registration
  // ...
}
```

### Log Audit Events

```javascript
const { logAuthEvent, logDataChange } = require('./services/auditLogService');

// Log authentication event
await logAuthEvent({
  userId: user.UserId,
  action: 'LOGIN',
  ipAddress: req.ip,
  userAgent: req.headers['user-agent']
});

// Log data modification
await logDataChange({
  userId: req.user.UserId,
  action: 'UPDATE',
  entityType: 'Products',
  entityId: productId,
  oldValue: oldData,
  newValue: newData,
  ipAddress: req.ip,
  userAgent: req.headers['user-agent']
});
```

## Installation & Setup

### 1. Run Database Migrations

```bash
# Run the authentication fields migration
psql -U username -d database_name -f migrations/003_extend_users_authentication.sql
```

### 2. Seed RBAC Data

```bash
# Run all seeders to populate modules, permissions, menus, and role mappings
node seeders/runSeeders.js
```

### 3. Generate Permission Matrix

```bash
# Generate permission matrix in all formats (HTML, CSV, JSON)
node utils/permissionMatrix.js all

# Or generate specific format
node utils/permissionMatrix.js html
```

### 4. Environment Variables

Add to `.env` file:

```env
# JWT Secrets (REQUIRED)
ACCESS_TOKEN_SECRET=your-access-token-secret-here
REFRESH_TOKEN_SECRET=your-refresh-token-secret-here

# Token Expiry
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
REMEMBER_ME_EXPIRY=30d

# Security Settings
MAX_FAILED_ATTEMPTS=5
LOCK_DURATION_MINUTES=30
REQUIRE_EMAIL_VERIFICATION=false

# Password Reset
RESET_TOKEN_EXPIRY_HOURS=1
MAX_RESET_ATTEMPTS_PER_DAY=3

# Email Verification
VERIFICATION_TOKEN_EXPIRY_HOURS=24
MAX_RESEND_ATTEMPTS=5
RESEND_COOLDOWN_MINUTES=5

# Password Policy
PASSWORD_MIN_LENGTH=8
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true
PASSWORD_REQUIRE_NUMBERS=true
PASSWORD_REQUIRE_SPECIAL=true

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:5173
```

## Maintenance

### Cleanup Tasks

Run these periodically (recommended: daily cron job):

```javascript
// Cleanup expired tokens
const { cleanupExpiredTokens: cleanupRefresh } = require('./services/authService');
const { cleanupExpiredTokens: cleanupVerification } = require('./services/emailVerificationService');
const { cleanupExpiredTokens: cleanupReset } = require('./services/passwordResetService');

// Cleanup old login history (keep last 180 days)
const { cleanupOldLoginHistory } = require('./services/loginHistoryService');

// Cleanup old audit logs (keep last 365 days)
const { cleanupOldAuditLogs } = require('./services/auditLogService');
```

## Security Best Practices

1. **Always use HTTPS** in production
2. **Rotate JWT secrets** periodically
3. **Monitor failed login attempts** for potential attacks
4. **Review audit logs** regularly
5. **Keep permissions up to date** as features change
6. **Enforce strong passwords** via policy
7. **Enable 2FA** for admin accounts (when implemented)
8. **Regularly review role permissions** via permission matrix
9. **Monitor suspicious login patterns**
10. **Keep dependencies updated** for security patches

## Permission Matrix

Generate comprehensive permission matrices showing which roles have access to which modules:

```bash
# Generate all formats
node utils/permissionMatrix.js all

# View generated files
docs/permission-matrix.html  # Interactive HTML table
docs/permission-matrix.csv   # Spreadsheet format
docs/permission-matrix.json  # Programmatic access
```

## Testing

### Test Authentication Flow

```javascript
// 1. Register/Login
POST /api/users/login
{
  "email": "admin@example.com",
  "password": "SecurePassword123!",
  "rememberMe": false
}

// 2. Access Protected Route
GET /api/products
Headers: { Authorization: "Bearer <access_token>" }

// 3. Refresh Token
POST /api/token/refresh-token
{
  "refreshToken": "<refresh_token>"
}

// 4. Logout
POST /api/users/logout
{
  "refreshToken": "<refresh_token>"
}
```

### Test Permission Checks

```javascript
// Get user permissions
GET /api/permissions/user/:userId
Headers: { Authorization: "Bearer <access_token>" }

// Get user menus
GET /api/menus/user
Headers: { Authorization: "Bearer <access_token>" }
```

## Troubleshooting

### Common Issues

**Issue: "Token is revoked"**
- Solution: User logged out or token was invalidated. Re-login required.

**Issue: "Account is locked"**
- Solution: Wait for lock duration to expire or contact admin to unlock.

**Issue: "Missing required permission"**
- Solution: Check role permissions via `/api/permissions/role/:roleId`

**Issue: "Password does not meet requirements"**
- Solution: Review password policy at `/api/users/password-policy`

## Support

For issues or questions:
1. Review this documentation
2. Check audit logs for security events
3. Generate and review permission matrix
4. Check login history for authentication issues

---

**Version:** 1.0.0  
**Last Updated:** 2026-07-20  
**Status:** Production Ready ✅
