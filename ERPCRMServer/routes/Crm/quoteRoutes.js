const express = require("express");
const { verifyAccessToken } = require("../../middlewares/authMiddleware");
const { createCrudRouter } = require("./createCrudRouter");
const quoteController = require("../../controllers/CrmApi/entityControllers").quoteController;
const { convertQuoteToInvoice, recordPayment } = require("../../controllers/CrmApi/quoteActions");

const router = express.Router();

router.use(verifyAccessToken);

router.post("/:id/convert-to-invoice", convertQuoteToInvoice);
router.post("/:id/payments", recordPayment);

const crudRouter = createCrudRouter(quoteController);
router.use("/", crudRouter);

module.exports = router;