/**
 * CRM Automation Jobs Index
 * 
 * Registers all CRM automation scheduled jobs.
 * Import and call startAllJobs() from server.js to enable all automations.
 */

const { startStaleLeadCheckJob } = require('./staleLeadCheck');
const { startQuoteExpiryJob } = require('./quoteExpiry');
const { startInvoiceOverdueJob } = require('./invoiceOverdue');
const { startRetentionRemindersJob } = require('./retentionReminders');
const { startActivityRemindersJob } = require('./activityReminders');
const { startCaseSlaCheckJob, startAutoCloseCasesJob } = require('./caseSlaCheck');
const { startPresalesRemindersJob } = require('./presalesReminders');

/**
 * Start all CRM automation jobs.
 * Call this once during server startup.
 */
const startAllCrmJobs = () => {
  console.log('🚀 Starting CRM automation jobs...');
  
  startStaleLeadCheckJob();
  startQuoteExpiryJob();
  startInvoiceOverdueJob();
  startRetentionRemindersJob();
  startActivityRemindersJob();
  startCaseSlaCheckJob();
  startAutoCloseCasesJob();
  startPresalesRemindersJob();
  
  console.log('✅ All CRM automation jobs started\n');
};

/**
 * Stop all CRM automation jobs (for graceful shutdown).
 */
const stopAllCrmJobs = () => {
  // node-cron jobs are automatically stopped when the process exits
  // This function is here for future extensibility if needed
  console.log('🛑 Stopping CRM automation jobs...');
  console.log('✅ All CRM automation jobs stopped');
};

module.exports = {
  startAllCrmJobs,
  stopAllCrmJobs,
};