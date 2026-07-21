# API Endpoints Documentation

## Authentication & Authorization Endpoints

### Authentication

#### Login
```http
POST /api/users/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "rememberMe": false
}

Response 200:
{
  "accessToken": "jwt-access-token",
  "refreshToken": "jwt-refresh-token",
  "expiresIn": "15m",
  "user": {
    "UserId": 1,
    "Email": "user@example.com",
    "Name": "John Doe",
    "RoleId": 2,
    "RoleName": "Company Admin",
    "CompanyId": 1
  }
}

Error 401:
{
  "message": "Invalid credentials"
}

Error 423:
{
  "message": "Account is locked due to 5 failed login attempts. Please try again in 25 minutes."
}
```

#### Refresh Access Token
```http
POST /api/token/refresh-token
Content-Type: application/json

{
  "refreshToken": "jwt-refresh-token"
}

Response 200:
{
  "accessToken": "new-jwt-access-token",
  "expiresIn": "15m"
}
```

#### Logout
```http
POST /api/users/logout
Authorization: Bearer {access-token}
Content-Type: application/json

{
  "refreshToken": "jwt-refresh-token"
}

Response 200:
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### Logout from All Devices
```http
POST /api/users/logout-all
Authorization: Bearer {access-token}

Response 200:
{
  "success": true,
  "message": "Logged out from all devices"
}
```

### Password Management

#### Forgot Password
```http
POST /api/users/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}

Response 200:
{
  "success": true,
  "message": "Password reset link has been sent to your email."
}
```

#### Reset Password
```http
POST /api/users/reset-password
Content-Type: application/json

{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePassword123!"
}

Response 200:
{
  "success": true,
  "message": "Password has been reset successfully. Please login with your new password."
}
```

#### Change Password
```http
POST /api/users/change-password
Authorization: Bearer {access-token}
Content-Type: application/json

{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewSecurePassword123!"
}

Response 200:
{
  "success": true,
  "message": "Password changed successfully"
}
```

#### Get Password Policy
```http
GET /api/users/password-policy

Response 200:
{
  "requirements": [
    "At least 8 characters long",
    "At least 1 uppercase letter",
    "At least 1 lowercase letter",
    "At least 1 number",
    "At least 1 special character (!@#$%^&*...)",
    "Cannot be a common password",
    "Cannot contain your name or email"
  ],
  "policy": {
    "minLength": 8,
    "requireUppercase": true,
    "requireLowercase": true,
    "requireNumbers": true,
    "requireSpecialChars": true
  }
}
```

### Email Verification

#### Verify Email
```http
POST /api/users/verify-email
Content-Type: application/json

{
  "token": "verification-token-from-email"
}

Response 200:
{
  "success": true,
  "message": "Email verified successfully!"
}
```

#### Resend Verification Email
```http
POST /api/users/resend-verification
Content-Type: application/json

{
  "email": "user@example.com"
}

Response 200:
{
  "success": true,
  "message": "Verification email sent successfully."
}
```

### Session Management

#### Get Active Sessions
```http
GET /api/users/sessions
Authorization: Bearer {access-token}

Response 200:
[
  {
    "TokenId": 1,
    "DeviceType": "desktop",
    "Browser": "Chrome",
    "OS": "Windows",
    "IpAddress": "192.168.1.1",
    "CreatedAt": "2026-07-20T10:00:00Z",
    "LastUsedAt": "2026-07-20T15:30:00Z"
  }
]
```

#### Revoke Specific Session
```http
DELETE /api/users/sessions/:tokenId
Authorization: Bearer {access-token}

Response 200:
{
  "success": true,
  "message": "Session revoked successfully"
}
```

## RBAC Management Endpoints

### Permissions

#### Get All Permissions
```http
GET /api/permissions
Authorization: Bearer {access-token}

Response 200:
{
  "products": {
    "moduleId": 1,
    "moduleName": "Products",
    "permissions": [
      {
        "permissionId": 1,
        "permissionKey": "products.create",
        "permissionName": "Create Products",
        "action": "create"
      },
      {
        "permissionId": 2,
        "permissionKey": "products.read",
        "permissionName": "Read Products",
        "action": "read"
      }
    ]
  }
}
```

#### Get User Permissions
```http
GET /api/permissions/user/:userId
Authorization: Bearer {access-token}

Response 200:
[
  {
    "PermissionId": 1,
    "PermissionKey": "products.create",
    "PermissionName": "Create Products",
    "Action": "create",
    "ModuleKey": "products",
    "ModuleName": "Products"
  }
]
```

#### Get Role Permissions
```http
GET /api/permissions/role/:roleId
Authorization: Bearer {access-token}

Response 200:
[
  {
    "PermissionId": 1,
    "PermissionKey": "products.create",
    "PermissionName": "Create Products",
    "Action": "create",
    "ModuleKey": "products",
    "ModuleName": "Products",
    "IsGranted": true
  }
]
```

#### Assign Permission to Role
```http
POST /api/permissions/assign
Authorization: Bearer {access-token}
Content-Type: application/json

{
  "roleId": 5,
  "permissionId": 10
}

Response 200:
{
  "success": true,
  "message": "Permission assigned to role"
}
```

#### Revoke Permission from Role
```http
DELETE /api/permissions/revoke
Authorization: Bearer {access-token}
Content-Type: application/json

{
  "roleId": 5,
  "permissionId": 10
}

