import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import useSocket from "../../hooks/useSocket";
import { getSessionUser } from "../../utils/sessionUser";

const buildPreview = (message) => {
  if (message?.isDeleted) return "Message deleted";
  if (message?.type === "image") return message.content || "Image received";
  if (message?.type === "file") return message.fileName || message.content || "Attachment received";
  return message?.content || "New message received";
};

const playNotificationSound = (audioContextRef) => {
  if (typeof window === "undefined") return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  try {
    const context = audioContextRef.current || new AudioContextClass();
    audioContextRef.current = context;

    if (context.state === "suspended") {
      context.resume().catch(() => {});
    }

    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    const startAt = context.currentTime;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, startAt);
    oscillator.frequency.exponentialRampToValueAtTime(660, startAt + 0.18);
    gainNode.gain.setValueAtTime(0.0001, startAt);
    gainNode.gain.exponentialRampToValueAtTime(0.08, startAt + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.22);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + 0.24);
  } catch {
    // best effort
  }
};

export default function GlobalMessageListener() {
  const { socket } = useSocket();
  const audioContextRef = useRef(null);
  const seenMessageIds = useRef(new Set());
  const sessionUser = getSessionUser() || {};
  const currentUserId = Number(sessionUser.id || sessionUser.userId);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onNewMessage = ({ message }) => {
      const messageId = String(message?._id || "");
      if (!messageId || seenMessageIds.current.has(messageId)) return;
      seenMessageIds.current.add(messageId);

      if (seenMessageIds.current.size > 200) {
        const ids = Array.from(seenMessageIds.current).slice(-100);
        seenMessageIds.current = new Set(ids);
      }

      if (Number(message?.sender?.userId) === Number(currentUserId)) return;

      const senderName = message?.sender?.name || "New message";
      const preview = buildPreview(message);

      toast(`${senderName}: ${preview.length > 80 ? `${preview.slice(0, 77)}...` : preview}`, {
        id: `incoming-message-${messageId}`,
        duration: 4000,
      });

      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        try {
          if (Notification.permission === "granted") {
            new Notification(senderName, { body: preview });
          }
        } catch {
          // best effort
        }
      }

      playNotificationSound(audioContextRef);
    };

    socket.on("new_message", onNewMessage);

    return () => {
      socket.off("new_message", onNewMessage);
    };
  }, [currentUserId, socket]);

  return null;
}
