const { appPool } = require("../../config/db");
const { isPrivilegedUser } = require("../../utils/hierarchyAccess");
const { getIO } = require("../../sockets/chatSocket");

const toInt = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeText = (value) => String(value || "").trim();

const getCurrentUserId = (req) =>
  toInt(req.user?.userId ?? req.user?.UserId ?? req.user?.id ?? req.user?.Id);

const getCurrentCompanyId = (req) => toInt(req.user?.companyId ?? req.user?.CompanyId);

const { isSuperAdmin, ROLE_IDS } = require('../../config/roleConfig');
const isSuperAdminUser = (user) => Number(user?.roleId ?? user?.RoleId) === ROLE_IDS.SUPERADMIN || isSuperAdmin(user);

const resolveCompanyContext = (req, explicitCompanyId = null) => {
  const privileged = isPrivilegedUser(req.user);
  const superAdmin = isSuperAdminUser(req.user);
  const requesterCompanyId = getCurrentCompanyId(req);
  const requestedCompanyId = toInt(explicitCompanyId);

  let companyId = requesterCompanyId;

  if (superAdmin) {
    companyId = requestedCompanyId ?? requesterCompanyId;
  } else if (requestedCompanyId) {
    if (!privileged || Number(requestedCompanyId) !== Number(requesterCompanyId)) {
      return {
        ok: false,
        status: 403,
        message: "Forbidden for requested company",
      };
    }
    companyId = requestedCompanyId;
  }

  if (!companyId && !superAdmin) {
    return {
      ok: false,
      status: 400,
      message: "Company context is required",
    };
  }

  return {
    ok: true,
    companyId,
    privileged,
    superAdmin,
    requesterCompanyId,
  };
};

const resolveTeamAccess = async (req, teamId) => {
  const resolvedTeamId = toInt(teamId);
  if (!resolvedTeamId) {
    return { ok: false, status: 400, message: "Invalid team id" };
  }

  const query = `
    SELECT
      t."Id",
      t."CompanyId",
      t."Name",
      t."Description",
      t."CreatedBy",
      t."IsArchived",
      t."CreatedAt",
      t."UpdatedAt",
      tm."UserId" AS "MemberUserId",
      tm."MemberRole" AS "MemberRole"
    FROM "ChatTeams" t
    LEFT JOIN "ChatTeamMembers" tm
      ON tm."TeamId" = t."Id"
      AND tm."UserId" = $2
    WHERE t."Id" = $1
    LIMIT 1;
  `;

  const { rows } = await appPool.query(query, [resolvedTeamId, getCurrentUserId(req)]);
  const team = rows[0];

  if (!team) {
    return { ok: false, status: 404, message: "Team not found" };
  }

  if (team.IsArchived) {
    return { ok: false, status: 400, message: "Team is archived" };
  }

  const privileged = isPrivilegedUser(req.user);
  const superAdmin = isSuperAdminUser(req.user);
  const requesterCompanyId = getCurrentCompanyId(req);
  const sameCompany =
    !requesterCompanyId || Number(requesterCompanyId) === Number(team.CompanyId);

  if (!superAdmin && !sameCompany) {
    return { ok: false, status: 403, message: "Forbidden for requested team" };
  }

  const isMember = Boolean(team.MemberUserId);
  if (!privileged && !isMember) {
    return { ok: false, status: 403, message: "You are not a member of this team" };
  }

  return {
    ok: true,
    team,
    isMember,
    memberRole: team.MemberRole || null,
    canManage: privileged || team.MemberRole === "owner",
  };
};

