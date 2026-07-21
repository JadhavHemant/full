// src/utils/assetUrl.js
// Utility functions for resolving asset URLs

// Import API base URL from endpoint configuration
import { API_BASE_URL } from "../Components/Endpoint/Endpoint";

// Public base URL (API base URL without /api suffix)
const PUBLIC_BASE_URL = API_BASE_URL.replace(/\/api$/, "");

/**
 * Resolve asset URL to full public URL
 * Handles relative paths, uploads directory, and absolute URLs
 * @param {string} value - Asset path or URL
 * @returns {string} Resolved full URL
 */
export const resolveAssetUrl = (value) => {
  // Return empty string if value is falsy
  if (!value) {
    return "";
  }

  // Normalize backslashes to forward slashes
  const normalized = String(value).replace(/\\/g, "/");

  // Return as-is if already a complete URL
  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  // Handle uploads directory paths
  const uploadsIndex = normalized.toLowerCase().lastIndexOf("/uploads/");
  if (uploadsIndex >= 0) {
    return `${PUBLIC_BASE_URL}${normalized.slice(uploadsIndex)}`;
  }

  // Handle paths starting with uploads/
  if (normalized.toLowerCase().startsWith("uploads/")) {
    return `${PUBLIC_BASE_URL}/${normalized}`;
  }

  // Handle absolute and relative paths
  return normalized.startsWith("/")
    ? `${PUBLIC_BASE_URL}${normalized}`
    : `${PUBLIC_BASE_URL}/${normalized}`;
};

// Export public base URL for use in other modules
export { PUBLIC_BASE_URL };
