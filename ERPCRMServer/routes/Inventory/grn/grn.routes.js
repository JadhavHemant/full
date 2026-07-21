const express = require("express");
const router = express.Router();
const { verifyAccessToken: authenticate } = require("../../../middlewares/authMiddleware");
const { createGRN, getAllGRNs, getGRNById } = require("../../../controllers/InventoryApis/grnController");

router.post("/grn", authenticate, createGRN);
router.get("/grn", authenticate, getAllGRNs);
router.get("/grn/:id", authenticate, getGRNById);

module.exports = router;