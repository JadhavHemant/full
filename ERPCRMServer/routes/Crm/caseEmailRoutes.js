const express = require("express");
const { verifyAccessToken } = require("../../middlewares/authMiddleware");
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
router.get("/routes", listEmailRoutes);
router.post("/routes", createEmailRoute);
router.put("/routes/:id", updateEmailRoute);
router.delete("/routes/:id", disableEmailRoute);

module.exports = router;
