const { appPool } = require('../../../config/db');
const { getAutomationConfig } = require('./config');

/**
 * Quote automation: expiry handling, auto-invoice generation.
 */

/**
 * Expire old quotes that are past their ValidTillDate.
 */
const expireOldQuotes = async () => {
  const companiesResult = await appPool.query(
    `SELECT DISTINCT "Id" AS "CompanyId" FROM "Companies" WHERE "IsActive" = TRUE AND "IsDelete" = FALSE`
  );

  const results = [];

  for (const company of companiesResult.rows) {
    const config = await getAutomationConfig(company.CompanyId);
    if (!config.quoteExpiry?.enabled) continue;

    // Find expired quotes
    const expiredQuotes = await appPool.query(
      `
      SELECT q.*, u."Name" AS "AssignedToName"
      FROM "Quotes" q
      LEFT JOIN "Users" u ON u."UserId" = q."AssignedTo"
      WHERE q."CompanyId" = $1
        AND q."Status" = 'Sent'
        AND q."ValidTillDate" < CURRENT_DATE
        AND q."IsDeleted" = FALSE
      `,
      [company.CompanyId]
    );

    for (const quote of expiredQuotes.rows) {
      // Update status to expired
      await appPool.query(
        `UPDATE "Quotes" SET "Status" = 'Expired', "UpdatedAt" = NOW() WHERE "Id" = $1`,
        [quote.Id]
      );

      // Notify assigned user and creator
      const recipients = [quote.AssignedTo, quote.CreatedBy].filter(Boolean);
      for (const userId of recipients) {
        await appPool.query(
          `INSERT INTO "Notifications" ("CompanyId", "UserId", "Title", "Message", "Type", "Severity", "EntityType", "EntityId", "CreatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
          [
            quote.CompanyId,
            userId,
            'Quote Expired',
            `Quote ${quote.QuoteNumber} has expired (ValidTillDate was ${quote.ValidTillDate})`,
            'QUOTE_EXPIRED',
            'info',
            'Quote',
            quote.Id,
          ]
        );
      }

      results.push(quote);
    }
  }

  return results;
};

/**
 * Auto-generate invoice from an accepted quote.
 */
const createInvoiceFromQuote = async (quoteId) => {
  // Get quote details
  const quoteResult = await appPool.query(
    `SELECT * FROM "Quotes" WHERE "Id" = $1 AND "IsDeleted" = FALSE LIMIT 1`,
    [quoteId]
  );

  if (quoteResult.rows.length === 0) {
    throw new Error('Quote not found');
  }

  const quote = quoteResult.rows[0];

  if (quote.Status !== 'Accepted') {
    throw new Error('Quote must be in Accepted status to generate invoice');
  }

  // Generate invoice number
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  // Get next sequence number for this month
  const seqResult = await appPool.query(
    `SELECT COUNT(*)::int AS "Count" FROM "Invoices" WHERE "InvoiceNumber" LIKE $1`,
    [`INV-${yearMonth}-%`]
  );
  
  const nextSeq = String(seqResult.rows[0].Count + 1).padStart(5, '0');
  const invoiceNumber = `INV-${yearMonth}-${nextSeq}`;

  // Calculate due date (default 30 days)
  const dueDate = new Date(now);
  dueDate.setDate(dueDate.getDate() + 30);

  // Create invoice
  const invoiceResult = await appPool.query(
    `INSERT INTO "Invoices" ("InvoiceNumber", "QuoteId", "OpportunityId", "AccountId", "Subtotal", "TaxAmount", "TotalAmount", "PaymentStatus", "DueDate", "Status", "CreatedBy", "CreatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
     RETURNING *`,
    [
      invoiceNumber,
      quote.Id,
      quote.OpportunityId,
      quote.AccountId,
      quote.Subtotal,
      quote.TaxAmount,
      quote.TotalAmount,
      'Pending',
      dueDate.toISOString().split('T')[0],
      'Sent',
      quote.CreatedBy,
    ]
  );

  const invoice = invoiceResult.rows[0];

  // Copy quote items to invoice items
  const quoteItems = await appPool.query(
    `SELECT * FROM "QuoteItems" WHERE "QuoteId" = $1 AND "IsDeleted" = FALSE`,
    [quote.Id]
  );

  for (const item of quoteItems.rows) {
    await appPool.query(
      `INSERT INTO "InvoiceItems" ("InvoiceId", "ProductId", "Quantity", "UnitPrice", "TotalPrice")
       VALUES ($1, $2, $3, $4, $5)`,
      [invoice.Id, item.ProductId, item.Quantity, item.UnitPrice, item.TotalPrice]
    );
  }

  // Update quote status
  await appPool.query(
    `UPDATE "Quotes" SET "Status" = 'Invoiced', "UpdatedAt" = NOW() WHERE "Id" = $1`,
    [quote.Id]
  );

  return invoice;
};

/**
 * Recalculate invoice payment status based on payments.
 */
const recalculateInvoicePaymentStatus = async (invoiceId) => {
  // Get invoice
  const invoiceResult = await appPool.query(
    `SELECT * FROM "Invoices" WHERE "Id" = $1 LIMIT 1`,
    [invoiceId]
  );

  if (invoiceResult.rows.length === 0) {
    throw new Error('Invoice not found');
  }

  const invoice = invoiceResult.rows[0];

  // Calculate total paid
  const paymentsResult = await appPool.query(
    `SELECT COALESCE(SUM("Amount"), 0)::numeric AS "TotalPaid"
     FROM "Payments"
     WHERE "InvoiceId" = $1 AND "IsDeleted" = FALSE`,
    [invoiceId]
  );

  const totalPaid = Number(paymentsResult.rows[0].TotalPaid);
  const totalAmount = Number(invoice.TotalAmount);

  // Determine new payment status
  let newStatus = invoice.PaymentStatus;
  if (totalPaid >= totalAmount) {
    newStatus = 'Paid';
  } else if (totalPaid > 0) {
    newStatus = 'Partial';
  }

  // Update if changed
  if (newStatus !== invoice.PaymentStatus) {
    await appPool.query(
      `UPDATE "Invoices" SET "PaymentStatus" = $1, "UpdatedAt" = NOW() WHERE "Id" = $2`,
      [newStatus, invoiceId]
    );
  }

  return { invoiceId, totalPaid, totalAmount, paymentStatus: newStatus };
};

/**
 * Check for overdue invoices and send reminders.
 */
const checkOverdueInvoices = async () => {
  const companiesResult = await appPool.query(
    `SELECT DISTINCT "CompanyId" FROM "Companies" WHERE "IsActive" = TRUE AND "IsDelete" = FALSE`
  );

  const results = [];

  for (const company of companiesResult.rows) {
    const config = await getAutomationConfig(company.CompanyId);
    if (!config.invoiceOverdue?.enabled) continue;

    const escalationDays = config.invoiceOverdue.escalationDays || [7, 14, 30];

    // Find overdue invoices
    const overdueInvoices = await appPool.query(
      `
      SELECT i.*, a."Name" AS "AccountName", u."Name" AS "AccountOwnerName", u."UserId" AS "AccountOwnerId"
      FROM "Invoices" i
      LEFT JOIN "Accounts" a ON a."Id" = i."AccountId"
      LEFT JOIN "Users" u ON u."UserId" = a."AssignedTo"
      WHERE i."CompanyId" = $1
        AND i."PaymentStatus" IN ('Pending', 'Partial')
        AND i."DueDate" < CURRENT_DATE
        AND i."IsDeleted" = FALSE
      `,
      [company.CompanyId]
    );

    for (const invoice of overdueInvoices.rows) {
      const dueDate = new Date(invoice.DueDate);
      const today = new Date();
      const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

      // Check if we should notify based on escalation days
      const shouldNotify = escalationDays.some(day => daysOverdue >= day && daysOverdue < day + 1);
      
      if (shouldNotify && invoice.AccountOwnerId) {
        // Notify account owner
        await appPool.query(
          `INSERT INTO "Notifications" ("CompanyId", "UserId", "Title", "Message", "Type", "Severity", "EntityType", "EntityId", "CreatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
          [
            invoice.CompanyId,
            invoice.AccountOwnerId,
            'Overdue Invoice Alert',
            `Invoice ${invoice.InvoiceNumber} is ${daysOverdue} days overdue (Amount: ${invoice.TotalAmount})`,
            'INVOICE_OVERDUE',
            daysOverdue >= 30 ? 'critical' : 'warning',
            'Invoice',
            invoice.Id,
          ]
        );

        // Escalate to manager if configured
        const accountOwnerResult = await appPool.query(
          `SELECT "ReportingManagerId" FROM "Users" WHERE "UserId" = $1 LIMIT 1`,
          [invoice.AccountOwnerId]
        );

        const managerId = accountOwnerResult.rows[0]?.ReportingManagerId;
        if (managerId && daysOverdue >= escalationDays[escalationDays.length - 1]) {
          await appPool.query(
            `INSERT INTO "Notifications" ("CompanyId", "UserId", "Title", "Message", "Type", "Severity", "EntityType", "EntityId", "CreatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
            [
              invoice.CompanyId,
              managerId,
              'Escalation: Overdue Invoice',
              `Invoice ${invoice.InvoiceNumber} is ${daysOverdue} days overdue. Account owner: ${invoice.AccountOwnerName}`,
              'INVOICE_OVERDUE_ESCALATION',
              'critical',
              'Invoice',
              invoice.Id,
            ]
          );
        }
      }

      results.push({ ...invoice, daysOverdue });
    }
  }

  return results;
};

module.exports = {
  expireOldQuotes,
  createInvoiceFromQuote,
  recalculateInvoicePaymentStatus,
  checkOverdueInvoices,
};