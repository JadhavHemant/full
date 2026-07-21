const bcrypt = require("bcryptjs");
const { appPool } = require("../config/db");
const { initModels } = require("../Models/initModels");

const DEFAULT_OPTIONS = {
  users: 100,
  perUser: 100,
  branchFactor: 4,
  levels: null,
  resetSeedCompany: false,
  seedPrefix: "seed.hv",
  emailDomain: "example.com",
  password: "Seed@123A",
  superAdminEmail: "",
  superAdminPassword: "",
  superAdminName: "Hemant Jadhav",
  companyName: "Seed Hierarchy Company",
  seedMonitoringFailures: false,
};

const ROLE_DEFINITIONS = [
  { Id: 1, RoleName: "Super Admin", Description: "Platform owner", Level: 0 },
  { Id: 2, RoleName: "Admin", Description: "Org admin", Level: 1 },
  { Id: 3, RoleName: "Manager", Description: "Team manager", Level: 2 },
  { Id: 4, RoleName: "Team Lead", Description: "Team lead", Level: 3 },
  { Id: 5, RoleName: "Sales Executive", Description: "Sales user", Level: 4 },
  { Id: 6, RoleName: "Support Executive", Description: "Support user", Level: 5 },
];

const USER_TYPE_DEFINITIONS = [
  { Id: 1, UserType: "Super Admin" },
  { Id: 2, UserType: "Admin" },
  { Id: 3, UserType: "Manager" },
  { Id: 4, UserType: "Team Lead" },
  { Id: 5, UserType: "Sales Executive" },
  { Id: 6, UserType: "Support Executive" },
];

const UNIT_DEFINITIONS = [
  { Name: "Piece", Symbol: "pc" },
  { Name: "Kilogram", Symbol: "kg" },
  { Name: "Liter", Symbol: "l" },
  { Name: "Box", Symbol: "box" },
  { Name: "Pack", Symbol: "pk" },
];

const CATEGORY_NAMES = [
  "Electronics",
  "Software",
  "Hardware",
  "Accessories",
  "Office Supplies",
  "Services",
  "Subscriptions",
  "Networking",
  "Security",
  "Storage",
];

const INDUSTRY_NAMES = [
  "Healthcare",
  "Retail",
  "Banking",
  "Insurance",
  "Education",
  "Manufacturing",
  "Logistics",
  "Telecom",
  "Hospitality",
  "Government",
];

const LEAD_SOURCE_NAMES = [
  "Website",
  "Email Campaign",
  "Referral",
  "Cold Call",
  "Social Media",
  "Partner",
  "Trade Show",
  "Webinar",
  "Marketplace",
  "Inbound",
];

const FOLLOWUP_TYPE_NAMES = [
  "Email",
  "Phone",
  "Meeting",
  "Demo",
  "Proposal",
  "Negotiation",
  "Reminder",
  "Site Visit",
  "Technical Review",
  "Contract Discussion",
];

const SALES_STAGE_NAMES = [
  "Prospecting",
  "Qualification",
  "Needs Analysis",
  "Proposal",
  "Negotiation",
  "Contracting",
  "Won",
  "Lost",
];

const TASK_TYPE_NAMES = [
  "Discovery Call",
  "Product Demo",
  "Technical Validation",
  "POC Setup",
  "POC Review",
  "Pricing Discussion",
  "Security Review",
  "Executive Meeting",
  "Contract Review",
  "Onboarding Planning",
];

const LEAD_STATUSES = ["New", "Qualified", "Disqualified"];
const OPPORTUNITY_STATUSES = [
  "Prospecting",
  "Qualification",
  "Needs Analysis",
  "Proposal",
  "Negotiation",
];
const PRESALES_STATUSES = ["Pending", "In Progress", "Completed"];
const CASE_STATUSES = ["Open", "In Progress", "Resolved"];
const CASE_PRIORITIES = ["Low", "Medium", "High"];
const HYPERSCALERS = ["AWS", "Azure", "GCP"];
const PO_STATUSES = ["Draft", "Pending", "Confirmed"];
const SO_STATUSES = ["Draft", "Pending", "Confirmed", "Processing"];
const SO_PAYMENT_STATUSES = ["Pending", "Partial", "Paid"];
const SO_PRIORITIES = ["Low", "Normal", "High"];
const STOCK_MOVEMENT_TYPES = ["IN", "OUT", "ADJUSTMENT", "TRANSFER"];
const CUSTOMER_TYPES = ["Retail", "Wholesale", "Corporate", "Distributor"];

let uniqueCounter = Date.now() % 1000000;

const pad = (value, size = 3) => String(value).padStart(size, "0");
const randomFrom = (items, fallback = null) =>
  items.length ? items[Math.floor(Math.random() * items.length)] : fallback;
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const nextUnique = () => {
  uniqueCounter += 1;
  return uniqueCounter;
};

