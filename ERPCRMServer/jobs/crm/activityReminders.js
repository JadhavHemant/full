const cron = require('node-cron');
const { dispatchActivityReminders } = require('../../services/crm/automations/activityAutomation');

/**
 * Scheduled job: Dispatch activity reminders.
 * Runs every 15 minutes.
 */
const startActivityRemindersJob = () => {
  cron.schedule('*/15 * * * *', async () => {
    console.log('🔄 Running activity reminders dispatch...');
    try {
      const reminders = await dispatchActivityReminders();
      console.log(`✅ Activity reminders dispatched. Sent ${reminders.length} reminders.`);
    } catch (error) {
      console.error('❌ Error in activity reminders dispatch:', error);
    }
  }, {
    timezone: 'Asia/Kolkata',
  });

  console.log('📅 Activity reminders job scheduled (every 15 minutes)');
};

module.exports = { startActivityRemindersJob };