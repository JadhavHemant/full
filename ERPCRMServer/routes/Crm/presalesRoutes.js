const express = require("express");
const { verifyAccessToken } = require("../../middlewares/authMiddleware");
const { createCrudRouter } = require("./createCrudRouter");
const presalesController = require("../../controllers/CrmApi/entityControllers").presalesController;
const { reassignPresale } = require("../../controllers/CrmApi/presalesActions");

const router = express.Router();

router.use(verifyAccessToken);

router.patch("/:id/assign", reassignPresale);

const crudRouter = createCrudRouter(presalesController);
router.use("/", crudRouter);

module.exports = router;