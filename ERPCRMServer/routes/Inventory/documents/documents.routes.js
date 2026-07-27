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
  downloadDocument,
} = require("../../../controllers/InventoryApis/documentController");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../../../uploads/temp"));
  },
  filename: (req, file, cb) => {
    cb(null, `upload-${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB limit

router.use(verifyAccessToken);

router.post("/upload", upload.single("file"), uploadDocument);
router.get("/entity/:type/:id", getDocumentsByEntity);
router.put("/:id", updateDocument);
router.delete("/:id", deleteDocument);
router.post("/:id/share", shareDocument);
router.get("/:id/versions", getDocumentVersions);
router.get("/:id/download", downloadDocument);

module.exports = router;