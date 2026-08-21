require('dotenv').config();

// Validate required environment variables
const requiredEnvVars = ['ACCESS_TOKEN_SECRET', 'REFRESH_TOKEN_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
const isProduction = process.env.NODE_ENV === 'production';

if (missingEnvVars.length > 0) {
  if (isProduction) {
    console.error('Missing required environment variables:', missingEnvVars.join(', '));
    console.error('Please set these environment variables before starting the server in production.');
    process.exit(1);
  } else {
    console.warn('⚠️ Missing environment variables:', missingEnvVars.join(', '));
    console.warn('⚠️ Using fallback values for development. DO NOT use in production!');
    // Set fallback values for development only
    if (!process.env.ACCESS_TOKEN_SECRET) process.env.ACCESS_TOKEN_SECRET = 'dev-access-secret-key-change-in-production';
    if (!process.env.REFRESH_TOKEN_SECRET) process.env.REFRESH_TOKEN_SECRET = 'dev-refresh-secret-key-change-in-production';
  }
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const { ensureDatabaseExists, appPool } = require('./config/db');
const { initModels } = require('./Models/initModels');
const userRoutes = require('./routes/User/userRoutes');
const refreshToken = require('./routes/Token/tokenRoutes');
const crmRoutes = require('./routes/Crm/crmIndex');
const leadRoutes = require('./routes/Crm/leadRoutes');
const { initializeChatSocket } = require("./sockets/chatSocket");
const { startCrmDigestScheduler } = require("./services/crmDigestReportService");
const { startCrmStaleReminderScheduler } = require("./services/crmStaleReminderService");
const { metricsMiddleware, prometheusRouter, socketEventsTotal } = require("./middlewares/prometheusMetrics");
const moduleMetrics = require("./middlewares/moduleMetrics");
const { rbacMiddleware } = require("./middlewares/rbac");
const { startAllCrmJobs } = require("./jobs/crm");
const { loadRoleIdsFromDb, updateRoleSets } = require("./config/roleConfig");
const { errorHandler, notFoundHandler } = require('./middleware/errorMiddleware');
const { loginLimiter, strictLimiter } = require('./config/rateLimiter');

// Route imports
const companiesRoutes = require('./routes/Company/companiesRoutes');
const userTypeRoutes = require('./routes/User/userTypeRoutes');
const roleRoutes = require('./routes/User/roleRoutes');
const auditLogRoutes = require('./routes/User/auditLogRoutes');
const advancedAuditRoutes = require('./routes/Inventory/advancedAudit/advancedAudit.routes');
const inventoryRoutes = require('./routes/Inventory/inventoryIndex');
const reportRoutes = require('./routes/System/reportRoutes');
const stockValuationRoutes = require('./routes/Inventory/stockValuation/stockValuation.routes');
const reorderLevelsRoutes = require('./routes/Inventory/reorderLevels/reorderLevels.routes');
const twoFactorRoutes = require('./routes/Auth/twoFactorRoutes');
const { getDashboardStats } = require('./controllers/InventoryApis/dashboard');
const apiMonitoringRoutes = require('./routes/System/apiMonitoringRoutes');
const companySettingsRoutes = require('./routes/System/companySettingsRoutes');
const notificationPreferencesRoutes = require('./routes/System/notificationPreferencesRoutes');
const auditEventsRoutes = require('./routes/System/auditEventsRoutes');
const tableCrudRoutes = require('./routes/System/tableCrudRoutes');
const teamsChatRoutes = require('./routes/System/teamsChatRoutes');
const chatChannelRoutes = require('./routes/channels');
const chatMessageRoutes = require('./routes/messages');
const exportRoutes = require('./routes/Inventory/utils/exportRoutes');
const importRoutes = require('./routes/Inventory/utils/importRoutes');
const fieldPermissionRoutes = require('./routes/RBAC/fieldPermissions.routes');
const recordPermissionRoutes = require('./routes/RBAC/recordPermissions.routes');

const rawPort = Number.parseInt(process.env.PORT, 10);
const PORT = Number.isInteger(rawPort) && rawPort > 0 && rawPort < 65536 ? rawPort : 5351;
const path = require('path');
let server;
let io;
const isDevelopment = process.env.NODE_ENV !== 'production';

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for now as it may break existing functionality
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Request logging middleware
if (isDevelopment) {
  // Development: colored console output
  app.use(morgan('dev'));
} else {
  // Production: combined format to file
  const fs = require('fs');
  const accessLogStream = fs.createWriteStream(
    path.join(__dirname, 'access.log'),
    { flags: 'a' }
  );
  app.use(morgan('combined', { stream: accessLogStream }));
}

// Rate limiting to prevent brute force attacks
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 5000 : 100, // The dashboard can fire many parallel module requests in development.
  skip: (req) => req.path === '/health' || req.path.startsWith('/monitoring/') || req.path === '/metrics',
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all API routes
app.use('/api/', limiter);

// Stricter rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 100 : 5, // Keep local testing from locking login after a few retries.
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Configure CORS explicitly with proper origin validation
// Add common known origins used during development and production
const knownOrigins = [
  'http://localhost:5173',
  'http://localhost:5351',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://10.55.175.187:4173',
  'https://erp-project-apis.onrender.com',
  'https://erpcrmui.netlify.app'
];

const allowedOrigins = process.env.CLIENT_ORIGIN 
  ? process.env.CLIENT_ORIGIN.split(',').map(origin => origin.trim())
  : [];

// Combine known origins with env-configured origins
const allAllowedOrigins = [...new Set([...knownOrigins, ...allowedOrigins])];

// CORS middleware - handles both preflight and actual requests
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Always allow localhost origins for development convenience
    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(origin);
    if (isLocalhost) {
      return callback(null, true);
    }
    
    // Check against allowed origins list
    if (allAllowedOrigins.length > 0) {
      if (allAllowedOrigins.indexOf(origin) !== -1) {
        return callback(null, true);
      }
    } else if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // For production without explicit config, try to be permissive
    // to avoid blocking legitimate requests
    console.warn(`⚠️ CORS: Unknown origin blocked: ${origin}`);
    callback(new Error('CORS policy: Origin not allowed'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));

// Prometheus metrics middleware — tracks all HTTP requests (must be before routes)
app.use(metricsMiddleware);

// Expose Prometheus metrics endpoint (excluded from rate limiting and auth)
app.use('/metrics', prometheusRouter);

// Module-specific metrics are available via moduleMetrics object
// Use in controllers/services to track CRM, Inventory, and RBAC business metrics
// Example: moduleMetrics.crmRecordsTotal.set({ entity: 'leads' }, 150)

app.use(express.json({ limit: '10mb' })); // Limit body size to prevent DoS attacks
app.get('/api/health', async (_req, res) => {
  try {
    await appPool.query('SELECT 1');
    res.json({ ok: true, status: 'healthy', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({
      ok: false,
      status: 'database_unavailable',
      timestamp: new Date().toISOString(),
    });
  }
});

// Display all available modules/routes
// Optional query param: ?userTypeId=1 to filter modules by user type
app.get('/api/modules', (req, res) => {
  const { userTypeId } = req.query;
  const { getUserTypePermissions, getVisibleModules, MODULE_VISIBILITY } = require('./config/userTypePermissions');
  
  const allModules = {
    health: '/api/health',
    users: '/api/users',
    token: '/api/token',
    company: '/api/company',
    usertypes: '/api/usertypes',
    roles: '/api/roles',
    auditLogs: '/api/audit-logs',
    inventory: {
      productCategory: '/api/productcategory',
      units: '/api/units',
      products: '/api/products',
      warehouses: '/api/warehouses',
      productStock: '/api/product-stock',
      stockMovements: '/api/stock-movements',
      purchaseOrders: '/api/purchase-orders',
      purchaseOrderItems: '/api/purchase-order-items',
      salesOrders: '/api/sales-orders',
      suppliers: '/api/suppliers',
      customers: '/api/customers',
      taxes: '/api/taxes',
      productTaxMap: '/api/product-tax-map',
      profitLossReports: '/api/profit-loss-reports',
      brands: '/api/brands',
      stockTransfers: '/api/stock-transfers',
      stockAdjustments: '/api/stock-adjustments',
      grn: '/api/grn',
      batches: '/api/batches',
      serialNumbers: '/api/serial-numbers',
      erp: '/api/erp',
    },
    crm: {
      taskTypes: '/api/crm/task-types',
      salesStages: '/api/crm/sales-stages',
      industries: '/api/crm/industries',
      followupTypes: '/api/crm/followup-types',
      leadSources: '/api/crm/lead-sources',
      accounts: '/api/crm/accounts',
      contacts: '/api/crm/contacts',
      leads: '/api/crm/leads',
      opportunities: '/api/crm/opportunities',
      opportunityProducts: '/api/crm/opportunity-products',
      activities: '/api/crm/activities',
      quotes: '/api/crm/quotes',
      invoices: '/api/crm/invoices',
      payments: '/api/crm/payments',
      retentions: '/api/crm/retentions',
      presales: '/api/crm/presales',
      cases: '/api/crm/cases',
      caseEmail: '/api/crm/cases/email',
    },
    reports: '/api/reports',
    monitoring: '/api/monitoring',
    system: {
      companySettings: '/api/system/company-settings',
      notificationPreferences: '/api/system/notification-preferences',
      auditEvents: '/api/system/audit-events',
      dataAdmin: '/api/system/data-admin',
    },
    chat: {
      workspace: '/api/chat-workspace',
      teamsChat: '/api/teams-chat',
      channels: '/api/chat',
      messages: '/api/chat',
    },
    utils: {
      export: '/api/utils/export',
      import: '/api/utils/import',
      barcode: '/api/utils/barcode',
      qrcode: '/api/utils/qrcode',
    },
    dashboard: '/api/dashboard',
  };

  // If userTypeId is provided, filter modules based on permissions
  if (userTypeId) {
    const permissions = getUserTypePermissions(parseInt(userTypeId));
    const visibleModuleKeys = getVisibleModules(parseInt(userTypeId));
    
    // Filter top-level modules
    const filteredModules = {};
    for (const [key, value] of Object.entries(allModules)) {
      if (key === 'health' || key === 'token' || key === 'monitoring') {
        // Always visible utility modules
        filteredModules[key] = value;
      } else if (visibleModuleKeys.includes(key)) {
        // Module is visible for this user type
        filteredModules[key] = value;
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        // Check if any sub-modules are visible
        const filteredSubModules = {};
        for (const [subKey, subValue] of Object.entries(value)) {
          if (visibleModuleKeys.includes(subKey) || visibleModuleKeys.includes(key)) {
            filteredSubModules[subKey] = subValue;
          }
        }
        if (Object.keys(filteredSubModules).length > 0) {
          filteredModules[key] = filteredSubModules;
        }
      }
    }

    return res.json({
      message: `ERP CRM System - Modules for ${permissions.name} (User Type ${userTypeId})`,
      userType: {
        id: parseInt(userTypeId),
        name: permissions.name,
        description: permissions.description,
        actions: permissions.actions,
        restrictions: permissions.restrictions,
      },
      totalVisibleModules: Object.keys(filteredModules).length,
      totalModules: Object.keys(allModules).length,
      modules: filteredModules,
      moduleDetails: visibleModuleKeys.map(key => MODULE_VISIBILITY[key]).filter(Boolean),
    });
  }

  // Return all modules without filtering
  res.json({
    message: 'ERP CRM System - Available Modules',
    totalModules: Object.keys(allModules).length,
    userTypeFilter: 'Not applied - showing all modules',
    howToFilter: 'Add ?userTypeId=1 (or any user type ID) to see filtered modules',
    availableUserTypes: getUserTypePermissions(1).modules.includes('*') ? 'All user types (1-9)' : 'N/A',
    modules: allModules,
  });
});
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'), {
    fallthrough: false,
    maxAge: isDevelopment ? 0 : '7d',
    setHeaders: (res) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');
    },
  })
);
// Apply RBAC (Role-Based Access Control) middleware globally BEFORE all protected routes.
// Permissions are checked against the user's role based on the URL path and HTTP method.
// Super admin (roleId=1) bypasses all checks.
// Public/excluded paths (login, register, forgot-password, reset-password, health) are skipped automatically.
app.use('/api', rbacMiddleware);

