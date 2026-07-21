const express = require("express");
const { verifyAccessToken } = require("../../middlewares/authMiddleware");
const { createCrudRouter } = require("./createCrudRouter");
const retentionController = require("../../controllers/CrmApi/entityControllers").retentionController;
const { getDueToday, reassignRetention } = require("../../controllers/CrmApi/retentionActions");

const router = express.Router();

router.use(verifyAccessToken);

router.get("/due-today", getDueToday);
router.patch("/:id/assign", reassignRetention);

const crudRouter = createCrudRouter(retentionController);
router.use("/", crudRouter);

module.exports = router;