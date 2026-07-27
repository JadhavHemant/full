const express = require("express");
const router = express.Router();
const { verifyAccessToken } = require("../../../middlewares/authMiddleware");
const {
  createRFQ,
  getRFQs,
  getRFQById,
  sendRFQToVendors,
  submitVendorResponse,
  selectVendorAndConvert,
  deleteRFQ,
} = require("../../../controllers/InventoryApis/rfqController");

router.use(verifyAccessToken);

router.post("/", createRFQ);
router.get("/", getRFQs);
router.get("/:id", getRFQById);
router.post("/:id/send", sendRFQToVendors);
router.post("/:id/vendor-response", submitVendorResponse);
router.post("/:id/select-vendor", selectVendorAndConvert);
router.delete("/:id", deleteRFQ);

module.exports = router;