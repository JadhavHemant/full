const express = require("express");
const { verifyAccessToken } = require("../../middlewares/authMiddleware");
const { listGroups, createGroup, updateGroup, deleteGroup } = require("../../controllers/CrmApi/groupsController");

const router = express.Router();

router.use(verifyAccessToken);

router.get("/", listGroups);
router.post("/", createGroup);
router.put("/:id", updateGroup);
router.delete("/:id", deleteGroup);

module.exports = router;