// Apply stricter rate limiting to authentication endpoints
app.use('/api/users/login', loginLimiter);
app.use('/api/users/forgot-password', strictLimiter);
app.use('/api/users/reset-password', strictLimiter);
app.use('/api/users/verify-email', strictLimiter);
app.use('/api/auth', twoFactorRoutes);
app.use('/api/users', userRoutes);
app.use('/api/token', authLimiter, refreshToken);

// --- Company & User Management Routes ---
app.use('/api/company', companiesRoutes);
app.use('/api/usertypes', userTypeRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/audit-logs', advancedAuditRoutes);

// --- Inventory Routes (consolidated) ---
app.use('/api/productcategory', inventoryRoutes.productCategoryRoutes);
app.use('/api/units', inventoryRoutes.UnitRoutes);
app.use('/api/products', inventoryRoutes.ProductsRoutes);
app.use('/api/warehouses', inventoryRoutes.warehousesRoutes);
app.use('/api/product-stock', inventoryRoutes.productStock);
app.use('/api/stock-movements', inventoryRoutes.StockMovements);
app.use('/api/purchase-orders', inventoryRoutes.PurchaseOrders);
app.use('/api/purchase-order-items', inventoryRoutes.PurchaseOrderItems);
app.use('/api/sales-orders', inventoryRoutes.SalesOrders);
app.use('/api/suppliers', inventoryRoutes.Suppliers);
app.use('/api/customers', inventoryRoutes.Customers);
app.use('/api/taxes', inventoryRoutes.Taxes);
app.use('/api/product-tax-map', inventoryRoutes.ProductTaxMap);
app.use('/api/profit-loss-reports', inventoryRoutes.ProfitLossReports);
app.use('/api/brands', inventoryRoutes.BrandsRoutes);
app.use('/api/stock-transfers', inventoryRoutes.StockTransfersRoutes);
app.use('/api/stock-adjustments', inventoryRoutes.StockAdjustmentsRoutes);
app.use('/api/grn', inventoryRoutes.GRNRoutes);
app.use('/api/batches', inventoryRoutes.BatchSerialRoutes);
app.use('/api/serial-numbers', inventoryRoutes.BatchSerialRoutes);
app.use('/api/erp', inventoryRoutes.erpModulesRoutes);
app.use('/api/stock-valuation', stockValuationRoutes);
app.use('/api/reorder-levels', reorderLevelsRoutes);
app.use('/api/financial-years', inventoryRoutes.FinancialYearsRoutes);
app.use('/api/documents', inventoryRoutes.DocumentsRoutes);
app.use('/api/email', inventoryRoutes.EmailRoutes);

const dashboardRouter = require('express').Router();
dashboardRouter.get('/', getDashboardStats);
app.use('/api/dashboard', dashboardRouter);

// Backward-compatible aliases for existing clients using legacy casing paths.
app.use('/api/Suppliers', inventoryRoutes.Suppliers);
app.use('/api/Customers', inventoryRoutes.Customers);
app.use('/api/Taxes', inventoryRoutes.Taxes);
app.use('/api/ProductTaxMap', inventoryRoutes.ProductTaxMap);
app.use('/api/AuditLogs', inventoryRoutes.AuditLogs);
app.use('/api/ProfitLossReports', inventoryRoutes.ProfitLossReports);

// --- CRM Routes (consolidated) ---
app.use('/api/crm/task-types', crmRoutes.taskTypeRoutes);
app.use('/api/crm/sales-stages', crmRoutes.salesStageRoutes);
app.use('/api/crm/industries', crmRoutes.industryRoutes);
app.use('/api/crm/followup-types', crmRoutes.followupTypeRoutes);
app.use('/api/crm/lead-sources', crmRoutes.leadSourceRoutes);
app.use('/api/crm/accounts', crmRoutes.accountRoutes);
app.use('/api/crm/contacts', crmRoutes.contactRoutes);
app.use('/api/crm/leads', crmRoutes.leadRoutes);
app.use('/api/crm/opportunities', crmRoutes.opportunityRoutes);
app.use('/api/crm/opportunity-products', crmRoutes.opportunityProductRoutes);
app.use('/api/crm/activities', crmRoutes.activityRoutes);
app.use('/api/crm/quotes', crmRoutes.quoteRoutes);
app.use('/api/crm/invoices', crmRoutes.invoiceRoutes);
app.use('/api/crm/payments', crmRoutes.paymentRoutes);
app.use('/api/crm/retentions', crmRoutes.retentionRoutes);
app.use('/api/crm/presales', crmRoutes.presalesRoutes);
app.use('/api/crm/cases', crmRoutes.caseRoutes);
app.use('/api/crm/cases/email', crmRoutes.caseEmailRoutes);
app.use('/api/crm/comments', crmRoutes.commentsRoutes);
app.use('/api/crm/assignments', crmRoutes.assignmentsRoutes);
app.use('/api/crm/visibility', crmRoutes.visibilityRoutes);
app.use('/api/crm/groups', crmRoutes.groupsRoutes);
app.use('/api/crm/group-members', crmRoutes.groupMembersRoutes);
app.use('/api/crm/settings', crmRoutes.automationSettingsRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/monitoring", apiMonitoringRoutes);
app.use("/api/system/company-settings", companySettingsRoutes);
app.use("/api/system/notification-preferences", notificationPreferencesRoutes);
app.use("/api/system/audit-events", auditEventsRoutes);
app.use("/api/system/data-admin", tableCrudRoutes);
app.use("/api/chat-workspace", teamsChatRoutes);
app.use("/api/teams-chat", teamsChatRoutes);
app.use("/api/chat", chatChannelRoutes);
app.use("/api/chat", chatMessageRoutes);
app.use("/api/utils", exportRoutes);
app.use("/api/utils", importRoutes);

// --- RBAC Permission Management Routes ---
app.use("/api/field-permissions", fieldPermissionRoutes);
app.use("/api/record-permissions", recordPermissionRoutes);

// Centralized error handling middleware (must be last)
app.use(errorHandler);

// Handle 404 errors (must be after error handler)
app.use(notFoundHandler);

const buildSocketServer = (serverInstance) => {
  io = new Server(serverInstance, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(origin);
        if (isLocalhost) {
          return callback(null, true);
        }
        if (allAllowedOrigins.length === 0) {
          if (process.env.NODE_ENV === 'development') {
            return callback(null, true);
          }
          return callback(new Error('CORS policy: No allowed origins configured'));
        }
        if (allAllowedOrigins.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          callback(new Error('CORS policy: Origin not allowed'));
        }
      },
      methods: ["GET", "POST"],
      credentials: true,
    },
  });
};

