const cron = require('node-cron');
const { checkStaleLeads } = require('../../services/crm/automations/leadAutomation');

/**
 * Scheduled job: Check for stale leads and send reminders.
 * Runs daily at 9 AM.
 */
const startStaleLeadCheckJob = () => {
  cron.schedule('0 9 * * *', async () => {
    console.log('🔄 Running stale lead check...');
    try {
      const staleLeads = await checkStaleLeads();
      console.log(`✅ Stale lead check completed. Found ${staleLeads.length} stale leads.`);
    } catch (error) {
      console.error('❌ Error in stale lead check:', error);
    }
  }, {
    timezone: 'Asia/Kolkata', // Adjust timezone as needed
  });

  console.log('📅 Stale lead check job scheduled (daily at 9 AM)');
};

module.exports = { startStaleLeadCheckJob };