import { CRM_ENDPOINTS } from "../config/endpoints";
import { createCrudService } from "./crmApi";

export const taskTypeService = createCrudService(CRM_ENDPOINTS.taskTypes);
export const salesStageService = createCrudService(CRM_ENDPOINTS.salesStages);
export const industryService = createCrudService(CRM_ENDPOINTS.industries);
export const followupTypeService = createCrudService(CRM_ENDPOINTS.followupTypes);
export const leadSourceService = createCrudService(CRM_ENDPOINTS.leadSources);
