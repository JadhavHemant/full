const express = require("express");
const { verifyAccessToken } = require("../../middlewares/authMiddleware");
const { checkPermission } = require("../../middlewares/rbac");
const {
  listEmailRoutes,
  createEmailRoute,
  updateEmailRoute,
  disableEmailRoute,
  processInboundCaseEmail,
} = require("../../controllers/CrmApi/caseEmailController");

const router = express.Router();

router.post("/inbound", processInboundCaseEmail);

router.use(verifyAccessToken);
router.get("/routes", checkPermission("settings", "view"), listEmailRoutes);
router.post("/routes", checkPermission("settings", "create"), createEmailRoute);
router.put("/routes/:id", checkPermission("settings", "edit"), updateEmailRoute);
router.delete("/routes/:id", checkPermission("settings", "delete"), disableEmailRoute);

module.exports = router;
