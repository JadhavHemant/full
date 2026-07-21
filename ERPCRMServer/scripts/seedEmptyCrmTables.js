require("dotenv").config();

const { appPool } = require("../config/db");

const nowIsoDate = () => new Date().toISOString().slice(0, 10);

const getCount = async (client, tableName) => {
  const { rows } = await client.query(`SELECT COUNT(*)::int AS count FROM "${tableName}"`);
  return rows[0]?.count || 0;
};

const pick = (rows, index) => rows[index % rows.length];

const fetchRows = async (client, query, params = []) => {
  const { rows } = await client.query(query, params);
  return rows;
};

const ensureBaseData = async (client) => {
  const [companies, users, accounts, contacts, leads, opportunities, products] = await Promise.all([
    fetchRows(client, `SELECT "Id" FROM "Companies" ORDER BY "Id"`),
    fetchRows(client, `SELECT "UserId", "CompanyId" FROM "Users" WHERE COALESCE("IsDelete", FALSE) = FALSE ORDER BY "UserId"`),
    fetchRows(client, `SELECT "Id", "CompanyId", "CreatedBy" FROM "Accounts" WHERE COALESCE("IsDeleted", FALSE) = FALSE ORDER BY "Id"`),
    fetchRows(client, `SELECT "Id", "CompanyId", "AccountId", "CreatedBy" FROM "Contacts" WHERE COALESCE("IsDeleted", FALSE) = FALSE ORDER BY "Id"`),
    fetchRows(client, `SELECT "Id", "CompanyId", "AccountId", "ContactId", "CreatedBy", "AssignedTo", "AssignedFrom" FROM "Leads" WHERE COALESCE("IsDeleted", FALSE) = FALSE ORDER BY "Id"`),
    fetchRows(client, `SELECT "Id", "CompanyId", "AccountId", "ContactId", "CreatedBy", "AssignedTo", "AssignedFrom" FROM "Opportunities" WHERE COALESCE("IsDeleted", FALSE) = FALSE ORDER BY "Id"`),
    fetchRows(client, `SELECT "Id" FROM "Products" WHERE COALESCE("IsDelete", FALSE) = FALSE OR COALESCE("IsDelete", FALSE) IS NULL ORDER BY "Id"`),
  ]);

  if (!companies.length || !users.length || !accounts.length || !contacts.length || !opportunities.length) {
    throw new Error("Missing base CRM data. Need companies, users, accounts, contacts, and opportunities before seeding empty CRM tables.");
  }

  return { companies, users, accounts, contacts, leads, opportunities, products };
};

const seedActivities = async (client, base) => {
  if (await getCount(client, "Activities")) return 0;

  const statuses = ["Pending", "In Progress", "Completed"];
  const priorities = ["Low", "Medium", "High"];
  const activityTypes = ["Call", "Meeting", "Task", "Email"];
  let inserted = 0;

  for (let index = 0; index < 24; index += 1) {
    const opportunity = pick(base.opportunities, index);
    const lead = base.leads.length ? pick(base.leads, index) : null;
    const account = base.accounts.find((row) => row.Id === opportunity.AccountId) || pick(base.accounts, index);
    const contact = base.contacts.find((row) => row.Id === opportunity.ContactId) || pick(base.contacts, index);
    const actorId = opportunity.AssignedTo || opportunity.CreatedBy || pick(base.users, index).UserId;

    await client.query(
      `
        INSERT INTO "Activities" (
          "CompanyId", "LeadId", "AccountId", "ContactId", "OpportunityId", "Type",
          "Subject", "Description", "DueDate", "Status", "Priority", "AssignedTo",
          "ReminderAt", "CreatedBy", "UpdatedBy", "IsActive", "IsDeleted", "Flag"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() + (($9)::text || ' days')::interval, $10, $11, $12, NOW() + (($13)::text || ' days')::interval, $14, $14, TRUE, FALSE, FALSE);
      `,
      [
        opportunity.CompanyId,
        lead?.Id ?? null,
        account.Id,
        contact.Id,
        opportunity.Id,
        activityTypes[index % activityTypes.length],
        `Follow-up ${index + 1}`,
        `Auto-seeded activity ${index + 1} for CRM workspace.`,
        index + 1,
        statuses[index % statuses.length],
        priorities[index % priorities.length],
        actorId,
        index + 1,
        actorId,
      ]
    );
    inserted += 1;
  }

  return inserted;
};

