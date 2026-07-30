const express = require("express");
const { verifyAccessToken } = require("../../middlewares/authMiddleware");
const { checkPermission } = require("../../middlewares/rbac");
const { listGroupMembers, addGroupMember, removeGroupMember } = require("../../controllers/CrmApi/groupMembersController");

const router = express.Router();

router.use(verifyAccessToken);

router.get("/", checkPermission("groupMembers", "view"), listGroupMembers);
router.post("/", checkPermission("groupMembers", "create"), addGroupMember);
router.delete("/:groupId/:userId", checkPermission("groupMembers", "delete"), removeGroupMember);

module.exports = router;