import { CRM_ENDPOINTS } from "../config/endpoints";
import { createCrudService } from "./crmApi";

export const accountService = createCrudService(CRM_ENDPOINTS.accounts);
export const contactService = createCrudService(CRM_ENDPOINTS.contacts);
export const leadService = createCrudService(CRM_ENDPOINTS.leads);
export const opportunityService = createCrudService(CRM_ENDPOINTS.opportunities);
export const activityService = createCrudService(CRM_ENDPOINTS.activities);
export const quoteService = createCrudService(CRM_ENDPOINTS.quotes);
export const invoiceService = createCrudService(CRM_ENDPOINTS.invoices);
export const paymentService = createCrudService(CRM_ENDPOINTS.payments);
export const retentionService = createCrudService(CRM_ENDPOINTS.retentions);
export const presalesService = createCrudService(CRM_ENDPOINTS.presales);
export const caseService = createCrudService(CRM_ENDPOINTS.cases);
