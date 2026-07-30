const express = require("express");
const { verifyAccessToken } = require("../../middlewares/authMiddleware");
const { checkPermission } = require("../../middlewares/rbac");
const { createCrudRouter } = require("./createCrudRouter");
const retentionController = require("../../controllers/CrmApi/entityControllers").retentionController;
const { getDueToday, reassignRetention } = require("../../controllers/CrmApi/retentionActions");

const router = express.Router();

router.use(verifyAccessToken);

router.get("/due-today", checkPermission("retentions", "view"), getDueToday);
router.patch("/:id/assign", checkPermission("retentions", "assign"), reassignRetention);

const crudRouter = createCrudRouter(retentionController, "retentions");
router.use("/", crudRouter);

module.exports = router;