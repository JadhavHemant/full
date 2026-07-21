const { appPool } = require("../config/db");

const mapUser = (row) => ({
  userId: Number(row.UserId),
  name: row.Name || "Unknown user",
  email: row.Email || "",
  roleId: row.RoleId ?? null,
  avatar: row.userImage || null,
  isOnline: Boolean(row.IsOnline),
  lastSeen: row.LastSeen || null,
});

const mapMember = (row) => ({
  user: mapUser(row),
  joinedAt: row.JoinedAt,
  lastReadAt: row.LastReadAt || null,
});

const messageSelect = `
  SELECT
    m."Id",
    m."ChannelId",
    m."SenderUserId",
    m."Content",
    m."Type",
    m."FileUrl",
    m."FileName",
    m."FileSize",
    m."FileType",
    m."IsEdited",
    m."EditedAt",
    m."IsDeleted",
    m."CreatedAt",
    u."UserId",
    u."Name",
    u."Email",
    u."RoleId",
    u."userImage",
    COALESCE(p."IsOnline", FALSE) AS "IsOnline",
    p."LastSeen"
  FROM "ChatAppMessages" m
  LEFT JOIN "Users" u ON u."UserId" = m."SenderUserId"
  LEFT JOIN "ChatAppPresence" p ON p."UserId" = u."UserId"
`;

const getMessageReactions = async (messageIds) => {
  if (!messageIds.length) return {};
  const { rows } = await appPool.query(
    `
      SELECT
        r."MessageId",
        r."Emoji",
        u."UserId",
        u."Name",
        u."Email",
        u."RoleId",
        u."userImage",
        COALESCE(p."IsOnline", FALSE) AS "IsOnline",
        p."LastSeen"
      FROM "ChatAppReactions" r
      INNER JOIN "Users" u ON u."UserId" = r."UserId"
      LEFT JOIN "ChatAppPresence" p ON p."UserId" = u."UserId"
      WHERE r."MessageId" = ANY($1::int[])
      ORDER BY r."CreatedAt" ASC;
    `,
    [messageIds]
  );

  return rows.reduce((acc, row) => {
    const messageId = Number(row.MessageId);
    const emoji = row.Emoji;
    if (!acc[messageId]) acc[messageId] = {};
    if (!acc[messageId][emoji]) acc[messageId][emoji] = [];
    acc[messageId][emoji].push(mapUser(row));
    return acc;
  }, {});
};

const getMessageReads = async (messageIds) => {
  if (!messageIds.length) return {};
  const { rows } = await appPool.query(
    `
      SELECT
        r."MessageId",
        r."ReadAt",
        u."UserId",
        u."Name",
        u."Email",
        u."RoleId",
        u."userImage",
        COALESCE(p."IsOnline", FALSE) AS "IsOnline",
        p."LastSeen"
      FROM "ChatAppMessageReads" r
      INNER JOIN "Users" u ON u."UserId" = r."UserId"
      LEFT JOIN "ChatAppPresence" p ON p."UserId" = u."UserId"
      WHERE r."MessageId" = ANY($1::int[])
      ORDER BY r."ReadAt" ASC;
    `,
    [messageIds]
  );

  return rows.reduce((acc, row) => {
    const messageId = Number(row.MessageId);
    if (!acc[messageId]) acc[messageId] = [];
    acc[messageId].push({
      user: mapUser(row),
      readAt: row.ReadAt,
    });
    return acc;
  }, {});
};

const buildMessages = async (rows) => {
  const ids = rows.map((row) => Number(row.Id));
  const [reactionsByMessage, readsByMessage] = await Promise.all([
    getMessageReactions(ids),
    getMessageReads(ids),
  ]);

  return rows.map((row) => {
    const groupedReactions = reactionsByMessage[Number(row.Id)] || {};
    const reactions = Object.entries(groupedReactions).map(([emoji, users]) => ({
      emoji,
      users,
    }));

    return {
      _id: Number(row.Id),
      channel: Number(row.ChannelId),
      sender: row.UserId
        ? mapUser(row)
        : {
            userId: null,
            name: "Unknown user",
            email: "",
            roleId: null,
            avatar: null,
            isOnline: false,
            lastSeen: null,
          },
      content: row.IsDeleted ? "" : row.Content || "",
      type: row.Type,
      fileUrl: row.FileUrl || null,
      fileName: row.FileName || null,
      fileSize: row.FileSize ? Number(row.FileSize) : null,
      fileType: row.FileType || null,
      reactions,
      readBy: readsByMessage[Number(row.Id)] || [],
      isEdited: Boolean(row.IsEdited),
      editedAt: row.EditedAt || null,
      isDeleted: Boolean(row.IsDeleted),
      createdAt: row.CreatedAt,
    };
  });
};

