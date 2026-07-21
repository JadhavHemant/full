const { appPool } = require("../config/db");

const logAuditEvent = async ({
  client = null,
  companyId = null,
  userId = null,
  eventType,
  action,
  entityType = null,
  entityId = null,
  beforeData = null,
  afterData = null,
  metadata = null,
  ipAddress = null,
  userAgent = null,
}) => {
  if (!eventType || !action) {
    return null;
  }

  const db = client || appPool;

  const { rows } = await db.query(
    `
      INSERT INTO "AuditEvents" (
        "CompanyId",
        "UserId",
        "EventType",
        "Action",
        "EntityType",
        "EntityId",
        "BeforeData",
        "AfterData",
        "Metadata",
        "IpAddress",
        "UserAgent"
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *;
    `,
    [
      companyId,
      userId,
      eventType,
      action,
      entityType,
      entityId,
      beforeData,
      afterData,
      metadata,
      ipAddress,
      userAgent,
    ]
  );

  return rows[0] || null;
};

module.exports = { logAuditEvent };
