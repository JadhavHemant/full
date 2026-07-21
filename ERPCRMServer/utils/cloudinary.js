const path = require("path");

const uploadLocalFile = async (file) => {
  const normalized = file.path.split(path.sep).join("/");
  return {
    secure_url: `/${normalized.replace(/^server\//, "")}`,
    original_filename: file.originalname,
    bytes: file.size,
    resource_type: file.mimetype?.startsWith("image/") ? "image" : "raw",
    format: path.extname(file.originalname || "").replace(".", ""),
  };
};

module.exports = {
  uploadLocalFile,
};