const parseIntArg = (name, fallback) => {
  const arg = process.argv.find((item) => item.startsWith(`--${name}=`));
  if (!arg) {
    return fallback;
  }
  const parsed = Number.parseInt(arg.split("=")[1], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseStringArg = (name, fallback) => {
  const arg = process.argv.find((item) => item.startsWith(`--${name}=`));
  if (!arg) {
    return fallback;
  }
  const value = arg.split("=")[1]?.trim();
  return value || fallback;
};

const parseBooleanArg = (name, fallback = false) => {
  const arg = process.argv.find((item) => item.startsWith(`--${name}=`));
  if (!arg) {
    return fallback;
  }

  const value = arg.split("=")[1]?.trim().toLowerCase();
  if (["1", "true", "yes", "y"].includes(value)) {
    return true;
  }
  if (["0", "false", "no", "n"].includes(value)) {
    return false;
  }
  return fallback;
};

const buildOptions = () => ({
  users: parseIntArg("users", DEFAULT_OPTIONS.users),
  perUser: parseIntArg("per-user", DEFAULT_OPTIONS.perUser),
  branchFactor: parseIntArg("branch-factor", DEFAULT_OPTIONS.branchFactor),
  levels: process.argv.some((item) => item.startsWith("--levels="))
    ? parseIntArg("levels", 1)
    : DEFAULT_OPTIONS.levels,
  resetSeedCompany: parseBooleanArg("reset-seed-company", DEFAULT_OPTIONS.resetSeedCompany),
  seedPrefix: parseStringArg("seed-prefix", DEFAULT_OPTIONS.seedPrefix),
  emailDomain: parseStringArg("email-domain", DEFAULT_OPTIONS.emailDomain),
  password: parseStringArg("password", DEFAULT_OPTIONS.password),
  superAdminEmail: parseStringArg("super-admin-email", DEFAULT_OPTIONS.superAdminEmail),
  superAdminPassword: parseStringArg(
    "super-admin-password",
    DEFAULT_OPTIONS.superAdminPassword
  ),
  superAdminName: parseStringArg("super-admin-name", DEFAULT_OPTIONS.superAdminName),
  companyName: parseStringArg("company-name", DEFAULT_OPTIONS.companyName),
  seedMonitoringFailures: parseBooleanArg(
    "seed-monitoring-failures",
    DEFAULT_OPTIONS.seedMonitoringFailures
  ),
});

const quote = (column) => `"${column}"`;

const getTableColumns = async (client, tableName) => {
  const { rows } = await client.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = $1;
    `,
    [tableName]
  );

  return new Set(rows.map((row) => row.column_name));
};

const buildUserEmail = (options, index) =>
  index === 1 && options.superAdminEmail
    ? options.superAdminEmail
    : `${options.seedPrefix}.user${pad(index)}@${options.emailDomain}`;

const buildHierarchyBlueprint = (options) => {
  const requestedLevels = Number.isFinite(options.levels) ? options.levels : null;
  if (!requestedLevels) {
    const managerIndexByIndex = new Map();
    const levelByIndex = new Map();

    for (let index = 1; index <= options.users; index += 1) {
      const managerIndex = index === 1 ? null : Math.floor((index - 2) / options.branchFactor) + 1;
      managerIndexByIndex.set(index, managerIndex);
      const level = managerIndex ? (levelByIndex.get(managerIndex) || 0) + 1 : 0;
      levelByIndex.set(index, level);
    }

    return { managerIndexByIndex, levelByIndex };
  }

  const levels = Math.max(1, Math.min(requestedLevels, options.users));
  const managerIndexByIndex = new Map([[1, null]]);
  const levelByIndex = new Map([[1, 0]]);

  if (options.users === 1) {
    return { managerIndexByIndex, levelByIndex };
  }

  const remainingUsers = options.users - 1;
  const remainingLevels = levels - 1;
  const levelBuckets = [[1]];
  let nextUserIndex = 2;

  for (let level = 1; level <= remainingLevels; level += 1) {
    const levelsLeftIncludingCurrent = remainingLevels - level + 1;
    const usersRemainingIncludingCurrent = options.users - nextUserIndex + 1;
    const countForLevel = Math.max(
      1,
      Math.ceil(usersRemainingIncludingCurrent / levelsLeftIncludingCurrent)
    );
    const bucket = [];

    for (
      let offset = 0;
      offset < countForLevel && nextUserIndex <= options.users;
      offset += 1, nextUserIndex += 1
    ) {
      bucket.push(nextUserIndex);
    }

    levelBuckets.push(bucket);
  }

  for (let level = 1; level < levelBuckets.length; level += 1) {
    const parents = levelBuckets[level - 1];
    const current = levelBuckets[level];

    for (let index = 0; index < current.length; index += 1) {
      const userIndex = current[index];
      managerIndexByIndex.set(userIndex, parents[index % parents.length]);
      levelByIndex.set(userIndex, level);
    }
  }

  return { managerIndexByIndex, levelByIndex };
};

const getRoleForLevel = (level, userIndex = 1) => {
  if (level <= 0) return 1;
  if (level === 1) return 2;
  if (level === 2) return 3;
  if (level === 3) return 4;
  return userIndex % 2 === 0 ? 5 : 6;
};

const getUserTypeForLevel = (level, userIndex = 1) => getRoleForLevel(level, userIndex);

const chunkRows = (rows, size = 250) => {
  const chunks = [];
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }
  return chunks;
};

const bulkInsert = async ({
  client,
  table,
  columns,
  rows,
  returning = ["Id"],
}) => {
  if (!rows.length) {
    return [];
  }

  const allReturnedRows = [];
  for (const chunk of chunkRows(rows)) {
    const values = [];
    const valueClauses = chunk.map((row, rowIndex) => {
      const placeholders = row.map((_value, columnIndex) => {
        const placeholderIndex = rowIndex * columns.length + columnIndex + 1;
        values.push(row[columnIndex]);
        return `$${placeholderIndex}`;
      });
      return `(${placeholders.join(", ")})`;
    });

    const query = `
      INSERT INTO "${table}" (${columns.map(quote).join(", ")})
      VALUES ${valueClauses.join(", ")}
      RETURNING ${returning.map(quote).join(", ")};
    `;

    const { rows: insertedRows } = await client.query(query, values);
    allReturnedRows.push(...insertedRows);
  }

  return allReturnedRows;
};

const getIdsByCreatedBy = async (client, table, createdBy) => {
  const { rows } = await client.query(
    `SELECT "Id" FROM "${table}" WHERE "CreatedBy" = $1 ORDER BY "Id";`,
    [createdBy]
  );
  return rows.map((row) => Number(row.Id));
};

const getCustomersByUserTag = async (client, userId) => {
  const { rows } = await client.query(
    `
      SELECT "Id"
      FROM "Customers"
      WHERE "Name" LIKE $1
      AND COALESCE("IsDeleted", FALSE) = FALSE
      ORDER BY "Id";
    `,
    [`SEED-CUST-U${userId}-%`]
  );
  return rows.map((row) => Number(row.Id));
};

const getOpportunityProductPairsByCreatedBy = async (client, createdBy) => {
  const { rows } = await client.query(
    `
      SELECT "OpportunityId", "ProductId"
      FROM "OpportunityProducts"
      WHERE "CreatedBy" = $1
      AND COALESCE("IsDeleted", FALSE) = FALSE;
    `,
    [createdBy]
  );

  return new Set(rows.map((row) => `${Number(row.OpportunityId)}:${Number(row.ProductId)}`));
};

const getItemCountByCreator = async (client, itemTable, joinClause, createdBy) => {
  const { rows } = await client.query(
    `
      SELECT COUNT(*)::int AS count
      FROM "${itemTable}" i
      ${joinClause}
      WHERE p."CreatedBy" = $1;
    `,
    [createdBy]
  );

  return Number(rows[0]?.count || 0);
};

const ensureRoles = async (client) => {
  const roleColumns = await getTableColumns(client, "Roles");
  for (const role of ROLE_DEFINITIONS) {
    const { rows: existingById } = await client.query(
      `SELECT "Id" FROM "Roles" WHERE "Id" = $1 LIMIT 1;`,
      [role.Id]
    );

    if (existingById.length) {
      continue;
    }

    let roleName = role.RoleName;
    const { rows: existingByName } = await client.query(
      `SELECT "Id" FROM "Roles" WHERE "RoleName" = $1 LIMIT 1;`,
      [roleName]
    );

    if (existingByName.length) {
      roleName = `${role.RoleName} ${role.Id}`;
    }

    const columns = ["Id", "RoleName"];
    const values = [role.Id, roleName];

    if (roleColumns.has("Description")) {
      columns.push("Description");
      values.push(role.Description);
    }

    if (roleColumns.has("Level")) {
      columns.push("Level");
      values.push(role.Level);
    }

    if (roleColumns.has("IsActive")) {
      columns.push("IsActive");
      values.push(true);
    }

    if (roleColumns.has("IsDeleted")) {
      columns.push("IsDeleted");
      values.push(false);
    }

    if (roleColumns.has("Flag")) {
      columns.push("Flag");
      values.push(true);
    }

    await client.query(
      `
        INSERT INTO "Roles" (${columns.map(quote).join(", ")})
        VALUES (${columns.map((_, index) => `$${index + 1}`).join(", ")})
        ON CONFLICT ("Id") DO NOTHING;
      `,
      values
    );
  }

  await client.query(`
    SELECT setval(
      pg_get_serial_sequence('"Roles"', 'Id'),
      COALESCE((SELECT MAX("Id") FROM "Roles"), 1),
      true
    );
  `);
};

const ensureUserTypes = async (client) => {
  for (const userType of USER_TYPE_DEFINITIONS) {
    await client.query(
      `
        INSERT INTO "UserTypes" ("Id", "UserType")
        VALUES ($1, $2)
        ON CONFLICT ("Id") DO UPDATE
        SET "UserType" = EXCLUDED."UserType";
      `,
      [userType.Id, userType.UserType]
    );
  }

  await client.query(`
    SELECT setval(
      pg_get_serial_sequence('"UserTypes"', 'Id'),
      COALESCE((SELECT MAX("Id") FROM "UserTypes"), 1),
      true
    );
  `);
};

const ensureSeedCompany = async (client, options) => {
  const seedEmail = `${options.seedPrefix}.company@${options.emailDomain}`;
  const existing = await client.query(
    `SELECT "Id" FROM "Companies" WHERE "Email" = $1 LIMIT 1;`,
    [seedEmail]
  );

  if (existing.rows.length) {
    return Number(existing.rows[0].Id);
  }

  const { rows } = await client.query(
    `
      INSERT INTO "Companies" (
        "CompanyName", "Email", "Phone", "BusinessType",
        "Address", "City", "State", "Country", "PostalCode",
        "Website", "OwnerName", "IsActive", "Flag", "IsDelete"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, TRUE, TRUE, FALSE)
      RETURNING "Id";
    `,
    [
      options.companyName,
      seedEmail,
      "9000000000",
      "Technology",
      "Seed Street 100",
      "Mumbai",
      "Maharashtra",
      "India",
      "400001",
      `https://${options.seedPrefix}.example.com`,
      "Seed Owner",
    ]
  );

  return Number(rows[0].Id);
};

const resetSeedCompanyData = async (client, options) => {
  const seedEmail = `${options.seedPrefix}.company@${options.emailDomain}`;
  const { rows } = await client.query(
    `SELECT "Id" FROM "Companies" WHERE "Email" = $1 LIMIT 1;`,
    [seedEmail]
  );

  if (!rows.length) {
    return false;
  }

  await client.query(`DELETE FROM "Companies" WHERE "Id" = $1;`, [Number(rows[0].Id)]);
  return true;
};

const ensureUnits = async (client) => {
  const names = UNIT_DEFINITIONS.map((unit) => unit.Name);
  const existing = await client.query(
    `SELECT "Id", "Name" FROM "Units" WHERE "Name" = ANY($1::text[]);`,
    [names]
  );

  const idByName = new Map(existing.rows.map((row) => [row.Name, Number(row.Id)]));

  for (const unit of UNIT_DEFINITIONS) {
    if (idByName.has(unit.Name)) {
      continue;
    }

    const { rows } = await client.query(
      `
        INSERT INTO "Units" ("Name", "Symbol", "IsDeleted")
        VALUES ($1, $2, FALSE)
        RETURNING "Id";
      `,
      [unit.Name, unit.Symbol]
    );
    idByName.set(unit.Name, Number(rows[0].Id));
  }

  return UNIT_DEFINITIONS.map((unit) => idByName.get(unit.Name)).filter(Boolean);
};

