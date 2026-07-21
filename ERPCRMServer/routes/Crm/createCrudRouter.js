const express = require("express");
const { verifyAccessToken } = require("../../middlewares/authMiddleware");

const createCrudRouter = (controller) => {
  const router = express.Router();

  router.use(verifyAccessToken);

  router.get("/", controller.list);
  router.get("/:id/comments", controller.listComments);
  router.post("/:id/comments", controller.addComment);
  router.get("/:id/history", controller.listHistory);
  router.get("/:id", controller.getById);
  router.post("/", controller.create);
  router.put("/:id", controller.update);
  router.delete("/:id", controller.remove);

  return router;
};

module.exports = { createCrudRouter };
