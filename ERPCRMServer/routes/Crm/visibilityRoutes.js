const express = require("express");
const { verifyAccessToken } = require("../../middlewares/authMiddleware");
const { listVisibility, upsertVisibility, deleteVisibility } = require("../../controllers/CrmApi/visibilityController");

const router = express.Router();

router.use(verifyAccessToken);

router.get("/", listVisibility);
router.post("/", upsertVisibility);
router.delete("/:id", deleteVisibility);

module.exports = router;