const express = require("express");
const { verifyAccessToken } = require("../../middlewares/authMiddleware");
const { checkPermission } = require("../../middlewares/rbac");
const { createCrudRouter } = require("./createCrudRouter");
const opportunityController = require("../../controllers/CrmApi/entityControllers").opportunityController;
const {
  getPipeline,
  transitionStage,
  reassignOpportunity,
} = require("../../controllers/CrmApi/opportunityActions");

const router = express.Router();

router.use(verifyAccessToken);

router.get("/pipeline", checkPermission("opportunities", "view"), getPipeline);
router.patch("/:id/stage", checkPermission("opportunities", "edit"), transitionStage);
router.patch("/:id/assign", checkPermission("opportunities", "assign"), reassignOpportunity);

const crudRouter = createCrudRouter(opportunityController, "opportunities");
router.use("/", crudRouter);

module.exports = router;