const getMessageById = async (messageId) => {
  const { rows } = await appPool.query(
    `${messageSelect} WHERE m."Id" = $1 LIMIT 1;`,
    [messageId]
  );
  const messages = await buildMessages(rows);
  return messages[0] || null;
};

const getChannelMembers = async (channelId) => {
  const { rows } = await appPool.query(
    `
      SELECT
        cm."JoinedAt",
        cm."LastReadAt",
        u."UserId",
        u."Name",
        u."Email",
        u."RoleId",
        u."userImage",
        COALESCE(p."IsOnline", FALSE) AS "IsOnline",
        p."LastSeen"
      FROM "ChatAppChannelMembers" cm
      INNER JOIN "Users" u ON u."UserId" = cm."UserId"
      LEFT JOIN "ChatAppPresence" p ON p."UserId" = u."UserId"
      WHERE cm."ChannelId" = $1
      ORDER BY u."Name" ASC;
    `,
    [channelId]
  );

  return rows.map(mapMember);
};

const getChannelById = async (channelId, currentUserId = null) => {
  const { rows } = await appPool.query(
    `
      SELECT
        c."Id",
        c."Name",
        c."Description",
        c."Type",
        c."IsPrivate",
        c."CreatedBy",
        c."LastMessageId",
        c."LastActivity",
        c."CreatedAt",
        creator."UserId" AS "CreatorUserId",
        creator."Name" AS "CreatorName",
        creator."Email" AS "CreatorEmail",
        creator."RoleId" AS "CreatorRoleId",
        creator."userImage" AS "CreatorAvatar",
        COALESCE(cp."IsOnline", FALSE) AS "CreatorOnline",
        cp."LastSeen" AS "CreatorLastSeen",
        (
          SELECT COUNT(*)
          FROM "ChatAppMessages" m
          WHERE m."ChannelId" = c."Id"
            AND m."IsDeleted" = FALSE
            AND COALESCE(m."SenderUserId", 0) <> COALESCE($2, 0)
            AND NOT EXISTS (
              SELECT 1
              FROM "ChatAppMessageReads" r
              WHERE r."MessageId" = m."Id"
                AND r."UserId" = $2
            )
        )::int AS "UnreadCount"
      FROM "ChatAppChannels" c
      LEFT JOIN "Users" creator ON creator."UserId" = c."CreatedBy"
      LEFT JOIN "ChatAppPresence" cp ON cp."UserId" = creator."UserId"
      WHERE c."Id" = $1
      LIMIT 1;
    `,
    [channelId, currentUserId]
  );

  const row = rows[0];
  if (!row) return null;
  const members = await getChannelMembers(channelId);
  const lastMessage = row.LastMessageId ? await getMessageById(row.LastMessageId) : null;

  return {
    _id: Number(row.Id),
    name: row.Name,
    description: row.Description || "",
    type: row.Type,
    isPrivate: Boolean(row.IsPrivate),
    members,
    createdBy: row.CreatorUserId
      ? {
          userId: Number(row.CreatorUserId),
          name: row.CreatorName || "Unknown user",
          email: row.CreatorEmail || "",
          roleId: row.CreatorRoleId ?? null,
          avatar: row.CreatorAvatar || null,
          isOnline: Boolean(row.CreatorOnline),
          lastSeen: row.CreatorLastSeen || null,
        }
      : null,
    lastMessage,
    lastActivity: row.LastActivity,
    createdAt: row.CreatedAt,
    unreadCount: Number(row.UnreadCount || 0),
  };
};

const ensureChannelAccess = async (channelId, userId) => {
  const { rows } = await appPool.query(
    `
      SELECT
        c."Id",
        c."CompanyId",
        c."Type",
        c."CreatedBy",
        cm."UserId" AS "MemberUserId"
      FROM "ChatAppChannels" c
      LEFT JOIN "ChatAppChannelMembers" cm
        ON cm."ChannelId" = c."Id"
        AND cm."UserId" = $2
      WHERE c."Id" = $1
      LIMIT 1;
    `,
    [channelId, userId]
  );

  const row = rows[0];
  if (!row) return { ok: false, status: 404, message: "Channel not found" };
  if (!row.MemberUserId) return { ok: false, status: 403, message: "Access denied for this channel" };
  return { ok: true, channel: row };
};

module.exports = {
  buildMessages,
  ensureChannelAccess,
  getChannelById,
  getChannelMembers,
  getMessageById,
  mapUser,
  messageSelect,
};
