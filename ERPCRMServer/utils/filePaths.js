const path = require("path");

const normalizeStoredUploadPath = (value) => {
  if (!value) {
    return null;
  }

  const normalized = String(value).replace(/\\/g, "/");
  const uploadsIndex = normalized.toLowerCase().lastIndexOf("/uploads/");

  if (uploadsIndex >= 0) {
    return normalized.slice(uploadsIndex);
  }

  if (normalized.toLowerCase().startsWith("uploads/")) {
    return `/${normalized}`;
  }

  return normalized.startsWith("/") ? normalized : `/${normalized}`;
};

const toFileSystemPath = (value, serverRoot) => {
  const normalized = normalizeStoredUploadPath(value);
  if (!normalized) {
    return null;
  }

  if (normalized.startsWith("/uploads/")) {
    return path.join(serverRoot, normalized.replace(/^\/+/, ""));
  }

  return path.isAbsolute(value) ? value : path.join(serverRoot, normalized.replace(/^\/+/, ""));
};

module.exports = {
  normalizeStoredUploadPath,
  toFileSystemPath,
};
