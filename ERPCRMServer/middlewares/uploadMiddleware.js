const fs = require("fs");
const multer = require("multer");
const path = require("path");

const userUploadsDir = path.join(__dirname, "..", "uploads", "users");
const MAX_IMAGE_UPLOAD_SIZE = 15 * 1024 * 1024;

if (!fs.existsSync(userUploadsDir)) {
  fs.mkdirSync(userUploadsDir, { recursive: true });
}

// File filter to validate file types
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, and GIF images are allowed.'), false);
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, userUploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate a safe filename to prevent path traversal attacks
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, "user-" + Date.now() + "-" + safeName);
  },
});

const uploadUserImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_IMAGE_UPLOAD_SIZE,
    files: 1,
  },
});

module.exports = uploadUserImage;
