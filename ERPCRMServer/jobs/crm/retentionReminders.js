const cron = require('node-cron');
const { checkRetentionReminders } = require('../../services/crm/automations/retentionAutomation');

/**
 * Scheduled job: Check for retention reminders and auto-create renewal opportunities.
 * Runs daily at 8 AM.
 */
const startRetentionRemindersJob = () => {
  cron.schedule('0 8 * * *', async () => {
    console.log('🔄 Running retention reminders check...');
    try {
      const reminders = await checkRetentionReminders();
      console.log(`✅ Retention reminders check completed. Processed ${reminders.length} retentions.`);
    } catch (error) {
      console.error('❌ Error in retention reminders check:', error);
    }
  }, {
    timezone: 'Asia/Kolkata',
  });

  console.log('📅 Retention reminders job scheduled (daily at 8 AM)');
};

module.exports = { startRetentionRemindersJob };