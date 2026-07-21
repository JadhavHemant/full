const express = require("express");
const { verifyAccessToken } = require("../../middlewares/authMiddleware");
const { createCrudRouter } = require("./createCrudRouter");
const leadController = require("../../controllers/CrmApi/entityControllers").leadController;
const {
  convertLead,
  markLeadLost,
  reassignLead,
} = require("../../controllers/CrmApi/leadActions");

const router = express.Router();

router.use(verifyAccessToken);

router.post("/:id/convert", convertLead);
router.patch("/:id/lost", markLeadLost);
router.patch("/:id/assign", reassignLead);

const crudRouter = createCrudRouter(leadController);
router.use("/", crudRouter);

module.exports = router;
