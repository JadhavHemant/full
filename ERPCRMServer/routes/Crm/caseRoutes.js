const express = require("express");
const { verifyAccessToken } = require("../../middlewares/authMiddleware");
const { createCrudRouter } = require("./createCrudRouter");
const caseController = require("../../controllers/CrmApi/entityControllers").caseController;
const { resolveCase, reassignCase } = require("../../controllers/CrmApi/caseActions");

const router = express.Router();

router.use(verifyAccessToken);

router.patch("/:id/resolve", resolveCase);
router.patch("/:id/assign", reassignCase);

const crudRouter = createCrudRouter(caseController);
router.use("/", crudRouter);

module.exports = router;