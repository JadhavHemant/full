const { sendEmail, sendBulkEmails, getTemplates } = require("../../services/emailService");
const { appPool } = require("../../config/db");

// @desc    Send an email
// @route   POST /api/email/send
// @access  Private
const sendEmailHandler = async (req, res) => {
  try {
    const { to, template, data, subject, html } = req.body;
    const userId = req.user?.UserId;

    if (!to) {
      return res.status(400).json({ message: "Recipient email is required" });
    }

    const result = await sendEmail({ to, template, data, subject, html });

    // Log the email
    await appPool.query(
      `INSERT INTO "EmailLogs" ("Recipient", "Subject", "Template", "Status", "Provider", "SentBy", "CreatedBy")
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [to, subject || (template || 'custom'), template || 'custom', result.success ? 'Sent' : 'Failed', result.provider || 'console', userId, userId]
    );

    if (result.success) {
      res.json({ message: "Email sent successfully", ...result });
    } else {
      res.status(500).json({ message: "Failed to send email", error: result.error });
    }
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ message: "Failed to send email", error: error.message });
  }
};

// @desc    Get email templates
// @route   GET /api/email/templates
// @access  Private
const getEmailTemplates = async (req, res) => {
  try {
    const templates = getTemplates();
    res.json(templates);
  } catch (error) {
    console.error("Error fetching templates:", error);
    res.status(500).json({ message: "Failed to fetch templates", error: error.message });
  }
};

// @desc    Get email logs
// @route   GET /api/email/logs
// @access  Private
const getEmailLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await appPool.query(
      `SELECT el.*, u."FullName" as "SentByName"
       FROM "EmailLogs" el
       LEFT JOIN "Users" u ON el."SentBy" = u."UserId"
       ORDER BY el."CreatedAt" DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({ data: result.rows, total: result.rows.length });
  } catch (error) {
    console.error("Error fetching email logs:", error);
    res.status(500).json({ message: "Failed to fetch email logs", error: error.message });
  }
};

// @desc    Send bulk emails
// @route   POST /api/email/bulk
// @access  Private
const sendBulkEmailsHandler = async (req, res) => {
  try {
    const { recipients } = req.body;
    const userId = req.user?.UserId;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ message: "Recipients array is required" });
    }

    const results = await sendBulkEmails(recipients);

    // Log all emails
    for (let i = 0; i < results.length; i++) {
      const r = recipients[i];
      const result = results[i];
      await appPool.query(
        `INSERT INTO "EmailLogs" ("Recipient", "Subject", "Template", "Status", "Provider", "SentBy", "CreatedBy")
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [r.to, r.subject || (r.template || 'custom'), r.template || 'custom', result.success ? 'Sent' : 'Failed', result.provider || 'console', userId, userId]
      );
    }

    const sent = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    res.json({ message: `Sent ${sent} emails, ${failed} failed`, results });
  } catch (error) {
    console.error("Error sending bulk emails:", error);
    res.status(500).json({ message: "Failed to send bulk emails", error: error.message });
  }
};

module.exports = {
  sendEmailHandler,
  getEmailTemplates,
  getEmailLogs,
  sendBulkEmailsHandler,
};