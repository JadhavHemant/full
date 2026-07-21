const express = require("express");
const { verifyAccessToken } = require("../../middlewares/authMiddleware");
const { listGroupMembers, addGroupMember, removeGroupMember } = require("../../controllers/CrmApi/groupMembersController");

const router = express.Router();

router.use(verifyAccessToken);

router.get("/", listGroupMembers);
router.post("/", addGroupMember);
router.delete("/:groupId/:userId", removeGroupMember);

module.exports = router;