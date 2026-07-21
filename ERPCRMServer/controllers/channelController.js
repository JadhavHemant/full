const { appPool } = require("../config/db");
const { ensureChannelAccess, getChannelById } = require("../utils/chatHelpers");
const { getIO } = require("../sockets/chatSocket");

const toInt = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalize = (value) => String(value || "").trim();
const getCurrentUserId = (req) => Number(req.user?.userId || req.user?.id);
const getCurrentCompanyId = (req) => Number(req.user?.companyId || 0);

const emitNewChannel = async (channelId) => {
  const channel = await getChannelById(channelId);
  const io = getIO();
  if (!channel || !io) return;
  channel.members.forEach((member) => {
    io.to(`user:${member.user.userId}`).emit("new_channel", { channel });
  });
};

const listChannels = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { rows } = await appPool.query(
      `
        SELECT cm."ChannelId"
        FROM "ChatAppChannelMembers" cm
        INNER JOIN "ChatAppChannels" c ON c."Id" = cm."ChannelId"
        WHERE cm."UserId" = $1
          AND c."CompanyId" = $2
        ORDER BY c."LastActivity" DESC, c."Id" DESC;
      `,
      [userId, getCurrentCompanyId(req)]
    );
    const channels = await Promise.all(rows.map((row) => getChannelById(Number(row.ChannelId), userId)));
    res.status(200).json({ channels: channels.filter(Boolean) });
  } catch (error) {
    console.error("Failed to fetch channels", error);
    res.status(500).json({ message: "Failed to fetch channels" });
  }
};

const createChannel = async (req, res) => {
  const client = await appPool.connect();
  try {
    const name = normalize(req.body.name);
    const description = normalize(req.body.description);
    const memberIds = Array.isArray(req.body.memberIds) ? req.body.memberIds.map(toInt).filter(Boolean) : [];
    const allMemberIds = [...new Set([getCurrentUserId(req), ...memberIds])];

    if (!name) return res.status(400).json({ message: "Channel name is required" });

    await client.query("BEGIN");
    const result = await client.query(
      `
        INSERT INTO "ChatAppChannels" ("CompanyId", "Name", "Description", "Type", "IsPrivate", "CreatedBy", "LastActivity")
        VALUES ($1, $2, $3, 'group', $4, $5, NOW())
        RETURNING "Id";
      `,
      [getCurrentCompanyId(req), name, description || null, Boolean(req.body.isPrivate), getCurrentUserId(req)]
    );
    await client.query(
      `
        INSERT INTO "ChatAppChannelMembers" ("ChannelId", "UserId")
        SELECT $1, x FROM UNNEST($2::int[]) AS x;
      `,
      [result.rows[0].Id, allMemberIds]
    );
    await client.query("COMMIT");

    await emitNewChannel(result.rows[0].Id);
    const channel = await getChannelById(result.rows[0].Id, getCurrentUserId(req));
    res.status(201).json({ channel });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to create channel", error);
    res.status(500).json({ message: "Failed to create channel" });
  } finally {
    client.release();
  }
};

const createDirectChannel = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const targetUserId = toInt(req.body.targetUserId);
    if (!targetUserId) return res.status(400).json({ message: "Target user is required" });

    const existing = await appPool.query(
      `
        SELECT c."Id"
        FROM "ChatAppChannels" c
        INNER JOIN "ChatAppChannelMembers" cm1 ON cm1."ChannelId" = c."Id" AND cm1."UserId" = $1
        INNER JOIN "ChatAppChannelMembers" cm2 ON cm2."ChannelId" = c."Id" AND cm2."UserId" = $2
        WHERE c."Type" = 'direct'
          AND c."CompanyId" = $3
          AND (SELECT COUNT(*) FROM "ChatAppChannelMembers" cm WHERE cm."ChannelId" = c."Id") = 2
        LIMIT 1;
      `,
      [currentUserId, targetUserId, getCurrentCompanyId(req)]
    );

    if (existing.rows[0]?.Id) {
      const channel = await getChannelById(existing.rows[0].Id, currentUserId);
      return res.status(200).json({ channel });
    }

    const userResult = await appPool.query(
      `
        SELECT "UserId", "Name"
        FROM "Users"
        WHERE "UserId" = $1 AND "CompanyId" = $2 AND "IsDelete" = FALSE
        LIMIT 1;
      `,
      [targetUserId, getCurrentCompanyId(req)]
    );
    if (!userResult.rows[0]) return res.status(404).json({ message: "User not found" });

    const created = await appPool.query(
      `
        INSERT INTO "ChatAppChannels" ("CompanyId", "Name", "Type", "IsPrivate", "CreatedBy", "LastActivity")
        VALUES ($1, $2, 'direct', TRUE, $3, NOW())
        RETURNING "Id";
      `,
      [getCurrentCompanyId(req), userResult.rows[0].Name || "Direct message", currentUserId]
    );
    await appPool.query(
      `
        INSERT INTO "ChatAppChannelMembers" ("ChannelId", "UserId")
        VALUES ($1, $2), ($1, $3);
      `,
      [created.rows[0].Id, currentUserId, targetUserId]
    );

    await emitNewChannel(created.rows[0].Id);
    const channel = await getChannelById(created.rows[0].Id, currentUserId);
    res.status(201).json({ channel });
  } catch (error) {
    console.error("Failed to create direct channel", error);
    res.status(500).json({ message: "Failed to create direct channel" });
  }
};

