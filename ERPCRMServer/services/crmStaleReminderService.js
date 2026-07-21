const { appPool } = require("../config/db");

const STALE_DAYS = 8;
const SCHEDULER_INTERVAL_MS = 12 * 60 * 60 * 1000;

const schedulerState = {
  timer: null,
  lastCheckKey: null,
  running: false,
};

const CRM_STALE_MODULES = [
  {
    entityType: "Lead",
    tableName: "Leads",
    alias: "l",
    titleExpression: `COALESCE(a."Name", 'Lead #' || l."Id"::text)`,
    statusExpression: `COALESCE(NULLIF(l."Status", ''), 'New')`,
    joins: `
      LEFT JOIN "Accounts" a ON a."Id" = l."AccountId"
    `,
    recipientColumns: ["CreatedBy", "AssignedTo", "AssignedFrom"],
  },
  {
    entityType: "Opportunity",
    tableName: "Opportunities",
    alias: "o",
    titleExpression: `COALESCE(NULLIF(o."OpportunityName", ''), 'Opportunity #' || o."Id"::text)`,
    statusExpression: `COALESCE(NULLIF(ss."Name", ''), 'Open')`,
    joins: `
      LEFT JOIN "SalesStages" ss ON ss."Id" = o."SalesStageId"
    `,
    recipientColumns: ["CreatedBy", "AssignedTo", "AssignedFrom"],
  },
  {
    entityType: "Presale",
    tableName: "Presales",
    alias: "p",
    titleExpression: `COALESCE(NULLIF(p."ClientName", ''), 'Presale #' || p."Id"::text)`,
    statusExpression: `COALESCE(NULLIF(p."Status", ''), 'Pending')`,
    joins: "",
    recipientColumns: ["CreatedBy", "AssignedTo", "AssignedFrom"],
  },
  {
    entityType: "Activity",
    tableName: "Activities",
    alias: "ac",
    titleExpression: `COALESCE(NULLIF(ac."Subject", ''), 'Activity #' || ac."Id"::text)`,
    statusExpression: `COALESCE(NULLIF(ac."Status", ''), 'Open')`,
    joins: "",
    recipientColumns: ["CreatedBy", "AssignedTo"],
  },
  {
    entityType: "Case",
    tableName: "Cases",
    alias: "cs",
    titleExpression: `COALESCE(NULLIF(cs."Subject", ''), 'Case #' || cs."Id"::text)`,
    statusExpression: `COALESCE(NULLIF(cs."Status", ''), 'Open')`,
    joins: "",
    recipientColumns: ["CreatedBy", "AssignedTo", "AssignedFrom"],
  },
];

const toDateKey = (date = new Date()) => {
  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString().slice(0, 10);
};

const formatDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value || "");
  }
  return date.toISOString().slice(0, 10);
};

const normalizeUserIds = (values) =>
  [...new Set(
    values
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0)
  )];

const getCompanyAdminRecipients = async (client, companyId) => {
  const { rows } = await client.query(
    `
      SELECT u."UserId"
      FROM "Users" u
      LEFT JOIN "Roles" r ON r."Id" = u."RoleId"
      WHERE u."CompanyId" = $1
        AND u."IsDelete" = FALSE
        AND u."IsActive" = TRUE
        AND LOWER(COALESCE(r."RoleName", '')) IN ('admin', 'company owner', 'super admin');
    `,
    [companyId]
  );

  return normalizeUserIds(rows.map((row) => row.UserId));
};

