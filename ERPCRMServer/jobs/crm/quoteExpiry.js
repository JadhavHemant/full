const cron = require('node-cron');
const { expireOldQuotes } = require('../../services/crm/automations/quoteAutomation');

/**
 * Scheduled job: Expire old quotes and notify users.
 * Runs daily at 10 AM.
 */
const startQuoteExpiryJob = () => {
  cron.schedule('0 10 * * *', async () => {
    console.log('🔄 Running quote expiry check...');
    try {
      const expiredQuotes = await expireOldQuotes();
      console.log(`✅ Quote expiry check completed. Expired ${expiredQuotes.length} quotes.`);
    } catch (error) {
      console.error('❌ Error in quote expiry check:', error);
    }
  }, {
    timezone: 'Asia/Kolkata',
  });

  console.log('📅 Quote expiry job scheduled (daily at 10 AM)');
};

module.exports = { startQuoteExpiryJob };