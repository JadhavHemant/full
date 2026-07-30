const express = require("express");
const { verifyAccessToken } = require("../../middlewares/authMiddleware");
const { checkPermission } = require("../../middlewares/rbac");

const createCrudRouter = (controller, moduleKey) => {
  const router = express.Router();

  router.use(verifyAccessToken);

  router.get("/", checkPermission(moduleKey, "view"), controller.list);
  router.get("/:id/comments", checkPermission(moduleKey, "view"), controller.listComments);
  router.post("/:id/comments", checkPermission(moduleKey, "edit"), controller.addComment);
  router.get("/:id/history", checkPermission(moduleKey, "view"), controller.listHistory);
  router.get("/:id", checkPermission(moduleKey, "view"), controller.getById);
  router.post("/", checkPermission(moduleKey, "create"), controller.create);
  router.put("/:id", checkPermission(moduleKey, "edit"), controller.update);
  router.delete("/:id", checkPermission(moduleKey, "delete"), controller.remove);

  return router;
};

module.exports = { createCrudRouter };
