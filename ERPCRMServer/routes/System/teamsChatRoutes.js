const express = require("express");
const { verifyAccessToken } = require("../../middlewares/authMiddleware");
const {
  getTeams,
  createTeam,
  getTeamMembers,
  addTeamMembers,
  removeTeamMember,
  getTeamChannels,
  createChannel,
  getChannelMessages,
  sendMessage,
  markChannelAsRead,
  getCompanyUsers,
} = require("../../controllers/System/teamsChatController");

const router = express.Router();

router.use(verifyAccessToken);

router.get("/users", getCompanyUsers);

router.get("/teams", getTeams);
router.post("/teams", createTeam);
router.get("/teams/:teamId/members", getTeamMembers);
router.post("/teams/:teamId/members", addTeamMembers);
router.delete("/teams/:teamId/members/:userId", removeTeamMember);
router.get("/teams/:teamId/channels", getTeamChannels);
router.post("/teams/:teamId/channels", createChannel);

router.get("/channels/:channelId/messages", getChannelMessages);
router.post("/channels/:channelId/messages", sendMessage);
router.post("/channels/:channelId/read", markChannelAsRead);

module.exports = router;
