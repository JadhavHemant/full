const { appPool } = require("../config/db");

const DEFAULT_KEEP_NAMES = ["super admin", "hemant", "shivani"];
const TARGET_USER_COUNT = 10;

const INDUSTRIES = [
  "Manufacturing",
  "Retail",
  "Healthcare",
  "Logistics",
  "Technology",
];

const LEAD_SOURCES = ["Website", "Referral", "Partner", "Inbound Call", "Email Campaign"];
const FOLLOWUP_TYPES = ["Email", "Phone", "Demo", "Meeting", "Reminder"];
const SALES_STAGES = [
  { name: "Prospecting", sortOrder: 1, isWon: false, isLost: false },
  { name: "Qualification", sortOrder: 2, isWon: false, isLost: false },
  { name: "Proposal", sortOrder: 3, isWon: false, isLost: false },
  { name: "Negotiation", sortOrder: 4, isWon: false, isLost: false },
  { name: "Won", sortOrder: 5, isWon: true, isLost: false },
  { name: "Lost", sortOrder: 6, isWon: false, isLost: true },
];
const TASK_TYPES = [
  { name: "Discovery Call", duration: 30 },
  { name: "Product Demo", duration: 60 },
  { name: "Technical Review", duration: 45 },
];
const PRODUCT_CATEGORIES = [
  "Industrial Automation",
  "Office IT",
  "Customer Experience",
  "Cloud Services",
];
const UNITS = [
  { name: "Piece", symbol: "pc" },
  { name: "License", symbol: "lic" },
  { name: "Box", symbol: "box" },
];

const CRM_ACCOUNTS = [
  {
    name: "Hemlock Manufacturing Pvt Ltd",
    website: "https://www.hemlockmanufacturing.in",
    description: "Mid-market manufacturer modernizing sales visibility and service response workflows.",
    contact: { firstName: "Rohan", lastName: "Desai", email: "rohan.desai@hemlockmanufacturing.in", phone: "9876501001", title: "Operations Head" },
    lead: { status: "Qualified", rating: 5, progress: 72, description: "Looking for a regional sales and service workflow rollout.", comments: "Budget approved for phase one." },
    opportunity: { name: "Regional workflow rollout", budget: 1800000, probability: 70, progress: 68, status: "Open", description: "Deployment across three regional teams." },
    caseItem: { subject: "Dashboard adoption training", priority: "Medium", status: "Open", description: "Customer requested role-based onboarding for service managers." },
  },
  {
    name: "North Axis Retail Group",
    website: "https://www.northaxisretail.com",
    description: "Retail business streamlining store-level customer follow-up and reporting.",
    contact: { firstName: "Megha", lastName: "Kapoor", email: "megha.kapoor@northaxisretail.com", phone: "9876501002", title: "Business Manager" },
    lead: { status: "New", rating: 4, progress: 34, description: "Inbound retail CRM enquiry from expansion team.", comments: "Awaiting discovery workshop." },
    opportunity: { name: "Store reporting modernization", budget: 950000, probability: 45, progress: 38, status: "Open", description: "Pilot for 12 stores and HO reporting." },
    caseItem: { subject: "Data import format clarification", priority: "Low", status: "In Progress", description: "Prospect wants sample import templates before trial." },
  },
  {
    name: "BluePeak Health Systems",
    website: "https://www.bluepeakhealth.in",
    description: "Healthcare provider coordinating account management and ticket visibility across branches.",
    contact: { firstName: "Ishita", lastName: "Nair", email: "ishita.nair@bluepeakhealth.in", phone: "9876501003", title: "Program Director" },
    lead: { status: "Qualified", rating: 5, progress: 81, description: "Multi-branch service coordination initiative.", comments: "Security review completed successfully." },
    opportunity: { name: "Multi-branch service desk rollout", budget: 2400000, probability: 82, progress: 79, status: "Open", description: "Service and CRM unification across six branches." },
    caseItem: { subject: "Escalation routing design", priority: "High", status: "Open", description: "Customer wants SLA-aligned case routing before sign-off." },
  },
];

