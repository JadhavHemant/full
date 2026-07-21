const fs = require("fs");
const multer = require("multer");
const path = require("path");

const chatUploadsDir = path.join(__dirname, "..", "uploads", "chat");

if (!fs.existsSync(chatUploadsDir)) {
  fs.mkdirSync(chatUploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, chatUploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    cb(null, `chat-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
});

const handleChatUpload = (req, res, next) => {
  upload.single("file")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({
        message: "File too large",
        error: "Maximum file size is 15MB",
      });
      return;
    }

    res.status(400).json({
      message: "File upload failed",
      error: error.message,
    });
  });
};

module.exports = { upload, handleChatUpload };
