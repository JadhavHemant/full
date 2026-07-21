/**
 * CRM Routes Index
 * Centralized export of all CRM route modules
 */

const {
  taskTypeRoutes,
  salesStageRoutes,
  industryRoutes,
  followupTypeRoutes,
  leadSourceRoutes,
} = require('./masterDataRoutes');
const {
  accountRoutes,
  contactRoutes,
  opportunityProductRoutes,
  activityRoutes,
  quoteRoutes,
  invoiceRoutes,
  paymentRoutes,
  retentionRoutes,
  presalesRoutes,
  caseRoutes,
} = require('./entityRoutes');
const leadRoutes = require('./leadRoutes');
const opportunityRoutes = require('./opportunityRoutes');
const caseEmailRoutes = require('./caseEmailRoutes');
const commentsRoutes = require('./commentsRoutes');
const assignmentsRoutes = require('./assignmentsRoutes');
const visibilityRoutes = require('./visibilityRoutes');
const groupsRoutes = require('./groupsRoutes');
const groupMembersRoutes = require('./groupMembersRoutes');
const automationSettingsRoutes = require('../crm/automationSettingsRoutes');

module.exports = {
  taskTypeRoutes,
  salesStageRoutes,
  industryRoutes,
  followupTypeRoutes,
  leadSourceRoutes,
  accountRoutes,
  contactRoutes,
  leadRoutes,
  opportunityRoutes,
  opportunityProductRoutes,
  activityRoutes,
  quoteRoutes,
  invoiceRoutes,
  paymentRoutes,
  retentionRoutes,
  presalesRoutes,
  caseRoutes,
  caseEmailRoutes,
  commentsRoutes,
  assignmentsRoutes,
  visibilityRoutes,
  groupsRoutes,
  groupMembersRoutes,
  automationSettingsRoutes,
};
