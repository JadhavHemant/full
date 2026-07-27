// Import axios for making HTTP requests
import axios from 'axios';
// Import js-cookie for managing browser cookies
import Cookies from 'js-cookie';
// Import API endpoint configurations
import * as API from '../../Endpoint/Endpoint';
// Import token utility functions for JWT management
import { setAccessTokenWithExpiry } from './tokenUtils';

// Determine if the application is running in production environment
const isProduction = window.location.protocol === 'https:';

// Base configuration for axios instances
const axiosConfig = {
  // Base URL for all API requests, defaults to localhost if not configured
  baseURL: API.API_BASE_URL || 'http://localhost:5351/api',
  // Include credentials (cookies) in cross-origin requests
  withCredentials: true,
  // Request timeout in milliseconds (30 seconds)
  timeout: 30000,
  // Default headers for all requests
  headers: {
    'Content-Type': 'application/json',
  },
};

// Create main axios instance for API calls
const axiosInstance = axios.create(axiosConfig);

// Create separate axios instance for monitoring calls with shorter timeout
const monitoringAxios = axios.create({
  ...axiosConfig,
  // Shorter timeout for monitoring calls (10 seconds)
  timeout: 10000,
});

// Promise to prevent multiple simultaneous refresh token requests
let refreshPromise = null;

// Queue of pending requests waiting for token refresh to complete
let pendingRefreshQueue = [];

/**
 * Process the queue of requests that were waiting for token refresh.
 * All queued requests will retry with the new access token.
 * @param {string|null} newAccessToken - The refreshed access token, or null if refresh failed
 * @param {Error|null} refreshError - The error if refresh failed
 */
const processPendingQueue = (newAccessToken, refreshError = null) => {
  const queue = pendingRefreshQueue;
  pendingRefreshQueue = [];

  queue.forEach(({ resolve, reject, originalRequest }) => {
    if (refreshError) {
      reject(refreshError);
    } else {
      // Retry original request with the new token
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      resolve(axiosInstance(originalRequest));
    }
  });
};

/**
 * Clear all session-related cookies
 * Removes access token, refresh token, and user data from cookies
 */
const clearSessionTokens = () => {
  Cookies.remove('accessToken', { path: '/' });
  Cookies.remove('refreshToken', { path: '/' });
  Cookies.remove('user', { path: '/' });
};

/**
 * Perform the actual token refresh request and handle the response.
 * Uses a cached promise to prevent multiple simultaneous refresh attempts.
 * @param {string} refreshToken - The refresh token
 * @returns {Promise<{accessToken: string, refreshToken: string}>}
 */
