const { createCrudRouter } = require("./createCrudRouter");
const {
  accountController,
  contactController,
  leadController,
  opportunityProductController,
  invoiceController,
  paymentController,
} = require("../../controllers/CrmApi/entityControllers");
const opportunityRoutes = require("./opportunityRoutes");
const quoteRoutes = require("./quoteRoutes");
const caseRoutes = require("./caseRoutes");
const activityRoutes = require("./activityRoutes");
const presalesRoutes = require("./presalesRoutes");
const retentionRoutes = require("./retentionRoutes");

module.exports = {
  accountRoutes: createCrudRouter(accountController, "accounts"),
  contactRoutes: createCrudRouter(contactController, "contacts"),
  leadRoutes: createCrudRouter(leadController, "leads"),
  opportunityRoutes,
  opportunityProductRoutes: createCrudRouter(opportunityProductController, "opportunityProducts"),
  activityRoutes,
  quoteRoutes,
  invoiceRoutes: createCrudRouter(invoiceController, "invoices"),
  paymentRoutes: createCrudRouter(paymentController, "payments"),
  retentionRoutes,
  presalesRoutes,
  caseRoutes,
};
