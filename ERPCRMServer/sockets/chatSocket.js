const jwt = require("jsonwebtoken");
const { appPool } = require("../config/db");
const { getChannelById, getMessageById } = require("../utils/chatHelpers");
const { socketEventsTotal } = require("../middlewares/prometheusMetrics");

let ioInstance = null;

const getTokenFromSocket = (socket) => {
  const authHeader = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
  if (!authHeader) return null;
  if (authHeader.startsWith?.("Bearer ")) return authHeader.slice(7);
  return authHeader;
};

const broadcastPresence = async (userId, isOnline) => {
  if (!ioInstance) return;
  ioInstance.emit(isOnline ? "user_online" : "user_offline", { userId: Number(userId) });
};

const getActiveUserById = async (userId) => {
  const { rows } = await appPool.query(
    `
      SELECT "UserId"
      FROM "Users"
      WHERE "UserId" = $1
      AND COALESCE("IsDelete", FALSE) = FALSE
      LIMIT 1;
    `,
    [userId]
  );
  return rows[0] || null;
};

const setPresence = async (userId, delta) => {
  const { rows } = await appPool.query(
    `
      INSERT INTO "ChatAppPresence" ("UserId", "IsOnline", "LastSeen", "SocketCount", "UpdatedAt")
      VALUES ($1, TRUE, NOW(), GREATEST($2, 0), NOW())
      ON CONFLICT ("UserId")
      DO UPDATE SET
        "SocketCount" = GREATEST("ChatAppPresence"."SocketCount" + $2, 0),
        "IsOnline" = GREATEST("ChatAppPresence"."SocketCount" + $2, 0) > 0,
        "LastSeen" = CASE WHEN GREATEST("ChatAppPresence"."SocketCount" + $2, 0) > 0 THEN "ChatAppPresence"."LastSeen" ELSE NOW() END,
        "UpdatedAt" = NOW()
      RETURNING "IsOnline", "SocketCount";
    `,
    [userId, delta]
  );
  return rows[0];
};

const emitChannelUpdate = async (channelId, actorUserId = null) => {
  if (!ioInstance) return;
  const channel = await getChannelById(channelId, actorUserId);
  if (!channel) return;
  ioInstance.to(`channel:${channelId}`).emit("channel_updated", { channel });
  channel.members.forEach((member) => {
    ioInstance.to(`user:${member.user.userId}`).emit("channel_updated", { channel });
  });
};

const initializeChatSocket = (io) => {
  ioInstance = io;

  io.use((socket, next) => {
    try {
      const token = getTokenFromSocket(socket);
      if (!token) return next(new Error("Unauthorized"));
      socket.user = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      next();
    } catch (error) {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", async (socket) => {
    socketEventsTotal.inc({ event: 'connection' });
    const userId = Number(socket.user?.userId || socket.user?.id);
    if (!userId) {
      socket.disconnect(true);
      return;
    }

    const activeUser = await getActiveUserById(userId);
    if (!activeUser) {
      socket.emit("socket_error", { message: "User session is no longer valid. Please log in again." });
      socket.disconnect(true);
      return;
    }

    socket.join(`user:${userId}`);
    try {
      const presence = await setPresence(userId, 1);
      if (presence?.SocketCount === 1) {
        await broadcastPresence(userId, true);
      }
    } catch (error) {
      console.error("Failed to set socket presence on connect:", error);
      socket.emit("socket_error", { message: "Unable to establish chat presence." });
      socket.disconnect(true);
      return;
    }

    socket.on("join_channel", ({ channelId }) => {
      if (channelId) socket.join(`channel:${channelId}`);
    });

    socket.on("leave_channel", ({ channelId }) => {
      if (channelId) socket.leave(`channel:${channelId}`);
    });

    socket.on("typing_start", ({ channelId }) => {
      if (!channelId) return;
      socket.to(`channel:${channelId}`).emit("user_typing", {
        userId,
        userName: socket.user?.name || "Someone",
        channelId: Number(channelId),
      });
    });

    socket.on("typing_stop", ({ channelId }) => {
      if (!channelId) return;
      socket.to(`channel:${channelId}`).emit("user_stop_typing", {
        userId,
        channelId: Number(channelId),
      });
    });

    socket.on("message_read", async ({ channelId, messageId }) => {
      if (!channelId || !messageId) return;
      await appPool.query(
        `
          INSERT INTO "ChatAppMessageReads" ("MessageId", "UserId", "ReadAt")
          VALUES ($1, $2, NOW())
          ON CONFLICT ("MessageId", "UserId")
          DO UPDATE SET "ReadAt" = EXCLUDED."ReadAt";
        `,
        [messageId, userId]
      );
      socket.to(`channel:${channelId}`).emit("message_read", {
        channelId: Number(channelId),
        messageId: Number(messageId),
        userId,
      });
      await emitChannelUpdate(channelId, userId);
    });

    socket.on("add_reaction", async ({ messageId, emoji }) => {
      if (!messageId || !emoji) return;
      await appPool.query(
        `
          INSERT INTO "ChatAppReactions" ("MessageId", "UserId", "Emoji")
          VALUES ($1, $2, $3)
          ON CONFLICT ("MessageId", "UserId", "Emoji") DO NOTHING;
        `,
        [messageId, userId, emoji]
      );
      const message = await getMessageById(messageId);
      if (message) {
        io.to(`channel:${message.channel}`).emit("reaction_updated", {
          messageId: Number(messageId),
          reactions: message.reactions,
        });
      }
    });

    socket.on("remove_reaction", async ({ messageId, emoji }) => {
      if (!messageId || !emoji) return;
      await appPool.query(
        `
          DELETE FROM "ChatAppReactions"
          WHERE "MessageId" = $1 AND "UserId" = $2 AND "Emoji" = $3;
        `,
        [messageId, userId, emoji]
      );
      const message = await getMessageById(messageId);
      if (message) {
        io.to(`channel:${message.channel}`).emit("reaction_updated", {
          messageId: Number(messageId),
          reactions: message.reactions,
        });
      }
    });

    socket.on("disconnect", async () => {
      socketEventsTotal.inc({ event: 'disconnect' });
      try {
        const nextPresence = await setPresence(userId, -1);
        if (!nextPresence?.IsOnline) {
          await broadcastPresence(userId, false);
        }
      } catch (error) {
        console.error("Failed to set socket presence on disconnect:", error);
      }
    });
  });
};

const getIO = () => ioInstance;

module.exports = {
  emitChannelUpdate,
  getIO,
  initializeChatSocket,
};
