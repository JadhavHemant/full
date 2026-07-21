import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import Cookies from "js-cookie";
import { canAccessAdminPortal, getDefaultPortalPath } from "../../utils/sessionUser";
import RouteAuthGate from "./RouteAuthGate";

const AdminRoute = () => {
  return (
    <RouteAuthGate>
      <AdminRouteContent />
    </RouteAuthGate>
  );
};

const AdminRouteContent = () => {
  const isLoggedIn = !!Cookies.get("accessToken");

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (!canAccessAdminPortal()) {
    return <Navigate to={getDefaultPortalPath()} replace />;
  }

  return <Outlet />;
};

export default AdminRoute;
