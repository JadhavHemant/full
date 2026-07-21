import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import Cookies from "js-cookie";
import CONFIG from "../config";
import { getApiBaseUrl } from "../utils/apiMode";

/**
 * Derive socket server URL from the API base URL.
 * First checks VITE_API_BASE_URL env var, then apiMode utility,
 * then falls back to config.js.
 * Removes the trailing /api so Socket.IO connects to the root server.
 */
const getSocketUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    return envUrl.replace(/\/api\/?$/, "");
  }
  if (typeof getApiBaseUrl === 'function') {
    return getApiBaseUrl().replace(/\/api\/?$/, "");
  }
  // Ultimate fallback: use config.js
  return CONFIG.SOCKET_URL;
};

const socketUrl = getSocketUrl();

export const useSocket = () => {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const token = Cookies.get("accessToken");
    if (!token) {
      setConnected(false);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return undefined;
    }

    // If socket already exists with the current token, don't reconnect
    if (socketRef.current?.connected) {
      return undefined;
    }

    // Disconnect existing socket if it exists but is not connected
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const socket = io(socketUrl, {
      autoConnect: true,
      transports: ["websocket", "polling"],
      auth: {
        token: `Bearer ${token}`,
      },
    });

    socketRef.current = socket;
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", (reason) => {
      setConnected(false);
      // If the server disconnected us (likely due to invalid token), reconnect on next render
      if (reason === "io server disconnect" || reason === "transport close") {
        forceUpdate((n) => n + 1);
      }
    });
    socket.on("connect_error", (err) => {
      if (err.message === "Unauthorized") {
        setConnected(false);
        socket.disconnect();
        socketRef.current = null;
        // Force re-render to try reconnecting with potentially new token
        forceUpdate((n) => n + 1);
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return {
    socket: socketRef.current,
    connected,
  };
};

export default useSocket;
