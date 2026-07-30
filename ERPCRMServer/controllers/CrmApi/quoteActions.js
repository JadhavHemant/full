const { appPool } = require("../../config/db");
const { resolveCompanyScope, toInt } = require("../../utils/companyScope");
const { logAuditEvent } = require("../../utils/auditEvents");

const nonEmpty = (value) => {
  if (typeof value !== "string") return value ?? null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const generateDocumentNumber = async ({ client, companyId, tableName, columnName, prefix }) => {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;

  const existing = await client.query(
    `
    SELECT "${columnName}"
    FROM "${tableName}"
    WHERE "CompanyId" = $1
      AND "${columnName}" LIKE $2
    ORDER BY "${columnName}" DESC
    LIMIT 1;
    `,
    [companyId, `${prefix}-${yearMonth}-%`]
  );

  const lastNumber = existing.rows[0]?.[columnName] || null;
  let nextSeq = 1;

  if (lastNumber) {
    const parts = String(lastNumber).split("-");
    if (parts.length === 3) {
      const parsed = Number.parseInt(parts[2], 10);
      nextSeq = Number.isNaN(parsed) ? 1 : parsed + 1;
    }
  }

  return `${prefix}-${yearMonth}-${String(nextSeq).padStart(5, "0")}`;
};

const convertQuoteToInvoice = async (req, res) => {
  const client = await appPool.connect();
  const quoteId = toInt(req.params.id);
  if (!quoteId) {
    return res.status(400).json({ message: "Invalid quote id" });
  }

  try {
    await client.query("BEGIN");

    const scope = resolveCompanyScope({
      req,
      requestedCompanyId: req.query.companyId,
      allowAllForSuperAdmin: true,
    });
    if (!scope.ok) {
      await client.query("ROLLBACK");
      return res.status(scope.status).json({ message: scope.message });
    }

    const quoteResult = await client.query(
      `
      SELECT q.*, a."Name" AS "AccountName"
      FROM "Quotes" q
      LEFT JOIN "Accounts" a ON a."Id" = q."AccountId"
      WHERE q."Id" = $1
        AND q."CompanyId" = $2
        AND COALESCE(q."IsDeleted", FALSE) = FALSE
      LIMIT 1;
      `,
      [quoteId, scope.companyId]
    );

    const quote = quoteResult.rows[0];
    if (!quote) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Quote not found" });
    }

    if (String(quote.Status || "").toLowerCase() !== "accepted") {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Only accepted quotes can be converted to invoices" });
    }

    const invoiceNumber = await generateDocumentNumber({
      client,
      companyId: scope.companyId,
      tableName: "Invoices",
      columnName: "InvoiceNumber",
      prefix: "INV",
    });

    const invoiceInsert = await client.query(
      `
      INSERT INTO "Invoices" (
        "CompanyId", "InvoiceNumber", "AccountId", "OpportunityId", "QuoteId",
        "Subtotal", "TaxAmount", "TotalAmount", "PaymentStatus", "PaymentMethod",
        "DueDate", "GeneratedDate", "Notes", "CreatedBy", "UpdatedBy",
        "IsActive", "IsDeleted", "Flag"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Pending', $9, $10, NOW(), $11, $12, $12, TRUE, FALSE, FALSE)
      RETURNING *;
      `,
      [
        quote.CompanyId,
        invoiceNumber,
        quote.AccountId,
        quote.OpportunityId,
        quoteId,
        quote.Subtotal,
        quote.TaxAmount,
        quote.TotalAmount,
        req.body.paymentMethod || null,
        req.body.dueDate || null,
        nonEmpty(req.body.notes) || quote.Notes,
        req.user.userId,
      ]
    );

    const invoice = invoiceInsert.rows[0];

    await client.query(
      `
      UPDATE "Quotes"
      SET "Status" = 'Invoiced',
          "UpdatedBy" = $2,
          "UpdatedAt" = NOW()
      WHERE "Id" = $1
        AND "CompanyId" = $3
        AND COALESCE("IsDeleted", FALSE) = FALSE;
      `,
      [quoteId, req.user.userId, scope.companyId]
    );

    await logAuditEvent({
      client,
      companyId: scope.companyId,
      userId: req.user.userId,
      eventType: "quote.converted_to_invoice",
      action: "update",
      entityType: "Quote",
      entityId: quoteId,
      beforeData: quote,
      afterData: invoice,
      metadata: { invoiceId: invoice.Id, invoiceNumber },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    await client.query("COMMIT");
    res.status(201).json({
      message: "Quote converted to invoice successfully",
      data: { quote, invoice },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error converting quote to invoice:", error);
    res.status(500).json({ message: "Failed to convert quote to invoice" });
  } finally {
    client.release();
  }
};

const recordPaymentForInvoice = async ({ req, res, client, invoiceId, scope }) => {
  const invoiceResult = await client.query(
    `
    SELECT *
    FROM "Invoices"
    WHERE "Id" = $1
      AND "CompanyId" = $2
      AND COALESCE("IsDeleted", FALSE) = FALSE
    LIMIT 1;
    `,
    [invoiceId, scope.companyId]
  );

  const invoice = invoiceResult.rows[0];
  if (!invoice) {
    await client.query("ROLLBACK");
    return res.status(404).json({ message: "Invoice not found" });
  }

    const amount = parseFloat(req.body.amount);
    if (!amount || amount <= 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Valid amount is required" });
    }

    const paymentInsert = await client.query(
      `
      INSERT INTO "Payments" (
        "CompanyId", "InvoiceId", "Amount", "PaymentDate", "PaymentMethod",
        "ReferenceNumber", "Status", "Notes", "CreatedBy", "UpdatedBy",
        "IsActive", "IsDeleted", "Flag"
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'Received', $7, $8, $8, TRUE, FALSE, FALSE)
      RETURNING *;
      `,
      [
        invoice.CompanyId,
        invoiceId,
        amount,
        req.body.paymentDate || new Date().toISOString(),
        req.body.paymentMethod || invoice.PaymentMethod,
        nonEmpty(req.body.referenceNumber) || null,
        nonEmpty(req.body.notes) || null,
        req.user.userId,
      ]
    );

    const payment = paymentInsert.rows[0];

    const paymentsResult = await client.query(
      `
      SELECT COALESCE(SUM("Amount"), 0) AS "TotalPaid"
      FROM "Payments"
      WHERE "InvoiceId" = $1
        AND "CompanyId" = $2
        AND COALESCE("IsDeleted", FALSE) = FALSE
        AND "Status" = 'Received';
      `,
      [invoiceId, scope.companyId]
    );

    const totalPaid = parseFloat(paymentsResult.rows[0]?.TotalPaid || 0);
    const totalAmount = parseFloat(invoice.TotalAmount || 0);
    let paymentStatus = "Pending";
    if (totalPaid >= totalAmount) {
      paymentStatus = "Paid";
    } else if (totalPaid > 0) {
      paymentStatus = "Partial";
    }

    await client.query(
      `
      UPDATE "Invoices"
      SET "PaymentStatus" = $2,
          "UpdatedBy" = $3,
          "UpdatedAt" = NOW()
      WHERE "Id" = $1
        AND "CompanyId" = $4
        AND COALESCE("IsDeleted", FALSE) = FALSE;
      `,
      [invoiceId, paymentStatus, req.user.userId, scope.companyId]
    );

    const updatedInvoice = await client.query(
      `
      SELECT *
      FROM "Invoices"
      WHERE "Id" = $1
        AND "CompanyId" = $2
        AND COALESCE("IsDeleted", FALSE) = FALSE
      LIMIT 1;
      `,
      [invoiceId, scope.companyId]
    );

    await logAuditEvent({
      client,
      companyId: scope.companyId,
      userId: req.user.userId,
      eventType: "invoice.payment_recorded",
      action: "update",
      entityType: "Invoice",
      entityId: invoiceId,
      beforeData: invoice,
      afterData: updatedInvoice.rows[0],
      metadata: { paymentId: payment.Id, amount, paymentStatus, totalPaid },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    await client.query("COMMIT");
    res.status(201).json({
      message: "Payment recorded successfully",
      data: { payment, invoice: updatedInvoice.rows[0] },
    });
};

const recordPayment = async (req, res) => {
  const client = await appPool.connect();
  const invoiceId = toInt(req.params.id);
  if (!invoiceId) {
    return res.status(400).json({ message: "Invalid invoice id" });
  }

  try {
    await client.query("BEGIN");

    const scope = resolveCompanyScope({
      req,
      requestedCompanyId: req.query.companyId,
      allowAllForSuperAdmin: true,
    });
    if (!scope.ok) {
      await client.query("ROLLBACK");
      return res.status(scope.status).json({ message: scope.message });
    }

    return await recordPaymentForInvoice({ req, res, client, invoiceId, scope });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error recording payment:", error);
    res.status(500).json({ message: "Failed to record payment" });
  } finally {
    client.release();
  }
};

const recordPaymentByQuoteId = async (req, res) => {
  const client = await appPool.connect();
  const quoteId = toInt(req.params.id);
  if (!quoteId) {
    return res.status(400).json({ message: "Invalid quote id" });
  }

  try {
    await client.query("BEGIN");

    const scope = resolveCompanyScope({
      req,
      requestedCompanyId: req.query.companyId,
      allowAllForSuperAdmin: true,
    });
    if (!scope.ok) {
      await client.query("ROLLBACK");
      return res.status(scope.status).json({ message: scope.message });
    }

    const invoiceResult = await client.query(
      `
      SELECT *
      FROM "Invoices"
      WHERE "QuoteId" = $1
        AND "CompanyId" = $2
        AND COALESCE("IsDeleted", FALSE) = FALSE
      ORDER BY "Id" DESC
      LIMIT 1;
      `,
      [quoteId, scope.companyId]
    );

    const invoice = invoiceResult.rows[0];
    if (!invoice) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "No invoice found for this quote" });
    }

    return await recordPaymentForInvoice({ req, res, client, invoiceId: invoice.Id, scope });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error recording quote payment:", error);
    res.status(500).json({ message: "Failed to record payment" });
  } finally {
    client.release();
  }
};

module.exports = {
  convertQuoteToInvoice,
  recordPayment,
  recordPaymentByQuoteId,
};