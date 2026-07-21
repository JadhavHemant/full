const express = require("express");
const { verifyAccessToken } = require("../../middlewares/authMiddleware");
const { recordApiExecution } = require("../../controllers/System/apiMonitoringController");

const router = express.Router();

router.post("/execution-log", verifyAccessToken, recordApiExecution);

module.exports = router;
