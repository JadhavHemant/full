const express = require("express");
const { verifyAccessToken } = require("../../middlewares/authMiddleware");
const { checkPermission } = require("../../middlewares/rbac");
const { listComments, createComment, deleteComment } = require("../../controllers/CrmApi/commentsController");

const router = express.Router();

router.use(verifyAccessToken);

router.get("/", checkPermission("comments", "view"), listComments);
router.post("/", checkPermission("comments", "create"), createComment);
router.delete("/:id", checkPermission("comments", "delete"), deleteComment);

module.exports = router;