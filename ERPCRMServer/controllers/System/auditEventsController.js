const { appPool } = require("../../config/db");
const { isPrivilegedUser } = require("../../utils/hierarchyAccess");
const { logAuditEvent } = require("../../utils/auditEvents");

const toInt = (value, fallback = null) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildListFilters = ({ req, privileged }) => {
  const filters = [];
  const values = [];

  const companyId = toInt(req.query.companyId, null) ?? toInt(req.user?.companyId, null);
  if (!privileged && companyId) {
    values.push(companyId);
    filters.push(`ae."CompanyId" = $${values.length}`);
  } else if (privileged && companyId) {
    values.push(companyId);
    filters.push(`ae."CompanyId" = $${values.length}`);
  }

  const userId = toInt(req.query.userId, null);
  if (userId) {
    values.push(userId);
    filters.push(`ae."UserId" = $${values.length}`);
  }

  const entityType = req.query.entityType?.trim();
  if (entityType) {
    values.push(entityType);
    filters.push(`ae."EntityType" = $${values.length}`);
  }

  const entityId = toInt(req.query.entityId, null);
  if (entityId) {
    values.push(entityId);
    filters.push(`ae."EntityId" = $${values.length}`);
  }

  const eventType = req.query.eventType?.trim();
  if (eventType) {
    values.push(eventType);
    filters.push(`ae."EventType" = $${values.length}`);
  }

  const action = req.query.action?.trim();
  if (action) {
    values.push(action);
    filters.push(`ae."Action" = $${values.length}`);
  }

  return { filters, values };
};

const listAuditEvents = async (req, res) => {
  try {
    const privileged = isPrivilegedUser(req.user);
    const limit = Math.min(200, Math.max(1, toInt(req.query.limit, 50)));
    const offset = Math.max(0, toInt(req.query.offset, 0));
    const { filters, values } = buildListFilters({ req, privileged });
    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const query = `
      SELECT ae.*
      FROM "AuditEvents" ae
      ${whereClause}
      ORDER BY ae."CreatedAt" DESC
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2};
    `;

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM "AuditEvents" ae
      ${whereClause};
    `;

    const [listResult, countResult] = await Promise.all([
      appPool.query(query, [...values, limit, offset]),
      appPool.query(countQuery, values),
    ]);

    return res.status(200).json({
      data: listResult.rows,
      pagination: {
        total: countResult.rows[0]?.total || 0,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error("Error loading audit events:", error);
    return res.status(500).json({ message: "Failed to load audit events" });
  }
};

const createAuditEvent = async (req, res) => {
  try {
    const companyId = toInt(req.body?.companyId, null) ?? toInt(req.user?.companyId, null);
    const privileged = isPrivilegedUser(req.user);

    if (!privileged && companyId && Number(req.user?.companyId) !== companyId) {
      return res.status(403).json({ message: "Forbidden for requested company" });
    }

    const eventType = req.body?.eventType;
    const action = req.body?.action;
    if (!eventType || !action) {
      return res.status(400).json({ message: "eventType and action are required" });
    }

    const event = await logAuditEvent({
      companyId,
      userId: req.user?.userId ?? null,
      eventType,
      action,
      entityType: req.body?.entityType || null,
      entityId: toInt(req.body?.entityId, null),
      beforeData: req.body?.beforeData ?? null,
      afterData: req.body?.afterData ?? null,
      metadata: req.body?.metadata ?? null,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] || null,
    });

    return res.status(201).json(event);
  } catch (error) {
    console.error("Error creating audit event:", error);
    return res.status(500).json({ message: "Failed to create audit event" });
  }
};

module.exports = {
  listAuditEvents,
  createAuditEvent,
};
