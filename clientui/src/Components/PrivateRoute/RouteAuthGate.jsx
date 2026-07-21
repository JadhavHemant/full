import React, { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { Navigate } from "react-router-dom";
import { restoreAccessTokenFromRefreshToken } from "../../utils/authSession";

const RouteAuthGate = ({ children }) => {
  const [status, setStatus] = useState(() => {
    const hasAccessToken = !!Cookies.get("accessToken");
    const hasRefreshToken = !!Cookies.get("refreshToken");

    if (hasAccessToken) {
      return "ready";
    }

    if (hasRefreshToken) {
      return "refreshing";
    }

    return "unauthenticated";
  });

  useEffect(() => {
    if (status !== "refreshing") {
      return undefined;
    }

    let active = true;

    restoreAccessTokenFromRefreshToken()
      .then((token) => {
        if (!active) {
          return;
        }

        setStatus(token ? "ready" : "unauthenticated");
      })
      .catch(() => {
        if (active) {
          setStatus("unauthenticated");
        }
      });

    return () => {
      active = false;
    };
  }, [status]);

  if (status === "refreshing") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-medium text-slate-600">
        Restoring session...
      </div>
    );
  }

  if (status !== "ready") {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default RouteAuthGate;
