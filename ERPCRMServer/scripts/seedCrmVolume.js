const { appPool } = require("../config/db");

const TARGETS = {
  Accounts: 10,
  Contacts: 10,
  Leads: 15,
  Opportunities: 10,
  Presales: 10,
  Cases: 5,
};

const LEAD_STATUSES = ["New", "Qualified", "Disqualified"];
const OPPORTUNITY_STAGES = ["Prospecting", "Qualification", "Needs Analysis", "Proposal", "Negotiation"];
const PRESALES_STATUSES = ["Pending", "In Progress", "Completed"];
const CASE_STATUSES = ["Open", "In Progress", "Resolved"];
const CASE_PRIORITIES = ["Low", "Medium", "High"];
const HYPERSCALERS = ["AWS", "Azure", "GCP"];

const randomFrom = (items, fallback = null) =>
  items.length ? items[Math.floor(Math.random() * items.length)] : fallback;

const getCountMap = async (tableName) => {
  const { rows } = await appPool.query(`
    SELECT "CreatedBy", COUNT(*)::int AS count
    FROM "${tableName}"
    GROUP BY "CreatedBy"
  `);

  return new Map(rows.map((row) => [Number(row.CreatedBy), row.count]));
};

const getIdsByCreatedBy = async (tableName) => {
  const { rows } = await appPool.query(`
    SELECT "Id", "CreatedBy"
    FROM "${tableName}"
    ORDER BY "Id"
  `);

  const map = new Map();
  for (const row of rows) {
    const userId = Number(row.CreatedBy);
    if (!map.has(userId)) {
      map.set(userId, []);
    }
    map.get(userId).push(Number(row.Id));
  }

  return map;
};

const buildDate = (daysOffset, hour = 10) => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};

