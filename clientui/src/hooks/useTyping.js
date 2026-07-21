import { useEffect, useRef } from "react";

export const useTyping = ({ socket, channelId }) => {
  const timeoutRef = useRef(null);
  const typingRef = useRef(false);

  const stopTyping = () => {
    if (!socket || !channelId || !typingRef.current) return;
    socket.emit("typing_stop", { channelId });
    typingRef.current = false;
  };

  const notifyTyping = () => {
    if (!socket || !channelId) return;
    if (!typingRef.current) {
      socket.emit("typing_start", { channelId });
      typingRef.current = true;
    }
    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(stopTyping, 2000);
  };

  useEffect(() => () => {
    window.clearTimeout(timeoutRef.current);
    stopTyping();
  }, [channelId, socket]);

  return {
    notifyTyping,
    stopTyping,
  };
};

export default useTyping;
