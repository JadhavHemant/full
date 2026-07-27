// src/Components/AdminSite/LogoutButton/LogoutButton.jsx
// Logout button component for user authentication

import React from 'react';
// Import useNavigate for programmatic navigation
import { useNavigate } from 'react-router-dom';
// Import Cookies for cookie management
import Cookies from 'js-cookie';

/**
 * LogoutButton component
 * Provides a button to log out the user by clearing authentication cookies
 * and redirecting to the login page
 */
const LogoutButton = () => {
  const navigate = useNavigate();

  /**
   * Handle logout action
   * Clears all authentication cookies and redirects to login page
   */
  const handleLogout = () => {
    Cookies.remove('accessToken');
    Cookies.remove('refreshToken');
    Cookies.remove('user');
    navigate('/login');
  };

  return (
    <button onClick={handleLogout} className='cursor-pointer'>Logout</button>
  );
};

export default LogoutButton;