const ensureProductCategories = async (client) => {
  const existing = await client.query(
    `
      SELECT "Id", "CategoryName"
      FROM "ProductCategories"
      WHERE "CategoryName" = ANY($1::text[]);
    `,
    [CATEGORY_NAMES]
  );

  const idByName = new Map(existing.rows.map((row) => [row.CategoryName, Number(row.Id)]));

  for (const categoryName of CATEGORY_NAMES) {
    if (idByName.has(categoryName)) {
      continue;
    }

    const { rows } = await client.query(
      `
        INSERT INTO "ProductCategories" ("CategoryName", "Description")
        VALUES ($1, $2)
        RETURNING "Id";
      `,
      [categoryName, `Seed category ${categoryName}`]
    );
    idByName.set(categoryName, Number(rows[0].Id));
  }

  return CATEGORY_NAMES.map((name) => idByName.get(name)).filter(Boolean);
};

const ensureLookupByName = async ({ client, table, names, actorUserId }) => {
  const columns = await getTableColumns(client, table);
  const { rows: existingRows } = await client.query(
    `SELECT "Id", "Name" FROM "${table}" WHERE "Name" = ANY($1::text[]);`,
    [names]
  );

  const idByName = new Map(existingRows.map((row) => [row.Name, Number(row.Id)]));

  for (const name of names) {
    if (idByName.has(name)) {
      continue;
    }

    const insertColumns = ["Name"];
    const values = [name];

    if (columns.has("DefaultDurationMinutes")) {
      insertColumns.push("DefaultDurationMinutes");
      values.push(30);
    }

    if (columns.has("CreatedBy")) {
      insertColumns.push("CreatedBy");
      values.push(actorUserId);
    }

    if (columns.has("UpdatedBy")) {
      insertColumns.push("UpdatedBy");
      values.push(actorUserId);
    }

    if (columns.has("IsActive")) {
      insertColumns.push("IsActive");
      values.push(true);
    }

    if (columns.has("IsDeleted")) {
      insertColumns.push("IsDeleted");
      values.push(false);
    }

    const { rows } = await client.query(
      `
        INSERT INTO "${table}" (${insertColumns.map(quote).join(", ")})
        VALUES (${insertColumns.map((_column, index) => `$${index + 1}`).join(", ")})
        RETURNING "Id";
      `,
      values
    );

    idByName.set(name, Number(rows[0].Id));
  }

  return names.map((name) => idByName.get(name)).filter(Boolean);
};

const ensureReferenceData = async ({ client, actorUserId }) => {
  const [unitIds, productCategoryIds, industryIds, leadSourceIds, followupTypeIds, salesStageIds, taskTypeIds] =
    await Promise.all([
      ensureUnits(client),
      ensureProductCategories(client),
      ensureLookupByName({ client, table: "Industries", names: INDUSTRY_NAMES, actorUserId }),
      ensureLookupByName({ client, table: "LeadSources", names: LEAD_SOURCE_NAMES, actorUserId }),
      ensureLookupByName({
        client,
        table: "FollowupTypes",
        names: FOLLOWUP_TYPE_NAMES,
        actorUserId,
      }),
      ensureLookupByName({ client, table: "SalesStages", names: SALES_STAGE_NAMES, actorUserId }),
      ensureLookupByName({ client, table: "TaskTypes", names: TASK_TYPE_NAMES, actorUserId }),
    ]);

  return {
    unitIds,
    productCategoryIds,
    industryIds,
    leadSourceIds,
    followupTypeIds,
    salesStageIds,
    taskTypeIds,
  };
};

const ensureApiMonitoringReferenceData = async ({ client, companyId }) => {
  const integrationSeeds = [
    {
      name: "CRM Workspace API",
      baseUrl: "https://crm.example.internal/api",
      authType: "bearer",
      endpoints: [
        { name: "Lead Sync", method: "POST", url: "/crm/leads/sync", expected: 200, critical: true },
        { name: "Opportunity Snapshot", method: "GET", url: "/crm/opportunities/summary", expected: 200, critical: false },
      ],
    },
    {
      name: "ERP Operations API",
      baseUrl: "https://erp.example.internal/api",
      authType: "api-key",
      endpoints: [
        { name: "Stock Availability", method: "GET", url: "/inventory/stock/availability", expected: 200, critical: true },
        { name: "Sales Order Push", method: "POST", url: "/sales/orders/push", expected: 201, critical: true },
      ],
    },
    {
      name: "Notification Gateway",
      baseUrl: "https://notify.example.internal/api",
      authType: "token",
      endpoints: [
        { name: "Email Dispatch", method: "POST", url: "/notifications/email/send", expected: 202, critical: false },
        { name: "Webhook Ack", method: "POST", url: "/webhooks/ack", expected: 200, critical: false },
      ],
    },
  ];

  const integrationIds = [];
  const endpointIds = [];

  for (const integrationSeed of integrationSeeds) {
    let integrationId = null;
    const existingIntegration = await client.query(
      `
        SELECT "Id"
        FROM "ApiIntegrations"
        WHERE "CompanyId" = $1
        AND "IntegrationName" = $2
        LIMIT 1;
      `,
      [companyId, integrationSeed.name]
    );

    if (existingIntegration.rows.length) {
      integrationId = Number(existingIntegration.rows[0].Id);
    } else {
      const inserted = await client.query(
        `
          INSERT INTO "ApiIntegrations" (
            "CompanyId", "IntegrationName", "BaseUrl", "AuthType", "IsActive"
          )
          VALUES ($1, $2, $3, $4, TRUE)
          RETURNING "Id";
        `,
        [companyId, integrationSeed.name, integrationSeed.baseUrl, integrationSeed.authType]
      );
      integrationId = Number(inserted.rows[0].Id);
    }

    integrationIds.push(integrationId);

    for (const endpointSeed of integrationSeed.endpoints) {
      const existingEndpoint = await client.query(
        `
          SELECT "Id"
          FROM "ApiEndpoints"
          WHERE "IntegrationId" = $1
          AND "EndpointName" = $2
          LIMIT 1;
        `,
        [integrationId, endpointSeed.name]
      );

      if (existingEndpoint.rows.length) {
        endpointIds.push(Number(existingEndpoint.rows[0].Id));
        continue;
      }

      const inserted = await client.query(
        `
          INSERT INTO "ApiEndpoints" (
            "IntegrationId", "EndpointName", "Method", "EndpointUrl",
            "TimeoutSeconds", "ExpectedStatusCode", "IsCritical", "IsActive"
          )
          VALUES ($1, $2, $3, $4, 30, $5, $6, TRUE)
          RETURNING "Id";
        `,
        [
          integrationId,
          endpointSeed.name,
          endpointSeed.method,
          endpointSeed.url,
          endpointSeed.expected,
          endpointSeed.critical,
        ]
      );
      endpointIds.push(Number(inserted.rows[0].Id));
    }
  }

  return {
    integrationIds,
    endpointIds,
  };
};

