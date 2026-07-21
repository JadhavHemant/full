const express = require("express");
const { verifyAccessToken } = require("../../middlewares/authMiddleware");
const { listComments, createComment, deleteComment } = require("../../controllers/CrmApi/commentsController");

const router = express.Router();

router.use(verifyAccessToken);

router.get("/", listComments);
router.post("/", createComment);
router.delete("/:id", deleteComment);

module.exports = router;