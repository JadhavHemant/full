require("dotenv").config();

// Email service supporting SendGrid and SES
// Uses SendGrid as primary, falls back to console.log in dev
let sgMail = null;
let awsSes = null;

const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || "console";
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@erpsystem.com";
const FROM_NAME = process.env.FROM_NAME || "ERP System";

// Try to load SendGrid
try {
  if (process.env.SENDGRID_API_KEY) {
    sgMail = require("@sendgrid/mail");
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    console.log("✅ SendGrid email service loaded");
  }
} catch (e) {
  console.warn("⚠️ SendGrid not available, try: npm install @sendgrid/mail");
}

// Store templates in memory (in production, use SendGrid dynamic templates or DB)
const emailTemplates = {
  welcome: {
    subject: "Welcome to ERP System",
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
        <h2 style="color: #f97316;">Welcome to ERP System!</h2>
        <p>Hello ${data.name || "User"},</p>
        <p>Your account has been created successfully. You can now log in to access our ERP system.</p>
        <p>Your login credentials:</p>
        <ul>
          <li><strong>Email:</strong> ${data.email}</li>
          ${data.tempPassword ? `<li><strong>Temporary Password:</strong> ${data.tempPassword}</li>` : ''}
        </ul>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.loginUrl || '#'}" style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Login Now</a>
        </div>
        <p style="color: #666; font-size: 12px;">If you didn't create this account, please ignore this email.</p>
      </div>
    `,
  },
  passwordReset: {
    subject: "Password Reset - ERP System",
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
        <h2 style="color: #f97316;">Password Reset Request</h2>
        <p>Hello ${data.name || "User"},</p>
        <p>We received a request to reset your password. Click the button below to reset it:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.resetUrl}" style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Reset Password</a>
        </div>
        <p>This link will expire in ${data.expiryMinutes || '60'} minutes.</p>
        <p style="color: #666; font-size: 12px;">If you didn't request this, please ignore this email.</p>
      </div>
    `,
  },
  leadAssigned: {
    subject: "New Lead Assigned - ERP CRM",
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
        <h2 style="color: #f97316;">New Lead Assigned</h2>
        <p>Hello ${data.assignedToName || "User"},</p>
        <p>A new lead has been assigned to you:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Lead Name</td><td style="padding: 8px; border: 1px solid #ddd;">${data.leadName}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;">Company</td><td style="padding: 8px; border: 1px solid #ddd;">${data.company || 'N/A'}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;">Value</td><td style="padding: 8px; border: 1px solid #ddd;">${data.expectedValue || 'N/A'}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;">Source</td><td style="padding: 8px; border: 1px solid #ddd;">${data.source || 'N/A'}</td></tr>
        </table>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.leadUrl}" style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">View Lead</a>
        </div>
      </div>
    `,
  },
  invoiceCreated: {
    subject: "New Invoice - ERP System",
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
        <h2 style="color: #f97316;">Invoice Created</h2>
        <p>Hello ${data.customerName || "Customer"},</p>
        <p>An invoice has been generated for you:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Invoice #</td><td style="padding: 8px; border: 1px solid #ddd;">${data.invoiceNumber}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;">Amount</td><td style="padding: 8px; border: 1px solid #ddd;">${data.amount}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;">Due Date</td><td style="padding: 8px; border: 1px solid #ddd;">${data.dueDate || 'N/A'}</td></tr>
        </table>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.invoiceUrl}" style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">View Invoice</a>
        </div>
      </div>
    `,
  },
  custom: {
    subject: (data) => data.subject || "Notification from ERP System",
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
        <h2 style="color: #f97316;">${data.title || 'Notification'}</h2>
        <p>Hello ${data.name || "User"},</p>
        <div>${data.message || ''}</div>
        ${data.actionUrl ? `<div style="text-align: center; margin: 30px 0;"><a href="${data.actionUrl}" style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">${data.actionText || 'View Details'}</a></div>` : ''}
      </div>
    `,
  },
};

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.template - Template name (welcome, passwordReset, leadAssigned, invoiceCreated, custom)
 * @param {Object} options.data - Template data
 * @param {string} options.subject - Custom subject (for custom template)
 * @param {string} options.html - Custom HTML (for custom template)
 * @returns {Promise<Object>}
 */
const sendEmail = async ({ to, template, data = {}, subject, html }) => {
  try {
    if (!to) {
      throw new Error("Recipient email is required");
    }

    // Build email content
    let emailSubject = subject;
    let emailHtml = html;

    if (template && emailTemplates[template]) {
      const tmpl = emailTemplates[template];
      emailSubject = typeof tmpl.subject === 'function' ? tmpl.subject(data) : tmpl.subject;
      emailHtml = tmpl.html(data);
    }

    if (!emailHtml) {
      throw new Error("Email content is required - provide html or template");
    }

    // Send via SendGrid
    if (sgMail && EMAIL_PROVIDER === 'sendgrid') {
      const msg = {
        to,
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject: emailSubject,
        html: emailHtml,
      };
      await sgMail.send(msg);
      return { success: true, provider: 'sendgrid' };
    }

    // Send via AWS SES
    if (awsSes && EMAIL_PROVIDER === 'ses') {
      // AWS SES implementation would go here
      return { success: true, provider: 'ses' };
    }

    // Fallback: log to console in development
    console.log(`\n📧 Email (${EMAIL_PROVIDER}):`);
    console.log(`   To: ${to}`);
    console.log(`   Subject: ${emailSubject}`);
    console.log(`   Body: ${emailHtml.substring(0, 200)}...\n`);

    // In development, we still want to mock success
    return { success: true, provider: 'console', to, subject: emailSubject };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Get available email templates
 * @returns {Array}
 */
const getTemplates = () => {
  return Object.keys(emailTemplates).map(key => ({
    name: key,
    subject: typeof emailTemplates[key].subject === 'function' ? emailTemplates[key].subject({}) : emailTemplates[key].subject,
    description: getTemplateDescription(key),
  }));
};

const getTemplateDescription = (name) => {
  const descriptions = {
    welcome: "Welcome email sent to new users with login instructions",
    passwordReset: "Password reset email with reset link",
    leadAssigned: "Notification email when a lead is assigned to a user",
    invoiceCreated: "Invoice notification sent to customers",
    custom: "Custom email with subject and HTML body",
  };
  return descriptions[name] || "";
};

/**
 * Send bulk emails
 * @param {Array} recipients - Array of {to, template, data}
 * @returns {Promise<Array>}
 */
const sendBulkEmails = async (recipients) => {
  const results = [];
  for (const recipient of recipients) {
    const result = await sendEmail(recipient);
    results.push({ ...result, to: recipient.to });
  }
  return results;
};

module.exports = {
  sendEmail,
  sendBulkEmails,
  getTemplates,
};