const seedApiMonitoringVolume = async ({ client, users, refs, options, summary }) => {
  const rows = [];
  const alertRows = [];
  const notificationRows = [];
  const totalLogs = Math.max(users.length * Math.max(options.perUser, 10), 120);

  for (let index = 0; index < totalLogs; index += 1) {
    const user = users[index % users.length];
    const integrationId = refs.integrationIds[index % refs.integrationIds.length] || null;
    const endpointId = refs.endpointIds[index % refs.endpointIds.length] || null;
    const shouldFail =
      options.seedMonitoringFailures && (index % 6 === 0 || index % 11 === 0);
    const statusCode = shouldFail ? (index % 2 === 0 ? 500 : 504) : index % 4 === 0 ? 201 : 200;
    const durationMs = shouldFail ? randomInt(1800, 12000) : randomInt(80, 1400);
    const createdAt = buildDateTime(-1 * (index % 14), 8 + (index % 10));

    rows.push([
      integrationId,
      endpointId,
      `seed-api-${user.userId}-${pad(index + 1, 5)}`,
      {
        path: `/seed/${user.userId}/${index + 1}`,
        actorUserId: user.userId,
        source: "seedHierarchyAndVolume",
      },
      shouldFail
        ? { ok: false, code: statusCode }
        : { ok: true, code: statusCode, records: randomInt(1, 25) },
      statusCode,
      !shouldFail,
      shouldFail ? `Seeded ${statusCode} failure for monitoring trend coverage.` : null,
      durationMs,
      user.userId,
      "Seeded",
      createdAt,
    ]);
  }

  const insertedLogs = await bulkInsert({
    client,
    table: "ApiExecutionLogs",
    columns: [
      "IntegrationId",
      "EndpointId",
      "RequestId",
      "RequestPayload",
      "ResponsePayload",
      "ResponseStatusCode",
      "IsSuccess",
      "ErrorMessage",
      "DurationMs",
      "TriggeredByUserId",
      "TriggerType",
      "CreatedAt",
    ],
    rows,
    returning: ["Id", "TriggeredByUserId", "ResponseStatusCode", "CreatedAt"],
  });

  for (const [index, logRow] of insertedLogs.entries()) {
    if (![500, 504].includes(Number(logRow.ResponseStatusCode))) {
      continue;
    }

    alertRows.push([
      Number(logRow.Id),
      "API_FAILURE",
      Number(logRow.TriggeredByUserId),
      "InApp",
      index % 3 === 0 ? "Escalated" : "Pending",
      logRow.CreatedAt,
    ]);
  }

  if (alertRows.length) {
    const insertedAlerts = await bulkInsert({
      client,
      table: "ApiFailureAlerts",
      columns: [
        "ApiExecutionLogId",
        "AlertType",
        "AlertSentToUserId",
        "AlertChannel",
        "AlertStatus",
        "CreatedAt",
      ],
      rows: alertRows,
      returning: ["Id", "AlertSentToUserId", "CreatedAt"],
    });

    const adminUsers = users.filter((user) => Number(user.roleId) <= 2);
    for (const [index, alert] of insertedAlerts.slice(0, refs.endpointIds.length).entries()) {
      const adminUser = adminUsers[index % adminUsers.length] || users[0];
      notificationRows.push([
        adminUser.companyId,
        adminUser.userId,
        "API Failure Escalation",
        `Seeded API alert #${alert.Id} requires attention from admin hierarchy.`,
        "API_FAILURE_ESCALATION",
        "critical",
        "ApiFailureAlert",
        Number(alert.Id),
        false,
        alert.CreatedAt,
      ]);
    }
  }

  if (notificationRows.length) {
    await bulkInsert({
      client,
      table: "Notifications",
      columns: [
        "CompanyId",
        "UserId",
        "Title",
        "Message",
        "Type",
        "Severity",
        "EntityType",
        "EntityId",
        "IsRead",
        "CreatedAt",
      ],
      rows: notificationRows,
    });
  }

  summary.ApiExecutionLogs = (summary.ApiExecutionLogs || 0) + insertedLogs.length;
  summary.ApiFailureAlerts = (summary.ApiFailureAlerts || 0) + alertRows.length;
  summary.Notifications = (summary.Notifications || 0) + notificationRows.length;
};

const ensureSeedUsers = async ({ client, options, companyId }) => {
  const emailList = Array.from(
    { length: options.users },
    (_item, index) => buildUserEmail(options, index + 1)
  );

  const { rows: existingUsers } = await client.query(
    `
      SELECT
        "UserId",
        "Name",
        "Email",
        "RoleId",
        "UserTypeId",
        "CompanyId",
        "ReportingManagerId",
        "HierarchyLevel",
        "HierarchyPath"
      FROM "Users"
      WHERE "Email" = ANY($1::text[]);
      `,
    [emailList]
  );

  const userByEmail = new Map(existingUsers.map((user) => [user.Email, user]));
  const userByIndex = new Map();
  const { managerIndexByIndex, levelByIndex } = buildHierarchyBlueprint(options);
  let createdUsers = 0;

  const passwordHash = await bcrypt.hash(options.password, 10);
  const superAdminPasswordHash = options.superAdminPassword
    ? await bcrypt.hash(options.superAdminPassword, 10)
    : passwordHash;

  for (let index = 1; index <= options.users; index += 1) {
    const email = buildUserEmail(options, index);
    const managerIndex = managerIndexByIndex.get(index) ?? null;
    const level = levelByIndex.get(index) || 0;

    const roleId = getRoleForLevel(level, index);
    const userTypeId = getUserTypeForLevel(level, index);
    const existingUser = userByEmail.get(email);
    const managerUserId = managerIndex ? userByIndex.get(managerIndex)?.UserId || null : null;
    const createdBy = managerUserId || null;
    const effectivePasswordHash = index === 1 ? superAdminPasswordHash : passwordHash;
    const displayName =
      index === 1 && options.superAdminEmail ? options.superAdminName : `Seed User ${pad(index)}`;

    if (!existingUser) {
      const { rows } = await client.query(
        `
          INSERT INTO "Users" (
            "Name", "Email", "Password", "MobileNumber",
            "CompanyId", "RoleId", "UserTypeId",
            "ReportingManagerId", "CreatedBy",
            "HierarchyLevel", "HierarchyPath",
            "Address", "City", "State", "Country", "PostalCode",
            "IsActive", "Flag", "IsDelete"
          )
          VALUES (
            $1, $2, $3, $4,
            $5, $6, $7,
            $8, $9,
            $10, $11,
            $12, $13, $14, $15, $16,
            TRUE, TRUE, FALSE
          )
          RETURNING
            "UserId",
            "Name",
            "Email",
            "RoleId",
            "UserTypeId",
            "CompanyId",
            "ReportingManagerId",
            "HierarchyLevel",
            "HierarchyPath";
        `,
        [
          displayName,
          email,
          effectivePasswordHash,
          `9${String(100000000 + index).slice(-9)}`,
          companyId,
          roleId,
          userTypeId,
          managerUserId,
          createdBy,
          level,
          null,
          `Seed Address ${index}`,
          "Mumbai",
          "Maharashtra",
          "India",
          `400${pad(index % 1000, 3)}`,
        ]
      );

      const inserted = rows[0];
      userByEmail.set(email, inserted);
      userByIndex.set(index, inserted);
      createdUsers += 1;
    } else {
      await client.query(
        `
          UPDATE "Users"
          SET
            "Name" = $1,
            "Password" = $2,
            "IsActive" = TRUE,
            "IsDelete" = FALSE
          WHERE "UserId" = $3;
        `,
        [
          displayName,
          effectivePasswordHash,
          existingUser.UserId,
        ]
      );
      userByIndex.set(index, existingUser);
    }
  }

  const hierarchyPathByIndex = new Map();
  for (let index = 1; index <= options.users; index += 1) {
    const user = userByIndex.get(index);
    const managerIndex = managerIndexByIndex.get(index);
    const managerUser = managerIndex ? userByIndex.get(managerIndex) : null;
    const level = levelByIndex.get(index) || 0;
    const roleId = getRoleForLevel(level, index);
    const userTypeId = getUserTypeForLevel(level, index);
    const managerUserId = managerUser ? Number(managerUser.UserId) : null;
    const createdBy = managerUserId || Number(user.UserId);
    const hierarchyPath = managerIndex
      ? `${hierarchyPathByIndex.get(managerIndex)}/${user.UserId}`
      : `/${user.UserId}`;

    hierarchyPathByIndex.set(index, hierarchyPath);

    await client.query(
      `
        UPDATE "Users"
        SET
          "RoleId" = $1,
          "UserTypeId" = $2,
          "CompanyId" = $3,
          "ReportingManagerId" = $4,
          "CreatedBy" = COALESCE("CreatedBy", $5),
          "HierarchyLevel" = $6,
          "HierarchyPath" = $7,
          "IsActive" = TRUE,
          "IsDelete" = FALSE
        WHERE "UserId" = $8;
      `,
      [roleId, userTypeId, companyId, managerUserId, createdBy, level, hierarchyPath, user.UserId]
    );
  }

  const userIds = Array.from(userByIndex.values()).map((user) => Number(user.UserId));
  const { rows: finalUsers } = await client.query(
    `
      SELECT
        "UserId",
        "Name",
        "Email",
        "RoleId",
        "UserTypeId",
        "CompanyId",
        "ReportingManagerId",
        "HierarchyLevel",
        "HierarchyPath"
      FROM "Users"
      WHERE "UserId" = ANY($1::int[])
      ORDER BY "UserId";
    `,
    [userIds]
  );

  return {
    createdUsers,
    users: finalUsers.map((row) => ({
      userId: Number(row.UserId),
      name: row.Name,
      email: row.Email,
      roleId: Number(row.RoleId),
      userTypeId: Number(row.UserTypeId),
      companyId: Number(row.CompanyId),
      reportingManagerId: row.ReportingManagerId ? Number(row.ReportingManagerId) : null,
      hierarchyLevel: Number(row.HierarchyLevel || 0),
      hierarchyPath: row.HierarchyPath || null,
    })),
  };
};

