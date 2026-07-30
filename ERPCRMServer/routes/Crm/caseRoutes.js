const express = require("express");
const { verifyAccessToken } = require("../../middlewares/authMiddleware");
const { checkPermission } = require("../../middlewares/rbac");
const { createCrudRouter } = require("./createCrudRouter");
const caseController = require("../../controllers/CrmApi/entityControllers").caseController;
const { resolveCase, reassignCase } = require("../../controllers/CrmApi/caseActions");

const router = express.Router();

router.use(verifyAccessToken);

router.patch("/:id/resolve", checkPermission("cases", "edit"), resolveCase);
router.patch("/:id/assign", checkPermission("cases", "assign"), reassignCase);

const crudRouter = createCrudRouter(caseController, "cases");
router.use("/", crudRouter);

module.exports = router;