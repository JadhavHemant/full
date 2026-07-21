const { appPool } = require("../config/db");
const { buildMessages, ensureChannelAccess, getChannelById, getMessageById, messageSelect } = require("../utils/chatHelpers");
const { getIO } = require("../sockets/chatSocket");
const { uploadLocalFile } = require("../utils/cloudinary");

const toInt = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalize = (value) => String(value || "").trim();
const currentUserId = (req) => Number(req.user?.userId || req.user?.id);

const touchChannel = async (channelId, messageId) => {
  await appPool.query(
    `
      UPDATE "ChatAppChannels"
      SET "LastMessageId" = $2,
          "LastActivity" = NOW(),
          "UpdatedAt" = NOW()
      WHERE "Id" = $1;
    `,
    [channelId, messageId]
  );
};

const listMessages = async (req, res) => {
  try {
    const channelId = toInt(req.params.id);
    const access = await ensureChannelAccess(channelId, currentUserId(req));
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    const cursor = toInt(req.query.cursor);
    const limit = Math.min(Math.max(toInt(req.query.limit) || 50, 1), 50);
    const params = [channelId];
    let where = `m."ChannelId" = $1`;
    if (cursor) {
      params.push(cursor);
      where += ` AND m."Id" < $${params.length}`;
    }
    params.push(limit);

    const { rows } = await appPool.query(
      `${messageSelect} WHERE ${where} ORDER BY m."Id" DESC LIMIT $${params.length};`,
      params
    );

    const messages = await buildMessages(rows.reverse());
    res.status(200).json({
      messages,
      nextCursor: messages.length ? messages[0]._id : null,
      hasMore: rows.length === limit,
    });
  } catch (error) {
    console.error("Failed to fetch messages", error);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
};

const createStoredMessage = async ({ channelId, senderUserId, content, type, fileUrl, fileName, fileSize, fileType }) => {
  const insert = await appPool.query(
    `
      INSERT INTO "ChatAppMessages"
      ("ChannelId", "SenderUserId", "Content", "Type", "FileUrl", "FileName", "FileSize", "FileType")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING "Id";
    `,
    [channelId, senderUserId, content || null, type, fileUrl || null, fileName || null, fileSize || null, fileType || null]
  );

  await appPool.query(
    `
      INSERT INTO "ChatAppMessageReads" ("MessageId", "UserId", "ReadAt")
      VALUES ($1, $2, NOW())
      ON CONFLICT ("MessageId", "UserId")
      DO UPDATE SET "ReadAt" = EXCLUDED."ReadAt";
    `,
    [insert.rows[0].Id, senderUserId]
  );

  await appPool.query(
    `
      UPDATE "ChatAppChannelMembers"
      SET "LastReadMessageId" = $2, "LastReadAt" = NOW()
      WHERE "ChannelId" = $1 AND "UserId" = $3;
    `,
    [channelId, insert.rows[0].Id, senderUserId]
  );

  await touchChannel(channelId, insert.rows[0].Id);
  return getMessageById(insert.rows[0].Id);
};

const createMessage = async (req, res) => {
  try {
    const channelId = toInt(req.params.id);
    const access = await ensureChannelAccess(channelId, currentUserId(req));
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    const content = normalize(req.body.content);
    const type = normalize(req.body.type) || "text";
    const fileUrl = req.body.fileUrl || null;
    const fileName = req.body.fileName || null;
    const fileSize = toInt(req.body.fileSize);
    const fileType = req.body.fileType || null;

    if (!content && !fileUrl) {
      return res.status(400).json({ message: "Message content is required" });
    }

    const message = await createStoredMessage({
      channelId,
      senderUserId: currentUserId(req),
      content,
      type,
      fileUrl,
      fileName,
      fileSize,
      fileType,
    });

    const io = getIO();
    if (io) {
      io.to(`channel:${channelId}`).emit("new_message", { message });
      const channel = await getChannelById(channelId, currentUserId(req));
      channel.members.forEach((member) => io.to(`user:${member.user.userId}`).emit("channel_updated", { channel }));
    }

    res.status(201).json({ message });
  } catch (error) {
    console.error("Failed to send message", error);
    res.status(500).json({ message: "Failed to send message" });
  }
};

const uploadAttachment = async (req, res) => {
  try {
    const channelId = toInt(req.params.id);
    const access = await ensureChannelAccess(channelId, currentUserId(req));
    if (!access.ok) return res.status(access.status).json({ message: access.message });
    if (!req.file) return res.status(400).json({ message: "File is required" });

    const uploaded = await uploadLocalFile(req.file);
    res.status(201).json({
      fileUrl: uploaded.secure_url,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      type: req.file.mimetype?.startsWith("image/") ? "image" : "file",
    });
  } catch (error) {
    console.error("Failed to upload attachment", error);
    res.status(500).json({ message: "Failed to upload attachment" });
  }
};

const editMessage = async (req, res) => {
  try {
    const messageId = toInt(req.params.id);
    const message = await getMessageById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });
    if (Number(message.sender.userId) !== currentUserId(req)) {
      return res.status(403).json({ message: "Only the sender can edit the message" });
    }

    await appPool.query(
      `
        UPDATE "ChatAppMessages"
        SET "Content" = $2, "IsEdited" = TRUE, "EditedAt" = NOW(), "UpdatedAt" = NOW()
        WHERE "Id" = $1;
      `,
      [messageId, normalize(req.body.content)]
    );
    const updated = await getMessageById(messageId);
    const io = getIO();
    if (io) io.to(`channel:${updated.channel}`).emit("message_updated", { message: updated });
    res.status(200).json({ message: updated });
  } catch (error) {
    console.error("Failed to edit message", error);
    res.status(500).json({ message: "Failed to edit message" });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const messageId = toInt(req.params.id);
    const message = await getMessageById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });
    if (Number(message.sender.userId) !== currentUserId(req)) {
      return res.status(403).json({ message: "Only the sender can delete the message" });
    }
    await appPool.query(
      `
        UPDATE "ChatAppMessages"
        SET "IsDeleted" = TRUE, "Content" = '', "UpdatedAt" = NOW()
        WHERE "Id" = $1;
      `,
      [messageId]
    );
    const io = getIO();
    if (io) {
      io.to(`channel:${message.channel}`).emit("message_deleted", {
        messageId,
        channelId: message.channel,
      });
    }
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Failed to delete message", error);
    res.status(500).json({ message: "Failed to delete message" });
  }
};