const seedUserDataVolume = async ({ client, user, refs, options, summary }) => {
  const userId = user.userId;
  const companyId = user.companyId;
  const managerId = user.reportingManagerId || user.userId;
  const perUser = options.perUser;

  let accountIds = await getIdsByCreatedBy(client, "Accounts", userId);
  let missing = Math.max(0, perUser - accountIds.length);
  if (missing > 0) {
    const rows = [];
    for (let index = 0; index < missing; index += 1) {
      const serial = accountIds.length + index + 1;
      rows.push([
        companyId,
        `SEED-ACC-U${userId}-${pad(serial)}`,
        `https://seed-acc-u${userId}-${serial}.example.com`,
        `Seed account ${serial} for user ${userId}`,
        randomFrom(refs.industryIds),
        userId,
        userId,
        true,
        false,
        false,
      ]);
    }

    const inserted = await bulkInsert({
      client,
      table: "Accounts",
      columns: [
        "CompanyId",
        "Name",
        "Website",
        "Description",
        "IndustryId",
        "CreatedBy",
        "UpdatedBy",
        "IsActive",
        "IsDeleted",
        "Flag",
      ],
      rows,
    });

    accountIds = accountIds.concat(inserted.map((row) => Number(row.Id)));
    summary.Accounts += inserted.length;
  }

  let contactIds = await getIdsByCreatedBy(client, "Contacts", userId);
  missing = Math.max(0, perUser - contactIds.length);
  if (missing > 0) {
    const rows = [];
    for (let index = 0; index < missing; index += 1) {
      const serial = contactIds.length + index + 1;
      const accountId = accountIds[index % accountIds.length] || null;
      rows.push([
        companyId,
        accountId,
        `Contact${pad(serial)}`,
        `User${pad(userId)}`,
        `${options.seedPrefix}.contact.u${userId}.${serial}@${options.emailDomain}`,
        `9${String(userId).padStart(3, "0")}${String(serial).padStart(6, "0")}`.slice(0, 10),
        "Decision Maker",
        userId,
        userId,
        true,
        false,
        false,
      ]);
    }

    const inserted = await bulkInsert({
      client,
      table: "Contacts",
      columns: [
        "CompanyId",
        "AccountId",
        "FirstName",
        "LastName",
        "Email",
        "Phone",
        "Title",
        "CreatedBy",
        "UpdatedBy",
        "IsActive",
        "IsDeleted",
        "Flag",
      ],
      rows,
    });

    contactIds = contactIds.concat(inserted.map((row) => Number(row.Id)));
    summary.Contacts += inserted.length;
  }

  let leadIds = await getIdsByCreatedBy(client, "Leads", userId);
  missing = Math.max(0, perUser - leadIds.length);
  if (missing > 0) {
    const rows = [];
    for (let index = 0; index < missing; index += 1) {
      const serial = leadIds.length + index + 1;
      const accountId = accountIds[index % accountIds.length] || null;
      const contactId = contactIds[index % contactIds.length] || null;
      rows.push([
        companyId,
        accountId,
        contactId,
        randomFrom(refs.leadSourceIds),
        randomFrom(refs.productCategoryIds),
        randomFrom(refs.followupTypeIds),
        randomFrom(refs.industryIds),
        randomFrom(LEAD_STATUSES, "New"),
        randomInt(1, 5),
        `Seed lead ${serial} for user ${userId}`,
        `Lead comment ${serial}`,
        userId,
        managerId,
        userId,
        userId,
        true,
        false,
        false,
      ]);
    }

    const inserted = await bulkInsert({
      client,
      table: "Leads",
      columns: [
        "CompanyId",
        "AccountId",
        "ContactId",
        "LeadSourceId",
        "ProductCategoryId",
        "FollowupTypeId",
        "IndustryId",
        "Status",
        "Rating",
        "Description",
        "Comments",
        "AssignedTo",
        "AssignedFrom",
        "CreatedBy",
        "UpdatedBy",
        "IsActive",
        "IsDeleted",
        "Flag",
      ],
      rows,
    });

    leadIds = leadIds.concat(inserted.map((row) => Number(row.Id)));
    summary.Leads += inserted.length;
  }

  let opportunityIds = await getIdsByCreatedBy(client, "Opportunities", userId);
  missing = Math.max(0, perUser - opportunityIds.length);
  if (missing > 0) {
    const rows = [];
    for (let index = 0; index < missing; index += 1) {
      const serial = opportunityIds.length + index + 1;
      const accountId = accountIds[index % accountIds.length] || null;
      const contactId = contactIds[index % contactIds.length] || null;
      rows.push([
        companyId,
        accountId,
        contactId,
        `SEED-OPP-U${userId}-${pad(serial, 4)}`,
        randomFrom(refs.salesStageIds),
        randomFrom(refs.leadSourceIds),
        randomFrom(refs.productCategoryIds),
        randomFrom(refs.industryIds),
        5000 + serial * 250,
        buildDate(14 + serial),
        `Seed opportunity ${serial} for user ${userId}`,
        `Qualification notes ${serial}`,
        randomFrom(OPPORTUNITY_STATUSES, "Prospecting"),
        userId,
        managerId,
        userId,
        userId,
        true,
        false,
        false,
      ]);
    }

    const inserted = await bulkInsert({
      client,
      table: "Opportunities",
      columns: [
        "CompanyId",
        "AccountId",
        "ContactId",
        "OpportunityName",
        "SalesStageId",
        "LeadSourceId",
        "ProductCategoryId",
        "IndustryId",
        "BudgetAmount",
        "EstCloseDate",
        "Description",
        "QualificationComments",
        "DetailedSummary",
        "AssignedTo",
        "AssignedFrom",
        "CreatedBy",
        "UpdatedBy",
        "IsActive",
        "IsDeleted",
        "Flag",
      ],
      rows,
    });

    opportunityIds = opportunityIds.concat(inserted.map((row) => Number(row.Id)));
    summary.Opportunities += inserted.length;
  }

  let presaleIds = await getIdsByCreatedBy(client, "Presales", userId);
  missing = Math.max(0, perUser - presaleIds.length);
  if (missing > 0) {
    const rows = [];
    for (let index = 0; index < missing; index += 1) {
      const serial = presaleIds.length + index + 1;
      const leadId = leadIds[index % leadIds.length] || null;
      const opportunityId = opportunityIds[index % opportunityIds.length] || null;
      rows.push([
        companyId,
        leadId,
        opportunityId,
        `Seed Client U${userId}-${serial}`,
        `Opportunity ${opportunityId || "NA"}`,
        buildDateTime(serial, 9),
        buildDateTime(serial, 12),
        buildDateTime(serial + 1, 18),
        120 + (serial % 60),
        randomFrom(PRESALES_STATUSES, "Pending"),
        randomFrom(HYPERSCALERS, "AWS"),
        "Follow-up Due",
        randomFrom(refs.taskTypeIds),
        [
          `https://docs.example.com/${options.seedPrefix}/u${userId}/presales-${serial}`,
        ],
        `Detailed summary for presales ${serial}`,
        `Presales description ${serial} for user ${userId}`,
        `Presales comment ${serial}`,
        userId,
        managerId,
        userId,
        userId,
        true,
        false,
        false,
      ]);
    }

    const inserted = await bulkInsert({
      client,
      table: "Presales",
      columns: [
        "CompanyId",
        "LeadId",
        "OpportunityId",
        "ClientName",
        "RelatedTo",
        "StartDate",
        "EndDate",
        "ETA",
        "DurationMinutes",
        "Status",
        "Hyperscaler",
        "FollowUpTriggerStatus",
        "TaskTypeId",
        "Documents",
        "DetailedSummary",
        "Description",
        "Comments",
        "AssignedTo",
        "AssignedFrom",
        "CreatedBy",
        "UpdatedBy",
        "IsActive",
        "IsDeleted",
        "Flag",
      ],
      rows,
    });

    presaleIds = presaleIds.concat(inserted.map((row) => Number(row.Id)));
    summary.Presales += inserted.length;
  }

  let caseIds = await getIdsByCreatedBy(client, "Cases", userId);
  missing = Math.max(0, perUser - caseIds.length);
  if (missing > 0) {
    const rows = [];
    for (let index = 0; index < missing; index += 1) {
      const serial = caseIds.length + index + 1;
      const accountId = accountIds[index % accountIds.length] || null;
      const contactId = contactIds[index % contactIds.length] || null;
      const leadId = leadIds[index % leadIds.length] || null;
      const opportunityId = opportunityIds[index % opportunityIds.length] || null;
      rows.push([
        companyId,
        accountId,
        contactId,
        leadId,
        opportunityId,
        `SEED CASE U${userId}-${pad(serial, 4)}`,
        randomFrom(CASE_STATUSES, "Open"),
        randomFrom(CASE_PRIORITIES, "Medium"),
        `Case description ${serial} for user ${userId}`,
        `Resolution in progress ${serial}`,
        userId,
        managerId,
        userId,
        userId,
        true,
        false,
        false,
      ]);
    }

    const inserted = await bulkInsert({
      client,
      table: "Cases",
      columns: [
        "CompanyId",
        "AccountId",
        "ContactId",
        "LeadId",
        "OpportunityId",
        "Subject",
        "Status",
        "Priority",
        "Description",
        "Resolution",
        "AssignedTo",
        "AssignedFrom",
        "CreatedBy",
        "UpdatedBy",
        "IsActive",
        "IsDeleted",
        "Flag",
      ],
      rows,
    });

    caseIds = caseIds.concat(inserted.map((row) => Number(row.Id)));
    summary.Cases += inserted.length;
  }

  let productIds = await getIdsByCreatedBy(client, "Products", userId);
  missing = Math.max(0, perUser - productIds.length);
  if (missing > 0) {
    const rows = [];
    for (let index = 0; index < missing; index += 1) {
      const serial = productIds.length + index + 1;
      const unique = nextUnique();
      rows.push([
        `SEED Product U${userId}-${pad(serial, 4)}`,
        `SPU${userId}${pad(serial, 4)}${unique}`,
        `Seed product ${serial} for user ${userId}`,
        randomFrom(refs.productCategoryIds),
        randomFrom(refs.unitIds),
        200 + serial * 3,
        130 + serial * 2,
        100 + (serial % 50),
        10,
        500,
        20,
        true,
        true,
        `BAR${userId}${serial}${unique}`,
        `SKU-${userId}-${serial}-${unique}`,
        `HSN${1000 + (serial % 8000)}`,
        18,
        serial % 5,
        companyId,
        userId,
        userId,
        true,
        false,
        false,
      ]);
    }

    const inserted = await bulkInsert({
      client,
      table: "Products",
      columns: [
        "ProductName",
        "ProductCode",
        "Description",
        "CategoryId",
        "UnitId",
        "Price",
        "Cost",
        "StockQuantity",
        "MinimumStock",
        "MaximumStock",
        "ReorderLevel",
        "NotifyStockOut",
        "NotifyStockReload",
        "Barcode",
        "SKU",
        "HSNCode",
        "TaxRate",
        "Discount",
        "CompanyId",
        "CreatedBy",
        "UpdatedBy",
        "IsActive",
        "Flag",
        "IsDelete",
      ],
      rows,
    });

    productIds = productIds.concat(inserted.map((row) => Number(row.Id)));
    summary.Products += inserted.length;
  }

  let opportunityProductIds = await getIdsByCreatedBy(client, "OpportunityProducts", userId);
  missing = Math.max(0, perUser - opportunityProductIds.length);
  if (missing > 0 && opportunityIds.length && productIds.length) {
    const rows = [];
    const existingPairs = await getOpportunityProductPairsByCreatedBy(client, userId);

    for (const opportunityId of opportunityIds) {
      if (rows.length >= missing) {
        break;
      }

      for (const productId of productIds) {
        if (rows.length >= missing) {
          break;
        }

        const key = `${opportunityId}:${productId}`;
        if (existingPairs.has(key)) {
          continue;
        }

        existingPairs.add(key);
        const serial = opportunityProductIds.length + rows.length + 1;
        rows.push([
          companyId,
          opportunityId,
          productId,
          1 + (serial % 5),
          200 + serial * 3,
          serial % 8,
          18,
          `Seed opportunity product ${serial} for user ${userId}`,
          userId,
          userId,
          true,
          false,
          false,
        ]);
      }
    }

    if (rows.length) {
      const inserted = await bulkInsert({
        client,
        table: "OpportunityProducts",
        columns: [
          "CompanyId",
          "OpportunityId",
          "ProductId",
          "Quantity",
          "UnitPrice",
          "DiscountPct",
          "TaxPct",
          "Notes",
          "CreatedBy",
          "UpdatedBy",
          "IsActive",
          "IsDeleted",
          "Flag",
        ],
        rows,
      });

      opportunityProductIds = opportunityProductIds.concat(inserted.map((row) => Number(row.Id)));
      summary.OpportunityProducts += inserted.length;
    }
  }

  let warehouseIds = await getIdsByCreatedBy(client, "Warehouses", userId);
  missing = Math.max(0, perUser - warehouseIds.length);
  if (missing > 0) {
    const rows = [];
    for (let index = 0; index < missing; index += 1) {
      const serial = warehouseIds.length + index + 1;
      const unique = nextUnique();
      rows.push([
        `SWH${userId}${pad(serial, 4)}${unique}`,
        `Seed Warehouse U${userId}-${pad(serial, 4)}`,
        `Zone ${serial % 10}`,
        `Warehouse Address ${serial}`,
        "Mumbai",
        "Maharashtra",
        "India",
        `400${pad(serial % 1000, 3)}`,
        `Contact ${pad(serial, 4)}`,
        `9${String(userId).padStart(3, "0")}${String(serial).padStart(6, "0")}`.slice(0, 10),
        `${options.seedPrefix}.wh.u${userId}.${serial}@${options.emailDomain}`,
        managerId,
        companyId,
        1000 + serial,
        "sqft",
        true,
        userId,
        userId,
      ]);
    }

    const inserted = await bulkInsert({
      client,
      table: "Warehouses",
      columns: [
        "WarehouseCode",
        "Name",
        "Location",
        "Address",
        "City",
        "State",
        "Country",
        "PinCode",
        "ContactPerson",
        "ContactPhone",
        "ContactEmail",
        "ManagerId",
        "CompanyId",
        "Capacity",
        "CapacityUnit",
        "IsActive",
        "CreatedBy",
        "UpdatedBy",
      ],
      rows,
    });

    warehouseIds = warehouseIds.concat(inserted.map((row) => Number(row.Id)));
    summary.Warehouses += inserted.length;
  }

  let supplierIds = await getIdsByCreatedBy(client, "Suppliers", userId);
  missing = Math.max(0, perUser - supplierIds.length);
  if (missing > 0) {
    const rows = [];
    for (let index = 0; index < missing; index += 1) {
      const serial = supplierIds.length + index + 1;
      rows.push([
        `SEED Supplier U${userId}-${pad(serial, 4)}`,
        `Supplier Contact ${pad(serial, 4)}`,
        `${options.seedPrefix}.supplier.u${userId}.${serial}.${nextUnique()}@${options.emailDomain}`,
        `8${String(userId).padStart(3, "0")}${String(serial).padStart(6, "0")}`.slice(0, 10),
        companyId,
        userId,
        `Supplier Address ${serial}`,
        "Mumbai",
        "Maharashtra",
        "India",
        `400${pad(serial % 1000, 3)}`,
        true,
      ]);
    }

    const inserted = await bulkInsert({
      client,
      table: "Suppliers",
      columns: [
        "Name",
        "ContactPerson",
        "Email",
        "Phone",
        "CompanyId",
        "CreatedBy",
        "Address",
        "City",
        "State",
        "Country",
        "PostalCode",
        "IsActive",
      ],
      rows,
    });

    supplierIds = supplierIds.concat(inserted.map((row) => Number(row.Id)));
    summary.Suppliers += inserted.length;
  }

  let customerIds = await getCustomersByUserTag(client, userId);
  missing = Math.max(0, perUser - customerIds.length);
  if (missing > 0) {
    const rows = [];
    for (let index = 0; index < missing; index += 1) {
      const serial = customerIds.length + index + 1;
      rows.push([
        null,
        `SEED-CUST-U${userId}-${pad(serial, 4)}`,
        `${options.seedPrefix}.customer.u${userId}.${serial}.${nextUnique()}@${options.emailDomain}`,
        `7${String(userId).padStart(3, "0")}${String(serial).padStart(6, "0")}`.slice(0, 10),
        `6${String(userId).padStart(3, "0")}${String(serial).padStart(6, "0")}`.slice(0, 10),
        `Customer Address ${serial}`,
        "Mumbai",
        "Maharashtra",
        "India",
        `400${pad(serial % 1000, 3)}`,
        `27ABCDE${pad(serial % 1000, 3)}1Z5`,
        `ABCDE${pad(serial % 10000, 4)}F`,
        randomFrom(CUSTOMER_TYPES, "Retail"),
        25000 + serial * 100,
        serial * 25,
        true,
        `Seed customer ${serial} for user ${userId}`,
        false,
      ]);
    }

    const inserted = await bulkInsert({
      client,
      table: "Customers",
      columns: [
        "CustomerCode",
        "Name",
        "Email",
        "Phone",
        "AlternatePhone",
        "Address",
        "City",
        "State",
        "Country",
        "PostalCode",
        "GSTNumber",
        "PANNumber",
        "CustomerType",
        "CreditLimit",
        "OutstandingBalance",
        "IsActive",
        "Notes",
        "IsDeleted",
      ],
      rows,
    });

    customerIds = customerIds.concat(inserted.map((row) => Number(row.Id)));
    summary.Customers += inserted.length;
  }

  let purchaseOrderIds = await getIdsByCreatedBy(client, "PurchaseOrders", userId);
  missing = Math.max(0, perUser - purchaseOrderIds.length);
  if (missing > 0) {
    const rows = [];
    for (let index = 0; index < missing; index += 1) {
      const serial = purchaseOrderIds.length + index + 1;
      const unique = nextUnique();
      rows.push([
        `PO-${userId}-${pad(serial, 5)}-${unique}`,
        supplierIds[index % supplierIds.length] || null,
        buildDateTime(-1 * (serial % 5), 9),
        buildDateTime(3 + (serial % 10), 10),
        null,
        randomFrom(PO_STATUSES, "Draft"),
        4000 + serial * 150,
        `PO note ${serial}`,
        companyId,
        userId,
      ]);
    }

    const inserted = await bulkInsert({
      client,
      table: "PurchaseOrders",
      columns: [
        "PONumber",
        "SupplierId",
        "OrderDate",
        "ExpectedDeliveryDate",
        "ReceivedDate",
        "Status",
        "TotalAmount",
        "Notes",
        "CompanyId",
        "CreatedBy",
      ],
      rows,
    });

    purchaseOrderIds = purchaseOrderIds.concat(inserted.map((row) => Number(row.Id)));
    summary.PurchaseOrders += inserted.length;
  }

  let salesOrderIds = await getIdsByCreatedBy(client, "SalesOrders", userId);
  missing = Math.max(0, perUser - salesOrderIds.length);
  if (missing > 0) {
    const rows = [];
    for (let index = 0; index < missing; index += 1) {
      const serial = salesOrderIds.length + index + 1;
      const unique = nextUnique();
      const totalAmount = 5000 + serial * 175;
      const taxAmount = Math.round(totalAmount * 0.18 * 100) / 100;
      const discountAmount = serial % 7 === 0 ? 150 : 50;
      const netAmount = totalAmount + taxAmount - discountAmount;
      const paidAmount = serial % 3 === 0 ? netAmount : netAmount / 2;
      const balanceAmount = netAmount - paidAmount;
      rows.push([
        `SO-${userId}-${pad(serial, 5)}-${unique}`,
        customerIds[index % customerIds.length] || null,
        null,
        buildDate(-1 * (serial % 7)),
        buildDate(7 + (serial % 12)),
        randomFrom(SO_STATUSES, "Draft"),
        randomFrom(SO_PRIORITIES, "Normal"),
        totalAmount,
        taxAmount,
        discountAmount,
        netAmount,
        paidAmount,
        balanceAmount,
        randomFrom(SO_PAYMENT_STATUSES, "Pending"),
        "Bank Transfer",
        `Shipping address ${serial}`,
        `Billing address ${serial}`,
        `SO note ${serial}`,
        `Internal note ${serial}`,
        companyId,
        userId,
        userId,
        false,
      ]);
    }

    const inserted = await bulkInsert({
      client,
      table: "SalesOrders",
      columns: [
        "SONumber",
        "CustomerId",
        "CustomerName",
        "OrderDate",
        "ExpectedDeliveryDate",
        "Status",
        "Priority",
        "TotalAmount",
        "TaxAmount",
        "DiscountAmount",
        "NetAmount",
        "PaidAmount",
        "BalanceAmount",
        "PaymentStatus",
        "PaymentMethod",
        "ShippingAddress",
        "BillingAddress",
        "Notes",
        "InternalNotes",
        "CompanyId",
        "CreatedBy",
        "UpdatedBy",
        "IsDeleted",
      ],
      rows,
    });

    salesOrderIds = salesOrderIds.concat(inserted.map((row) => Number(row.Id)));
    summary.SalesOrders += inserted.length;
  }

  const stockRows = await getStockRowsByCreator(client, userId);
  missing = Math.max(0, perUser - stockRows.length);
  if (missing > 0) {
    const existingPairs = new Set(stockRows.map((row) => `${row.productId}:${row.warehouseId}`));
    const rows = [];

    for (const productId of productIds) {
      if (rows.length >= missing) {
        break;
      }
      for (const warehouseId of warehouseIds) {
        if (rows.length >= missing) {
          break;
        }
        const key = `${productId}:${warehouseId}`;
        if (existingPairs.has(key)) {
          continue;
        }
        existingPairs.add(key);
        const serial = stockRows.length + rows.length + 1;
        rows.push([
          productId,
          warehouseId,
          40 + (serial % 120),
          serial % 10,
          10,
          600,
          20,
          buildDateTime(-1 * (serial % 15), 7),
          true,
          userId,
          userId,
        ]);
      }
    }

    if (rows.length) {
      const inserted = await bulkInsert({
        client,
        table: "ProductStockPerWarehouse",
        columns: [
          "ProductId",
          "WarehouseId",
          "Quantity",
          "ReservedQuantity",
          "MinimumStock",
          "MaximumStock",
          "ReorderLevel",
          "LastRestocked",
          "IsActive",
          "CreatedBy",
          "UpdatedBy",
        ],
        rows,
      });
      summary.ProductStockPerWarehouse += inserted.length;
    }
  }

  let stockMovementIds = await getIdsByCreatedBy(client, "StockMovements", userId);
  missing = Math.max(0, perUser - stockMovementIds.length);
  if (missing > 0) {
    const rows = [];
    for (let index = 0; index < missing; index += 1) {
      const serial = stockMovementIds.length + index + 1;
      rows.push([
        productIds[index % productIds.length] || null,
        warehouseIds[index % warehouseIds.length] || null,
        randomFrom(STOCK_MOVEMENT_TYPES, "IN"),
        1 + (serial % 25),
        `Seed stock movement ${serial} for user ${userId}`,
        userId,
      ]);
    }

    const inserted = await bulkInsert({
      client,
      table: "StockMovements",
      columns: [
        "ProductId",
        "WarehouseId",
        "ChangeType",
        "Quantity",
        "Reason",
        "CreatedBy",
      ],
      rows,
    });

    stockMovementIds = stockMovementIds.concat(inserted.map((row) => Number(row.Id)));
    summary.StockMovements += inserted.length;
  }

  let purchaseOrderItemCount = await getItemCountByCreator(
    client,
    "PurchaseOrderItems",
    'INNER JOIN "PurchaseOrders" p ON p."Id" = i."PurchaseOrderId"',
    userId
  );
  missing = Math.max(0, perUser - purchaseOrderItemCount);
  if (missing > 0) {
    const rows = [];
    for (let index = 0; index < missing; index += 1) {
      const serial = purchaseOrderItemCount + index + 1;
      const quantity = 5 + (serial % 20);
      const unitCost = 90 + serial * 2;
      rows.push([
        purchaseOrderIds[index % purchaseOrderIds.length] || null,
        productIds[index % productIds.length] || null,
        quantity,
        unitCost,
        quantity % 4,
        `Seed PO item ${serial} for user ${userId}`,
      ]);
    }

    const inserted = await bulkInsert({
      client,
      table: "PurchaseOrderItems",
      columns: [
        "PurchaseOrderId",
        "ProductId",
        "Quantity",
        "UnitCost",
        "ReceivedQuantity",
        "Notes",
      ],
      rows,
    });

    purchaseOrderItemCount += inserted.length;
    summary.PurchaseOrderItems += inserted.length;
  }

  let salesOrderItemCount = await getItemCountByCreator(
    client,
    "SalesOrderItems",
    'INNER JOIN "SalesOrders" p ON p."Id" = i."SalesOrderId"',
    userId
  );
  missing = Math.max(0, perUser - salesOrderItemCount);
  if (missing > 0) {
    const rows = [];
    for (let index = 0; index < missing; index += 1) {
      const serial = salesOrderItemCount + index + 1;
      rows.push([
        salesOrderIds[index % salesOrderIds.length] || null,
        productIds[index % productIds.length] || null,
        1 + (serial % 15),
        150 + serial * 3,
      ]);
    }

    const inserted = await bulkInsert({
      client,
      table: "SalesOrderItems",
      columns: ["SalesOrderId", "ProductId", "Quantity", "UnitPrice"],
      rows,
    });

    salesOrderItemCount += inserted.length;
    summary.SalesOrderItems += inserted.length;
  }
};

