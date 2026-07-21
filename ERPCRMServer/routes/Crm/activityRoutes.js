const express = require("express");
const { verifyAccessToken } = require("../../middlewares/authMiddleware");
const { createCrudRouter } = require("./createCrudRouter");
const activityController = require("../../controllers/CrmApi/entityControllers").activityController;
const { completeActivity, reassignActivity } = require("../../controllers/CrmApi/activityActions");

const router = express.Router();

router.use(verifyAccessToken);

router.patch("/:id/complete", completeActivity);
router.patch("/:id/assign", reassignActivity);

const crudRouter = createCrudRouter(activityController);
router.use("/", crudRouter);

module.exports = router;