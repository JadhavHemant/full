const { appPool } = require("../../config/db");
const { isPrivilegedUser } = require("../../utils/hierarchyAccess");
const { logAuditEvent } = require("../../utils/auditEvents");

const ALLOWED_CHANNELS = new Set(["InApp", "Email", "SMS", "Push", "Webhook", "Digest"]);

const toUserId = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const sanitizePreference = (item) => ({
  NotificationType: String(item.NotificationType || "").trim(),
  Channel: String(item.Channel || "").trim(),
  IsEnabled: item.IsEnabled === undefined ? true : Boolean(item.IsEnabled),
  QuietHoursStart: item.QuietHoursStart || null,
  QuietHoursEnd: item.QuietHoursEnd || null,
});

const validatePreference = (item) => {
  if (!item.NotificationType) {
    return "NotificationType is required";
  }
  if (!item.Channel || !ALLOWED_CHANNELS.has(item.Channel)) {
    return "Channel is invalid";
  }
  return null;
};

const getPreferencesByUserId = async (userId) => {
  const { rows } = await appPool.query(
    `
      SELECT *
      FROM "NotificationPreferences"
      WHERE "UserId" = $1
      ORDER BY "NotificationType", "Channel";
    `,
    [userId]
  );

  return rows;
};

const getMyNotificationPreferences = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const data = await getPreferencesByUserId(userId);
    return res.status(200).json({ userId, data });
  } catch (error) {
    console.error("Error loading notification preferences:", error);
    return res.status(500).json({ message: "Failed to load notification preferences" });
  }
};

const getUserNotificationPreferences = async (req, res) => {
  try {
    const requestedUserId = toUserId(req.params.userId);
    if (!requestedUserId) {
      return res.status(400).json({ message: "Valid userId is required" });
    }

    const privileged = isPrivilegedUser(req.user);
    if (!privileged && Number(req.user?.userId) !== requestedUserId) {
      return res.status(403).json({ message: "Forbidden for requested user" });
    }

    const data = await getPreferencesByUserId(requestedUserId);
    return res.status(200).json({ userId: requestedUserId, data });
  } catch (error) {
    console.error("Error loading user notification preferences:", error);
    return res.status(500).json({ message: "Failed to load user notification preferences" });
  }
};

const upsertMyNotificationPreferences = async (req, res) => {
  const client = await appPool.connect();
  try {
    const userId = req.user?.userId;
    const companyId = req.user?.companyId ?? null;
    const preferences = Array.isArray(req.body?.preferences) ? req.body.preferences : null;

    if (!preferences || !preferences.length) {
      return res.status(400).json({ message: "preferences array is required" });
    }

    const normalized = preferences.map(sanitizePreference);
    for (const item of normalized) {
      const validationError = validatePreference(item);
      if (validationError) {
        return res.status(400).json({ message: validationError });
      }
    }

    const replaceExisting = Boolean(req.body?.replaceExisting);

    await client.query("BEGIN");

    const beforeData = await client.query(
      `
        SELECT *
        FROM "NotificationPreferences"
        WHERE "UserId" = $1
        ORDER BY "NotificationType", "Channel";
      `,
      [userId]
    );

    if (replaceExisting) {
      await client.query(`DELETE FROM "NotificationPreferences" WHERE "UserId" = $1;`, [userId]);
    }

    for (const item of normalized) {
      await client.query(
        `
          INSERT INTO "NotificationPreferences" (
            "UserId",
            "NotificationType",
            "Channel",
            "IsEnabled",
            "QuietHoursStart",
            "QuietHoursEnd"
          )
          VALUES ($1,$2,$3,$4,$5,$6)
          ON CONFLICT ("UserId", "NotificationType", "Channel") DO UPDATE
          SET
            "IsEnabled" = EXCLUDED."IsEnabled",
            "QuietHoursStart" = EXCLUDED."QuietHoursStart",
            "QuietHoursEnd" = EXCLUDED."QuietHoursEnd",
            "UpdatedAt" = NOW();
        `,
        [
          userId,
          item.NotificationType,
          item.Channel,
          item.IsEnabled,
          item.QuietHoursStart,
          item.QuietHoursEnd,
        ]
      );
    }

    const afterData = await client.query(
      `
        SELECT *
        FROM "NotificationPreferences"
        WHERE "UserId" = $1
        ORDER BY "NotificationType", "Channel";
      `,
      [userId]
    );

    await logAuditEvent({
      client,
      companyId,
      userId,
      eventType: "NotificationPreferences",
      action: "Upsert",
      entityType: "User",
      entityId: userId,
      beforeData: beforeData.rows,
      afterData: afterData.rows,
      metadata: {
        replaceExisting,
        updatedCount: normalized.length,
      },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] || null,
    });

    await client.query("COMMIT");
    return res.status(200).json({ userId, data: afterData.rows });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error saving notification preferences:", error);
    return res.status(500).json({ message: "Failed to save notification preferences" });
  } finally {
    client.release();
  }
};

module.exports = {
  getMyNotificationPreferences,
  getUserNotificationPreferences,
  upsertMyNotificationPreferences,
};