const buildDate = (daysOffset = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().slice(0, 10);
};

const buildDateTime = (daysOffset = 0, hour = 10) => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};

const getStockRowsByCreator = async (client, createdBy) => {
  const { rows } = await client.query(
    `
      SELECT "Id", "ProductId", "WarehouseId"
      FROM "ProductStockPerWarehouse"
      WHERE "CreatedBy" = $1
      ORDER BY "Id";
    `,
    [createdBy]
  );

  return rows.map((row) => ({
    id: Number(row.Id),
    productId: Number(row.ProductId),
    warehouseId: Number(row.WarehouseId),
  }));
};

const getCountMapByCreatedBy = async (client, table, userIds, whereClause = "") => {
  const { rows } = await client.query(
    `
      SELECT "CreatedBy" AS "UserId", COUNT(*)::int AS count
      FROM "${table}"
      WHERE "CreatedBy" = ANY($1::int[])
      ${whereClause ? `AND ${whereClause}` : ""}
      GROUP BY "CreatedBy";
    `,
    [userIds]
  );

  return new Map(rows.map((row) => [Number(row.UserId), Number(row.count)]));
};

const getCustomerCountMapBySeedTag = async (client, userIds) => {
  const { rows } = await client.query(`
    SELECT
      substring("Name" from '^SEED-CUST-U([0-9]+)-')::int AS "UserId",
      COUNT(*)::int AS count
    FROM "Customers"
    WHERE "Name" ~ '^SEED-CUST-U[0-9]+-'
    AND COALESCE("IsDeleted", FALSE) = FALSE
    GROUP BY 1;
  `);

  const allowed = new Set(userIds.map((userId) => Number(userId)));
  const map = new Map();
  for (const row of rows) {
    const userId = Number(row.UserId);
    if (allowed.has(userId)) {
      map.set(userId, Number(row.count));
    }
  }
  return map;
};

