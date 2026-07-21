const express = require("express");
const { verifyAccessToken } = require("../../middlewares/authMiddleware");
const {
  getMyNotificationPreferences,
  getUserNotificationPreferences,
  upsertMyNotificationPreferences,
} = require("../../controllers/System/notificationPreferencesController");

const router = express.Router();

router.use(verifyAccessToken);

router.get("/mine", getMyNotificationPreferences);
router.put("/mine", upsertMyNotificationPreferences);
router.get("/user/:userId", getUserNotificationPreferences);

module.exports = router;
