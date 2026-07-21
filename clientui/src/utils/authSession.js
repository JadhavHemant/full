// Import axios for making HTTP requests
import axios from "axios";
// Import js-cookie for managing browser cookies
import Cookies from "js-cookie";
// Import API endpoint configurations
import * as API from "../Components/Endpoint/Endpoint";
// Import token utility functions for JWT management
import { setAccessTokenWithExpiry } from "../Components/AdminSite/utils/tokenUtils";

// Promise to prevent multiple simultaneous refresh token requests
let refreshPromise = null;

/**
 * Clear all session-related cookies
 * Removes access token, refresh token, and user data from cookies
 */
export const clearSessionTokens = () => {
  Cookies.remove("accessToken", { path: "/" });
  Cookies.remove("refreshToken", { path: "/" });
  Cookies.remove("user", { path: "/" });
};

/**
 * Restore access token using refresh token
 * If access token exists, returns it immediately
 * If not, attempts to refresh using the stored refresh token
 * Uses a promise cache to prevent multiple simultaneous refresh attempts
 * @returns {Promise<string|null>} Access token or null if refresh fails
 */
export const restoreAccessTokenFromRefreshToken = async () => {
  // Return existing access token if available
  const accessToken = Cookies.get("accessToken");
  if (accessToken) {
    return accessToken;
  }

  // Check if refresh token exists
  const refreshToken = Cookies.get("refreshToken");
  if (!refreshToken) {
    return null;
  }

  // Use cached promise if refresh is already in progress
  if (!refreshPromise) {
    refreshPromise = axios
      .post(API.REFRESH_TOKEN, { refreshToken }, { withCredentials: true })
      .then((response) => {
        const nextAccessToken = response.data?.accessToken;
        if (!nextAccessToken) {
          throw new Error("Refresh response did not include an access token");
        }

        // Set the new access token with calculated expiry
        setAccessTokenWithExpiry(nextAccessToken);
        return nextAccessToken;
      })
      .catch((error) => {
        // Clear all tokens if refresh fails
        clearSessionTokens();
        throw error;
      })
      .finally(() => {
        // Reset the promise cache
        refreshPromise = null;
      });
  }

  return refreshPromise;
};
