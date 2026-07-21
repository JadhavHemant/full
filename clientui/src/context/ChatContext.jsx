import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import chatApi from "../api/chat";
import { getSessionUser } from "../utils/sessionUser";
import useSocket from "../hooks/useSocket";
import useChatMessages from "../hooks/useChatMessages";

const ChatContext = createContext(null);
let cachedChannels = [];

const replaceMessage = (messages, nextMessage) =>
  messages.map((message) => {
    if (message._id === nextMessage._id) return nextMessage;
    if (message.optimisticId && nextMessage.optimisticId && message.optimisticId === nextMessage.optimisticId) {
      return nextMessage;
    }
    if (message.isOptimistic && message.content === nextMessage.content && message.sender?.userId === nextMessage.sender?.userId) {
      return nextMessage;
    }
    return message;
  });

const sortChannelsByActivity = (channels) =>
  [...channels].sort(
    (a, b) => new Date(b.lastActivity || 0).getTime() - new Date(a.lastActivity || 0).getTime()
  );

const buildLastMessagePreview = (message) => {
  if (!message) return null;
  if (message.isDeleted) {
    return { ...message, content: "" };
  }
  if (message.type === "image") {
    return { ...message, content: message.content || "Image" };
  }
  if (message.type === "file") {
    return { ...message, content: message.fileName || message.content || "Attachment" };
  }
  return message;
};

