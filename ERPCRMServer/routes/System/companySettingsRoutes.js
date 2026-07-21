const express = require("express");
const { verifyAccessToken } = require("../../middlewares/authMiddleware");
const {
  getCompanySettings,
  upsertCompanySettings,
} = require("../../controllers/System/companySettingsController");

const router = express.Router();

router.use(verifyAccessToken);

router.get("/", getCompanySettings);
router.get("/:companyId", getCompanySettings);
router.put("/", upsertCompanySettings);
router.put("/:companyId", upsertCompanySettings);

module.exports = router;
