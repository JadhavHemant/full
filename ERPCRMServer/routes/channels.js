const express = require("express");
const { verifyAccessToken } = require("../middlewares/authMiddleware");
const { validateRequest, schemas } = require("../middlewares/validation");
const {
  addMember,
  createChannel,
  createDirectChannel,
  deleteChannel,
  getChannelDetails,
  listChannels,
  removeMember,
  searchUsers,
  updateChannel,
} = require("../controllers/channelController");

const router = express.Router();

// Apply authentication to all routes
router.use(verifyAccessToken);

// Search users
router.get("/users/search", validateRequest(schemas.pagination, 'query'), searchUsers);

// List channels with pagination
router.get("/channels", validateRequest(schemas.pagination, 'query'), listChannels);

// Create channel with validation
router.post("/channels", validateRequest(schemas.createChannel, 'body', true), createChannel);

// Create direct channel
router.post("/channels/direct", createDirectChannel);

// Get channel details
router.get("/channels/:id", getChannelDetails);

// Update channel with validation
router.put("/channels/:id", validateRequest(schemas.createChannel, 'body', true), updateChannel);

// Delete channel
router.delete("/channels/:id", deleteChannel);

// Add member
router.post("/channels/:id/members", addMember);

// Remove member
router.delete("/channels/:id/members", removeMember);

module.exports = router;