export const ChatProvider = ({ children }) => {
  const sessionUser = getSessionUser() || {};
  const currentUserId = Number(sessionUser.id || sessionUser.userId);
  const [channels, setChannels] = useState([]);
  const [activeChannelId, setActiveChannelId] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  const [membersPanelOpen, setMembersPanelOpen] = useState(true);
  const [imageLightbox, setImageLightbox] = useState(null);
  const { socket, connected } = useSocket();

  const refreshChannels = useCallback(async () => {
    const nextChannels = await chatApi.getChannels();
    cachedChannels = nextChannels;
    setChannels(nextChannels);
    if (!activeChannelId && nextChannels[0]?._id) {
      setActiveChannelId(nextChannels[0]._id);
    }
  }, [activeChannelId]);

  const markMessageRead = useCallback(
    async (messageId) => {
      if (!messageId) return;
      try {
        await chatApi.markRead(messageId);
        socket?.emit("message_read", {
          channelId: activeChannelId,
          messageId,
        });
      } catch {
        // best effort
      }
    },
    [activeChannelId, socket]
  );

  const { messages, setMessages, loading, hasMore, loadOlder, scrollAnchorRef } = useChatMessages({
    activeChannelId,
    onRead: markMessageRead,
  });

  const activeChannel = useMemo(
    () => channels.find((channel) => Number(channel._id) === Number(activeChannelId)) || null,
    [activeChannelId, channels]
  );

  const updateChannelWithMessage = useCallback((channelId, message, options = {}) => {
    const {
      incrementUnread = false,
      markAsRead = false,
      forceDeletedPreview = false,
    } = options;

    setChannels((prev) => {
      const next = prev.map((channel) => {
        if (Number(channel._id) !== Number(channelId)) return channel;

        const unreadCount = markAsRead
          ? 0
          : Math.max(0, Number(channel.unreadCount || 0) + (incrementUnread ? 1 : 0));

        return {
          ...channel,
          lastActivity: message?.createdAt || message?.updatedAt || new Date().toISOString(),
          lastMessage: forceDeletedPreview
            ? { ...(channel.lastMessage || {}), isDeleted: true, content: "" }
            : buildLastMessagePreview(message) || channel.lastMessage,
          unreadCount,
        };
      });

      return sortChannelsByActivity(next);
    });
  }, []);

  useEffect(() => {
    if (cachedChannels.length) {
      setChannels(cachedChannels);
      if (!activeChannelId && cachedChannels[0]?._id) {
        setActiveChannelId(cachedChannels[0]._id);
      }
    }
    refreshChannels().catch(() => toast.error("Failed to load chat channels"));
  }, [refreshChannels]);

  useEffect(() => {
    if (!socket || !activeChannelId) return;
    socket.emit("join_channel", { channelId: activeChannelId });
    return () => {
      socket.emit("leave_channel", { channelId: activeChannelId });
    };
  }, [activeChannelId, socket]);

  useEffect(() => {
    if (!socket) return;

    const onNewMessage = ({ message }) => {
      const isOwnMessage = Number(message.sender?.userId) === Number(currentUserId);
      const isActiveChannel = Number(message.channel) === Number(activeChannelId);

      if (Number(message.channel) === Number(activeChannelId)) {
        setMessages((prev) => {
          const exists = prev.some((item) => Number(item._id) === Number(message._id));
          if (exists) return replaceMessage(prev, message);
          return [...replaceMessage(prev, message), message];
        });
      }
      updateChannelWithMessage(message.channel, message, {
        incrementUnread: !isOwnMessage && !isActiveChannel,
        markAsRead: isActiveChannel,
      });

    };

    const onUpdatedMessage = ({ message }) => {
      setMessages((prev) => replaceMessage(prev, message));
      updateChannelWithMessage(message.channel, message);
    };

    const onDeletedMessage = ({ messageId, channelId }) => {
      setMessages((prev) =>
        prev.map((item) =>
          Number(item._id) === Number(messageId)
            ? { ...item, isDeleted: true, content: "" }
            : item
        )
      );
      updateChannelWithMessage(channelId, null, { forceDeletedPreview: true });
    };

    const onReactionUpdated = ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((item) =>
          Number(item._id) === Number(messageId) ? { ...item, reactions } : item
        )
      );
    };

    const onChannelUpdated = ({ channel, removedChannelId }) => {
      if (removedChannelId) {
        setChannels((prev) => prev.filter((item) => Number(item._id) !== Number(removedChannelId)));
        return;
      }
      if (!channel) return;
      setChannels((prev) => {
        const exists = prev.some((item) => Number(item._id) === Number(channel._id));
        const next = exists
          ? prev.map((item) => (Number(item._id) === Number(channel._id) ? channel : item))
          : [channel, ...prev];
        return [...next].sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
      });
    };

    const onNewChannel = ({ channel }) => {
      setChannels((prev) => {
        const exists = prev.some((item) => Number(item._id) === Number(channel._id));
        return exists ? prev : [channel, ...prev];
      });
    };

    const onTyping = ({ userId, userName, channelId }) => {
      if (Number(userId) === currentUserId || Number(channelId) !== Number(activeChannelId)) return;
      setTypingUsers((prev) => ({
        ...prev,
        [userId]: { userId, userName, channelId },
      }));
    };

    const onStopTyping = ({ userId, channelId }) => {
      if (Number(channelId) !== Number(activeChannelId)) return;
      setTypingUsers((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    };

    const refreshPresence = ({ userId, online }) => {
      setChannels((prev) =>
        prev.map((channel) => ({
          ...channel,
          members: (channel.members || []).map((member) =>
            Number(member.user.userId) === Number(userId)
              ? { ...member, user: { ...member.user, isOnline: online, lastSeen: online ? member.user.lastSeen : new Date().toISOString() } }
              : member
          ),
        }))
      );
    };

    socket.on("new_message", onNewMessage);
    socket.on("message_updated", onUpdatedMessage);
    socket.on("message_deleted", onDeletedMessage);
    socket.on("reaction_updated", onReactionUpdated);
    socket.on("channel_updated", onChannelUpdated);
    socket.on("new_channel", onNewChannel);
    socket.on("user_typing", onTyping);
    socket.on("user_stop_typing", onStopTyping);
    socket.on("user_online", ({ userId }) => refreshPresence({ userId, online: true }));
    socket.on("user_offline", ({ userId }) => refreshPresence({ userId, online: false }));

    return () => {
      socket.off("new_message", onNewMessage);
      socket.off("message_updated", onUpdatedMessage);
      socket.off("message_deleted", onDeletedMessage);
      socket.off("reaction_updated", onReactionUpdated);
      socket.off("channel_updated", onChannelUpdated);
      socket.off("new_channel", onNewChannel);
      socket.off("user_typing", onTyping);
      socket.off("user_stop_typing", onStopTyping);
      socket.off("user_online");
      socket.off("user_offline");
    };
  }, [activeChannelId, currentUserId, refreshChannels, setMessages, socket]);

  useEffect(() => {
    if (!activeChannelId || !messages.length) return;
    const lastMessage = messages.at(-1);
    if (!lastMessage?._id) return;
    updateChannelWithMessage(activeChannelId, lastMessage, { markAsRead: true });
  }, [activeChannelId, messages, updateChannelWithMessage]);

  const sendMessage = useCallback(
    async ({ content, attachment = null }) => {
      if (!activeChannelId) return;
      const optimisticId = `temp-${Date.now()}`;
      const optimisticMessage = {
        _id: optimisticId,
        optimisticId,
        isOptimistic: true,
        channel: activeChannelId,
        sender: {
          userId: currentUserId,
          name: sessionUser.name || sessionUser.Name || "You",
          avatar: sessionUser.userImage || null,
          isOnline: true,
        },
        content: content || "",
        type: attachment?.type || "text",
        fileUrl: attachment?.fileUrl || null,
        fileName: attachment?.fileName || null,
        fileSize: attachment?.fileSize || null,
        fileType: attachment?.fileType || null,
        reactions: [],
        readBy: [],
        isEdited: false,
        isDeleted: false,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimisticMessage]);

      try {
        let payload = {
          content,
          type: "text",
        };
        if (attachment?.file) {
          const uploaded = await chatApi.uploadFile(activeChannelId, attachment.file);
          payload = {
            content: content || "",
            type: uploaded.type,
            fileUrl: uploaded.fileUrl,
            fileName: uploaded.fileName,
            fileSize: uploaded.fileSize,
            fileType: uploaded.fileType,
          };
        }
        const message = await chatApi.sendMessage(activeChannelId, payload);
        setMessages((prev) => prev.map((item) => (item._id === optimisticId ? message : item)));
        updateChannelWithMessage(activeChannelId, message, { markAsRead: true });
        return message;
      } catch (error) {
        setMessages((prev) =>
          prev.map((item) =>
            item._id === optimisticId ? { ...item, failed: true } : item
          )
        );
        throw error;
      }
    },
    [activeChannelId, currentUserId, sessionUser, setMessages, updateChannelWithMessage]
  );

  const value = {
    channels,
    refreshChannels,
    activeChannel,
    activeChannelId,
    setActiveChannelId,
    messages,
    setMessages,
    sendMessage,
    loadingMessages: loading,
    hasMoreMessages: hasMore,
    loadOlderMessages: loadOlder,
    scrollAnchorRef,
    socket,
    connected,
    currentUserId,
    typingUsers: Object.values(typingUsers),
    markMessageRead,
    membersPanelOpen,
    setMembersPanelOpen,
    imageLightbox,
    setImageLightbox,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChat must be used within ChatProvider");
  return context;
};

export default ChatContext;