const getItemCountMapByCreator = async ({ client, itemTable, joinTable, joinColumn, userIds }) => {
  const { rows } = await client.query(
    `
      SELECT p."CreatedBy" AS "UserId", COUNT(i."Id")::int AS count
      FROM "${itemTable}" i
      INNER JOIN "${joinTable}" p ON p."Id" = i."${joinColumn}"
      WHERE p."CreatedBy" = ANY($1::int[])
      GROUP BY p."CreatedBy";
    `,
    [userIds]
  );

  return new Map(rows.map((row) => [Number(row.UserId), Number(row.count)]));
};

const verifyUserDataMinimums = async ({ client, users, perUser }) => {
  const userIds = users.map((user) => user.userId);
  const emptyMap = new Map();

  const [
    accounts,
    contacts,
    leads,
    opportunities,
    presales,
    cases,
    products,
    opportunityProducts,
    warehouses,
    suppliers,
    purchaseOrders,
    salesOrders,
    productStock,
    stockMovements,
    customers,
    purchaseOrderItems,
    salesOrderItems,
  ] = await Promise.all([
    getCountMapByCreatedBy(client, "Accounts", userIds),
    getCountMapByCreatedBy(client, "Contacts", userIds),
    getCountMapByCreatedBy(client, "Leads", userIds),
    getCountMapByCreatedBy(client, "Opportunities", userIds),
    getCountMapByCreatedBy(client, "Presales", userIds),
    getCountMapByCreatedBy(client, "Cases", userIds),
    getCountMapByCreatedBy(client, "Products", userIds, 'COALESCE("IsDelete", FALSE) = FALSE'),
    getCountMapByCreatedBy(client, "OpportunityProducts", userIds, 'COALESCE("IsDeleted", FALSE) = FALSE'),
    getCountMapByCreatedBy(client, "Warehouses", userIds),
    getCountMapByCreatedBy(client, "Suppliers", userIds),
    getCountMapByCreatedBy(client, "PurchaseOrders", userIds),
    getCountMapByCreatedBy(client, "SalesOrders", userIds, 'COALESCE("IsDeleted", FALSE) = FALSE'),
    getCountMapByCreatedBy(client, "ProductStockPerWarehouse", userIds),
    getCountMapByCreatedBy(client, "StockMovements", userIds),
    getCustomerCountMapBySeedTag(client, userIds),
    getItemCountMapByCreator({
      client,
      itemTable: "PurchaseOrderItems",
      joinTable: "PurchaseOrders",
      joinColumn: "PurchaseOrderId",
      userIds,
    }),
    getItemCountMapByCreator({
      client,
      itemTable: "SalesOrderItems",
      joinTable: "SalesOrders",
      joinColumn: "SalesOrderId",
      userIds,
    }),
  ]);

  const countsByTable = {
    Accounts: accounts || emptyMap,
    Contacts: contacts || emptyMap,
    Leads: leads || emptyMap,
    Opportunities: opportunities || emptyMap,
    Presales: presales || emptyMap,
    Cases: cases || emptyMap,
    Products: products || emptyMap,
    OpportunityProducts: opportunityProducts || emptyMap,
    Warehouses: warehouses || emptyMap,
    Suppliers: suppliers || emptyMap,
    Customers: customers || emptyMap,
    PurchaseOrders: purchaseOrders || emptyMap,
    SalesOrders: salesOrders || emptyMap,
    ProductStockPerWarehouse: productStock || emptyMap,
    StockMovements: stockMovements || emptyMap,
    PurchaseOrderItems: purchaseOrderItems || emptyMap,
    SalesOrderItems: salesOrderItems || emptyMap,
  };

  const tableKeys = Object.keys(countsByTable);
  const perUserCounts = users.map((user) => {
    const row = {
      userId: user.userId,
      roleId: user.roleId,
      managerId: user.reportingManagerId,
    };

    for (const tableKey of tableKeys) {
      row[tableKey] = countsByTable[tableKey].get(user.userId) || 0;
    }

    return row;
  });

  const usersBelowTarget = perUserCounts
    .filter((row) => tableKeys.some((tableKey) => row[tableKey] < perUser))
    .map((row) => ({
      userId: row.userId,
      roleId: row.roleId,
      managerId: row.managerId,
      failingTables: tableKeys.filter((tableKey) => row[tableKey] < perUser),
    }));

  const minimumsByTable = tableKeys.reduce((accumulator, tableKey) => {
    let minValue = Number.POSITIVE_INFINITY;
    for (const row of perUserCounts) {
      minValue = Math.min(minValue, row[tableKey]);
    }
    accumulator[tableKey] = Number.isFinite(minValue) ? minValue : 0;
    return accumulator;
  }, {});

  return {
    perUserCounts,
    minimumsByTable,
    usersBelowTarget,
  };
};

