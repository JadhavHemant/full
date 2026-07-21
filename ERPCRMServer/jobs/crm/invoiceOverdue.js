const cron = require('node-cron');
const { checkOverdueInvoices } = require('../../services/crm/automations/quoteAutomation');

/**
 * Scheduled job: Check for overdue invoices and send reminders.
 * Runs daily at 11 AM.
 */
const startInvoiceOverdueJob = () => {
  cron.schedule('0 11 * * *', async () => {
    console.log('🔄 Running invoice overdue check...');
    try {
      const overdueInvoices = await checkOverdueInvoices();
      console.log(`✅ Invoice overdue check completed. Found ${overdueInvoices.length} overdue invoices.`);
    } catch (error) {
      console.error('❌ Error in invoice overdue check:', error);
    }
  }, {
    timezone: 'Asia/Kolkata',
  });

  console.log('📅 Invoice overdue job scheduled (daily at 11 AM)');
};

module.exports = { startInvoiceOverdueJob };