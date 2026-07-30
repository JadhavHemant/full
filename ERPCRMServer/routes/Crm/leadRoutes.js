const express = require("express");
const { verifyAccessToken } = require("../../middlewares/authMiddleware");
const { checkPermission } = require("../../middlewares/rbac");
const { createCrudRouter } = require("./createCrudRouter");
const leadController = require("../../controllers/CrmApi/entityControllers").leadController;
const {
  convertLead,
  markLeadLost,
  reassignLead,
} = require("../../controllers/CrmApi/leadActions");

const router = express.Router();

router.use(verifyAccessToken);

router.post("/:id/convert", checkPermission("leads", "approve"), convertLead);
router.post("/:id/convert", checkPermission("leads", "approve"), convertLead);
router.patch("/:id/lost", checkPermission("leads", "edit"), markLeadLost);
router.patch("/:id/assign", checkPermission("leads", "assign"), reassignLead);

const crudRouter = createCrudRouter(leadController, "leads");
router.use("/", crudRouter);

module.exports = router;