const INVENTORY_ITEMS = [
  {
    productName: "Edge Control Gateway",
    sku: "ECG-100",
    code: "PRD-ECG-100",
    hsn: "851762",
    price: 85000,
    cost: 64000,
    stockQuantity: 18,
    minimumStock: 5,
  },
  {
    productName: "Retail Insight License",
    sku: "RIL-200",
    code: "PRD-RIL-200",
    hsn: "998314",
    price: 42000,
    cost: 25000,
    stockQuantity: 43,
    minimumStock: 10,
  },
  {
    productName: "Service Desk Bundle",
    sku: "SDB-300",
    code: "PRD-SDB-300",
    hsn: "998314",
    price: 125000,
    cost: 92000,
    stockQuantity: 9,
    minimumStock: 4,
  },
];

const WAREHOUSES = [
  { code: "WH-PUNE-01", name: "Pune Central Warehouse", city: "Pune", state: "Maharashtra", capacity: 12000 },
  { code: "WH-BLR-01", name: "Bengaluru Dispatch Hub", city: "Bengaluru", state: "Karnataka", capacity: 9500 },
];

const SUPPLIERS = [
  { name: "Vertex Components LLP", contactPerson: "Anil Shah", email: "anil.shah@vertexcomponents.in", phone: "9811102201", city: "Mumbai", state: "Maharashtra" },
  { name: "Nimbus Tech Supplies", contactPerson: "Sonal Mehta", email: "sonal.mehta@nimbustech.in", phone: "9811102202", city: "Ahmedabad", state: "Gujarat" },
];

const CUSTOMERS = [
  { name: "Atlas Logistics India", email: "procurement@atlaslogistics.in", phone: "9899001010", city: "Hyderabad", state: "Telangana", type: "Corporate", creditLimit: 1500000, balance: 325000 },
  { name: "UrbanNest Projects", email: "accounts@urbannestprojects.in", phone: "9899001011", city: "Chennai", state: "Tamil Nadu", type: "Corporate", creditLimit: 1100000, balance: 210000 },
  { name: "Sunrise Mobility Services", email: "finance@sunrisemobility.in", phone: "9899001012", city: "Delhi", state: "Delhi", type: "Distributor", creditLimit: 900000, balance: 145000 },
];

const parseArg = (name, fallback = "") => {
  const arg = process.argv.find((item) => item.startsWith(`--${name}=`));
  if (!arg) {
    return fallback;
  }

  return arg.slice(name.length + 3).trim();
};

const normalizeName = (value) => String(value || "").trim().toLowerCase();

const parseKeepNames = () => {
  const raw = parseArg("keep-names", DEFAULT_KEEP_NAMES.join(","));
  return raw
    .split(",")
    .map((value) => normalizeName(value))
    .filter(Boolean);
};

const unique = (values) => [...new Set(values)];