async function main() {
  const usersResult = await appPool.query(`
    SELECT "UserId", "Name", "CompanyId", "ReportingManagerId"
    FROM "Users"
    WHERE "IsDelete" = FALSE
    ORDER BY "UserId"
  `);

  const users = usersResult.rows;

  const [
    industries,
    leadSources,
    followupTypes,
    salesStages,
    taskTypes,
    productCategories,
    accountCounts,
    contactCounts,
    leadCounts,
    opportunityCounts,
    presalesCounts,
    caseCounts,
    accountsByUser,
    contactsByUser,
    leadsByUser,
    oppsByUser,
  ] = await Promise.all([
    appPool.query(`SELECT "Id" FROM "Industries" WHERE COALESCE("IsDeleted", FALSE) = FALSE ORDER BY "Id"`),
    appPool.query(`SELECT "Id" FROM "LeadSources" WHERE COALESCE("IsDeleted", FALSE) = FALSE ORDER BY "Id"`),
    appPool.query(`SELECT "Id" FROM "FollowupTypes" WHERE COALESCE("IsDeleted", FALSE) = FALSE ORDER BY "Id"`),
    appPool.query(`SELECT "Id" FROM "SalesStages" WHERE COALESCE("IsDeleted", FALSE) = FALSE ORDER BY "Id"`),
    appPool.query(`SELECT "Id" FROM "TaskTypes" WHERE COALESCE("IsDeleted", FALSE) = FALSE ORDER BY "Id"`),
    appPool.query(`SELECT "Id" FROM "ProductCategories" WHERE "CategoryName" NOT LIKE 'DELETED_%' ORDER BY "Id"`),
    getCountMap("Accounts"),
    getCountMap("Contacts"),
    getCountMap("Leads"),
    getCountMap("Opportunities"),
    getCountMap("Presales"),
    getCountMap("Cases"),
    getIdsByCreatedBy("Accounts"),
    getIdsByCreatedBy("Contacts"),
    getIdsByCreatedBy("Leads"),
    getIdsByCreatedBy("Opportunities"),
  ]);

  const industryIds = industries.rows.map((row) => Number(row.Id));
  const leadSourceIds = leadSources.rows.map((row) => Number(row.Id));
  const followupTypeIds = followupTypes.rows.map((row) => Number(row.Id));
  const salesStageIds = salesStages.rows.map((row) => Number(row.Id));
  const taskTypeIds = taskTypes.rows.map((row) => Number(row.Id));
  const productCategoryIds = productCategories.rows.map((row) => Number(row.Id));

  const summary = {
    accounts: 0,
    contacts: 0,
    leads: 0,
    opportunities: 0,
    presales: 0,
    cases: 0,
  };

  await appPool.query("BEGIN");
  try {
    for (const user of users) {
      const userId = Number(user.UserId);
      const companyId = Number(user.CompanyId);
      const managerId = user.ReportingManagerId ? Number(user.ReportingManagerId) : null;

      if (!accountsByUser.has(userId)) accountsByUser.set(userId, []);
      if (!contactsByUser.has(userId)) contactsByUser.set(userId, []);
      if (!leadsByUser.has(userId)) leadsByUser.set(userId, []);
      if (!oppsByUser.has(userId)) oppsByUser.set(userId, []);

      const missingAccounts = Math.max(0, TARGETS.Accounts - (accountCounts.get(userId) || 0));
      for (let i = 0; i < missingAccounts; i += 1) {
        const { rows } = await appPool.query(
          `
            INSERT INTO "Accounts" (
              "CompanyId", "Name", "Website", "Description", "IndustryId",
              "CreatedBy", "IsActive", "IsDeleted", "Flag"
            )
            VALUES ($1,$2,$3,$4,$5,$6,TRUE,FALSE,FALSE)
            RETURNING "Id";
          `,
          [
            companyId,
            `Seed Account U${userId}-${i + 1}`,
            `https://u${userId}-account${i + 1}.example.com`,
            `Seeded account ${i + 1} for user ${userId}`,
            randomFrom(industryIds),
            userId,
          ]
        );
        accountsByUser.get(userId).push(Number(rows[0].Id));
        summary.accounts += 1;
      }

      const missingContacts = Math.max(0, TARGETS.Contacts - (contactCounts.get(userId) || 0));
      for (let i = 0; i < missingContacts; i += 1) {
        const accountId = randomFrom(accountsByUser.get(userId));
        const { rows } = await appPool.query(
          `
            INSERT INTO "Contacts" (
              "CompanyId", "AccountId", "FirstName", "LastName", "Email", "Phone",
              "Title", "CreatedBy", "IsActive", "IsDeleted", "Flag"
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE,FALSE,FALSE)
            RETURNING "Id";
          `,
          [
            companyId,
            accountId,
            `Contact${i + 1}`,
            `User${userId}`,
            `seed.contact.u${userId}.${i + 1}@example.com`,
            `91${String(userId).padStart(3, "0")}${String(i + 1).padStart(5, "0")}`.slice(0, 12),
            "Decision Maker",
            userId,
          ]
        );
        contactsByUser.get(userId).push(Number(rows[0].Id));
        summary.contacts += 1;
      }

      const missingLeads = Math.max(0, TARGETS.Leads - (leadCounts.get(userId) || 0));
      for (let i = 0; i < missingLeads; i += 1) {
        const accountId = randomFrom(accountsByUser.get(userId));
        const contactId = randomFrom(contactsByUser.get(userId));
        const { rows } = await appPool.query(
          `
            INSERT INTO "Leads" (
              "CompanyId", "AccountId", "ContactId", "LeadSourceId", "ProductCategoryId",
              "FollowupTypeId", "IndustryId", "Status", "Rating", "Description", "Comments",
              "AssignedTo", "AssignedFrom", "CreatedBy", "IsActive", "IsDeleted", "Flag"
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,TRUE,FALSE,FALSE)
            RETURNING "Id";
          `,
          [
            companyId,
            accountId,
            contactId,
            randomFrom(leadSourceIds),
            randomFrom(productCategoryIds),
            randomFrom(followupTypeIds),
            randomFrom(industryIds),
            randomFrom(LEAD_STATUSES, "New"),
            (i % 5) + 1,
            `Seed lead ${i + 1} for user ${userId}`,
            `Qualification note ${i + 1}`,
            userId,
            managerId,
            userId,
          ]
        );
        leadsByUser.get(userId).push(Number(rows[0].Id));
        summary.leads += 1;
      }

      const missingOpps = Math.max(0, TARGETS.Opportunities - (opportunityCounts.get(userId) || 0));
      for (let i = 0; i < missingOpps; i += 1) {
        const accountId = randomFrom(accountsByUser.get(userId));
        const contactId = randomFrom(contactsByUser.get(userId));
        await appPool.query(
          `
            INSERT INTO "Opportunities" (
              "CompanyId", "AccountId", "ContactId", "OpportunityName", "SalesStageId",
              "LeadSourceId", "ProductCategoryId", "IndustryId", "BudgetAmount", "EstCloseDate",
              "Description", "QualificationComments", "DetailedSummary",
              "AssignedTo", "AssignedFrom", "CreatedBy", "IsActive", "IsDeleted", "Flag"
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,TRUE,FALSE,FALSE)
            RETURNING "Id";
          `,
          [
            companyId,
            accountId,
            contactId,
            `Seed Opportunity U${userId}-${i + 1}`,
            randomFrom(salesStageIds),
            randomFrom(leadSourceIds),
            randomFrom(productCategoryIds),
            randomFrom(industryIds),
            5000 + i * 750,
            buildDate(7 + i, 12).slice(0, 10),
            `Seed opportunity ${i + 1} for user ${userId}`,
            `Qualification comments ${i + 1}`,
            randomFrom(OPPORTUNITY_STAGES),
            userId,
            managerId,
            userId,
          ]
        ).then(({ rows }) => {
          oppsByUser.get(userId).push(Number(rows[0].Id));
          summary.opportunities += 1;
        });
      }

      const missingPresales = Math.max(0, TARGETS.Presales - (presalesCounts.get(userId) || 0));
      for (let i = 0; i < missingPresales; i += 1) {
        const leadId = randomFrom(leadsByUser.get(userId));
        const opportunityId = randomFrom(oppsByUser.get(userId));
        await appPool.query(
          `
            INSERT INTO "Presales" (
              "CompanyId", "LeadId", "OpportunityId", "ClientName", "RelatedTo",
              "StartDate", "EndDate", "ETA", "DurationMinutes", "Status", "Hyperscaler",
              "FollowUpTriggerStatus", "TaskTypeId", "DetailedSummary", "Description", "Comments",
              "AssignedTo", "AssignedFrom", "CreatedBy", "IsActive", "IsDeleted", "Flag"
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,TRUE,FALSE,FALSE);
          `,
          [
            companyId,
            leadId,
            opportunityId,
            `${user.Name} Client ${i + 1}`,
            `Opportunity ${opportunityId || "N/A"}`,
            buildDate(i, 10),
            buildDate(i, 11),
            buildDate(i + 1, 16),
            60 + (i % 3) * 30,
            randomFrom(PRESALES_STATUSES, "Pending"),
            randomFrom(HYPERSCALERS),
            "Open",
            randomFrom(taskTypeIds),
            `Detailed summary ${i + 1} for user ${userId}`,
            `Presales description ${i + 1}`,
            `Presales comments ${i + 1}`,
            userId,
            managerId,
            userId,
          ]
        );
        summary.presales += 1;
      }

      const missingCases = Math.max(0, TARGETS.Cases - (caseCounts.get(userId) || 0));
      for (let i = 0; i < missingCases; i += 1) {
        const accountId = randomFrom(accountsByUser.get(userId));
        const contactId = randomFrom(contactsByUser.get(userId));
        const leadId = randomFrom(leadsByUser.get(userId));
        const opportunityId = randomFrom(oppsByUser.get(userId));
        await appPool.query(
          `
            INSERT INTO "Cases" (
              "CompanyId", "AccountId", "ContactId", "LeadId", "OpportunityId", "Subject",
              "Status", "Priority", "Description", "Resolution", "AssignedTo", "AssignedFrom",
              "CreatedBy", "IsActive", "IsDeleted", "Flag"
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,TRUE,FALSE,FALSE);
          `,
          [
            companyId,
            accountId,
            contactId,
            leadId,
            opportunityId,
            `Seed Case U${userId}-${i + 1}`,
            randomFrom(CASE_STATUSES, "Open"),
            randomFrom(CASE_PRIORITIES, "Medium"),
            `Case description ${i + 1} for user ${userId}`,
            `Resolution note ${i + 1}`,
            userId,
            managerId,
            userId,
          ]
        );
        summary.cases += 1;
      }
    }

    await appPool.query("COMMIT");
  } catch (error) {
    await appPool.query("ROLLBACK");
    throw error;
  }

  const finalCounts = {};
  for (const table of ["Accounts", "Contacts", "Leads", "Opportunities", "Presales", "Cases"]) {
    finalCounts[table] = (
      await appPool.query(`SELECT COUNT(*)::int AS count FROM "${table}"`)
    ).rows[0].count;
  }

  console.log(
    JSON.stringify(
      {
        created: summary,
        finalCounts,
        perUserTargetTotal: Object.values(TARGETS).reduce((sum, value) => sum + value, 0),
      },
      null,
      2
    )
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