const fetchStaleRowsForModule = async (client, module) => {
  const recipientSelect = module.recipientColumns
    .map((column) => `${module.alias}."${column}"`)
    .join(", ");

  const { rows } = await client.query(
    `
      SELECT
        ${module.alias}."Id",
        ${module.alias}."CompanyId",
        ${module.alias}."CreatedAt",
        ${module.alias}."UpdatedAt",
        ${recipientSelect},
        ${module.titleExpression} AS "RecordTitle",
        ${module.statusExpression} AS "RecordStatus",
        GREATEST(
          COALESCE(${module.alias}."UpdatedAt", ${module.alias}."CreatedAt"),
          COALESCE(audit_log."LastAuditAt", ${module.alias}."CreatedAt"),
          COALESCE(comment_log."LastCommentAt", ${module.alias}."CreatedAt")
        ) AS "LastActivityAt"
      FROM "${module.tableName}" ${module.alias}
      ${module.joins}
      LEFT JOIN LATERAL (
        SELECT MAX(ae."CreatedAt") AS "LastAuditAt"
        FROM "AuditEvents" ae
        WHERE ae."EntityType" = $1
          AND ae."EntityId" = ${module.alias}."Id"
          AND ae."CompanyId" = ${module.alias}."CompanyId"
      ) audit_log ON TRUE
      LEFT JOIN LATERAL (
        SELECT MAX(c."CreatedAt") AS "LastCommentAt"
        FROM "Comments" c
        WHERE c."EntityType" = $1
          AND c."EntityId" = ${module.alias}."Id"
      ) comment_log ON TRUE
      WHERE ${module.alias}."IsDeleted" = FALSE
        AND ${module.alias}."CreatedAt" <= NOW() - INTERVAL '${STALE_DAYS} days'
        AND GREATEST(
          COALESCE(${module.alias}."UpdatedAt", ${module.alias}."CreatedAt"),
          COALESCE(audit_log."LastAuditAt", ${module.alias}."CreatedAt"),
          COALESCE(comment_log."LastCommentAt", ${module.alias}."CreatedAt")
        ) <= NOW() - INTERVAL '${STALE_DAYS} days'
      ORDER BY "LastActivityAt" ASC;
    `,
    [module.entityType]
  );

  return rows;
};

const createNotificationIfMissing = async ({ client, companyId, userId, title, message, entityType, entityId }) => {
  if (!Number.isInteger(Number(userId)) || Number(userId) <= 0) {
    return 0;
  }

  const existingNotification = await client.query(
    `
      SELECT 1
      FROM "Notifications" n
      WHERE n."CompanyId" = $1
        AND n."UserId" = $2
        AND n."Type" = 'CRM_STALE_RECORD'
        AND n."EntityType" = $3
        AND n."EntityId" = $4
        AND n."IsRead" = FALSE
      LIMIT 1;
    `,
    [companyId, userId, entityType, entityId]
  );

  if (existingNotification.rowCount) {
    return 0;
  }

  const result = await client.query(
    `
      INSERT INTO "Notifications"
        ("CompanyId", "UserId", "Title", "Message", "Type", "Severity", "EntityType", "EntityId")
      VALUES ($1, $2, $3, $4, 'CRM_STALE_RECORD', 'warning', $5, $6);
    `,
    [companyId, userId, title, message, entityType, entityId]
  );

  return Number(result.rowCount || 0);
};

const runCrmStaleReminderSweep = async () => {
  const client = await appPool.connect();
  try {
    let createdCount = 0;

    for (const module of CRM_STALE_MODULES) {
      const staleRows = await fetchStaleRowsForModule(client, module);
      for (const row of staleRows) {
        const recordRecipients = normalizeUserIds(
          module.recipientColumns.map((column) => row[column])
        );
        const adminRecipients = await getCompanyAdminRecipients(client, row.CompanyId);
        const recipients = normalizeUserIds([...recordRecipients, ...adminRecipients]);

        if (!recipients.length) {
          continue;
        }

        const lastActionDate = formatDate(row.LastActivityAt || row.CreatedAt);
        const title = `${module.entityType} needs attention`;
        const message = `${row.RecordTitle} has no update for more than ${STALE_DAYS} days. Status: ${row.RecordStatus}. Last action: ${lastActionDate}.`;

        for (const userId of recipients) {
          createdCount += await createNotificationIfMissing({
            client,
            companyId: row.CompanyId,
            userId,
            title,
            message,
            entityType: module.entityType,
            entityId: row.Id,
          });
        }
      }
    }

    return { ok: true, createdCount };
  } finally {
    client.release();
  }
};

const startCrmStaleReminderScheduler = () => {
  if (schedulerState.timer) {
    return schedulerState.timer;
  }

  const run = async () => {
    const dateKey = toDateKey(new Date());
    if (schedulerState.running || schedulerState.lastCheckKey === dateKey) {
      return;
    }

    schedulerState.running = true;
    try {
      await runCrmStaleReminderSweep();
      schedulerState.lastCheckKey = dateKey;
    } catch (error) {
      console.error("CRM stale reminder scheduler failed:", error);
    } finally {
      schedulerState.running = false;
    }
  };

  schedulerState.timer = setInterval(run, SCHEDULER_INTERVAL_MS);
  setTimeout(run, 20 * 1000);
  return schedulerState.timer;
};

module.exports = {
  runCrmStaleReminderSweep,
  startCrmStaleReminderScheduler,
};
