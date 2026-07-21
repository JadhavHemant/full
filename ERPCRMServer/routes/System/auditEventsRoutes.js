const express = require("express");
const { verifyAccessToken } = require("../../middlewares/authMiddleware");
const {
  listAuditEvents,
  createAuditEvent,
} = require("../../controllers/System/auditEventsController");

const router = express.Router();

router.use(verifyAccessToken);

router.get("/", listAuditEvents);
router.post("/", createAuditEvent);

module.exports = router;
