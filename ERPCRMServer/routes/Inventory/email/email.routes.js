const express = require("express");
const router = express.Router();
const { verifyAccessToken } = require("../../../middlewares/authMiddleware");
const {
  sendEmailHandler,
  getEmailTemplates,
  getEmailLogs,
  sendBulkEmailsHandler,
} = require("../../../controllers/InventoryApis/emailController");

router.use(verifyAccessToken);

router.post("/send", sendEmailHandler);
router.get("/templates", getEmailTemplates);
router.get("/logs", getEmailLogs);
router.post("/bulk", sendBulkEmailsHandler);

module.exports = router;