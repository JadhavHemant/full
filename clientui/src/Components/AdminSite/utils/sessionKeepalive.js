/**
 * Session Keepalive Utility
 * 
 * Proactively manages token refresh to prevent automatic logout.
 * The access token expires in 15 minutes by default.
 * This utility refreshes the token every 10 minutes to keep the session alive.
 * 
 * Features:
 * - Proactive token refresh before expiry
 * - Interval-based refresh check
 * - Refresh callback integration with axiosInstance
 * - Automatic cleanup on logout
 */

import Cookies from 'js-cookie';
import * as API from '../../Endpoint/Endpoint';
import axios from 'axios';
import { setAccessTokenWithExpiry } from './tokenUtils';

let keepaliveIntervalId = null;
const KEEPALIVE_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const REFRESH_THRESHOLD_MINUTES = 5; // Refresh if expiring within 5 minutes

/**
 * Check if token is expiring soon
 * @param {string} token - Access token
 * @param {number} thresholdMinutes - Threshold in minutes
 * @returns {boolean}
 */
const isTokenExpiringSoon = (token, thresholdMinutes = REFRESH_THRESHOLD_MINUTES) => {
  if (!token) return true;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiryTime = payload.exp * 1000;
    const now = Date.now();
    const minutesLeft = (expiryTime - now) / (60 * 1000);
    return minutesLeft <= thresholdMinutes;
  } catch (e) {
    return true;
  }
};

/**
 * Perform token refresh
 * @returns {Promise<boolean>} - True if refresh succeeded
 */
const performTokenRefresh = async () => {
  const refreshToken = Cookies.get('refreshToken');
  if (!refreshToken) {
    console.warn('⚠️ Session keepalive: No refresh token available');
    return false;
  }

  try {
    const response = await axios.post(
      `${API.API_BASE_URL}/token/refresh-token`,
      { refreshToken }
    );

    const { accessToken, refreshToken: newRefreshToken } = response.data;

    if (!accessToken) {
      console.error('❌ Session keepalive: No access token in response');
      return false;
    }

    // Set new access token
    setAccessTokenWithExpiry(accessToken);

    // Update refresh token if rotated
    if (newRefreshToken) {
      Cookies.set('refreshToken', newRefreshToken, {
        expires: 7,
        path: '/',
        sameSite: 'Lax',
      });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ Session keepalive: Token refreshed successfully');
    }

    return true;
  } catch (error) {
    console.error('❌ Session keepalive: Token refresh failed:', error.message);
    return false;
  }
};

/**
 * Start session keepalive
 * Sets up interval to periodically check and refresh tokens
 */
export const startSessionKeepalive = () => {
  // Clear any existing interval
  stopSessionKeepalive();

  console.log('🔋 Session keepalive started (refreshing every 10 minutes)');

  // Do initial check immediately
  checkAndRefreshToken();

  // Set up periodic check
  keepaliveIntervalId = setInterval(checkAndRefreshToken, KEEPALIVE_INTERVAL_MS);
};

/**
 * Check token and refresh if needed
 */
const checkAndRefreshToken = async () => {
  const accessToken = Cookies.get('accessToken');
  
  if (!accessToken) {
    console.warn('⚠️ Session keepalive: No access token found');
    return;
  }

  if (isTokenExpiringSoon(accessToken)) {
    console.log('🔄 Session keepalive: Token expiring soon, refreshing...');
    await performTokenRefresh();
  }
};

/**
 * Stop session keepalive
 * Clears the interval
 */
export const stopSessionKeepalive = () => {
  if (keepaliveIntervalId) {
    clearInterval(keepaliveIntervalId);
    keepaliveIntervalId = null;
    console.log('🔋 Session keepalive stopped');
  }
};

export default {
  startSessionKeepalive,
  stopSessionKeepalive,
  performTokenRefresh,
};