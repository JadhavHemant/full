const { appPool } = require("../../config/db");
const { resolveCompanyScope, toInt } = require("../../utils/companyScope");

const normalizeText = (value) => String(value || "").trim();
const normalizeEmail = (value) => normalizeText(value).toLowerCase();
const boolOrDefault = (value, fallback) =>
  value === undefined || value === null ? fallback : Boolean(value);

const isValidEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

const resolveInboundSecretValid = (req) => {
  const expected = normalizeText(process.env.INBOUND_EMAIL_SECRET);
  if (!expected) {
    return true;
  }
  const provided = normalizeText(req.headers["x-inbound-secret"]);
  return provided && provided === expected;
};

const resolvePriority = ({ subject, bodyText }) => {
  const text = `${subject || ""} ${bodyText || ""}`.toLowerCase();
  if (/(critical|urgent|asap|priority|escalation)/i.test(text)) {
    return "High";
  }
  return "Medium";
};

const cleanSubject = (subject) => {
  const raw = normalizeText(subject);
  if (!raw) return "Inbound Email Case";
  return raw.replace(/^(re|fwd|fw)\s*:\s*/gi, "").trim() || "Inbound Email Case";
};

const extractCaseIdFromSubject = (subject) => {
  const match = String(subject || "").match(/CASE[-\s]?(\d+)/i);
  return match ? toInt(match[1]) : null;
};

const getRouteById = async (routeId) => {
  const { rows } = await appPool.query(
    `
      SELECT *
      FROM "InboundEmailRoutes"
      WHERE "Id" = $1
      LIMIT 1;
    `,
    [routeId]
  );
  return rows[0] || null;
};

const ensureRouteForeignKeys = async ({ client, companyId, departmentId, assignToUserId }) => {
  if (departmentId) {
    const department = await client.query(
      `
        SELECT "Id"
        FROM "Departments"
        WHERE "Id" = $1
        AND "CompanyId" = $2
        LIMIT 1;
      `,
      [departmentId, companyId]
    );
    if (!department.rows.length) {
      return { ok: false, status: 400, message: "Invalid department for selected company" };
    }
  }

  if (assignToUserId) {
    const user = await client.query(
      `
        SELECT "UserId"
        FROM "Users"
        WHERE "UserId" = $1
        AND "CompanyId" = $2
        AND "IsDelete" = FALSE
        LIMIT 1;
      `,
      [assignToUserId, companyId]
    );
    if (!user.rows.length) {
      return { ok: false, status: 400, message: "Assigned user must belong to selected company" };
    }
  }

  return { ok: true };
};

