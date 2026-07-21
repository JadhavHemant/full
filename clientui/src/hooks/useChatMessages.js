import { useEffect, useRef, useState } from "react";
import chatApi from "../api/chat";

const messageCache = new Map();

export const useChatMessages = ({ activeChannelId, onRead }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState(null);
  const scrollAnchorRef = useRef(null);

  useEffect(() => {
    if (!activeChannelId) {
      setMessages([]);
      setCursor(null);
      setHasMore(true);
      return;
    }

    const cached = messageCache.get(String(activeChannelId));
    if (cached) {
      setMessages(cached.messages);
      setCursor(cached.cursor);
      setHasMore(cached.hasMore);
      return;
    }

    setMessages([]);
    setCursor(null);
    setHasMore(true);
  }, [activeChannelId]);

  useEffect(() => {
    if (!activeChannelId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const data = await chatApi.getMessages(activeChannelId, { limit: 50 });
        if (cancelled) return;
        const nextMessages = data.messages || [];
        const nextCursor = data.nextCursor || null;
        const nextHasMore = Boolean(data.hasMore);

        messageCache.set(String(activeChannelId), {
          messages: nextMessages,
          cursor: nextCursor,
          hasMore: nextHasMore,
        });

        setMessages(nextMessages);
        setCursor(nextCursor);
        setHasMore(nextHasMore);
        const lastMessage = nextMessages.at(-1);
        if (lastMessage?._id) {
          onRead?.(lastMessage._id);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [activeChannelId, onRead]);

  const loadOlder = async () => {
    if (!activeChannelId || !cursor || !hasMore || loading) return;
    setLoading(true);
    try {
      const previousHeight = scrollAnchorRef.current?.scrollHeight || 0;
      const data = await chatApi.getMessages(activeChannelId, { limit: 50, cursor });
      const nextCursor = data.nextCursor || null;
      const nextHasMore = Boolean(data.hasMore);

      setMessages((prev) => {
        const nextMessages = [...(data.messages || []), ...prev];
        messageCache.set(String(activeChannelId), {
          messages: nextMessages,
          cursor: nextCursor,
          hasMore: nextHasMore,
        });
        return nextMessages;
      });
      setCursor(nextCursor);
      setHasMore(nextHasMore);
      requestAnimationFrame(() => {
        if (!scrollAnchorRef.current) return;
        const nextHeight = scrollAnchorRef.current.scrollHeight;
        scrollAnchorRef.current.scrollTop = nextHeight - previousHeight;
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    messages,
    setMessages,
    loading,
    hasMore,
    loadOlder,
    scrollAnchorRef,
  };
};

export default useChatMessages;
