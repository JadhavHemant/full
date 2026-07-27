const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { verifyAccessToken } = require("../../../middlewares/authMiddleware");
const {
  uploadDocument,
  getDocumentsByEntity,
  updateDocument,
  deleteDocument,
  shareDocument,
  getDocumentVersions,
  uploadDocumentVersion,
} = require("../../../controllers/InventoryApis/documentController");

// Configure multer for document uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../../../uploads/documents");
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|png|jpg|jpeg|gif|zip|rar/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname || mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  },
});

router.use(verifyAccessToken);

// Document Routes
router.post("/upload", upload.single("file"), uploadDocument);
router.get("/entity/:entityType/:entityId", getDocumentsByEntity);
router.put("/:id", updateDocument);
router.delete("/:id", deleteDocument);
router.post("/:id/share", shareDocument);
router.get("/:id/versions", getDocumentVersions);
router.post("/:id/versions", upload.single("file"), uploadDocumentVersion);

module.exports = router;