const run = async () => {
  const options = buildOptions();
  await initModels();
  const client = await appPool.connect();

  const summary = {
    Users: 0,
    Accounts: 0,
    Contacts: 0,
    Leads: 0,
    Opportunities: 0,
    Presales: 0,
    Cases: 0,
    Products: 0,
    OpportunityProducts: 0,
    Warehouses: 0,
    Suppliers: 0,
    Customers: 0,
    PurchaseOrders: 0,
    SalesOrders: 0,
    ProductStockPerWarehouse: 0,
    StockMovements: 0,
    PurchaseOrderItems: 0,
    SalesOrderItems: 0,
    ApiExecutionLogs: 0,
    ApiFailureAlerts: 0,
    Notifications: 0,
  };

  try {
    await client.query("BEGIN");

    await ensureRoles(client);
    await ensureUserTypes(client);
    if (options.resetSeedCompany) {
      const deleted = await resetSeedCompanyData(client, options);
      if (deleted) {
        console.log(`Reset existing seeded company for prefix ${options.seedPrefix}`);
      }
    }
    const companyId = await ensureSeedCompany(client, options);

    const { users, createdUsers } = await ensureSeedUsers({
      client,
      options,
      companyId,
    });
    summary.Users = createdUsers;

    const actorUserId = users[0]?.userId;
    const refs = await ensureReferenceData({ client, actorUserId });
    const apiRefs = await ensureApiMonitoringReferenceData({ client, companyId });

    for (let index = 0; index < users.length; index += 1) {
      const user = users[index];
      await seedUserDataVolume({
        client,
        user,
        refs,
        options,
        summary,
      });

      if ((index + 1) % 10 === 0 || index + 1 === users.length) {
        console.log(`Progress: seeded ${index + 1}/${users.length} users`);
      }
    }

    await seedApiMonitoringVolume({
      client,
      users,
      refs: apiRefs,
      options,
      summary,
    });

    const verification = await verifyUserDataMinimums({
      client,
      users,
      perUser: options.perUser,
    });

    await client.query("COMMIT");

    console.log("\nSeed completed.");
    console.log("\nInserted rows in this run:");
    console.table(summary);

    console.log("\nMinimum records per user by table (target:", options.perUser, "):");
    console.table([verification.minimumsByTable]);

    if (verification.usersBelowTarget.length) {
      console.warn(`\nUsers below target: ${verification.usersBelowTarget.length}/${users.length}`);
      console.table(
        verification.usersBelowTarget.slice(0, 20).map((row) => ({
          userId: row.userId,
          roleId: row.roleId,
          managerId: row.managerId,
          failingTables: row.failingTables.join(", "),
        }))
      );
    } else {
      console.log("\nAll users meet or exceed the per-table target.");
    }

    console.log("\nSample login credentials:");
    const sampleUsers = users.slice(0, Math.min(10, users.length)).map((user) => ({
      userId: user.userId,
      roleId: user.roleId,
      managerId: user.reportingManagerId,
      email: user.email,
      password:
        options.superAdminEmail &&
        user.email.toLowerCase() === options.superAdminEmail.toLowerCase()
          ? options.superAdminPassword || options.password
          : options.password,
    }));
    console.table(sampleUsers);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Seed failed. Transaction rolled back.");
    console.error(error);
    process.exitCode = 1;
  } finally {
    client.release();
    await appPool.end();
  }
};

run();