const getExistingTables = async (client, names) => {
  const { rows } = await client.query(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY($1::text[]);
    `,
    [names]
  );

  return new Set(rows.map((row) => row.table_name));
};

const findOrCreateCompany = async (client, fallbackUser) => {
  if (fallbackUser?.CompanyId) {
    const result = await client.query(
      'SELECT "Id", "CompanyName" FROM "Companies" WHERE "Id" = $1 LIMIT 1',
      [fallbackUser.CompanyId]
    );
    if (result.rows[0]) {
      return result.rows[0];
    }
  }

  const existing = await client.query(
    'SELECT "Id", "CompanyName" FROM "Companies" ORDER BY "Id" ASC LIMIT 1'
  );
  if (existing.rows[0]) {
    return existing.rows[0];
  }

  const created = await client.query(
    `
      INSERT INTO "Companies" ("CompanyName", "CreatedAt", "UpdatedAt")
      VALUES ($1, NOW(), NOW())
      RETURNING "Id", "CompanyName";
    `,
    ["BizOrbit Solutions Pvt Ltd"]
  );
  return created.rows[0];
};

const selectUsersToKeep = async (client, keepNames) => {
  const { rows } = await client.query(`
    SELECT "UserId", "Name", "Email", "CompanyId", "RoleId", "HierarchyLevel", "ReportingManagerId"
    FROM "Users"
    WHERE COALESCE("IsDelete", FALSE) = FALSE
    ORDER BY
      CASE WHEN LOWER(COALESCE("Name", '')) = 'super admin' THEN 0 ELSE 1 END,
      COALESCE("HierarchyLevel", 9999) ASC,
      "UserId" ASC;
  `);

  if (!rows.length) {
    throw new Error("No active users found to preserve.");
  }

  const namedMatches = rows.filter((row) => keepNames.includes(normalizeName(row.Name)));
  const selected = [...namedMatches];

  for (const row of rows) {
    if (selected.length >= TARGET_USER_COUNT) {
      break;
    }
    if (!selected.some((item) => Number(item.UserId) === Number(row.UserId))) {
      selected.push(row);
    }
  }

  if (selected.length !== TARGET_USER_COUNT) {
    throw new Error(`Expected to preserve ${TARGET_USER_COUNT} users, but only found ${selected.length}.`);
  }

  if (!selected.some((row) => Number(row.RoleId) === 1 || normalizeName(row.Name) === "super admin")) {
    throw new Error("A Super Admin user must be included in the preserved user list.");
  }

  return selected;
};

const runOperationalReset = async (client, keepUserIds) => {
  await client.query(
    `
      DELETE FROM "refresh_tokens"
      WHERE NOT ("UserId" = ANY($1::int[]));
    `,
    [keepUserIds]
  );

  await client.query(
    `
      DELETE FROM "PasswordResets"
      WHERE NOT ("UserId" = ANY($1::int[]));
    `,
    [keepUserIds]
  );

  await client.query(
    `
      DELETE FROM "EmailOtpVerifications"
      WHERE "UserId" IS NOT NULL
        AND NOT ("UserId" = ANY($1::int[]));
    `,
    [keepUserIds]
  );

  await client.query(
    `
      DELETE FROM "UserSessions"
      WHERE NOT ("UserId" = ANY($1::int[]));
    `,
    [keepUserIds]
  );

  await client.query(
    `
      DELETE FROM "SecurityLogs"
      WHERE "UserId" IS NOT NULL
        AND NOT ("UserId" = ANY($1::int[]));
    `,
    [keepUserIds]
  );

  const requestedTables = [
    "Notifications",
    "AuditEvents",
    "Comments",
    "EntityVisibility",
    "Assignments",
    "PresalesAssignments",
    "OpportunityProducts",
    "Payments",
    "Invoices",
    "Quotes",
    "Activities",
    "Cases",
    "Retentions",
    "Presales",
    "Opportunities",
    "Leads",
    "Contacts",
    "Accounts",
    "ApiFailureAlerts",
    "ApiExecutionLogs",
    "SalesOrderItems",
    "SalesOrders",
    "PurchaseOrderItems",
    "PurchaseOrders",
    "StockMovements",
    "ProductStockPerWarehouse",
    "Products",
    "Suppliers",
    "Customers",
    "Warehouses",
    "Taxes",
    "Units",
    "ProductTaxMap",
    "Groups",
    "GroupMembers",
    "ChatMessages",
    "MessageReactions",
    "MessageReadReceipts",
  ];

  const existingTables = await getExistingTables(client, requestedTables);
  const truncateTables = requestedTables.filter((table) => existingTables.has(table));

  if (truncateTables.length) {
    await client.query(
      `TRUNCATE TABLE ${truncateTables.map((table) => `"${table}"`).join(", ")} RESTART IDENTITY CASCADE;`
    );
  }

  await client.query(`
    DELETE FROM "TaskTypes";
    DELETE FROM "SalesStages";
    DELETE FROM "LeadSources";
    DELETE FROM "FollowupTypes";
    DELETE FROM "Industries";
    DELETE FROM "ProductCategories";
  `);

  await client.query(
    'DELETE FROM "Users" WHERE NOT ("UserId" = ANY($1::int[]));',
    [keepUserIds]
  );
};

const insertLookupRows = async (client, tableName, rows) => {
  const inserted = [];
  for (const row of rows) {
    const columns = Object.keys(row);
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
    const values = columns.map((column) => row[column]);
    const result = await client.query(
      `
        INSERT INTO "${tableName}" (${columns.map((column) => `"${column}"`).join(", ")})
        VALUES (${placeholders})
        RETURNING *;
      `,
      values
    );
    inserted.push(result.rows[0]);
  }
  return inserted;
};

const buildCode = (prefix, index) => `${prefix}-${String(index + 1).padStart(3, "0")}`;

const seedOperationalData = async ({ client, companyId, users }) => {
  const createdBy = Number(users[0].UserId);
  const userCycle = (index) => users[index % users.length];

  const industries = await insertLookupRows(
    client,
    "Industries",
    INDUSTRIES.map((name) => ({
      Name: name,
      CreatedBy: createdBy,
      UpdatedBy: createdBy,
      IsActive: true,
      IsDeleted: false,
      CreatedAt: new Date(),
      UpdatedAt: new Date(),
    }))
  );

  const leadSources = await insertLookupRows(
    client,
    "LeadSources",
    LEAD_SOURCES.map((name) => ({
      Name: name,
      CreatedBy: createdBy,
      UpdatedBy: createdBy,
      IsActive: true,
      IsDeleted: false,
      CreatedAt: new Date(),
      UpdatedAt: new Date(),
    }))
  );

  const followupTypes = await insertLookupRows(
    client,
    "FollowupTypes",
    FOLLOWUP_TYPES.map((name) => ({
      Name: name,
      CreatedBy: createdBy,
      UpdatedBy: createdBy,
      IsActive: true,
      IsDeleted: false,
      CreatedAt: new Date(),
      UpdatedAt: new Date(),
    }))
  );

  const salesStages = await insertLookupRows(
    client,
    "SalesStages",
    SALES_STAGES.map((stage) => ({
      Name: stage.name,
      SortOrder: stage.sortOrder,
      IsWon: stage.isWon,
      IsLost: stage.isLost,
      CreatedBy: createdBy,
      UpdatedBy: createdBy,
      IsActive: true,
      IsDeleted: false,
      CreatedAt: new Date(),
      UpdatedAt: new Date(),
    }))
  );

  await insertLookupRows(
    client,
    "TaskTypes",
    TASK_TYPES.map((task) => ({
      Name: task.name,
      DefaultDurationMinutes: task.duration,
      CreatedBy: createdBy,
      UpdatedBy: createdBy,
      IsActive: true,
      IsDeleted: false,
      CreatedAt: new Date(),
      UpdatedAt: new Date(),
    }))
  );

  const productCategories = await insertLookupRows(
    client,
    "ProductCategories",
    PRODUCT_CATEGORIES.map((name) => ({
      CategoryName: name,
      Description: `${name} sample category`,
      CreatedAt: new Date(),
    }))
  );

  const units = await insertLookupRows(
    client,
    "Units",
    UNITS.map((unit) => ({
      Name: unit.name,
      Symbol: unit.symbol,
      IsDeleted: false,
      CreatedAt: new Date(),
      UpdatedAt: new Date(),
    }))
  );

  const accounts = [];
  const contacts = [];
  const leads = [];
  const opportunities = [];

  for (const [index, accountSeed] of CRM_ACCOUNTS.entries()) {
    const owner = userCycle(index);
    const assigned = userCycle(index + 1);
    const industry = industries[index % industries.length];
    const leadSource = leadSources[index % leadSources.length];
    const followupType = followupTypes[index % followupTypes.length];
    const salesStage = salesStages[Math.min(index + 1, salesStages.length - 2)];
    const category = productCategories[index % productCategories.length];
    const shouldMaterializeCustomer = String(accountSeed.lead.status || "").toLowerCase() === "qualified";
    let account = null;
    let contact = null;

    if (shouldMaterializeCustomer) {
      const accountResult = await client.query(
        `
          INSERT INTO "Accounts" (
            "CompanyId", "Name", "Website", "Description", "IndustryId", "AnnualRevenue", "EmployeeCount",
            "AccountOwnerId", "CreatedBy", "UpdatedBy", "IsActive", "IsDeleted", "Flag"
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,TRUE,FALSE,FALSE)
          RETURNING *;
        `,
        [companyId, accountSeed.name, accountSeed.website, accountSeed.description, industry.Id, 25000000 + index * 5000000, 120 + index * 35, owner.UserId, owner.UserId, owner.UserId]
      );
      account = accountResult.rows[0];
      accounts.push(account);

      const contactResult = await client.query(
        `
          INSERT INTO "Contacts" (
            "CompanyId", "AccountId", "FirstName", "LastName", "Email", "Phone", "Title",
            "AssignedTo", "CreatedBy", "UpdatedBy", "IsActive", "IsDeleted", "Flag"
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,TRUE,FALSE,FALSE)
          RETURNING *;
        `,
        [companyId, account.Id, accountSeed.contact.firstName, accountSeed.contact.lastName, accountSeed.contact.email, accountSeed.contact.phone, accountSeed.contact.title, assigned.UserId, owner.UserId, owner.UserId]
      );
      contact = contactResult.rows[0];
      contacts.push(contact);
    }

    const leadResult = await client.query(
      `
        INSERT INTO "Leads" (
          "CompanyId", "AccountId", "ContactId", "LeadSourceId", "ProductCategoryId", "FollowupTypeId", "IndustryId",
          "ProspectAccountName", "ProspectAccountWebsite", "ProspectContactFirstName", "ProspectContactLastName",
          "ProspectContactEmail", "ProspectContactPhone", "ProspectContactTitle",
          "Status", "Rating", "ProgressPercentage", "Description", "Comments", "AssignedTo", "AssignedFrom",
          "CreatedBy", "UpdatedBy", "IsActive", "IsDeleted", "Flag"
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,TRUE,FALSE,FALSE)
        RETURNING *;
      `,
      [
        companyId,
        account?.Id ?? null,
        contact?.Id ?? null,
        leadSource.Id,
        category.Id,
        followupType.Id,
        industry.Id,
        accountSeed.name,
        accountSeed.website,
        accountSeed.contact.firstName,
        accountSeed.contact.lastName,
        accountSeed.contact.email,
        accountSeed.contact.phone,
        accountSeed.contact.title,
        accountSeed.lead.status,
        accountSeed.lead.rating,
        accountSeed.lead.progress,
        accountSeed.lead.description,
        accountSeed.lead.comments,
        assigned.UserId,
        owner.UserId,
        owner.UserId,
        owner.UserId,
      ]
    );
    const lead = leadResult.rows[0];
    leads.push(lead);

    if (shouldMaterializeCustomer) {
      const opportunityResult = await client.query(
        `
          INSERT INTO "Opportunities" (
            "CompanyId", "LeadId", "AccountId", "ContactId", "OpportunityName", "SalesStageId", "LeadSourceId",
            "ProductCategoryId", "IndustryId", "BudgetAmount", "EstCloseDate", "Probability", "ProgressPercentage",
            "Description", "QualificationComments", "DetailedSummary", "Status", "AssignedTo", "AssignedFrom",
            "CreatedBy", "UpdatedBy", "IsActive", "IsDeleted", "Flag"
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,CURRENT_DATE + INTERVAL '30 days',$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,TRUE,FALSE,FALSE)
          RETURNING *;
        `,
        [companyId, lead.Id, account.Id, contact.Id, accountSeed.opportunity.name, salesStage.Id, leadSource.Id, category.Id, industry.Id, accountSeed.opportunity.budget, accountSeed.opportunity.probability, accountSeed.opportunity.progress, accountSeed.opportunity.description, "Commercial review in progress.", "Customer wants phased rollout and adoption support.", accountSeed.opportunity.status, assigned.UserId, owner.UserId, owner.UserId, owner.UserId]
      );
      const opportunity = opportunityResult.rows[0];
      opportunities.push(opportunity);

      await client.query(
        `
          INSERT INTO "Activities" (
            "CompanyId", "LeadId", "AccountId", "ContactId", "OpportunityId", "Type", "Subject", "Description",
            "DueDate", "Status", "Priority", "AssignedTo", "CreatedBy", "UpdatedBy", "IsActive", "IsDeleted", "Flag"
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW() + INTERVAL '3 days',$9,$10,$11,$12,$13,TRUE,FALSE,FALSE);
        `,
        [companyId, lead.Id, account.Id, contact.Id, opportunity.Id, "Meeting", `${accountSeed.name} follow-up`, "Review implementation scope, commercials, and timeline.", "Pending", "High", assigned.UserId, owner.UserId, owner.UserId]
      );

      const quoteResult = await client.query(
        `
          INSERT INTO "Quotes" (
            "CompanyId", "QuoteNumber", "AccountId", "ContactId", "OpportunityId", "ValidTillDate", "Status",
            "Subtotal", "DiscountAmount", "TaxAmount", "TotalAmount", "TermsAndConditions", "Notes",
            "CreatedBy", "UpdatedBy", "IsActive", "IsDeleted", "Flag"
          )
          VALUES ($1,$2,$3,$4,$5,CURRENT_DATE + INTERVAL '15 days','Sent',$6,$7,$8,$9,$10,$11,$12,$13,TRUE,FALSE,FALSE)
          RETURNING *;
        `,
        [companyId, buildCode("QT", index), account.Id, contact.Id, opportunity.Id, accountSeed.opportunity.budget * 0.85, 25000, accountSeed.opportunity.budget * 0.15, accountSeed.opportunity.budget, "Implementation billed in milestone-based phases.", "Quote shared after business review.", owner.UserId, owner.UserId]
      );
      const quote = quoteResult.rows[0];

      const invoiceResult = await client.query(
        `
          INSERT INTO "Invoices" (
            "CompanyId", "InvoiceNumber", "AccountId", "OpportunityId", "QuoteId", "Subtotal", "TaxAmount", "TotalAmount",
            "PaymentStatus", "PaymentMethod", "DueDate", "GeneratedDate", "Notes", "CreatedBy", "UpdatedBy",
            "IsActive", "IsDeleted", "Flag"
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Pending','Bank Transfer',CURRENT_DATE + INTERVAL '20 days',CURRENT_DATE,$9,$10,$11,TRUE,FALSE,FALSE)
          RETURNING *;
        `,
        [companyId, buildCode("INV", index), account.Id, opportunity.Id, quote.Id, quote.Subtotal, quote.TaxAmount, quote.TotalAmount, "Initial milestone invoice created for customer sign-off.", owner.UserId, owner.UserId]
      );
      const invoice = invoiceResult.rows[0];

      await client.query(
        `
          INSERT INTO "Payments" (
            "CompanyId", "InvoiceId", "Amount", "PaymentDate", "PaymentMethod", "ReferenceNumber", "Status", "Notes",
            "CreatedBy", "UpdatedBy", "IsActive", "IsDeleted", "Flag"
          )
          VALUES ($1,$2,$3,CURRENT_DATE,'Bank Transfer',$4,'Received',$5,$6,$7,TRUE,FALSE,FALSE);
        `,
        [companyId, invoice.Id, Math.round(Number(invoice.TotalAmount) * 0.35), `PAY-${index + 1}`, "Advance payment received against kickoff milestone.", owner.UserId, owner.UserId]
      );

      await client.query(
        `
          INSERT INTO "Retentions" (
            "CompanyId", "AccountId", "ContactId", "OpportunityId", "Type", "Status", "NextActionDate", "ReminderDate", "Notes",
            "AssignedTo", "CreatedBy", "UpdatedBy", "IsActive", "IsDeleted", "Flag"
          )
          VALUES ($1,$2,$3,$4,'Quarterly Business Review','Scheduled',CURRENT_DATE + INTERVAL '45 days',CURRENT_DATE + INTERVAL '40 days',$5,$6,$7,$8,TRUE,FALSE,FALSE);
        `,
        [companyId, account.Id, contact.Id, opportunity.Id, "Track adoption, renewal probability, and reference-readiness.", assigned.UserId, owner.UserId, owner.UserId]
      );

      await client.query(
        `
          INSERT INTO "Cases" (
            "CompanyId", "AccountId", "ContactId", "LeadId", "OpportunityId", "Subject", "Status", "Priority",
            "Description", "Resolution", "AssignedTo", "AssignedFrom", "CreatedBy", "UpdatedBy", "IsActive", "IsDeleted", "Flag"
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,TRUE,FALSE,FALSE);
        `,
        [
          companyId,
          account.Id,
          contact.Id,
          lead.Id,
          opportunity.Id,
          accountSeed.caseItem.subject,
          accountSeed.caseItem.status,
          accountSeed.caseItem.priority,
          accountSeed.caseItem.description,
          "Assigned for guided follow-up with customer operations team.",
          assigned.UserId,
          owner.UserId,
          owner.UserId,
          owner.UserId,
        ]
      );
    } else {
      await client.query(
        `
          INSERT INTO "Activities" (
            "CompanyId", "LeadId", "AccountId", "ContactId", "OpportunityId", "Type", "Subject", "Description",
            "DueDate", "Status", "Priority", "AssignedTo", "CreatedBy", "UpdatedBy", "IsActive", "IsDeleted", "Flag"
          )
          VALUES ($1,$2,NULL,NULL,NULL,'Call',$3,$4,NOW() + INTERVAL '2 days','Pending','Medium',$5,$6,$7,TRUE,FALSE,FALSE);
        `,
        [
          companyId,
          lead.Id,
          `${accountSeed.name} discovery follow-up`,
          "Prospect-level follow-up before qualification. Account and contact will be created only after qualification.",
          assigned.UserId,
          owner.UserId,
          owner.UserId,
        ]
      );
    }
  }

  const suppliers = [];
  for (const [index, supplierSeed] of SUPPLIERS.entries()) {
    const owner = userCycle(index);
    const result = await client.query(
      `
        INSERT INTO "Suppliers" (
          "Name", "ContactPerson", "Email", "Phone", "CompanyId", "CreatedBy", "Address", "City", "State", "Country", "PostalCode", "IsActive", "CreatedAt"
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'India',$10,TRUE,NOW())
        RETURNING *;
      `,
      [supplierSeed.name, supplierSeed.contactPerson, supplierSeed.email, supplierSeed.phone, companyId, owner.UserId, `${supplierSeed.city} industrial zone`, supplierSeed.city, supplierSeed.state, buildCode("PIN", index)]
    );
    suppliers.push(result.rows[0]);
  }

  const warehouses = [];
  for (const [index, warehouseSeed] of WAREHOUSES.entries()) {
    const owner = userCycle(index);
    const manager = userCycle(index + 2);
    const result = await client.query(
      `
        INSERT INTO "Warehouses" (
          "WarehouseCode", "Name", "Location", "Address", "City", "State", "Country", "PinCode",
          "ContactPerson", "ContactPhone", "ContactEmail", "ManagerId", "CompanyId", "Capacity", "CapacityUnit",
          "IsActive", "CreatedBy", "UpdatedBy"
        )
        VALUES ($1,$2,$3,$4,$5,$6,'India',$7,$8,$9,$10,$11,$12,$13,'sqft',TRUE,$14,$15)
        RETURNING *;
      `,
      [
        warehouseSeed.code,
        warehouseSeed.name,
        `${warehouseSeed.city} region`,
        `${warehouseSeed.city} logistics park`,
        warehouseSeed.city,
        warehouseSeed.state,
        buildCode("WHPIN", index),
        manager.Name || `Manager ${manager.UserId}`,
        `98000020${index + 1}`,
        `warehouse${index + 1}@bizorbit.in`,
        manager.UserId,
        companyId,
        warehouseSeed.capacity,
        owner.UserId,
        owner.UserId,
      ]
    );
    warehouses.push(result.rows[0]);
  }

  const customers = [];
  for (const [index, customerSeed] of CUSTOMERS.entries()) {
    const result = await client.query(
      `
        INSERT INTO "Customers" (
          "CustomerCode", "Name", "Email", "Phone", "Address", "City", "State", "Country", "PostalCode",
          "CustomerType", "CreditLimit", "OutstandingBalance", "IsActive", "Notes", "IsDeleted"
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,'India',$8,$9,$10,$11,TRUE,$12,FALSE)
        RETURNING *;
      `,
      [
        buildCode("CUST", index),
        customerSeed.name,
        customerSeed.email,
        customerSeed.phone,
        `${customerSeed.city} business district`,
        customerSeed.city,
        customerSeed.state,
        buildCode("CPIN", index),
        customerSeed.type,
        customerSeed.creditLimit,
        customerSeed.balance,
        "Key customer seeded for realistic sales and collection tracking.",
      ]
    );
    customers.push(result.rows[0]);
  }

  const products = [];
  for (const [index, productSeed] of INVENTORY_ITEMS.entries()) {
    const owner = userCycle(index);
    const category = productCategories[index % productCategories.length];
    const unit = units[index % units.length];
    const result = await client.query(
      `
        INSERT INTO "Products" (
          "ProductName", "ProductCode", "Description", "CategoryId", "UnitId", "Price", "Cost",
          "StockQuantity", "MinimumStock", "MaximumStock", "ReorderLevel", "NotifyStockOut", "NotifyStockReload",
          "SKU", "HSNCode", "TaxRate", "Discount", "CompanyId", "CreatedBy", "UpdatedBy", "IsActive", "Flag", "IsDelete"
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,TRUE,TRUE,$12,$13,18,0,$14,$15,$16,TRUE,FALSE,FALSE)
        RETURNING *;
      `,
      [
        productSeed.productName,
        productSeed.code,
        `${productSeed.productName} seeded as realistic inventory catalog data.`,
        category.Id,
        unit.Id,
        productSeed.price,
        productSeed.cost,
        productSeed.stockQuantity,
        productSeed.minimumStock,
        productSeed.stockQuantity + 20,
        productSeed.minimumStock + 2,
        productSeed.sku,
        productSeed.hsn,
        companyId,
        owner.UserId,
        owner.UserId,
      ]
    );
    products.push(result.rows[0]);
  }

  for (const [index, product] of products.entries()) {
    const warehouse = warehouses[index % warehouses.length];
    const owner = userCycle(index);
    await client.query(
      `
        INSERT INTO "StockMovements" (
          "ProductId", "WarehouseId", "ChangeType", "Quantity", "Reason", "CreatedBy", "CreatedAt"
        )
        VALUES ($1,$2,'IN',$3,$4,$5,NOW());
      `,
      [product.Id, warehouse.Id, product.StockQuantity, "Initial realistic stock load", owner.UserId]
    );
  }

  for (const [index, supplier] of suppliers.entries()) {
    const owner = userCycle(index);
    await client.query(
      `
        INSERT INTO "PurchaseOrders" (
          "PONumber", "SupplierId", "OrderDate", "ExpectedDeliveryDate", "Status", "TotalAmount", "Notes", "CompanyId", "CreatedBy", "CreatedAt", "UpdatedAt"
        )
        VALUES ($1,$2,NOW(),NOW() + INTERVAL '10 days','Ordered',$3,$4,$5,$6,NOW(),NOW());
      `,
      [buildCode("PO", index), supplier.Id, 325000 + index * 50000, "Seeded purchase order for restock planning.", companyId, owner.UserId]
    );
  }

  for (const [index, customer] of customers.entries()) {
    const owner = userCycle(index);
    await client.query(
      `
        INSERT INTO "SalesOrders" (
          "SONumber", "CustomerId", "CustomerName", "OrderDate", "ExpectedDeliveryDate", "Status", "Priority",
          "TotalAmount", "TaxAmount", "DiscountAmount", "PaidAmount", "PaymentStatus", "PaymentMethod",
          "ShippingAddress", "BillingAddress", "Notes", "InternalNotes", "CompanyId", "CreatedBy", "UpdatedBy", "IsDeleted"
        )
        VALUES ($1,$2,$3,CURRENT_DATE,CURRENT_DATE + INTERVAL '7 days','Confirmed','Normal',$4,$5,$6,$7,$8,'Bank Transfer',$9,$10,$11,$12,$13,$14,$15,FALSE);
      `,
      [
        buildCode("SO", index),
        customer.Id,
        customer.Name,
        475000 + index * 80000,
        85500 + index * 14400,
        10000,
        150000,
        index === 0 ? "Partial" : "Pending",
        `${customer.City} receiving yard`,
        `${customer.City} accounts office`,
        "Seeded sales order for dashboard and report coverage.",
        "Follow up on dispatch confirmation and payment schedule.",
        companyId,
        owner.UserId,
        owner.UserId,
      ]
    );
  }
};

const main = async () => {
  const client = await appPool.connect();
  const keepNames = unique(parseKeepNames());

  try {
    await client.query("BEGIN");

    const preservedUsers = await selectUsersToKeep(client, keepNames);
    const keepUserIds = preservedUsers.map((row) => Number(row.UserId));
    const company = await findOrCreateCompany(client, preservedUsers.find((row) => row.CompanyId));
    const companyId = Number(company.Id);

    await runOperationalReset(client, keepUserIds);
    await seedOperationalData({ client, companyId, users: preservedUsers });

    await client.query("COMMIT");

    console.log("Portal data reset completed.");
    console.log(`Preserved users (${preservedUsers.length}): ${preservedUsers.map((row) => `${row.Name}#${row.UserId}`).join(", ")}`);
    console.log(`Company used for seeded data: ${company.CompanyName || company.Id}`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to reset portal data:", error);
    process.exitCode = 1;
  } finally {
    client.release();
  }
};

main();