const getChannelDetails = async (req, res) => {
  try {
    const access = await ensureChannelAccess(toInt(req.params.id), getCurrentUserId(req));
    if (!access.ok) return res.status(access.status).json({ message: access.message });
    const channel = await getChannelById(Number(req.params.id), getCurrentUserId(req));
    res.status(200).json({ channel });
  } catch (error) {
    console.error("Failed to fetch channel details", error);
    res.status(500).json({ message: "Failed to fetch channel details" });
  }
};

const updateChannel = async (req, res) => {
  try {
    const channelId = toInt(req.params.id);
    const access = await ensureChannelAccess(channelId, getCurrentUserId(req));
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    await appPool.query(
      `
        UPDATE "ChatAppChannels"
        SET "Name" = COALESCE(NULLIF($2, ''), "Name"),
            "Description" = COALESCE($3, "Description"),
            "UpdatedAt" = NOW()
        WHERE "Id" = $1;
      `,
      [channelId, normalize(req.body.name), normalize(req.body.description) || null]
    );
    const channel = await getChannelById(channelId, getCurrentUserId(req));
    const io = getIO();
    if (io) {
      io.to(`channel:${channelId}`).emit("channel_updated", { channel });
      channel.members.forEach((member) => io.to(`user:${member.user.userId}`).emit("channel_updated", { channel }));
    }
    res.status(200).json({ channel });
  } catch (error) {
    console.error("Failed to update channel", error);
    res.status(500).json({ message: "Failed to update channel" });
  }
};

const deleteChannel = async (req, res) => {
  try {
    const channelId = toInt(req.params.id);
    const channel = await getChannelById(channelId, getCurrentUserId(req));
    if (!channel) return res.status(404).json({ message: "Channel not found" });
    if (Number(channel.createdBy?.userId) !== getCurrentUserId(req)) {
      return res.status(403).json({ message: "Only the channel creator can delete it" });
    }
    await appPool.query(`DELETE FROM "ChatAppChannels" WHERE "Id" = $1;`, [channelId]);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Failed to delete channel", error);
    res.status(500).json({ message: "Failed to delete channel" });
  }
};

const addMember = async (req, res) => {
  try {
    const channelId = toInt(req.params.id);
    const userId = toInt(req.body.userId);
    if (!userId) return res.status(400).json({ message: "User is required" });
    const access = await ensureChannelAccess(channelId, getCurrentUserId(req));
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    await appPool.query(
      `
        INSERT INTO "ChatAppChannelMembers" ("ChannelId", "UserId")
        VALUES ($1, $2)
        ON CONFLICT ("ChannelId", "UserId") DO NOTHING;
      `,
      [channelId, userId]
    );
    const channel = await getChannelById(channelId, getCurrentUserId(req));
    await emitNewChannel(channelId);
    res.status(200).json({ channel });
  } catch (error) {
    console.error("Failed to add member", error);
    res.status(500).json({ message: "Failed to add member" });
  }
};

const removeMember = async (req, res) => {
  try {
    const channelId = toInt(req.params.id);
    const userId = toInt(req.body.userId);
    if (!userId) return res.status(400).json({ message: "User is required" });
    const access = await ensureChannelAccess(channelId, getCurrentUserId(req));
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    await appPool.query(`DELETE FROM "ChatAppChannelMembers" WHERE "ChannelId" = $1 AND "UserId" = $2;`, [channelId, userId]);
    const channel = await getChannelById(channelId, getCurrentUserId(req));
    res.status(200).json({ channel });
  } catch (error) {
    console.error("Failed to remove member", error);
    res.status(500).json({ message: "Failed to remove member" });
  }
};

const searchUsers = async (req, res) => {
  try {
    const q = `%${normalize(req.query.q)}%`;
    const { rows } = await appPool.query(
      `
        SELECT
          u."UserId",
          u."Name",
          u."Email",
          u."RoleId",
          u."userImage",
          COALESCE(p."IsOnline", FALSE) AS "IsOnline",
          p."LastSeen"
        FROM "Users" u
        LEFT JOIN "ChatAppPresence" p ON p."UserId" = u."UserId"
        WHERE u."CompanyId" = $1
          AND u."IsDelete" = FALSE
          AND u."IsActive" = TRUE
          AND u."UserId" <> $2
          AND (u."Name" ILIKE $3 OR u."Email" ILIKE $3)
        ORDER BY u."Name" ASC
        LIMIT 20;
      `,
      [getCurrentCompanyId(req), getCurrentUserId(req), q]
    );

    res.status(200).json({
      users: rows.map((row) => ({
        userId: Number(row.UserId),
        name: row.Name,
        email: row.Email,
        roleId: row.RoleId,
        avatar: row.userImage || null,
        isOnline: Boolean(row.IsOnline),
        lastSeen: row.LastSeen || null,
      })),
    });
  } catch (error) {
    console.error("Failed to search users", error);
    res.status(500).json({ message: "Failed to search users" });
  }
};

module.exports = {
  addMember,
  createChannel,
  createDirectChannel,
  deleteChannel,
  getChannelDetails,
  listChannels,
  removeMember,
  searchUsers,
  updateChannel,
};