const seedOpportunityProducts = async (client, base) => {
  if (await getCount(client, "OpportunityProducts")) return 0;
  if (!base.products.length) return 0;

  let inserted = 0;
  const maxRows = Math.min(30, base.opportunities.length * base.products.length);
  const used = new Set();

  for (let index = 0; inserted < maxRows && index < maxRows * 3; index += 1) {
    const opportunity = pick(base.opportunities, index);
    const product = pick(base.products, index);
    const key = `${opportunity.Id}:${product.Id}`;
    if (used.has(key)) continue;
    used.add(key);

    const actorId = opportunity.AssignedTo || opportunity.CreatedBy || pick(base.users, index).UserId;
    await client.query(
      `
        INSERT INTO "OpportunityProducts" (
          "CompanyId", "OpportunityId", "ProductId", "Quantity", "UnitPrice", "DiscountPct",
          "TaxPct", "Notes", "CreatedBy", "UpdatedBy", "IsActive", "IsDeleted", "Flag"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, TRUE, FALSE, FALSE);
      `,
      [
        opportunity.CompanyId,
        opportunity.Id,
        product.Id,
        (index % 5) + 1,
        1000 + index * 25,
        index % 10,
        18,
        `Auto-seeded line item ${inserted + 1}`,
        actorId,
      ]
    );
    inserted += 1;
  }

  return inserted;
};

const seedQuotes = async (client, base) => {
  if (await getCount(client, "Quotes")) return 0;

  let inserted = 0;
  for (let index = 0; index < Math.min(25, base.opportunities.length); index += 1) {
    const opportunity = pick(base.opportunities, index);
    const actorId = opportunity.AssignedTo || opportunity.CreatedBy || pick(base.users, index).UserId;
    const subtotal = 5000 + index * 750;
    const taxAmount = Math.round(subtotal * 0.18);
    const discountAmount = index % 2 === 0 ? 250 : 0;
    const totalAmount = subtotal - discountAmount + taxAmount;

    await client.query(
      `
        INSERT INTO "Quotes" (
          "CompanyId", "QuoteNumber", "AccountId", "ContactId", "OpportunityId", "ValidTillDate",
          "Status", "Subtotal", "DiscountAmount", "TaxAmount", "TotalAmount",
          "TermsAndConditions", "Notes", "CreatedBy", "UpdatedBy", "IsActive", "IsDeleted", "Flag"
        )
        VALUES ($1, $2, $3, $4, $5, CURRENT_DATE + (($6)::text || ' days')::interval, $7, $8, $9, $10, $11, $12, $13, $14, $14, TRUE, FALSE, FALSE);
      `,
      [
        opportunity.CompanyId,
        `QT-${String(index + 1).padStart(4, "0")}`,
        opportunity.AccountId,
        opportunity.ContactId,
        opportunity.Id,
        15 + index,
        index % 3 === 0 ? "Sent" : "Draft",
        subtotal,
        discountAmount,
        taxAmount,
        totalAmount,
        "Standard delivery and support terms apply.",
        `Auto-seeded quote ${index + 1}`,
        actorId,
      ]
    );
    inserted += 1;
  }

  return inserted;
};

const seedInvoices = async (client, base) => {
  if (await getCount(client, "Invoices")) return 0;

  const quotes = await fetchRows(
    client,
    `SELECT "Id", "CompanyId", "AccountId", "OpportunityId", "CreatedBy", "Subtotal", "TaxAmount", "TotalAmount" FROM "Quotes" WHERE COALESCE("IsDeleted", FALSE) = FALSE ORDER BY "Id"`
  );
  if (!quotes.length) return 0;

  let inserted = 0;
  for (let index = 0; index < Math.min(20, quotes.length); index += 1) {
    const quote = pick(quotes, index);
    const actorId = quote.CreatedBy || pick(base.users, index).UserId;

    await client.query(
      `
        INSERT INTO "Invoices" (
          "CompanyId", "InvoiceNumber", "AccountId", "OpportunityId", "QuoteId", "Subtotal",
          "TaxAmount", "TotalAmount", "PaymentStatus", "PaymentMethod", "DueDate",
          "GeneratedDate", "Notes", "CreatedBy", "UpdatedBy", "IsActive", "IsDeleted", "Flag"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_DATE + (($11)::text || ' days')::interval, CURRENT_DATE, $12, $13, $13, TRUE, FALSE, FALSE);
      `,
      [
        quote.CompanyId,
        `INV-${String(index + 1).padStart(4, "0")}`,
        quote.AccountId,
        quote.OpportunityId,
        quote.Id,
        quote.Subtotal || 0,
        quote.TaxAmount || 0,
        quote.TotalAmount || 0,
        index % 3 === 0 ? "Paid" : index % 3 === 1 ? "Partial" : "Pending",
        index % 2 === 0 ? "Bank Transfer" : "UPI",
        30 + index,
        `Auto-seeded invoice ${index + 1}`,
        actorId,
      ]
    );
    inserted += 1;
  }

  return inserted;
};