const performTokenRefresh = async (refreshToken) => {
  // If a refresh is already in progress, return the existing promise
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = axios
    .post(`${API.API_BASE_URL}/token/refresh-token`, { refreshToken })
    .then((response) => {
      const { accessToken, refreshToken: newRefreshToken } = response.data;

      if (!accessToken) {
        throw new Error('No access token in refresh response');
      }

      // Set new access token with calculated expiry
      setAccessTokenWithExpiry(accessToken);

      // Update refresh token if a new one is provided (token rotation)
      if (newRefreshToken) {
        Cookies.set('refreshToken', newRefreshToken, {
          expires: 7,
          path: '/',
          sameSite: 'Lax',
          secure: isProduction,
        });
      }

      return { accessToken, newRefreshToken };
    })
    .catch((error) => {
      // Clear all tokens if refresh fails
      clearSessionTokens();
      throw error;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};

/**
 * Build complete monitoring URL from config
 * @param {object} config - Axios request configuration
 * @returns {string} Complete URL for monitoring
 */
const buildMonitoringUrl = (config = {}) => {
  if (!config.url) {
    return '';
  }

  // Return URL as-is if it's already a complete URL
  if (/^https?:\/\//i.test(config.url)) {
    return config.url;
  }

  // Combine base URL and path
  const baseUrl = String(config.baseURL || API.API_BASE_URL || '').replace(/\/$/, '');
  const path = String(config.url).replace(/^\//, '');
  return baseUrl ? `${baseUrl}/${path}` : config.url;
};

/**
 * Determine if monitoring should be skipped for this request
 * @param {object} config - Axios request configuration
 * @returns {boolean} True if monitoring should be skipped
 */
const shouldSkipMonitoring = (config = {}) => {
  const url = buildMonitoringUrl(config);
  return (
    config._skipMonitoring ||
    !url ||
    url.includes('/monitoring/execution-log') ||
    url.includes('/token/refresh-token')
  );
};

/**
 * Convert value to serializable format for logging
 * @param {any} value - Value to serialize
 * @param {any} fallback - Fallback value if serialization fails
 * @returns {any} Serialized value or fallback
 */
const toSerializable = (value, fallback = null) => {
  if (value === undefined) {
    return fallback;
  }

  if (value === null) {
    return null;
  }

  // Return primitive values as-is
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  // Try to deep clone objects/arrays
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_error) {
    return fallback;
  }
};

/**
 * Submit API execution log to monitoring endpoint
 * @param {object} params - Parameters containing config, response, and error
 */
const submitApiExecutionLog = ({ config, response = null, error = null }) => {
  // Skip if config is missing or monitoring is disabled for this request
  if (!config || shouldSkipMonitoring(config)) {
    return;
  }

  // Skip if no access token is available
  const token = Cookies.get('accessToken');
  if (!token) {
    return;
  }

  // Calculate request duration
  const startedAt = config.metadata?.startedAt || Date.now();
  const responseStatusCode = response?.status || error?.response?.status || null;
  
  // Build monitoring payload (exclude sensitive data)
  const payload = {
    RequestId: config.metadata?.requestId || `${Date.now()}`,
    RequestPayload: {
      url: buildMonitoringUrl(config),
      method: String(config.method || 'GET').toUpperCase(),
      params: toSerializable(config.params, {}),
      // Exclude request data to prevent sensitive information leakage
      data: null,
    },
    ResponsePayload: response
      ? {
          statusText: response.statusText || null,
          // Exclude response data to prevent sensitive information leakage
          data: null,
        }
      : {
          statusText: error?.response?.statusText || null,
        },
    ResponseStatusCode: responseStatusCode,
    IsSuccess: !error && responseStatusCode >= 200 && responseStatusCode < 400,
    ErrorMessage: error?.response?.data?.message || error?.message || null,
    DurationMs: Math.max(0, Date.now() - startedAt),
    TriggerType: 'Frontend',
  };

  // Send monitoring log asynchronously (errors are ignored)
  monitoringAxios
    .post(API.MONITORING_EXECUTION_LOG, payload, {
      _skipMonitoring: true,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    .catch(() => {});
};

// Request interceptor - adds auth token and metadata to all requests
axiosInstance.interceptors.request.use(
  (config) => {
    const token = Cookies.get('accessToken');
    
    // Add metadata for monitoring and request tracking
    config.metadata = {
      ...(config.metadata || {}),
      startedAt: Date.now(),
      requestId:
        config.metadata?.requestId || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    };

    // Add authorization header if token exists
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn('⚠️ No access token found for request:', config.url);
    }

    // Log requests in development mode
    if (!isProduction) {
      console.log(`[${config.method?.toUpperCase()}] ${config.url}`, {
        hasToken: Boolean(token),
      });
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handles responses, errors, and token refresh
axiosInstance.interceptors.response.use(
  (response) => {
    // Log successful responses in development mode
    if (!isProduction) {
      console.log(`[${response.config.method?.toUpperCase()}] ${response.config.url} - ${response.status}`);
    }
    
    // Submit monitoring log for successful requests
    submitApiExecutionLog({ config: response.config, response });
    return response;
  },
  async (error) => {
    const originalRequest = error.config || {};

    // Handle 401 Unauthorized errors with token refresh logic
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const savedRefreshToken = Cookies.get('refreshToken');

      // If no refresh token, clear session and redirect to login
      if (!savedRefreshToken) {
        console.error('❌ No refresh token available. Logging out user.');
        clearSessionTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      // If a token refresh is already in progress, queue this request
      if (refreshPromise) {
        return new Promise((resolve, reject) => {
          pendingRefreshQueue.push({ resolve, reject, originalRequest });
        });
      }

      try {
        console.log('🔄 Attempting to refresh access token...');
        
        // Perform token refresh (this sets a shared promise to prevent concurrent refreshes)
        const { accessToken } = await performTokenRefresh(savedRefreshToken);

        console.log('✅ Token refreshed successfully');

        // Process any queued requests that arrived while we were refreshing
        processPendingQueue(accessToken);

        // Retry original request with new token
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // If refresh fails, fail all queued requests and redirect to login
        console.error('❌ Token refresh failed:', refreshError.message);
        
        // Reject all queued requests
        processPendingQueue(null, refreshError);
        
        clearSessionTokens();
        window.location.href = '/';
        return Promise.reject(refreshError);
      }
    }

    // Log errors in development mode
    if (!isProduction) {
      console.error(
        `[${error.config?.method?.toUpperCase()}] ${error.config?.url} - ${error.response?.status}`,
        error.response?.data || error.message
      );
    }

    // Submit monitoring log for failed requests
    submitApiExecutionLog({ config: originalRequest, error });
    return Promise.reject(error);
  }
);

export default axiosInstance;