const resolveChannelAccess = async (req, channelId) => {
  const resolvedChannelId = toInt(channelId);
  if (!resolvedChannelId) {
    return { ok: false, status: 400, message: "Invalid channel id" };
  }

  const query = `
    SELECT
      c."Id" AS "ChannelId",
      c."TeamId",
      c."Name" AS "ChannelName",
      c."Description" AS "ChannelDescription",
      c."ChannelType",
      c."IsArchived" AS "ChannelArchived",
      t."CompanyId",
      t."Name" AS "TeamName",
      tm."UserId" AS "MemberUserId",
      tm."MemberRole"
    FROM "ChatChannels" c
    INNER JOIN "ChatTeams" t
      ON t."Id" = c."TeamId"
    LEFT JOIN "ChatTeamMembers" tm
      ON tm."TeamId" = t."Id"
      AND tm."UserId" = $2
    WHERE c."Id" = $1
    LIMIT 1;
  `;

  const { rows } = await appPool.query(query, [resolvedChannelId, getCurrentUserId(req)]);
  const channel = rows[0];

  if (!channel) {
    return { ok: false, status: 404, message: "Channel not found" };
  }

  if (channel.ChannelArchived) {
    return { ok: false, status: 400, message: "Channel is archived" };
  }

  const privileged = isPrivilegedUser(req.user);
  const superAdmin = isSuperAdminUser(req.user);
  const requesterCompanyId = getCurrentCompanyId(req);
  const sameCompany =
    !requesterCompanyId || Number(requesterCompanyId) === Number(channel.CompanyId);

  if (!superAdmin && !sameCompany) {
    return { ok: false, status: 403, message: "Forbidden for requested channel" };
  }

  const isMember = Boolean(channel.MemberUserId);
  if (!privileged && !isMember) {
    return { ok: false, status: 403, message: "You are not a member of this team" };
  }

  return {
    ok: true,
    channel,
    isMember,
    memberRole: channel.MemberRole || null,
    canManage: privileged || channel.MemberRole === "owner",
  };
};

const getTeamChannelsWithMeta = async ({ teamIds, userId }) => {
  if (!teamIds.length) return [];

  const query = `
    SELECT
      c."Id",
      c."TeamId",
      c."Name",
      c."Description",
      c."ChannelType",
      c."IsDefault",
      c."IsArchived",
      c."CreatedAt",
      c."UpdatedAt",
      COALESCE(unread."UnreadCount", 0)::int AS "UnreadCount",
      lm."Id" AS "LastMessageId",
      lm."MessageText" AS "LastMessageText",
      lm."CreatedAt" AS "LastMessageAt",
      lm."SenderName" AS "LastMessageSender"
    FROM "ChatChannels" c
    LEFT JOIN LATERAL (
      SELECT
        m."Id",
        m."MessageText",
        m."CreatedAt",
        u."Name" AS "SenderName"
      FROM "ChatMessages" m
      LEFT JOIN "Users" u ON u."UserId" = m."SenderUserId"
      WHERE m."ChannelId" = c."Id"
      AND m."IsDeleted" = FALSE
      ORDER BY m."Id" DESC
      LIMIT 1
    ) lm ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS "UnreadCount"
      FROM "ChatMessages" m
      WHERE m."ChannelId" = c."Id"
      AND m."IsDeleted" = FALSE
      AND COALESCE(m."SenderUserId", 0) <> $2
      AND NOT EXISTS (
        SELECT 1
        FROM "ChatMessageReads" r
        WHERE r."MessageId" = m."Id"
        AND r."UserId" = $2
      )
    ) unread ON TRUE
    WHERE c."TeamId" = ANY($1::int[])
    AND c."IsArchived" = FALSE
    ORDER BY c."TeamId", c."IsDefault" DESC, c."Name" ASC;
  `;

  const { rows } = await appPool.query(query, [teamIds, userId]);
  return rows;
};