const seedPayments = async (client, base) => {
  if (await getCount(client, "Payments")) return 0;

  const invoices = await fetchRows(
    client,
    `SELECT "Id", "CompanyId", "CreatedBy", "TotalAmount", "PaymentStatus" FROM "Invoices" WHERE COALESCE("IsDeleted", FALSE) = FALSE ORDER BY "Id"`
  );
  if (!invoices.length) return 0;

  let inserted = 0;
  for (let index = 0; index < Math.min(15, invoices.length); index += 1) {
    const invoice = pick(invoices, index);
    const actorId = invoice.CreatedBy || pick(base.users, index).UserId;
    const amount = invoice.PaymentStatus === "Partial"
      ? Math.max(1, Math.round(Number(invoice.TotalAmount || 0) * 0.5))
      : Number(invoice.TotalAmount || 0);

    await client.query(
      `
        INSERT INTO "Payments" (
          "CompanyId", "InvoiceId", "Amount", "PaymentDate", "PaymentMethod",
          "ReferenceNumber", "Status", "Notes", "CreatedBy", "UpdatedBy", "IsActive", "IsDeleted", "Flag"
        )
        VALUES ($1, $2, $3, CURRENT_DATE - (($4)::text || ' days')::interval, $5, $6, $7, $8, $9, $9, TRUE, FALSE, FALSE);
      `,
      [
        invoice.CompanyId,
        invoice.Id,
        amount,
        index,
        index % 2 === 0 ? "Bank Transfer" : "UPI",
        `PAY-${String(index + 1).padStart(4, "0")}`,
        invoice.PaymentStatus === "Pending" ? "Pending" : "Completed",
        `Auto-seeded payment ${index + 1}`,
        actorId,
      ]
    );
    inserted += 1;
  }

  return inserted;
};

const seedRetentions = async (client, base) => {
  if (await getCount(client, "Retentions")) return 0;

  const types = ["Renewal", "Health Check", "Expansion", "Escalation"];
  const statuses = ["Planned", "In Progress", "Completed"];
  let inserted = 0;

  for (let index = 0; index < Math.min(20, base.opportunities.length); index += 1) {
    const opportunity = pick(base.opportunities, index);
    const actorId = opportunity.AssignedTo || opportunity.CreatedBy || pick(base.users, index).UserId;

    await client.query(
      `
        INSERT INTO "Retentions" (
          "CompanyId", "AccountId", "ContactId", "OpportunityId", "Type", "Status",
          "NextActionDate", "ReminderDate", "Notes", "AssignedTo", "CreatedBy", "UpdatedBy", "IsActive", "IsDeleted", "Flag"
        )
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE + (($7)::text || ' days')::interval, CURRENT_DATE + (($8)::text || ' days')::interval, $9, $10, $11, $11, TRUE, FALSE, FALSE);
      `,
      [
        opportunity.CompanyId,
        opportunity.AccountId,
        opportunity.ContactId,
        opportunity.Id,
        types[index % types.length],
        statuses[index % statuses.length],
        7 + index,
        3 + index,
        `Auto-seeded retention ${index + 1}`,
        actorId,
        actorId,
      ]
    );
    inserted += 1;
  }

  return inserted;
};

const main = async () => {
  const client = await appPool.connect();
  try {
    await client.query("BEGIN");
    const base = await ensureBaseData(client);

    const summary = {
      Activities: await seedActivities(client, base),
      OpportunityProducts: await seedOpportunityProducts(client, base),
      Quotes: await seedQuotes(client, base),
      Invoices: await seedInvoices(client, base),
      Payments: await seedPayments(client, base),
      Retentions: await seedRetentions(client, base),
    };

    await client.query("COMMIT");
    console.log("Seed summary:");
    Object.entries(summary).forEach(([table, count]) => {
      console.log(`${table}: ${count}`);
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to seed empty CRM tables:", error);
    process.exitCode = 1;
  } finally {
    client.release();
    await appPool.end();
  }
};

main();
