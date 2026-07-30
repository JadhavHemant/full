const express = require("express");
const { verifyAccessToken } = require("../../middlewares/authMiddleware");
const { checkPermission } = require("../../middlewares/rbac");
const { createCrudRouter } = require("./createCrudRouter");
const presalesController = require("../../controllers/CrmApi/entityControllers").presalesController;
const { reassignPresale } = require("../../controllers/CrmApi/presalesActions");

const router = express.Router();

router.use(verifyAccessToken);

router.patch("/:id/assign", checkPermission("presales", "assign"), reassignPresale);

const crudRouter = createCrudRouter(presalesController, "presales");
router.use("/", crudRouter);

module.exports = router;