const getTeams = async (req, res) => {
  try {
    const context = resolveCompanyContext(req, req.query.companyId);
    if (!context.ok) {
      return res.status(context.status).json({ message: context.message });
    }

    const { privileged, superAdmin, companyId } = context;
    const userId = getCurrentUserId(req);
    let teamsResult;

    if (privileged) {
      if (companyId) {
        teamsResult = await appPool.query(
          `
            SELECT
              t.*,
              tm."MemberRole",
              (tm."UserId" IS NOT NULL) AS "IsMember"
            FROM "ChatTeams" t
            LEFT JOIN "ChatTeamMembers" tm
              ON tm."TeamId" = t."Id"
              AND tm."UserId" = $1
            WHERE t."IsArchived" = FALSE
            AND t."CompanyId" = $2
            ORDER BY t."UpdatedAt" DESC, t."Id" DESC;
          `,
          [userId, companyId]
        );
      } else if (superAdmin) {
        teamsResult = await appPool.query(
          `
            SELECT
              t.*,
              tm."MemberRole",
              (tm."UserId" IS NOT NULL) AS "IsMember"
            FROM "ChatTeams" t
            LEFT JOIN "ChatTeamMembers" tm
              ON tm."TeamId" = t."Id"
              AND tm."UserId" = $1
            WHERE t."IsArchived" = FALSE
            ORDER BY t."UpdatedAt" DESC, t."Id" DESC;
          `,
          [userId]
        );
      } else {
        return res.status(400).json({ message: "CompanyId is required" });
      }
    } else {
      if (!companyId) {
        return res.status(400).json({ message: "CompanyId is required" });
      }

      teamsResult = await appPool.query(
        `
          SELECT
            t.*,
            tm."MemberRole",
            TRUE AS "IsMember"
          FROM "ChatTeams" t
          INNER JOIN "ChatTeamMembers" tm
            ON tm."TeamId" = t."Id"
            AND tm."UserId" = $1
          WHERE t."IsArchived" = FALSE
          AND t."CompanyId" = $2
          ORDER BY t."UpdatedAt" DESC, t."Id" DESC;
        `,
        [userId, companyId]
      );
    }

    const teams = teamsResult.rows || [];
    const teamIds = teams.map((team) => Number(team.Id)).filter(Boolean);
    const channels = await getTeamChannelsWithMeta({
      teamIds,
      userId,
    });

    const channelsByTeam = new Map();
    channels.forEach((channel) => {
      const key = Number(channel.TeamId);
      if (!channelsByTeam.has(key)) channelsByTeam.set(key, []);
      channelsByTeam.get(key).push(channel);
    });

    const mapped = teams.map((team) => ({
      ...team,
      channels: channelsByTeam.get(Number(team.Id)) || [],
    }));

    return res.status(200).json({ teams: mapped });
  } catch (error) {
    console.error("Error fetching teams:", error);
    return res.status(500).json({ message: "Failed to fetch teams" });
  }
};

