/**
 * Session Keepalive Utility
 *
 * Proactively manages token refresh to prevent automatic logout.
 *
 * Fix summary (vs original):
 *  - Initial check is delayed 30 s so the app finishes mounting before
 *    we touch any tokens (prevents a race where RouteAuthGate hasn't
 *    finished its own restore yet).
 *  - When no accessToken is found we now attempt a proactive refresh
 *    (using the refreshToken) instead of just warning and bailing out.
 *  - The keepalive interval is 8 minutes (token refreshed at 5-min
 *    threshold → we check 3 min before that window closes).
 */

import Cookies from 'js-cookie';
import * as API from '../../Endpoint/Endpoint';
import axios from 'axios';
import { setAccessTokenWithExpiry } from './tokenUtils';

// ── constants ─────────────────────────────────────────────────────────────────
/** How often we check the token (ms). */
const KEEPALIVE_INTERVAL_MS = 8 * 60 * 1000;          // 8 minutes

/** Refresh if the token expires within this many minutes. */
const REFRESH_THRESHOLD_MINUTES = 5;

/** Delay before the FIRST check fires after startSessionKeepalive(). */
const INITIAL_CHECK_DELAY_MS = 30 * 1000;              // 30 seconds

/** True when we are production (https). */
const isProduction = window.location.protocol === 'https:';

// ── module state ──────────────────────────────────────────────────────────────
let keepaliveIntervalId  = null;
let initialCheckTimerId  = null;
let isRefreshing         = false;   // guard against concurrent refresh calls

// ── helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns true when the token will expire within `thresholdMinutes`.
 * Also returns true when the token is missing or unparseable — we treat
 * those cases as "expiring soon" so we proactively try a refresh.
 */
const isTokenExpiringSoon = (token, thresholdMinutes = REFRESH_THRESHOLD_MINUTES) => {
  if (!token) return true;
  try {
    const payload    = JSON.parse(atob(token.split('.')[1]));
    const expiryTime = payload.exp * 1000;
    const minutesLeft = (expiryTime - Date.now()) / 60_000;
    return minutesLeft <= thresholdMinutes;
  } catch {
    return true;   // unparseable → treat as expiring
  }
};

// ── core refresh ──────────────────────────────────────────────────────────────

/**
 * Attempt a token refresh using the stored refreshToken.
 * Returns true on success, false on any failure.
 * Guards against concurrent calls with `isRefreshing`.
 */
const performTokenRefresh = async () => {
  if (isRefreshing) {
    if (!isProduction) console.log('🔄 Keepalive: refresh already in progress, skipping');
    return false;   // already in-flight
  }

  const refreshToken = Cookies.get('refreshToken');
  if (!refreshToken) {
    if (!isProduction) console.warn('⚠️ Keepalive: no refreshToken — cannot refresh');
    return false;
  }

  isRefreshing = true;
  try {
    if (!isProduction) {
      console.log('🔄 Keepalive: starting proactive token refresh...');
    }

    const response = await axios.post(
      `${API.API_BASE_URL}/token/refresh-token`,
      { refreshToken },
      { withCredentials: true, timeout: 15_000 },
    );

    const { accessToken, refreshToken: newRefreshToken } = response.data;

    if (!accessToken) {
      console.error('❌ Keepalive: refresh response contained no accessToken');
      return false;
    }

    const tokenSet = setAccessTokenWithExpiry(accessToken);
    
    if (!tokenSet) {
      console.error('❌ Keepalive: failed to set new access token');
      return false;
    }

    if (newRefreshToken) {
      const isProduction = window.location.protocol === 'https:';
      Cookies.set('refreshToken', newRefreshToken, {
        expires: 7,
        path: '/',
        sameSite: 'Lax',
        secure: isProduction,
      });
      
      if (!isProduction) {
        console.log('✅ Keepalive: refresh token rotated');
      }
    }

    if (!isProduction) {
      console.log('✅ Keepalive: token refreshed successfully');
    }
    return true;
  } catch (err) {
    // A failed keepalive refresh is NOT fatal — the main axiosInstance
    // interceptor handles 401s from real API calls.  We log but do NOT
    // clear cookies or redirect here; that would cause the spurious logout.
    const errorDetails = {
      message: err.response?.data?.message || err.message,
      status: err.response?.status,
      isTimeout: err.code === 'ECONNABORTED',
      isNetworkError: err.message === 'Network Error',
    };

    if (!isProduction) {
      console.warn('⚠️ Keepalive: refresh failed —', errorDetails);
      
      if (errorDetails.isTimeout) {
        console.warn('⚠️ Keepalive: refresh timed out (backend may be slow)');
      } else if (errorDetails.status === 401) {
        console.warn('⚠️ Keepalive: refresh token invalid (user will be logged out on next API call)');
      }
    }
    
    return false;
  } finally {
    isRefreshing = false;
  }
};

// ── check logic ───────────────────────────────────────────────────────────────

/**
 * Check the current accessToken and refresh it if it is missing or expiring.
 */
const checkAndRefreshToken = async () => {
  const accessToken = Cookies.get('accessToken');

  if (!accessToken) {
    // Token is gone (expired cookie, tab restore, etc.).
    // Try a proactive refresh; if it fails the next real API call will
    // 401 and the axiosInstance interceptor will handle the redirect.
    if (!isProduction) console.log('🔄 Keepalive: accessToken absent — attempting proactive refresh');
    await performTokenRefresh();
    return;
  }

  if (isTokenExpiringSoon(accessToken)) {
    if (!isProduction) console.log('🔄 Keepalive: token expiring soon — refreshing');
    await performTokenRefresh();
  }
};

// ── public API ────────────────────────────────────────────────────────────────

/**
 * Start session keepalive.
 *
 * - Waits 30 s before the first check so the app can fully mount and
 *   RouteAuthGate can complete its own token-restore flow first.
 * - After that, checks every KEEPALIVE_INTERVAL_MS.
 */
export const startSessionKeepalive = () => {
  stopSessionKeepalive();   // clear any previous timers

  if (!isProduction) console.log('🔋 Keepalive started (first check in 30 s, then every 8 min)');

  // Delayed first check
  initialCheckTimerId = setTimeout(async () => {
    initialCheckTimerId = null;
    await checkAndRefreshToken();

    // Only start the interval after the first check completes
    keepaliveIntervalId = setInterval(checkAndRefreshToken, KEEPALIVE_INTERVAL_MS);
  }, INITIAL_CHECK_DELAY_MS);
};

/**
 * Stop session keepalive and clean up all timers.
 */
export const stopSessionKeepalive = () => {
  if (initialCheckTimerId !== null) {
    clearTimeout(initialCheckTimerId);
    initialCheckTimerId = null;
  }
  if (keepaliveIntervalId !== null) {
    clearInterval(keepaliveIntervalId);
    keepaliveIntervalId = null;
    if (!isProduction) console.log('🔋 Keepalive stopped');
  }
};

export default { startSessionKeepalive, stopSessionKeepalive, performTokenRefresh };
