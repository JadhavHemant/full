# 🚀 Quick Wins Action Plan

**Goal:** Complete high-impact, low-effort items in the next 2-3 days

---

## ✅ DAY 1: Security & Error Handling (4-6 hours)

### 1. Add Rate Limiting (1 hour)
**Why:** Prevent brute force attacks  
**Impact:** HIGH  
**Files:** `ERPCRMServer/server.js`, `ERPCRMServer/routes/authRoutes.js`

```bash
cd ERPCRMServer
npm install express-rate-limit
```

### 2. Improve Error Handling (2 hours)
**Why:** Better error messages, easier debugging  
**Impact:** HIGH  
**Files:** Create `ERPCRMServer/utils/errorHandler.js`, `ERPCRMServer/middleware/errorMiddleware.js`

### 3. Add Request Logging (1 hour)
**Why:** Track API usage, debug issues  
**Impact:** MEDIUM  
**Files:** `ERPCRMServer/server.js`

```bash
npm install morgan
```

### 4. Setup Environment Variables Template (30 min)
**Why:** Easier deployment, security  
**Impact:** HIGH  
**Files:** Create `.env.example`

---

## ✅ DAY 2: Complete Partial Features (6-8 hours)

### 1. Complete 2FA Implementation (3 hours)
**Why:** Critical security feature  
**Impact:** HIGH  
**Status:** Backend routes exist, need TOTP logic

**Tasks:**
- Install speakeasy & qrcode
- Implement TOTP generation/validation
- Add backup codes
- Update login flow
- Test with frontend TwoFASetupPage

```bash
npm install speakeasy qrcode
```

**Files:**
- `ERPCRMServer/controllers/twoFactorController.js`
- `ERPCRMServer/routes/twoFactorRoutes.js`
- `ERPCRMServer/Models/User2FA.js` (create if missing)

### 2. Complete Stock Valuation Methods (3 hours)
**Why:** Core inventory feature  
**Impact:** HIGH  
**Status:** Routes exist, need calculation logic

**Tasks:**
- Implement FIFO calculation
- Implement LIFO calculation
- Implement Weighted Average
- Add valuation reports

**Files:**
- `ERPCRMServer/controllers/stockValuationController.js`
- `ERPCRMServer/services/costingService.js` (create)

### 3. Add Auto-Replenishment Logic (2 hours)
**Why:** Automated inventory management  
**Impact:** MEDIUM  
**Status:** ReorderLevels page exists, need backend logic

**Tasks:**
- Create reorder check cron job
- Implement auto-PO generation
- Add reorder alerts/notifications

**Files:**
- `ERPCRMServer/jobs/reorderCheckJob.js` (create)
- `ERPCRMServer/controllers/reorderLevelController.js`

---

## ✅ DAY 3: Frontend Missing Features (6-8 hours)

### 1. Create Purchase Orders Page (2 hours)
**Why:** Core procurement feature  
**Impact:** HIGH  
**Status:** Backend exists, no frontend page

**Files:**
- `clientui/src/features/inventory/pages/PurchaseOrdersPage.jsx` (create)
- `clientui/src/features/inventory/services/purchaseOrderService.js` (create)

### 2. Create Sales Orders Page (2 hours)
**Why:** Core sales feature  
**Impact:** HIGH  
**Status:** Backend exists, no frontend page

**Files:**
- `clientui/src/features/inventory/pages/SalesOrdersPage.jsx` (create)
- `clientui/src/features/inventory/services/salesOrderService.js` (create)

### 3. Add Column Sorting to All Tables (2 hours)
**Why:** Better UX, easier data navigation  
**Impact:** MEDIUM  
**Status:** Most tables don't have sorting

**Files:**
- Update all `*Page.jsx` files with MUI Table sorting

### 4. Add Bulk Actions (Select Multiple) (2 hours)
**Why:** Efficiency improvement  
**Impact:** MEDIUM  
**Status:** No bulk actions anywhere

**Files:**
- Create `clientui/src/components/BulkActions.jsx`
- Update all list pages

---

## 📋 DETAILED TASK BREAKDOWN

### Task 1: Rate Limiting Implementation

**Step 1:** Install package
```bash
cd ERPCRMServer
npm install express-rate-limit
```

**Step 2:** Create rate limiter configuration
**File:** `ERPCRMServer/config/rateLimiter.js`
```javascript
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts
  message: 'Too many login attempts, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { loginLimiter, apiLimiter };
```

