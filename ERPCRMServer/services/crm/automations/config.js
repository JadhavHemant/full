const { appPool } = require('../../../config/db');

/**
 * Default CRM automation configuration.
 * All thresholds and toggles live here as safe fallbacks.
 */
const DEFAULT_CONFIG = {
  leadAutoAssign: { enabled: true },
  leadScoring: { enabled: true },
  staleLeadCheck: { enabled: true, staleDays: 5 },
  opportunityStaleCheck: { enabled: true, staleDays: 10 },
  quoteExpiry: { enabled: true },
  wonOpportunityAutoQuote: { enabled: true, notifyUserIds: [] },
  invoiceOverdue: { enabled: true, escalationDays: [7, 14, 30] },
  caseSla: {
    enabled: true,
    hoursByPriority: { Urgent: 4, High: 8, Medium: 24, Low: 72 },
    escalationAfterHours: 24,
  },
  presalesReminder: { enabled: true, hoursBefore: 24 },
  retentionReminder: { enabled: true },
  activityReminder: { enabled: true },
};

/** @type {Map<number, { config: Object, expiresAt: number }>} */
const configCache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

/**
 * Read the crmAutomation block from CompanySettings for a given company.
 * Merges over DEFAULT_CONFIG so missing keys fall back safely.
 */
const getAutomationConfig = async (companyId) => {
  const numericId = Number(companyId);
  if (!numericId) return { ...DEFAULT_CONFIG };

  // Try cache first
  const cached = configCache.get(numericId);
  if (cached && Date.now() <= cached.expiresAt) {
    return cached.config;
  }

  const result = await appPool.query(
    `SELECT "Settings" FROM "CompanySettings" WHERE "CompanyId" = $1 LIMIT 1`,
    [numericId]
  );

  const dbSettings = result.rows[0]?.Settings || {};
  const crmAutomation = dbSettings.crmAutomation || {};

  // Merge DB config over defaults (deep merge for nested objects)
  const merged = deepMerge(DEFAULT_CONFIG, crmAutomation);

  // Cache it
  configCache.set(numericId, { config: merged, expiresAt: Date.now() + CACHE_TTL_MS });

  return merged;
};

/**
 * Update the crmAutomation block for a company.
 * Merges partialConfig into the existing Settings JSONB.
 */
const updateAutomationConfig = async (companyId, partialConfig, updatedBy) => {
  const numericId = Number(companyId);
  if (!numericId) {
    throw new Error('Invalid companyId');
  }

  // Fetch current settings
  const result = await appPool.query(
    `SELECT "Settings", "Version" FROM "CompanySettings" WHERE "CompanyId" = $1 LIMIT 1`,
    [numericId]
  );

  const currentSettings = result.rows[0]?.Settings || {};
  const currentVersion = result.rows[0]?.Version || 1;

  // Merge partial update into existing crmAutomation block
  const existingCrm = currentSettings.crmAutomation || {};
  const mergedCrm = deepMerge(existingCrm, partialConfig);

  const newSettings = {
    ...currentSettings,
    crmAutomation: mergedCrm,
  };

  // Upsert
  await appPool.query(
    `INSERT INTO "CompanySettings" ("CompanyId", "Settings", "Version", "UpdatedBy", "UpdatedAt")
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT ("CompanyId") DO UPDATE SET
       "Settings" = EXCLUDED."Settings",
       "Version" = EXCLUDED."Version" + 1,
       "UpdatedBy" = EXCLUDED."UpdatedBy",
       "UpdatedAt" = NOW()`,
    [numericId, newSettings, currentVersion + 1, updatedBy || null]
  );

  // Invalidate cache
  configCache.delete(numericId);

  return mergedCrm;
};

/**
 * Invalidate cache for a company (call after updating config).
 */
const invalidateConfigCache = (companyId) => {
  configCache.delete(Number(companyId));
};

/**
 * Deep merge two objects. source overwrites target.
 */
const deepMerge = (target, source) => {
  const output = { ...target };
  if (source && typeof source === 'object') {
    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        output[key] = deepMerge(target[key] || {}, source[key]);
      } else {
        output[key] = source[key];
      }
    }
  }
  return output;
};

module.exports = {
  DEFAULT_CONFIG,
  getAutomationConfig,
  updateAutomationConfig,
  invalidateConfigCache,
};