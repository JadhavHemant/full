const express = require("express");
const { verifyAccessToken } = require("../../middlewares/authMiddleware");
const { createCrudRouter } = require("./createCrudRouter");
const opportunityController = require("../../controllers/CrmApi/entityControllers").opportunityController;
const {
  getPipeline,
  transitionStage,
  reassignOpportunity,
} = require("../../controllers/CrmApi/opportunityActions");

const router = express.Router();

router.use(verifyAccessToken);

router.get("/pipeline", getPipeline);
router.patch("/:id/stage", transitionStage);
router.patch("/:id/assign", reassignOpportunity);

const crudRouter = createCrudRouter(opportunityController);
router.use("/", crudRouter);

module.exports = router;