const createTeam = async (req, res) => {
  const client = await appPool.connect();
  try {
    const teamName = normalizeText(req.body.name);
    const description = normalizeText(req.body.description) || null;
    const memberUserIdsRaw = Array.isArray(req.body.memberUserIds)
      ? req.body.memberUserIds
      : [];

    if (!teamName) {
      return res.status(400).json({ message: "Team name is required" });
    }

    const context = resolveCompanyContext(req, req.body.companyId);
    if (!context.ok) {
      return res.status(context.status).json({ message: context.message });
    }

    if (!context.companyId) {
      return res.status(400).json({ message: "CompanyId is required" });
    }

    const currentUserId = getCurrentUserId(req);
    if (!currentUserId) {
      return res.status(401).json({ message: "Invalid user session" });
    }

    const uniqueMemberIds = [...new Set(memberUserIdsRaw.map(toInt).filter(Boolean))].filter(
      (id) => Number(id) !== Number(currentUserId)
    );

    await client.query("BEGIN");

    const teamInsert = await client.query(
      `
        INSERT INTO "ChatTeams" ("CompanyId", "Name", "Description", "CreatedBy")
        VALUES ($1, $2, $3, $4)
        RETURNING *;
      `,
      [context.companyId, teamName, description, currentUserId]
    );
    const team = teamInsert.rows[0];

    await client.query(
      `
        INSERT INTO "ChatTeamMembers" ("TeamId", "UserId", "MemberRole")
        VALUES ($1, $2, 'owner')
        ON CONFLICT ("TeamId", "UserId") DO NOTHING;
      `,
      [team.Id, currentUserId]
    );

    if (uniqueMemberIds.length) {
      const validUsers = await client.query(
        `
          SELECT "UserId"
          FROM "Users"
          WHERE "UserId" = ANY($1::int[])
          AND "CompanyId" = $2
        AND "IsDelete" = FALSE;
      `,
      [uniqueMemberIds, context.companyId]
      );
      const validUserIds = validUsers.rows.map((row) => Number(row.UserId)).filter(Boolean);

      if (validUserIds.length) {
        await client.query(
          `
            INSERT INTO "ChatTeamMembers" ("TeamId", "UserId", "MemberRole")
            SELECT $1, member_id, 'member'
            FROM UNNEST($2::int[]) AS member_id
            ON CONFLICT ("TeamId", "UserId") DO NOTHING;
          `,
          [team.Id, validUserIds]
        );
      }
    }

    const generalChannel = await client.query(
      `
        INSERT INTO "ChatChannels"
        ("TeamId", "Name", "Description", "ChannelType", "IsDefault", "CreatedBy")
        VALUES ($1, 'General', 'Default channel for all team members', 'standard', TRUE, $2)
        RETURNING *;
      `,
      [team.Id, currentUserId]
    );

    await client.query("COMMIT");
    return res.status(201).json({
      message: "Team created successfully",
      team: {
        ...team,
        channels: [generalChannel.rows[0]],
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505") {
      return res.status(409).json({ message: "Team with same name already exists" });
    }
    console.error("Error creating team:", error);
    return res.status(500).json({ message: "Failed to create team" });
  } finally {
    client.release();
  }
};

const getTeamMembers = async (req, res) => {
  try {
    const access = await resolveTeamAccess(req, req.params.teamId);
    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    const { rows } = await appPool.query(
      `
        SELECT
          tm."Id",
          tm."TeamId",
          tm."UserId",
          tm."MemberRole",
          tm."IsMuted",
          tm."LastReadAt",
          tm."JoinedAt",
          u."Name",
          u."Email",
          u."RoleId",
          u."CompanyId",
          u."userImage"
        FROM "ChatTeamMembers" tm
        INNER JOIN "Users" u
          ON u."UserId" = tm."UserId"
        WHERE tm."TeamId" = $1
        AND u."IsDelete" = FALSE
        ORDER BY
          CASE WHEN tm."MemberRole" = 'owner' THEN 0 ELSE 1 END,
          u."Name" ASC;
      `,
      [access.team.Id]
    );

    return res.status(200).json({ members: rows });
  } catch (error) {
    console.error("Error fetching team members:", error);
    return res.status(500).json({ message: "Failed to fetch team members" });
  }
};

const addTeamMembers = async (req, res) => {
  const client = await appPool.connect();
  try {
    const access = await resolveTeamAccess(req, req.params.teamId);
    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }
    if (!access.canManage) {
      return res.status(403).json({ message: "Only team owners can add members" });
    }

    const userIdsRaw = Array.isArray(req.body.userIds) ? req.body.userIds : [];
    const userIds = [...new Set(userIdsRaw.map(toInt).filter(Boolean))];
    if (!userIds.length) {
      return res.status(400).json({ message: "At least one valid user id is required" });
    }

    await client.query("BEGIN");

    const validUsers = await client.query(
      `
        SELECT "UserId"
        FROM "Users"
        WHERE "UserId" = ANY($1::int[])
        AND "CompanyId" = $2
        AND "IsDelete" = FALSE;
      `,
      [userIds, access.team.CompanyId]
    );
    const validUserIds = validUsers.rows.map((row) => Number(row.UserId)).filter(Boolean);

    if (!validUserIds.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "No valid users found in this company" });
    }

    await client.query(
      `
        INSERT INTO "ChatTeamMembers" ("TeamId", "UserId", "MemberRole")
        SELECT $1, member_id, 'member'
        FROM UNNEST($2::int[]) AS member_id
        ON CONFLICT ("TeamId", "UserId") DO NOTHING;
      `,
      [access.team.Id, validUserIds]
    );

    await client.query(
      `
        UPDATE "ChatTeams"
        SET "UpdatedAt" = NOW()
        WHERE "Id" = $1;
      `,
      [access.team.Id]
    );

    await client.query("COMMIT");
    return res.status(200).json({
      message: "Members added successfully",
      addedUserIds: validUserIds,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error adding team members:", error);
    return res.status(500).json({ message: "Failed to add team members" });
  } finally {
    client.release();
  }
};

const removeTeamMember = async (req, res) => {
  const client = await appPool.connect();
  try {
    const access = await resolveTeamAccess(req, req.params.teamId);
    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }
    if (!access.canManage) {
      return res.status(403).json({ message: "Only team owners can remove members" });
    }

    const userIdToRemove = toInt(req.params.userId);
    if (!userIdToRemove) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    await client.query("BEGIN");

    const memberResult = await client.query(
      `
        SELECT "MemberRole"
        FROM "ChatTeamMembers"
        WHERE "TeamId" = $1
        AND "UserId" = $2
        LIMIT 1;
      `,
      [access.team.Id, userIdToRemove]
    );

    const member = memberResult.rows[0];
    if (!member) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Member not found in team" });
    }

    if (member.MemberRole === "owner") {
      const owners = await client.query(
        `
          SELECT COUNT(*)::int AS count
          FROM "ChatTeamMembers"
          WHERE "TeamId" = $1
          AND "MemberRole" = 'owner';
        `,
        [access.team.Id]
      );
      if (Number(owners.rows[0]?.count || 0) <= 1) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Cannot remove the last owner from team" });
      }
    }

    await client.query(
      `
        DELETE FROM "ChatTeamMembers"
        WHERE "TeamId" = $1
        AND "UserId" = $2;
      `,
      [access.team.Id, userIdToRemove]
    );

    await client.query(
      `
        UPDATE "ChatTeams"
        SET "UpdatedAt" = NOW()
        WHERE "Id" = $1;
      `,
      [access.team.Id]
    );

    await client.query("COMMIT");
    return res.status(200).json({ message: "Member removed successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error removing team member:", error);
    return res.status(500).json({ message: "Failed to remove team member" });
  } finally {
    client.release();
  }
};

