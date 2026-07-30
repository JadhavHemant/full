const express = require("express");
const { verifyAccessToken } = require("../../middlewares/authMiddleware");
const { checkPermission } = require("../../middlewares/rbac");
const { createCrudRouter } = require("./createCrudRouter");
const quoteController = require("../../controllers/CrmApi/entityControllers").quoteController;
const { convertQuoteToInvoice, recordPaymentByQuoteId } = require("../../controllers/CrmApi/quoteActions");

const router = express.Router();

router.use(verifyAccessToken);

router.post("/:id/convert-to-invoice", checkPermission("quotes", "approve"), convertQuoteToInvoice);
router.post("/:id/payments", checkPermission("payments", "create"), recordPaymentByQuoteId);

const crudRouter = createCrudRouter(quoteController, "quotes");
router.use("/", crudRouter);

module.exports = router;