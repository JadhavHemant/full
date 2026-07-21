import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import Cookies from 'js-cookie';
import { getDefaultPortalPath } from '../../utils/sessionUser';
import RouteAuthGate from './RouteAuthGate';

const PrivateRoute = () => {
  return (
    <RouteAuthGate>
      <PrivateRouteContent />
    </RouteAuthGate>
  );
};

const PrivateRouteContent = () => {
  const isLoggedIn = !!Cookies.get('accessToken');
  if (!isLoggedIn) {
    return <Navigate to='/login' replace />;
  }
  return <Navigate to={getDefaultPortalPath()} replace />;
};

export default PrivateRoute;
  