const resolveCaseAssignee = async ({ client, route, companyId }) => {
  let assigneeId = toInt(route.AssignToUserId);

  if (assigneeId) {
    const assigned = await client.query(
      `
        SELECT "UserId", "ReportingManagerId"
        FROM "Users"
        WHERE "UserId" = $1
        AND "CompanyId" = $2
        AND "IsDelete" = FALSE
        AND "IsActive" = TRUE
        LIMIT 1;
      `,
      [assigneeId, companyId]
    );

    if (!assigned.rows.length) {
      assigneeId = null;
    } else if (route.AssignToManager && assigned.rows[0].ReportingManagerId) {
      const manager = await client.query(
        `
          SELECT "UserId"
          FROM "Users"
          WHERE "UserId" = $1
          AND "CompanyId" = $2
          AND "IsDelete" = FALSE
          AND "IsActive" = TRUE
          LIMIT 1;
        `,
        [assigned.rows[0].ReportingManagerId, companyId]
      );
      if (manager.rows.length) {
        assigneeId = manager.rows[0].UserId;
      }
    }
  }

  if (!assigneeId && route.DepartmentId) {
    const departmentManager = await client.query(
      `
        SELECT "UserId"
        FROM "Users"
        WHERE "CompanyId" = $1
        AND "DepartmentId" = $2
        AND "IsDelete" = FALSE
        AND "IsActive" = TRUE
        ORDER BY COALESCE("HierarchyLevel", 999999) ASC, "UserId" ASC
        LIMIT 1;
      `,
      [companyId, route.DepartmentId]
    );
    if (departmentManager.rows.length) {
      assigneeId = departmentManager.rows[0].UserId;
    }
  }

  if (!assigneeId) {
    const companyAdmin = await client.query(
      `
        SELECT "UserId"
        FROM "Users"
        WHERE "CompanyId" = $1
        AND "RoleId" = 2
        AND "IsDelete" = FALSE
        AND "IsActive" = TRUE
        ORDER BY COALESCE("HierarchyLevel", 999999) ASC, "UserId" ASC
        LIMIT 1;
      `,
      [companyId]
    );
    if (companyAdmin.rows.length) {
      assigneeId = companyAdmin.rows[0].UserId;
    }
  }

  if (!assigneeId) {
    const firstActiveUser = await client.query(
      `
        SELECT "UserId"
        FROM "Users"
        WHERE "CompanyId" = $1
        AND "IsDelete" = FALSE
        AND "IsActive" = TRUE
        ORDER BY COALESCE("HierarchyLevel", 999999) ASC, "UserId" ASC
        LIMIT 1;
      `,
      [companyId]
    );
    assigneeId = firstActiveUser.rows[0]?.UserId || null;
  }

  return assigneeId || null;
};

const listEmailRoutes = async (req, res) => {
  try {
    const scope = resolveCompanyScope({
      req,
      requestedCompanyId: req.query.companyId,
      allowAllForSuperAdmin: true,
    });
    if (!scope.ok) {
      return res.status(scope.status).json({ message: scope.message });
    }

    const values = [];
    const where = [];
    if (scope.companyId != null) {
      values.push(scope.companyId);
      where.push(`r."CompanyId" = $${values.length}`);
    }
    if (req.query.isActive === "true" || req.query.isActive === "false") {
      values.push(req.query.isActive === "true");
      where.push(`r."IsActive" = $${values.length}`);
    }

    const query = `
      SELECT
        r.*,
        d."DepartmentName",
        u."Name" AS "AssignToUserName"
      FROM "InboundEmailRoutes" r
      LEFT JOIN "Departments" d ON d."Id" = r."DepartmentId"
      LEFT JOIN "Users" u ON u."UserId" = r."AssignToUserId"
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY r."CompanyId" ASC, LOWER(r."InboundEmail") ASC;
    `;

    const { rows } = await appPool.query(query, values);
    return res.status(200).json({ routes: rows });
  } catch (error) {
    console.error("Error listing inbound email routes:", error);
    return res.status(500).json({ message: "Failed to load inbound email routes" });
  }
};

