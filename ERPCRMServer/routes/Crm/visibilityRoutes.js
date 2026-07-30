const express = require("express");
const { verifyAccessToken } = require("../../middlewares/authMiddleware");
const { checkPermission } = require("../../middlewares/rbac");
const { listVisibility, upsertVisibility, deleteVisibility } = require("../../controllers/CrmApi/visibilityController");

const router = express.Router();

router.use(verifyAccessToken);

router.get("/", checkPermission("visibility", "view"), listVisibility);
router.post("/", checkPermission("visibility", "edit"), upsertVisibility);
router.delete("/:id", checkPermission("visibility", "delete"), deleteVisibility);

module.exports = router;