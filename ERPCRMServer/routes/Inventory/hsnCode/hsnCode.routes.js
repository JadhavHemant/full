const express = require("express");
const router = express.Router();
const { verifyAccessToken } = require("../../../middlewares/authMiddleware");
const { createHSNCode, getHSNCodes, updateHSNCode, deleteHSNCode } = require("../../../controllers/InventoryApis/hsnCodeController");

router.use(verifyAccessToken);

router.post("/", createHSNCode);
router.get("/", getHSNCodes);
router.put("/:id", updateHSNCode);
router.delete("/:id", deleteHSNCode);

module.exports = router;