const createEmailRoute = async (req, res) => {
  const client = await appPool.connect();
  try {
    const inboundEmail = normalizeEmail(req.body.inboundEmail);
    if (!isValidEmail(inboundEmail)) {
      return res.status(400).json({ message: "Valid inboundEmail is required" });
    }

    const scope = resolveCompanyScope({
      req,
      requestedCompanyId: req.body.companyId,
      allowAllForSuperAdmin: false,
    });
    if (!scope.ok) {
      return res.status(scope.status).json({ message: scope.message });
    }

    const payload = {
      companyId: scope.companyId,
      departmentId: toInt(req.body.departmentId),
      routeName: normalizeText(req.body.routeName) || inboundEmail,
      inboundEmail,
      assignToUserId: toInt(req.body.assignToUserId),
      assignToManager: boolOrDefault(req.body.assignToManager, false),
      autoCreateAccount: boolOrDefault(req.body.autoCreateAccount, true),
      autoCreateContact: boolOrDefault(req.body.autoCreateContact, true),
      isActive: boolOrDefault(req.body.isActive, true),
      createdBy: req.user.userId,
    };

    await client.query("BEGIN");

    const foreignKeys = await ensureRouteForeignKeys({
      client,
      companyId: payload.companyId,
      departmentId: payload.departmentId,
      assignToUserId: payload.assignToUserId,
    });
    if (!foreignKeys.ok) {
      await client.query("ROLLBACK");
      return res.status(foreignKeys.status).json({ message: foreignKeys.message });
    }

    const insert = await client.query(
      `
        INSERT INTO "InboundEmailRoutes"
          ("CompanyId", "DepartmentId", "RouteName", "InboundEmail", "AssignToUserId",
           "AssignToManager", "AutoCreateAccount", "AutoCreateContact", "IsActive", "CreatedBy", "UpdatedBy")
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
        RETURNING *;
      `,
      [
        payload.companyId,
        payload.departmentId,
        payload.routeName,
        payload.inboundEmail,
        payload.assignToUserId,
        payload.assignToManager,
        payload.autoCreateAccount,
        payload.autoCreateContact,
        payload.isActive,
        payload.createdBy,
      ]
    );

    await client.query("COMMIT");
    return res.status(201).json({ route: insert.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505") {
      return res
        .status(409)
        .json({ message: "Inbound email already configured for this company" });
    }
    console.error("Error creating inbound email route:", error);
    return res.status(500).json({ message: "Failed to create inbound email route" });
  } finally {
    client.release();
  }
};

const updateEmailRoute = async (req, res) => {
  const client = await appPool.connect();
  try {
    const routeId = toInt(req.params.id);
    if (!routeId) {
      return res.status(400).json({ message: "Invalid route id" });
    }

    const current = await getRouteById(routeId);
    if (!current) {
      return res.status(404).json({ message: "Route not found" });
    }

    const requestedCompanyId = req.body.companyId ?? current.CompanyId;
    const scope = resolveCompanyScope({
      req,
      requestedCompanyId,
      allowAllForSuperAdmin: false,
    });
    if (!scope.ok) {
      return res.status(scope.status).json({ message: scope.message });
    }

    const inboundEmail = normalizeEmail(req.body.inboundEmail ?? current.InboundEmail);
    if (!isValidEmail(inboundEmail)) {
      return res.status(400).json({ message: "Valid inboundEmail is required" });
    }

    const payload = {
      companyId: scope.companyId,
      departmentId: toInt(req.body.departmentId ?? current.DepartmentId),
      routeName: normalizeText(req.body.routeName ?? current.RouteName) || inboundEmail,
      inboundEmail,
      assignToUserId: toInt(req.body.assignToUserId ?? current.AssignToUserId),
      assignToManager: boolOrDefault(req.body.assignToManager, current.AssignToManager),
      autoCreateAccount: boolOrDefault(req.body.autoCreateAccount, current.AutoCreateAccount),
      autoCreateContact: boolOrDefault(req.body.autoCreateContact, current.AutoCreateContact),
      isActive: boolOrDefault(req.body.isActive, current.IsActive),
      updatedBy: req.user.userId,
    };

    await client.query("BEGIN");

    const foreignKeys = await ensureRouteForeignKeys({
      client,
      companyId: payload.companyId,
      departmentId: payload.departmentId,
      assignToUserId: payload.assignToUserId,
    });
    if (!foreignKeys.ok) {
      await client.query("ROLLBACK");
      return res.status(foreignKeys.status).json({ message: foreignKeys.message });
    }

    const update = await client.query(
      `
        UPDATE "InboundEmailRoutes"
        SET
          "CompanyId" = $1,
          "DepartmentId" = $2,
          "RouteName" = $3,
          "InboundEmail" = $4,
          "AssignToUserId" = $5,
          "AssignToManager" = $6,
          "AutoCreateAccount" = $7,
          "AutoCreateContact" = $8,
          "IsActive" = $9,
          "UpdatedBy" = $10,
          "UpdatedAt" = NOW()
        WHERE "Id" = $11
        RETURNING *;
      `,
      [
        payload.companyId,
        payload.departmentId,
        payload.routeName,
        payload.inboundEmail,
        payload.assignToUserId,
        payload.assignToManager,
        payload.autoCreateAccount,
        payload.autoCreateContact,
        payload.isActive,
        payload.updatedBy,
        routeId,
      ]
    );

    await client.query("COMMIT");
    return res.status(200).json({ route: update.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505") {
      return res
        .status(409)
        .json({ message: "Inbound email already configured for this company" });
    }
    console.error("Error updating inbound email route:", error);
    return res.status(500).json({ message: "Failed to update inbound email route" });
  } finally {
    client.release();
  }
};

const disableEmailRoute = async (req, res) => {
  try {
    const routeId = toInt(req.params.id);
    if (!routeId) {
      return res.status(400).json({ message: "Invalid route id" });
    }

    const current = await getRouteById(routeId);
    if (!current) {
      return res.status(404).json({ message: "Route not found" });
    }

    const scope = resolveCompanyScope({
      req,
      requestedCompanyId: current.CompanyId,
      allowAllForSuperAdmin: false,
    });
    if (!scope.ok) {
      return res.status(scope.status).json({ message: scope.message });
    }

    const { rows } = await appPool.query(
      `
        UPDATE "InboundEmailRoutes"
        SET "IsActive" = FALSE, "UpdatedBy" = $2, "UpdatedAt" = NOW()
        WHERE "Id" = $1
        RETURNING *;
      `,
      [routeId, req.user.userId]
    );
    return res.status(200).json({ route: rows[0] });
  } catch (error) {
    console.error("Error disabling inbound email route:", error);
    return res.status(500).json({ message: "Failed to disable inbound email route" });
  }
};

const processInboundCaseEmail = async (req, res) => {
  if (!resolveInboundSecretValid(req)) {
    return res.status(401).json({ message: "Unauthorized inbound email webhook" });
  }

  const toEmail = normalizeEmail(req.body.toEmail || req.body.to || req.body.recipient);
  const fromEmail = normalizeEmail(req.body.fromEmail || req.body.from || req.body.sender);
  const subject = normalizeText(req.body.subject);
  const bodyText = normalizeText(req.body.bodyText || req.body.body || req.body.text);
  const messageId = normalizeText(req.body.messageId || req.body.message_id);
  const threadId = normalizeText(req.body.threadId || req.body.thread_id || req.body.conversationId);
  const requestedCompanyId = toInt(req.body.companyId);

  if (!toEmail || !fromEmail) {
    return res.status(400).json({ message: "toEmail and fromEmail are required" });
  }

  const client = await appPool.connect();
  try {
    await client.query("BEGIN");

    const routeLookup = await client.query(
      `
        SELECT *
        FROM "InboundEmailRoutes"
        WHERE "IsActive" = TRUE
        AND LOWER("InboundEmail") = LOWER($1)
        ${requestedCompanyId ? `AND "CompanyId" = $2` : ""}
        ORDER BY "Id" ASC
        LIMIT 1;
      `,
      requestedCompanyId ? [toEmail, requestedCompanyId] : [toEmail]
    );
    const route = routeLookup.rows[0];
    if (!route) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "No active inbound route configured for recipient" });
    }

    const companyId = route.CompanyId;

    if (messageId) {
      const duplicate = await client.query(
        `
          SELECT "Id", "CaseId"
          FROM "InboundEmailEvents"
          WHERE "CompanyId" = $1
          AND "MessageId" = $2
          LIMIT 1;
        `,
        [companyId, messageId]
      );
      if (duplicate.rows.length) {
        await client.query("COMMIT");
        return res.status(200).json({
          message: "Inbound email already processed",
          action: "duplicate",
          caseId: duplicate.rows[0].CaseId || null,
        });
      }
    }

    let caseId = null;
    if (threadId) {
      const byThread = await client.query(
        `
          SELECT "CaseId"
          FROM "InboundEmailEvents"
          WHERE "CompanyId" = $1
          AND "ThreadId" = $2
          AND "CaseId" IS NOT NULL
          ORDER BY "Id" DESC
          LIMIT 1;
        `,
        [companyId, threadId]
      );
      caseId = byThread.rows[0]?.CaseId || null;
    }

    if (!caseId) {
      const taggedId = extractCaseIdFromSubject(subject);
      if (taggedId) {
        const existing = await client.query(
          `
            SELECT "Id"
            FROM "Cases"
            WHERE "Id" = $1
            AND "CompanyId" = $2
            AND "IsDeleted" = FALSE
            LIMIT 1;
          `,
          [taggedId, companyId]
        );
        caseId = existing.rows[0]?.Id || null;
      }
    }

    const assigneeId = await resolveCaseAssignee({ client, route, companyId });
    const actorUserId = toInt(route.CreatedBy) || assigneeId || null;
    const inboundNote =
      `\n\n--- Inbound Email ---\nFrom: ${fromEmail}\nTo: ${toEmail}\nSubject: ${subject || "(no subject)"}\n\n${bodyText || "(empty body)"}`;

    let action = "updated";
    if (caseId) {
      const update = await client.query(
        `
          UPDATE "Cases"
          SET
            "Description" = COALESCE("Description", '') || $2,
            "AssignedTo" = COALESCE("AssignedTo", $3),
            "AssignedFrom" = COALESCE("AssignedFrom", $4),
            "UpdatedBy" = $4,
            "UpdatedAt" = NOW()
          WHERE "Id" = $1
          AND "CompanyId" = $5
          AND "IsDeleted" = FALSE
          RETURNING *;
        `,
        [caseId, inboundNote, assigneeId, actorUserId, companyId]
      );
      if (!update.rows.length) {
        caseId = null;
      }
    }

    if (!caseId) {
      const insert = await client.query(
        `
          INSERT INTO "Cases"
            ("CompanyId", "Subject", "Status", "Priority", "Description", "AssignedTo", "AssignedFrom",
             "CreatedBy", "UpdatedBy", "IsActive", "IsDeleted", "Flag")
          VALUES
            ($1, $2, 'Open', $3, $4, $5, $6, $6, $6, TRUE, FALSE, FALSE)
          RETURNING *;
        `,
        [
          companyId,
          cleanSubject(subject),
          resolvePriority({ subject, bodyText }),
          `Inbound email from ${fromEmail} to ${toEmail}\n\n${bodyText || "(empty body)"}`,
          assigneeId,
          actorUserId,
        ]
      );
      caseId = insert.rows[0].Id;
      action = "created";
    }

    await client.query(
      `
        INSERT INTO "InboundEmailEvents"
          ("CompanyId", "RouteId", "CaseId", "MessageId", "ThreadId", "FromEmail", "ToEmail",
           "Subject", "BodyText", "Status", "RawPayload")
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Processed', $10::jsonb);
      `,
      [
        companyId,
        route.Id,
        caseId,
        messageId || null,
        threadId || null,
        fromEmail || null,
        toEmail || null,
        subject || null,
        bodyText || null,
        JSON.stringify(req.body || {}),
      ]
    );

    await client.query("COMMIT");
    return res.status(200).json({
      message: action === "created" ? "Case created from inbound email" : "Case updated from inbound email",
      action,
      companyId,
      caseId,
      assignedTo: assigneeId,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error processing inbound case email:", error);
    return res.status(500).json({ message: "Failed to process inbound case email" });
  } finally {
    client.release();
  }
};

module.exports = {
  listEmailRoutes,
  createEmailRoute,
  updateEmailRoute,
  disableEmailRoute,
  processInboundCaseEmail,
};
