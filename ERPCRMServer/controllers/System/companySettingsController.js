const { appPool } = require("../../config/db");
const { isPrivilegedUser } = require("../../utils/hierarchyAccess");
const { logAuditEvent } = require("../../utils/auditEvents");

const toCompanyId = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const resolveTargetCompanyId = (req) => {
  const explicitCompanyId =
    toCompanyId(req.params.companyId) ??
    toCompanyId(req.query.companyId) ??
    toCompanyId(req.body?.companyId);

  return explicitCompanyId ?? toCompanyId(req.user?.companyId);
};

const assertCompanyAccess = (req, companyId) => {
  if (!companyId) {
    return { ok: false, status: 400, message: "CompanyId is required" };
  }

  const privileged = isPrivilegedUser(req.user);
  if (!privileged && Number(req.user?.companyId) !== Number(companyId)) {
    return { ok: false, status: 403, message: "Forbidden for requested company" };
  }

  return { ok: true };
};

const getCompanySettings = async (req, res) => {
  try {
    const companyId = resolveTargetCompanyId(req);
    const access = assertCompanyAccess(req, companyId);
    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    const { rows } = await appPool.query(
      `
        SELECT *
        FROM "CompanySettings"
        WHERE "CompanyId" = $1
        LIMIT 1;
      `,
      [companyId]
    );

    if (!rows.length) {
      return res.status(200).json({
        CompanyId: companyId,
        Settings: {},
        Version: 0,
      });
    }

    return res.status(200).json(rows[0]);
  } catch (error) {
    console.error("Error loading company settings:", error);
    return res.status(500).json({ message: "Failed to load company settings" });
  }
};

const upsertCompanySettings = async (req, res) => {
  const client = await appPool.connect();
  try {
    const companyId = resolveTargetCompanyId(req);
    const access = assertCompanyAccess(req, companyId);
    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    const settings = req.body?.settings;
    if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
      return res.status(400).json({ message: "settings object is required" });
    }

    const merge = Boolean(req.body?.merge);

    await client.query("BEGIN");

    const previous = await client.query(
      `
        SELECT *
        FROM "CompanySettings"
        WHERE "CompanyId" = $1
        LIMIT 1;
      `,
      [companyId]
    );

    let result;
    if (merge) {
      result = await client.query(
        `
          INSERT INTO "CompanySettings" ("CompanyId", "Settings", "Version", "UpdatedBy")
          VALUES ($1, $2::jsonb, 1, $3)
          ON CONFLICT ("CompanyId") DO UPDATE
          SET
            "Settings" = COALESCE("CompanySettings"."Settings", '{}'::jsonb) || EXCLUDED."Settings",
            "Version" = "CompanySettings"."Version" + 1,
            "UpdatedBy" = EXCLUDED."UpdatedBy",
            "UpdatedAt" = NOW()
          RETURNING *;
        `,
        [companyId, JSON.stringify(settings), req.user?.userId ?? null]
      );
    } else {
      result = await client.query(
        `
          INSERT INTO "CompanySettings" ("CompanyId", "Settings", "Version", "UpdatedBy")
          VALUES ($1, $2::jsonb, 1, $3)
          ON CONFLICT ("CompanyId") DO UPDATE
          SET
            "Settings" = EXCLUDED."Settings",
            "Version" = "CompanySettings"."Version" + 1,
            "UpdatedBy" = EXCLUDED."UpdatedBy",
            "UpdatedAt" = NOW()
          RETURNING *;
        `,
        [companyId, JSON.stringify(settings), req.user?.userId ?? null]
      );
    }

    const updated = result.rows[0];

    await logAuditEvent({
      client,
      companyId,
      userId: req.user?.userId ?? null,
      eventType: "CompanySettings",
      action: "Upsert",
      entityType: "CompanySettings",
      entityId: Number(updated?.Id),
      beforeData: previous.rows[0] || null,
      afterData: updated || null,
      metadata: {
        merge,
      },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] || null,
    });

    await client.query("COMMIT");
    return res.status(200).json(updated);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error saving company settings:", error);
    return res.status(500).json({ message: "Failed to save company settings" });
  } finally {
    client.release();
  }
};

module.exports = {
  getCompanySettings,
  upsertCompanySettings,
};
