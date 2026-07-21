const cron = require('node-cron');
const { checkCaseSla, autoCloseResolvedCases } = require('../../services/crm/automations/caseAutomation');

/**
 * Scheduled job: Check SLA breaches for open cases and auto-close resolved cases.
 * Runs every hour.
 */
const startCaseSlaCheckJob = () => {
  cron.schedule('0 * * * *', async () => {
    console.log('🔄 Running case SLA check...');
    try {
      const slaBreaches = await checkCaseSla();
      console.log(`✅ Case SLA check completed. Found ${slaBreaches.length} SLA breaches.`);
    } catch (error) {
      console.error('❌ Error in case SLA check:', error);
    }
  }, {
    timezone: 'Asia/Kolkata',
  });

  console.log('📅 Case SLA check job scheduled (every hour)');
};

/**
 * Scheduled job: Auto-close resolved cases after inactivity.
 * Runs daily at midnight.
 */
const startAutoCloseCasesJob = () => {
  cron.schedule('0 0 * * *', async () => {
    console.log('🔄 Running auto-close resolved cases...');
    try {
      const closedCases = await autoCloseResolvedCases();
      console.log(`✅ Auto-close completed. Closed ${closedCases.length} cases.`);
    } catch (error) {
      console.error('❌ Error in auto-close cases:', error);
    }
  }, {
    timezone: 'Asia/Kolkata',
  });

  console.log('📅 Auto-close cases job scheduled (daily at midnight)');
};

module.exports = { startCaseSlaCheckJob, startAutoCloseCasesJob };