**Step 3:** Apply to routes
**File:** `ERPCRMServer/routes/authRoutes.js`
```javascript
const { loginLimiter } = require('../config/rateLimiter');

router.post('/login', loginLimiter, authController.login);
router.post('/register', loginLimiter, authController.register);
```

**Step 4:** Apply global limiter
**File:** `ERPCRMServer/server.js`
```javascript
const { apiLimiter } = require('./config/rateLimiter');
app.use('/api/', apiLimiter);
```

---

### Task 2: Error Handler Middleware

**File:** `ERPCRMServer/middleware/errorMiddleware.js`
```javascript
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Joi validation error
  if (err.isJoi) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.details.map(d => ({ field: d.path.join('.'), message: d.message }))
    });
  }

  // Sequelize validation error
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.errors.map(e => ({ field: e.path, message: e.message }))
    });
  }

  // Sequelize unique constraint error
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry',
      errors: err.errors.map(e => ({ field: e.path, message: `${e.path} already exists` }))
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  // Default error
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
```

**Apply in server.js:**
```javascript
const errorHandler = require('./middleware/errorMiddleware');

// ... all routes ...

// Error handler (must be last)
app.use(errorHandler);
```

---

### Task 3: Request Logging

**File:** `ERPCRMServer/server.js`
```javascript
const morgan = require('morgan');

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Production logging (to file)
if (process.env.NODE_ENV === 'production') {
  const fs = require('fs');
  const path = require('path');
  const accessLogStream = fs.createWriteStream(
    path.join(__dirname, 'access.log'),
    { flags: 'a' }
  );
  app.use(morgan('combined', { stream: accessLogStream }));
}
```

---

### Task 4: Environment Template

**File:** `.env.example`
```env
# Server
NODE_ENV=development
PORT=5351
BASE_URL=http://localhost:5351

# Database - Local
LOCAL_DB_HOST=localhost
LOCAL_DB_PORT=5432
LOCAL_DB_NAME=your_db_name
LOCAL_DB_USER=your_db_user
LOCAL_DB_PASSWORD=your_db_password

# Database - Remote (Production)
REMOTE_DB_HOST=
REMOTE_DB_NAME=
REMOTE_DB_USER=
REMOTE_DB_PASSWORD=
DATABASE_URL=

# JWT
JWT_SECRET=your_jwt_secret_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_min_32_chars
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Email (SendGrid)
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=
SENDGRID_FROM_NAME=

# SMS (Twilio)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# CORS
CORS_ORIGIN=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Session
SESSION_SECRET=your_session_secret

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Sentry (Error Tracking)
SENTRY_DSN=

# Feature Flags
ENABLE_2FA=true
ENABLE_EMAIL_VERIFICATION=true
ENABLE_SMS_VERIFICATION=false
```

---

## 🎯 EXPECTED OUTCOMES

After completing these quick wins:

### Security Improvements
- ✅ Brute force protection (rate limiting)
- ✅ Better error handling (no stack traces leaked)
- ✅ Request logging (audit trail)
- ✅ Environment variable template (security best practice)

### Feature Completions
- ✅ 2FA fully functional
- ✅ Stock valuation with all methods
- ✅ Auto-replenishment working
- ✅ Purchase & Sales Order pages created

### UX Improvements
- ✅ Column sorting on all tables
- ✅ Bulk actions available
- ✅ Better data navigation

---

## 📊 PROGRESS TRACKING

| Task | Estimated | Status | Notes |
|------|-----------|--------|-------|
| Rate Limiting | 1h | ⏳ Pending | - |
| Error Handler | 2h | ⏳ Pending | - |
| Request Logging | 1h | ⏳ Pending | - |
| .env.example | 0.5h | ⏳ Pending | - |
| 2FA Completion | 3h | ⏳ Pending | - |
| Stock Valuation | 3h | ⏳ Pending | - |
| Auto-Replenishment | 2h | ⏳ Pending | - |
| PO Page | 2h | ⏳ Pending | - |
| SO Page | 2h | ⏳ Pending | - |
| Table Sorting | 2h | ⏳ Pending | - |
| Bulk Actions | 2h | ⏳ Pending | - |

**Total:** ~20 hours (2-3 days)

---

## 🚀 NEXT STEPS

After completing these quick wins:

1. **Week 2:** Setup testing infrastructure
2. **Week 3:** Write tests for critical flows
3. **Week 4:** Complete remaining frontend pages
4. **Week 5:** Production deployment preparation

---

**Priority:** Start with Day 1 (Security) → Day 2 (Features) → Day 3 (Frontend)  
**Focus:** Complete one task fully before moving to next  
**Review:** Daily standup to track progress

