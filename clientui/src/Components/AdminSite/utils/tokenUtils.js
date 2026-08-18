// import Cookies from 'js-cookie';

// export const setAccessTokenWithExpiry = (accessToken) => {
//   try {
//     const payload = JSON.parse(atob(accessToken.split('.')[1]));
//     const expiryTime = payload.exp * 1000;
//     const now = new Date().getTime();
//     const minutes = (expiryTime - now) / (60 * 1000);

//     //console.log(`Access token expires in ~${Math.round(minutes)} minutes`);

//     Cookies.set('accessToken', accessToken, {
//       expires: minutes / 1440,
//       path: '/',
//       sameSite: 'Lax',
//     });
//   } catch (err) {
//     console.error('Token parsing failed. Using fallback 15 mins.', err);
//     Cookies.set('accessToken', accessToken, {
//       expires: 1 / 96,
//       path: '/',
//       sameSite: 'Lax',
//     });
//   }
// };




// src/Components/AdminSite/utils/tokenUtils.js

import Cookies from 'js-cookie';

// ✅ Check if running in production
const isProduction = window.location.protocol === 'https:';

/**
 * Parse JWT token payload
 * @param {string} token - JWT token
 * @returns {object|null} - Decoded payload or null if invalid
 */
export const parseJWT = (token) => {
    try {
        if (!token || typeof token !== 'string') {
            throw new Error('Invalid token format');
        }

        const parts = token.split('.');
        if (parts.length !== 3) {
            throw new Error('Invalid JWT structure');
        }

        const payload = JSON.parse(atob(parts[1]));
        return payload;
    } catch (err) {
        console.error('❌ Failed to parse JWT:', err.message);
        return null;
    }
};

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean} - True if expired
 */
export const isTokenExpired = (token) => {
    const payload = parseJWT(token);
    if (!payload || !payload.exp) {
        return true;
    }

    const expiryTime = payload.exp * 1000; // Convert to milliseconds
    const now = new Date().getTime();
    
    return now >= expiryTime;
};

/**
 * Get token expiry time in minutes
 * @param {string} token - JWT token
 * @returns {number} - Minutes until expiry (0 if expired or invalid)
 */
export const getTokenExpiryMinutes = (token) => {
    const payload = parseJWT(token);
    if (!payload || !payload.exp) {
        return 0;
    }

    const expiryTime = payload.exp * 1000;
    const now = new Date().getTime();
    const minutes = Math.max(0, (expiryTime - now) / (60 * 1000));
    
    return Math.round(minutes);
};

/**
 * Set access token with automatic expiry calculation
 * @param {string} accessToken - JWT access token
 * @param {object} options - Cookie options
 */
export const setAccessTokenWithExpiry = (accessToken, options = {}) => {
    if (!accessToken || typeof accessToken !== 'string') {
        console.error('❌ Invalid access token provided');
        return false;
    }

    try {
        const payload = parseJWT(accessToken);
        
        if (!payload || !payload.exp) {
            throw new Error('Token does not contain expiry information');
        }

        const expiryTime = payload.exp * 1000; // Convert to milliseconds
        const now = new Date().getTime();
        const minutes = (expiryTime - now) / (60 * 1000);

        // ✅ Validate expiry time
        if (minutes <= 0) {
            console.error('❌ Token is already expired');
            return false;
        }

        if (minutes > 1440) { // More than 24 hours
            console.warn('⚠️ Token expiry is unusually long (>24h)');
        }

        // ✅ Convert minutes to an absolute Date for cookie expiry.
        // js-cookie treats numeric `expires` as days; fractional values < 1
        // are unreliable across browsers and treated as session cookies on
        // some Chromium versions.  Using a Date object is always precise.
        const expiryDate = new Date(expiryTime);

        if (!isProduction) {
            console.log(`✅ Access token expires in ${Math.round(minutes)} minutes (${expiryDate.toISOString()})`);
        }

        // ✅ Set cookie with absolute expiry date
        Cookies.set('accessToken', accessToken, {
            expires: expiryDate,
            path: '/',
            sameSite: 'Lax',
            secure: isProduction,
            ...options
        });

        return true;

    } catch (err) {
        console.error('❌ Token parsing failed. Using fallback 15 mins.', err);
        
        // ✅ Fallback: 15 minutes expiry using an absolute Date
        const fallbackDate = new Date(Date.now() + 15 * 60 * 1000);
        Cookies.set('accessToken', accessToken, {
            expires: fallbackDate,
            path: '/',
            sameSite: 'Lax',
            secure: isProduction,
            ...options
        });

        return false;
    }
};

/**
 * Set refresh token (typically long-lived)
 * @param {string} refreshToken - JWT refresh token
 * @param {number} expiryDays - Days until expiry (default 7)
 */
export const setRefreshToken = (refreshToken, expiryDays = 7) => {
    if (!refreshToken || typeof refreshToken !== 'string') {
        console.error('❌ Invalid refresh token provided');
        return false;
    }

    try {
        Cookies.set('refreshToken', refreshToken, {
            expires: expiryDays,
            path: '/',
            sameSite: 'Lax',
            secure: isProduction,
            httpOnly: false // Note: JS Cookie cannot set httpOnly
        });

        if (!isProduction) {
            console.log(`✅ Refresh token set with ${expiryDays} days expiry`);
        }

        return true;
    } catch (err) {
        console.error('❌ Failed to set refresh token:', err);
        return false;
    }
};

