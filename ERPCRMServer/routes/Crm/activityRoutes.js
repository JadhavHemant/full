const express = require("express");
const { verifyAccessToken } = require("../../middlewares/authMiddleware");
const { checkPermission } = require("../../middlewares/rbac");
const { createCrudRouter } = require("./createCrudRouter");
const activityController = require("../../controllers/CrmApi/entityControllers").activityController;
const { completeActivity, reassignActivity } = require("../../controllers/CrmApi/activityActions");

const router = express.Router();

router.use(verifyAccessToken);

router.patch("/:id/complete", checkPermission("activities", "edit"), completeActivity);
router.patch("/:id/assign", checkPermission("activities", "assign"), reassignActivity);

const crudRouter = createCrudRouter(activityController, "activities");
router.use("/", crudRouter);

module.exports = router;