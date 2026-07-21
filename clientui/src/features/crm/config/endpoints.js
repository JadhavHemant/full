import { API_BASE_URL } from "../../../Components/Endpoint/Endpoint";

const CRM_BASE = `${API_BASE_URL}/crm`;

export const CRM_ENDPOINTS = {
  taskTypes: `${CRM_BASE}/task-types`,
  salesStages: `${CRM_BASE}/sales-stages`,
  industries: `${CRM_BASE}/industries`,
  followupTypes: `${CRM_BASE}/followup-types`,
  leadSources: `${CRM_BASE}/lead-sources`,
  accounts: `${CRM_BASE}/accounts`,
  contacts: `${CRM_BASE}/contacts`,
  leads: `${CRM_BASE}/leads`,
  opportunities: `${CRM_BASE}/opportunities`,
  activities: `${CRM_BASE}/activities`,
  quotes: `${CRM_BASE}/quotes`,
  invoices: `${CRM_BASE}/invoices`,
  payments: `${CRM_BASE}/payments`,
  retentions: `${CRM_BASE}/retentions`,
  presales: `${CRM_BASE}/presales`,
  cases: `${CRM_BASE}/cases`,
};
