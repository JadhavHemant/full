const express = require("express");
const { verifyAccessToken } = require("../middlewares/authMiddleware");
const { validateRequest, schemas } = require("../middlewares/validation");
const { handleChatUpload } = require("../middleware/upload");
const {
  createMessage,
  deleteMessage,
  editMessage,
  listMessages,
  markRead,
  toggleReaction,
  uploadAttachment,
} = require("../controllers/messageController");

const router = express.Router();

// Apply authentication to all routes
router.use(verifyAccessToken);

// List messages with pagination validation
router.get("/channels/:id/messages", validateRequest(schemas.pagination, 'query'), listMessages);

// Create message with validation and content sanitization
router.post("/channels/:id/messages", validateRequest(schemas.createMessage, 'body', true), createMessage);

// Upload attachment
router.post("/channels/:id/upload", handleChatUpload, uploadAttachment);

// Edit message with validation
router.put("/messages/:id", validateRequest(schemas.updateMessage, 'body', true), editMessage);

// Delete message
router.delete("/messages/:id", deleteMessage);

// Toggle reaction
router.post("/messages/:id/react", toggleReaction);

// Mark message as read
router.post("/messages/:id/read", markRead);

module.exports = router;