Response 200:
{
  "success": true,
  "message": "Permission revoked from role"
}
```

### Menus

#### Get User Menus (Hierarchical)
```http
GET /api/menus/user
Authorization: Bearer {access-token}

Response 200:
[
  {
    "MenuId": 1,
    "MenuName": "Dashboard",
    "MenuKey": "menu.dashboard",
    "MenuPath": "/dashboard",
    "MenuIcon": "dashboard",
    "CanView": true,
    "CanCreate": false,
    "children": []
  },
  {
    "MenuId": 2,
    "MenuName": "Inventory",
    "MenuKey": "menu.inventory",
    "MenuPath": "/inventory",
    "MenuIcon": "inventory",
    "CanView": true,
    "children": [
      {
        "MenuId": 3,
        "MenuName": "Products",
        "MenuKey": "menu.inventory.products",
        "MenuPath": "/inventory/products",
        "MenuIcon": "category",
        "CanView": true,
        "CanCreate": true,
        "children": []
      }
    ]
  }
]
```

#### Get All Menus (Admin)
```http
GET /api/menus
Authorization: Bearer {access-token}

Response 200:
[
  {
    "MenuId": 1,
    "MenuName": "Dashboard",
    "MenuKey": "menu.dashboard",
    "MenuPath": "/dashboard",
    "IsVisible": true,
    "IsActive": true,
    "ModuleKey": "dashboard"
  }
]
```

### Modules

#### Get User Modules
```http
GET /api/modules/user
Authorization: Bearer {access-token}

Response 200:
[
  {
    "ModuleId": 1,
    "ModuleKey": "dashboard",
    "ModuleName": "Dashboard",
    "Icon": "dashboard"
  },
  {
    "ModuleId": 2,
    "ModuleKey": "products",
    "ModuleName": "Products",
    "Icon": "category"
  }
]
```

### Audit Logs

#### Get Audit Logs
```http
GET /api/audit-logs?userId=1&action=LOGIN&startDate=2026-01-01&endDate=2026-12-31&limit=100&offset=0
Authorization: Bearer {access-token}

Response 200:
[
  {
    "Id": 1,
    "UserId": 1,
    "UserName": "John Doe",
    "Action": "LOGIN",
    "EntityType": "Authentication",
    "IpAddress": "192.168.1.1",
    "CreatedAt": "2026-07-20T10:00:00Z"
  }
]
```

#### Get Audit Statistics
```http
GET /api/audit-logs/stats?startDate=2026-07-01&endDate=2026-07-31
Authorization: Bearer {access-token}

Response 200:
[
  {
    "Action": "LOGIN",
    "EntityType": "Authentication",
    "Count": 150
  },
  {
    "Action": "UPDATE",
    "EntityType": "Products",
    "Count": 45
  }
]
```

### Login History

#### Get User Login History
```http
GET /api/login-history?userId=1&limit=50&offset=0
Authorization: Bearer {access-token}

Response 200:
[
  {
    "LoginId": 1,
    "LoginStatus": "success",
    "IpAddress": "192.168.1.1",
    "DeviceType": "desktop",
    "Browser": "Chrome",
    "OperatingSystem": "Windows",
    "IsSuspicious": false,
    "CreatedAt": "2026-07-20T10:00:00Z"
  }
]
```

#### Get Suspicious Logins
```http
GET /api/login-history/suspicious?startDate=2026-07-01&endDate=2026-07-31
Authorization: Bearer {access-token}

Response 200:
[
  {
    "LoginId": 123,
    "UserId": 5,
    "UserName": "Jane Smith",
    "Email": "jane@example.com",
    "IpAddress": "10.0.0.1",
    "SuspiciousReason": "Multiple failed attempts in last hour; Logins from multiple IPs",
    "CreatedAt": "2026-07-20T10:00:00Z"
  }
]
```

#### Get Failed Login Attempts
```http
GET /api/login-history/failed?startDate=2026-07-01&endDate=2026-07-31&limit=100
Authorization: Bearer {access-token}

Response 200:
[
  {
    "LoginId": 456,
    "UserId": 3,
    "Email": "user@example.com",
    "IpAddress": "192.168.1.100",
    "FailureReason": "Invalid credentials",
    "CreatedAt": "2026-07-20T09:45:00Z"
  }
]
```

## Error Responses

### Common Error Codes

#### 400 Bad Request
```json
{
  "message": "Validation error message",
  "errors": ["Specific error 1", "Specific error 2"]
}
```

#### 401 Unauthorized
```json
{
  "message": "Authentication required" | "Invalid or expired token"
}
```

#### 403 Forbidden
```json
{
  "message": "Forbidden: Missing required permission: products.create",
  "requiredPermission": "products.create"
}
```

#### 404 Not Found
```json
{
  "message": "Resource not found"
}
```

#### 429 Too Many Requests
```json
{
  "message": "Too many requests. Please try again later."
}
```

#### 500 Internal Server Error
```json
{
  "message": "Internal server error"
}
```

## Authentication Headers

All protected endpoints require the access token in the Authorization header:

```http
Authorization: Bearer {access-token}
```

## Rate Limiting

- **Authentication endpoints**: 5 requests per 15 minutes
- **General API endpoints**: 100 requests per 15 minutes (development: 5000)
- **Health check**: Unlimited

## Environment

- **Development**: `http://localhost:5351`
- **Production**: Configure via `CLIENT_ORIGIN` environment variable

---

For more details, see [RBAC_IMPLEMENTATION_GUIDE.md](./RBAC_IMPLEMENTATION_GUIDE.md)
