// src/hooks/useTheme.js
// Centralized theme hook for consistent day/night colors across the project

import { useMemo, useState, useEffect } from "react";

/**
 * Check if dark theme is currently active
 */
const isDark = () =>
  document.documentElement.getAttribute("data-theme") === "dark" ||
  document.documentElement.classList.contains("dark");

/**
 * Static base color palette (matches App.css CSS variables)
 */
export const C = {
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#3B82F6",
  primary: "#2563EB",
  secondary: "#4F46E5",
  purple: "#A855F7",
  cyan: "#06B6D4",
  orange: "#F97316",
  bg: "#F8FAFC",
  card: "#FFFFFF",
  text: "#0F172A",
  textMuted: "#64748B",
  border: "#E2E8F0",
};

/**
 * Custom hook that provides theme-aware colors.
 * Automatically reacts to theme changes via MutationObserver.
 *
 * @returns {{ dark: boolean, colors: object, C: object }}
 */
export const useTheme = () => {
  const [dark, setDark] = useState(isDark);

  // Watch for theme changes on <html> element
  useEffect(() => {
    const observer = new MutationObserver(() => setDark(isDark()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class"],
    });
    return () => observer.disconnect();
  }, []);

  // Dynamic theme-aware colors
  const colors = useMemo(() => {
    const d = dark;
    return {
      success: "#22C55E",
      warning: "#F59E0B",
      danger: "#EF4444",
      info: "#3B82F6",
      primary: d ? "#3B82F6" : "#2563EB",
      secondary: d ? "#6366F1" : "#4F46E5",
      purple: "#A855F7",
      cyan: "#06B6D4",
      orange: "#F97316",
      bg: d ? "#0F172A" : "#F8FAFC",
      card: d ? "#1E293B" : "#FFFFFF",
      text: d ? "#F8FAFC" : "#0F172A",
      textMuted: d ? "#94A3B8" : "#64748B",
      border: d ? "#334155" : "#E2E8F0",
      sidebar: d ? "#020617" : "#0F172A",
    };
  }, [dark]);

  return { dark, colors, C };
};

export default useTheme;