/**
 * Get access token from cookie
 * @returns {string|null} - Access token or null
 */
export const getAccessToken = () => {
    return Cookies.get('accessToken') || null;
};

/**
 * Get refresh token from cookie
 * @returns {string|null} - Refresh token or null
 */
export const getRefreshToken = () => {
    return Cookies.get('refreshToken') || null;
};

/**
 * Remove all authentication tokens
 */
export const clearTokens = () => {
    Cookies.remove('accessToken', { path: '/' });
    Cookies.remove('refreshToken', { path: '/' });
    
    if (!isProduction) {
        console.log('🗑️ All tokens cleared');
    }
};

/**
 * Check if user is authenticated (has valid access token)
 * @returns {boolean} - True if authenticated
 */
export const isAuthenticated = () => {
    const token = getAccessToken();
    if (!token) {
        return false;
    }

    return !isTokenExpired(token);
};

/**
 * Get user data from token
 * @param {string} token - JWT token (optional, uses stored token if not provided)
 * @returns {object|null} - User data or null
 */
export const getUserFromToken = (token = null) => {
    const accessToken = token || getAccessToken();
    if (!accessToken) {
        return null;
    }

    const payload = parseJWT(accessToken);
    if (!payload) {
        return null;
    }

    // ✅ Extract common user fields (adjust based on your JWT structure)
    return {
        id: payload.id || payload.userId || payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        companyId: payload.companyId,
        // Add other fields as needed
        ...payload
    };
};

/**
 * Set both tokens (convenience method)
 * @param {string} accessToken - Access token
 * @param {string} refreshToken - Refresh token
 * @param {number} refreshExpiryDays - Refresh token expiry in days
 */
export const setTokens = (accessToken, refreshToken, refreshExpiryDays = 7) => {
    const accessSet = setAccessTokenWithExpiry(accessToken);
    const refreshSet = setRefreshToken(refreshToken, refreshExpiryDays);
    
    return accessSet && refreshSet;
};

/**
 * Auto-refresh token if expiring soon
 * @param {function} refreshCallback - Function to call for token refresh
 * @param {number} thresholdMinutes - Refresh if expiring within this many minutes (default 5)
 */
export const autoRefreshToken = async (refreshCallback, thresholdMinutes = 5) => {
    const token = getAccessToken();
    if (!token) {
        return false;
    }

    const minutesLeft = getTokenExpiryMinutes(token);
    
    if (minutesLeft <= thresholdMinutes && minutesLeft > 0) {
        if (!isProduction) {
            console.log(`⏰ Token expiring in ${minutesLeft} minutes, refreshing...`);
        }
        
        try {
            await refreshCallback();
            return true;
        } catch (err) {
            console.error('❌ Auto-refresh failed:', err);
            return false;
        }
    }

    return false;
};

/**
 * Handle token rotation response from refresh endpoint
 * Updates both access and refresh tokens
 * @param {object} response - Response from refresh endpoint containing accessToken and refreshToken
 */
export const handleTokenRotation = (response) => {
    if (!response || !response.accessToken) {
        console.error('❌ Invalid token rotation response');
        return false;
    }

    try {
        // Set new access token
        const accessSet = setAccessTokenWithExpiry(response.accessToken);
        
        // Set new refresh token (if provided - token rotation)
        let refreshSet = true;
        if (response.refreshToken) {
            refreshSet = setRefreshToken(response.refreshToken, 7);
            
            if (!isProduction) {
                console.log('✅ Refresh token rotated (old token revoked server-side)');
            }
        }

        return accessSet && refreshSet;
    } catch (err) {
        console.error('❌ Failed to handle token rotation:', err);
        return false;
    }
};

/**
 * Logout user by revoking all refresh tokens
 * Should be called on logout or when switching accounts
 * @param {function} logoutApi - Function to call logout endpoint
 * @returns {boolean} - True if logout successful
 */
export const logoutUser = async (logoutApi) => {
    try {
        // Call backend logout endpoint to revoke all refresh tokens
        await logoutApi();
        
        // Clear local tokens
        clearTokens();
        
        if (!isProduction) {
            console.log('✅ User logged out and all tokens revoked');
        }
        
        return true;
    } catch (err) {
        console.error('❌ Logout failed:', err);
        // Still clear local tokens even if API call fails
        clearTokens();
        return false;
    }
};

/**
 * Schedule automatic token refresh
 * @param {function} refreshCallback - Function to call for token refresh
 * @param {number} checkIntervalMinutes - Check interval in minutes (default 1)
 * @returns {number} - Interval ID for clearing
 */
export const scheduleTokenRefresh = (refreshCallback, checkIntervalMinutes = 1) => {
    const intervalMs = checkIntervalMinutes * 60 * 1000;
    
    const intervalId = setInterval(async () => {
        await autoRefreshToken(refreshCallback, 5);
    }, intervalMs);

    if (!isProduction) {
        console.log(`⏲️ Token refresh scheduled every ${checkIntervalMinutes} minute(s)`);
    }

    return intervalId;
};

// ✅ Export all utilities
export default {
    parseJWT,
    isTokenExpired,
    getTokenExpiryMinutes,
    setAccessTokenWithExpiry,
    setRefreshToken,
    getAccessToken,
    getRefreshToken,
    clearTokens,
    isAuthenticated,
    getUserFromToken,
    setTokens,
    autoRefreshToken,
    scheduleTokenRefresh,
    handleTokenRotation,
    logoutUser
};