const toggleReaction = async (req, res) => {
  try {
    const messageId = toInt(req.params.id);
    const emoji = normalize(req.body.emoji);
    if (!emoji) return res.status(400).json({ message: "Emoji is required" });

    const existing = await appPool.query(
      `
        SELECT 1
        FROM "ChatAppReactions"
        WHERE "MessageId" = $1 AND "UserId" = $2 AND "Emoji" = $3
        LIMIT 1;
      `,
      [messageId, currentUserId(req), emoji]
    );

    if (existing.rows[0]) {
      await appPool.query(`DELETE FROM "ChatAppReactions" WHERE "MessageId" = $1 AND "UserId" = $2 AND "Emoji" = $3;`, [messageId, currentUserId(req), emoji]);
    } else {
      await appPool.query(
        `
          INSERT INTO "ChatAppReactions" ("MessageId", "UserId", "Emoji")
          VALUES ($1, $2, $3);
        `,
        [messageId, currentUserId(req), emoji]
      );
    }

    const updated = await getMessageById(messageId);
    const io = getIO();
    if (io && updated) {
      io.to(`channel:${updated.channel}`).emit("reaction_updated", {
        messageId,
        reactions: updated.reactions,
      });
    }
    res.status(200).json({ reactions: updated?.reactions || [] });
  } catch (error) {
    console.error("Failed to toggle reaction", error);
    res.status(500).json({ message: "Failed to toggle reaction" });
  }
};

const markRead = async (req, res) => {
  try {
    const messageId = toInt(req.params.id);
    const message = await getMessageById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });

    await appPool.query(
      `
        INSERT INTO "ChatAppMessageReads" ("MessageId", "UserId", "ReadAt")
        VALUES ($1, $2, NOW())
        ON CONFLICT ("MessageId", "UserId")
        DO UPDATE SET "ReadAt" = EXCLUDED."ReadAt";
      `,
      [messageId, currentUserId(req)]
    );
    await appPool.query(
      `
        UPDATE "ChatAppChannelMembers"
        SET "LastReadMessageId" = $2, "LastReadAt" = NOW()
        WHERE "ChannelId" = $1 AND "UserId" = $3;
      `,
      [message.channel, messageId, currentUserId(req)]
    );

    const io = getIO();
    if (io) {
      io.to(`channel:${message.channel}`).emit("message_read", {
        channelId: message.channel,
        messageId,
        userId: currentUserId(req),
      });
      const channel = await getChannelById(message.channel, currentUserId(req));
      channel.members.forEach((member) => io.to(`user:${member.user.userId}`).emit("channel_updated", { channel }));
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Failed to mark message as read", error);
    res.status(500).json({ message: "Failed to mark message as read" });
  }
};

module.exports = {
  createMessage,
  deleteMessage,
  editMessage,
  listMessages,
  markRead,
  toggleReaction,
  uploadAttachment,
};
