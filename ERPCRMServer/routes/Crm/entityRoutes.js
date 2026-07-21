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
  accountRoutes: createCrudRouter(accountController),
  contactRoutes: createCrudRouter(contactController),
  leadRoutes: createCrudRouter(leadController),
  opportunityRoutes,
  opportunityProductRoutes: createCrudRouter(opportunityProductController),
  activityRoutes,
  quoteRoutes,
  invoiceRoutes: createCrudRouter(invoiceController),
  paymentRoutes: createCrudRouter(paymentController),
  retentionRoutes,
  presalesRoutes,
  caseRoutes,
};