const startServer = (port) => {
  return new Promise((resolve, reject) => {
    server = http.createServer(app);
    buildSocketServer(server);

    const onError = (err) => {
      server.removeListener('listening', onListening);
      if (err.code === 'EADDRINUSE') {
        console.warn(`⚠️ Port ${port} is in use, trying port ${port + 1}...`);
        resolve(startServer(port + 1));
      } else {
        reject(err);
      }
    };

    const onListening = () => {
      server.removeListener('error', onError);
      console.log(`Server running on port ${port}`);
      resolve(server);
    };

    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port);
  });
};

ensureDatabaseExists().then(async () => {
  // Note: RBAC migration is handled automatically by the role controller (self-healing)
  // and via the standalone script: node scripts/runMigration.js
  // Database pool is kept alive - do NOT close it here
  
  // Load role IDs dynamically from database
  try {
    await loadRoleIdsFromDb();
    updateRoleSets();
    console.log('✅ Role IDs loaded successfully from database');
  } catch (error) {
    console.warn('⚠️ Could not load dynamic role IDs, using fallbacks:', error.message);
  }
  
  await initModels();
  startCrmDigestScheduler();
  startCrmStaleReminderScheduler();
  
  // Start CRM automation jobs
  startAllCrmJobs();
  
  // Initialize the server and socket after database setup
  try {
    await startServer(PORT);
    console.log('🔌 Initializing chat socket...');
    try {
      initializeChatSocket(io);
      console.log('✅ Chat socket initialized\n');
    } catch (socketError) {
      console.error('⚠️  Chat socket initialization failed (non-blocking):', socketError.message);
      console.log('   Chat features may not be available. Server is still running.\n');
    }
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }

}).catch(err => {
  console.error(' Error during startup:', err);
});