const getTeamChannels = async (req, res) => {
  try {
    const access = await resolveTeamAccess(req, req.params.teamId);
    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    const channels = await getTeamChannelsWithMeta({
      teamIds: [Number(access.team.Id)],
      userId: getCurrentUserId(req),
    });

    return res.status(200).json({ channels });
  } catch (error) {
    console.error("Error fetching channels:", error);
    return res.status(500).json({ message: "Failed to fetch channels" });
  }
};

const createChannel = async (req, res) => {
  const client = await appPool.connect();
  try {
    const access = await resolveTeamAccess(req, req.params.teamId);
    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    const name = normalizeText(req.body.name);
    const description = normalizeText(req.body.description) || null;
    const channelType = normalizeText(req.body.channelType) || "standard";

    if (!name) {
      return res.status(400).json({ message: "Channel name is required" });
    }

    await client.query("BEGIN");

    const exists = await client.query(
      `
        SELECT 1
        FROM "ChatChannels"
        WHERE "TeamId" = $1
        AND LOWER("Name") = LOWER($2)
        LIMIT 1;
      `,
      [access.team.Id, name]
    );

    if (exists.rows.length) {
      await client.query("ROLLBACK");
      return res.status(409).json({ message: "Channel with same name already exists" });
    }

    const result = await client.query(
      `
        INSERT INTO "ChatChannels"
          ("TeamId", "Name", "Description", "ChannelType", "CreatedBy")
        VALUES
          ($1, $2, $3, $4, $5)
        RETURNING *;
      `,
      [access.team.Id, name, description, channelType, getCurrentUserId(req)]
    );

    await client.query(
      `
        UPDATE "ChatTeams"
        SET "UpdatedAt" = NOW()
        WHERE "Id" = $1;
      `,
      [access.team.Id]
    );

    await client.query("COMMIT");
    return res.status(201).json({
      message: "Channel created successfully",
      channel: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505") {
      return res.status(409).json({ message: "Channel with same name already exists" });
    }
    console.error("Error creating channel:", error);
    return res.status(500).json({ message: "Failed to create channel" });
  } finally {
    client.release();
  }
};

const getChannelMessages = async (req, res) => {
  try {
    const access = await resolveChannelAccess(req, req.params.channelId);
    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    const limitRaw = toInt(req.query.limit);
    const limit = limitRaw ? Math.min(Math.max(limitRaw, 1), 200) : 60;
    const beforeId = toInt(req.query.beforeId);
    const search = normalizeText(req.query.search);

    const values = [access.channel.ChannelId];
    let conditions = `m."ChannelId" = $1 AND m."IsDeleted" = FALSE`;

    if (beforeId) {
      values.push(beforeId);
      conditions += ` AND m."Id" < $${values.length}`;
    }

    if (search) {
      values.push(`%${search}%`);
      conditions += ` AND m."MessageText" ILIKE $${values.length}`;
    }

    values.push(limit);

    const messagesQuery = `
      SELECT
        m."Id",
        m."TeamId",
        m."ChannelId",
        m."SenderUserId",
        m."ParentMessageId",
        m."MessageType",
        m."MessageText",
        m."Metadata",
        m."IsDeleted",
        m."CreatedAt",
        m."UpdatedAt",
        u."Name" AS "SenderName",
        u."Email" AS "SenderEmail",
        u."userImage" AS "SenderImage",
        EXISTS (
          SELECT 1
          FROM "ChatMessageReads" r
          WHERE r."MessageId" = m."Id"
          AND r."UserId" = $${values.length + 1}
        ) AS "IsReadByMe"
      FROM "ChatMessages" m
      LEFT JOIN "Users" u
        ON u."UserId" = m."SenderUserId"
      WHERE ${conditions}
      ORDER BY m."Id" DESC
      LIMIT $${values.length};
    `;

    const params = [...values, getCurrentUserId(req)];
    const { rows } = await appPool.query(messagesQuery, params);

    const messages = rows.reverse();

    return res.status(200).json({
      channel: {
        id: access.channel.ChannelId,
        name: access.channel.ChannelName,
        teamId: access.channel.TeamId,
        teamName: access.channel.TeamName,
      },
      messages,
    });
  } catch (error) {
    console.error("Error fetching channel messages:", error);
    return res.status(500).json({ message: "Failed to fetch messages" });
  }
};

const sendMessage = async (req, res) => {
  const client = await appPool.connect();
  try {
    const access = await resolveChannelAccess(req, req.params.channelId);
    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    const messageText = normalizeText(req.body.messageText);
    const messageType = normalizeText(req.body.messageType) || "text";
    const parentMessageId = toInt(req.body.parentMessageId);
    const metadata =
      req.body.metadata && typeof req.body.metadata === "object" && !Array.isArray(req.body.metadata)
        ? req.body.metadata
        : {};

    if (!messageText) {
      return res.status(400).json({ message: "Message cannot be empty" });
    }
    if (messageText.length > 5000) {
      return res.status(400).json({ message: "Message is too long (max 5000 chars)" });
    }

    const currentUserId = getCurrentUserId(req);
    if (!currentUserId) {
      return res.status(401).json({ message: "Invalid user session" });
    }

    await client.query("BEGIN");

    const insertResult = await client.query(
      `
        INSERT INTO "ChatMessages"
          ("TeamId", "ChannelId", "SenderUserId", "ParentMessageId", "MessageType", "MessageText", "Metadata")
        VALUES
          ($1, $2, $3, $4, $5, $6, $7::jsonb)
        RETURNING *;
      `,
      [
        access.channel.TeamId,
        access.channel.ChannelId,
        currentUserId,
        parentMessageId,
        messageType,
        messageText,
        JSON.stringify(metadata),
      ]
    );
    const message = insertResult.rows[0];

    await client.query(
      `
        INSERT INTO "ChatMessageReads" ("MessageId", "UserId", "ReadAt")
        VALUES ($1, $2, NOW())
        ON CONFLICT ("MessageId", "UserId")
        DO UPDATE SET "ReadAt" = EXCLUDED."ReadAt";
      `,
      [message.Id, currentUserId]
    );

    await client.query(
      `
        UPDATE "ChatChannels"
        SET "UpdatedAt" = NOW()
        WHERE "Id" = $1;
      `,
      [access.channel.ChannelId]
    );

    await client.query(
      `
        UPDATE "ChatTeams"
        SET "UpdatedAt" = NOW()
        WHERE "Id" = $1;
      `,
      [access.channel.TeamId]
    );

    await client.query("COMMIT");

    const messageWithSender = await appPool.query(
      `
        SELECT
          m.*,
          u."Name" AS "SenderName",
          u."Email" AS "SenderEmail",
          u."userImage" AS "SenderImage",
          TRUE AS "IsReadByMe"
        FROM "ChatMessages" m
        LEFT JOIN "Users" u ON u."UserId" = m."SenderUserId"
        WHERE m."Id" = $1
        LIMIT 1;
      `,
      [message.Id]
    );
    const data = messageWithSender.rows[0];
    const io = getIO();
    if (io && data) {
      io.to(`channel:${access.channel.ChannelId}`).emit("message_created", {
        channelId: Number(access.channel.ChannelId),
        teamId: Number(access.channel.TeamId),
        message: data,
      });
      io.to(`channel:${access.channel.ChannelId}`).emit("channel_updated", {
        channelId: Number(access.channel.ChannelId),
        teamId: Number(access.channel.TeamId),
      });
    }

    return res.status(201).json({
      message: "Message sent",
      data,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error sending message:", error);
    return res.status(500).json({ message: "Failed to send message" });
  } finally {
    client.release();
  }
};

const markChannelAsRead = async (req, res) => {
  try {
    const access = await resolveChannelAccess(req, req.params.channelId);
    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    const currentUserId = getCurrentUserId(req);
    if (!currentUserId) {
      return res.status(401).json({ message: "Invalid user session" });
    }

    const upsertReads = await appPool.query(
      `
        INSERT INTO "ChatMessageReads" ("MessageId", "UserId", "ReadAt")
        SELECT m."Id", $2, NOW()
        FROM "ChatMessages" m
        WHERE m."ChannelId" = $1
        AND m."IsDeleted" = FALSE
        AND COALESCE(m."SenderUserId", 0) <> $2
        ON CONFLICT ("MessageId", "UserId")
        DO UPDATE SET "ReadAt" = EXCLUDED."ReadAt";
      `,
      [access.channel.ChannelId, currentUserId]
    );

    await appPool.query(
      `
        UPDATE "ChatTeamMembers"
        SET "LastReadAt" = NOW()
        WHERE "TeamId" = $1
        AND "UserId" = $2;
      `,
      [access.channel.TeamId, currentUserId]
    );

    const unreadResult = await appPool.query(
      `
        SELECT COUNT(*)::int AS count
        FROM "ChatMessages" m
        WHERE m."ChannelId" = $1
        AND m."IsDeleted" = FALSE
        AND COALESCE(m."SenderUserId", 0) <> $2
        AND NOT EXISTS (
          SELECT 1
          FROM "ChatMessageReads" r
          WHERE r."MessageId" = m."Id"
          AND r."UserId" = $2
        );
      `,
      [access.channel.ChannelId, currentUserId]
    );

    return res.status(200).json({
      message: "Channel marked as read",
      processed: upsertReads.rowCount || 0,
      unreadCount: Number(unreadResult.rows[0]?.count || 0),
    });
  } catch (error) {
    console.error("Error marking channel as read:", error);
    return res.status(500).json({ message: "Failed to mark as read" });
  }
};

const getCompanyUsers = async (req, res) => {
  try {
    const context = resolveCompanyContext(req, req.query.companyId);
    if (!context.ok) {
      return res.status(context.status).json({ message: context.message });
    }

    if (!context.companyId) {
      return res.status(400).json({ message: "CompanyId is required" });
    }

    const { rows } = await appPool.query(
      `
        SELECT
          "UserId",
          "Name",
          "Email",
          "RoleId",
          "UserTypeId",
          "CompanyId",
          "ReportingManagerId",
          "userImage"
        FROM "Users"
        WHERE "CompanyId" = $1
        AND "IsDelete" = FALSE
        AND "IsActive" = TRUE
        ORDER BY "Name" ASC;
      `,
      [context.companyId]
    );

    return res.status(200).json({ users: rows });
  } catch (error) {
    console.error("Error fetching company users:", error);
    return res.status(500).json({ message: "Failed to fetch users" });
  }
};

module.exports = {
  getTeams,
  createTeam,
  getTeamMembers,
  addTeamMembers,
  removeTeamMember,
  getTeamChannels,
  createChannel,
  getChannelMessages,
  sendMessage,
  markChannelAsRead,
  getCompanyUsers,
};
