const express = require("express");
const router = express.Router();
const { verifyAccessToken } = require("../../../middlewares/authMiddleware");
const { performMatching, getMatches, approveMatch } = require("../../../controllers/InventoryApis/invoiceMatchController");

router.use(verifyAccessToken);

router.post("/", performMatching);
router.get("/", getMatches);
router.post("/:id/approve", approveMatch);

module.exports = router;