const cron = require('node-cron');
const { checkPresalesReminders } = require('../../services/crm/automations/presalesAutomation');

/**
 * Scheduled job: Check for presales with upcoming ETAs and send reminders.
 * Runs every hour.
 */
const startPresalesRemindersJob = () => {
  cron.schedule('0 * * * *', async () => {
    console.log('🔄 Running presales reminders check...');
    try {
      const reminders = await checkPresalesReminders();
      console.log(`✅ Presales reminders check completed. Found ${reminders.length} upcoming presales.`);
    } catch (error) {
      console.error('❌ Error in presales reminders check:', error);
    }
  }, {
    timezone: 'Asia/Kolkata',
  });

  console.log('📅 Presales reminders job scheduled (every hour)');
};

module.exports = { startPresalesRemindersJob };