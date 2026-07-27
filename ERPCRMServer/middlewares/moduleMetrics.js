const client = require('prom-client');
const { register } = require('./prometheusMetrics');

// ── CRM Module Metrics ──────────────────────────────────────────────

const crmRecordsTotal = new client.Gauge({
  name: 'crm_records_total',
  help: 'Total number of CRM records by entity type',
  labelNames: ['entity'],
  registers: [register],
});

const crmRecordsCreatedTotal = new client.Counter({
  name: 'crm_records_created_total',
  help: 'Total number of CRM records created by entity type',
  labelNames: ['entity'],
  registers: [register],
});

const crmPipelineValue = new client.Gauge({
  name: 'crm_pipeline_value',
  help: 'Total pipeline value (opportunity budget) in INR',
  labelNames: ['stage'],
  registers: [register],
});

const crmLeadConversionRate = new client.Gauge({
  name: 'crm_lead_conversion_rate',
  help: 'Lead to opportunity conversion rate percentage',
  registers: [register],
});

const crmCaseResolutionTime = new client.Histogram({
  name: 'crm_case_resolution_seconds',
  help: 'Time taken to resolve cases in seconds',
  labelNames: ['priority'],
  buckets: [3600, 7200, 14400, 43200, 86400, 172800, 604800],
  registers: [register],
});

const crmActivityCompletionRate = new client.Gauge({
  name: 'crm_activity_completion_rate',
  help: 'Percentage of activities completed on time',
  registers: [register],
});

// ── Inventory Module Metrics ────────────────────────────────────────

const inventoryStockValue = new client.Gauge({
  name: 'inventory_stock_value',
  help: 'Total stock value in INR',
  labelNames: ['warehouse'],
  registers: [register],
});

const inventoryStockUnits = new client.Gauge({
  name: 'inventory_stock_units',
  help: 'Total stock units by warehouse',
  labelNames: ['warehouse'],
  registers: [register],
});

const inventoryLowStockCount = new client.Gauge({
  name: 'inventory_low_stock_count',
  help: 'Number of products below reorder level',
  labelNames: ['warehouse'],
  registers: [register],
});

const inventoryOutOfStockCount = new client.Gauge({
  name: 'inventory_out_of_stock_count',
  help: 'Number of products out of stock',
  labelNames: ['warehouse'],
  registers: [register],
});

const inventoryOrdersTotal = new client.Counter({
  name: 'inventory_orders_total',
  help: 'Total number of orders by type and status',
  labelNames: ['type', 'status'],
  registers: [register],
});

const inventoryOrderValue = new client.Gauge({
  name: 'inventory_order_value',
  help: 'Total order value by type and status',
  labelNames: ['type', 'status'],
  registers: [register],
});

const inventoryExpiryAlerts = new client.Gauge({
  name: 'inventory_expiry_alerts',
  help: 'Number of products expiring within 30 days',
  registers: [register],
});

const inventoryStockTurnover = new client.Gauge({
  name: 'inventory_stock_turnover_ratio',
  help: 'Stock turnover ratio by product category',
  labelNames: ['category'],
  registers: [register],
});

// ── User/RBAC Module Metrics ────────────────────────────────────────

const rbacUsersTotal = new client.Gauge({
  name: 'rbac_users_total',
  help: 'Total number of users by status and role',
  labelNames: ['status', 'role'],
  registers: [register],
});

const rbacLoginAttemptsTotal = new client.Counter({
  name: 'rbac_login_attempts_total',
  help: 'Total login attempts by result',
  labelNames: ['result'],
  registers: [register],
});

const rbacActiveSessions = new client.Gauge({
  name: 'rbac_active_sessions',
  help: 'Number of active user sessions',
  registers: [register],
});

const rbacRolesTotal = new client.Gauge({
  name: 'rbac_roles_total',
  help: 'Total number of roles',
  registers: [register],
});

const rbacPermissionsTotal = new client.Gauge({
  name: 'rbac_permissions_total',
  help: 'Total number of permissions by module',
  labelNames: ['module'],
  registers: [register],
});

const rbacAuditLogsTotal = new client.Counter({
  name: 'rbac_audit_logs_total',
  help: 'Total audit log entries by action type',
  labelNames: ['action'],
  registers: [register],
});

const rbacLockedAccounts = new client.Gauge({
  name: 'rbac_locked_accounts',
  help: 'Number of locked user accounts',
  registers: [register],
});

const rbacPasswordResetsTotal = new client.Counter({
  name: 'rbac_password_resets_total',
  help: 'Total password reset requests',
  registers: [register],
});

// ── Export all metrics ──────────────────────────────────────────────

module.exports = {
  // CRM
  crmRecordsTotal,
  crmRecordsCreatedTotal,
  crmPipelineValue,
  crmLeadConversionRate,
  crmCaseResolutionTime,
  crmActivityCompletionRate,

  // Inventory
  inventoryStockValue,
  inventoryStockUnits,
  inventoryLowStockCount,
  inventoryOutOfStockCount,
  inventoryOrdersTotal,
  inventoryOrderValue,
  inventoryExpiryAlerts,
  inventoryStockTurnover,

  // RBAC
  rbacUsersTotal,
  rbacLoginAttemptsTotal,
  rbacActiveSessions,
  rbacRolesTotal,
  rbacPermissionsTotal,
  rbacAuditLogsTotal,
  rbacLockedAccounts,
  rbacPasswordResetsTotal,
};