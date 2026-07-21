import axiosInstance from "../../../Components/AdminSite/utils/axiosInstance";
import * as API from "../../../Components/Endpoint/Endpoint";
import {
  followupTypeService,
  industryService,
  leadSourceService,
  salesStageService,
  taskTypeService,
} from "./masterDataService";
import {
  accountService,
  contactService,
  invoiceService,
  leadService,
  opportunityService,
  quoteService,
} from "./entityServices";

const toArray = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.users)) {
    return payload.users;
  }

  return [];
};

const sortByLabel = (rows, getLabel) =>
  [...rows].sort((left, right) => getLabel(left).localeCompare(getLabel(right)));

const mapOptions = (rows, getValue, getLabel) =>
  sortByLabel(rows, getLabel).map((row) => ({
    value: String(getValue(row)),
    label: getLabel(row),
  }));

const buildLeadLabel = (row) => {
  const contactName = [row.ContactName, row.FirstName, row.LastName].filter(Boolean).join(" ").trim();
  const accountName = row.AccountName || row.Name || "";
  const leadName = contactName || accountName || row.Description || `Lead ${row.Id}`;

  return row.Status ? `${leadName} (${row.Status})` : leadName;
};

const loadCrudOptions = async (service, getLabel) => {
  const response = await service.list({ limit: 200, offset: 0 });
  return mapOptions(toArray(response), (row) => row.Id, getLabel);
};

export const loadCompanyOptions = async () => {
  const response = await axiosInstance.get(API.COMPANIES.GET_ACTIVE);
  return mapOptions(toArray(response.data), (row) => row.Id, (row) => row.CompanyName || row.Name);
};

export const loadUserOptions = async () => {
  const response = await axiosInstance.get(API.GETALLUSERS, {
    params: { page: 1, limit: 200, scope: "company", isActive: "true" },
  });

  return mapOptions(
    toArray(response.data),
    (row) => row.id || row.Id || row.UserId,
    (row) => row.name || row.Name || row.Email || `User ${row.id || row.Id || row.UserId}`
  );
};

export const loadCategoryOptions = async () => {
  const response = await axiosInstance.get(API.CATEGORIES.GET_ACTIVE);
  return mapOptions(
    toArray(response.data),
    (row) => row.Id,
    (row) => row.CategoryName || row.Name
  );
};

export const loadTaskTypeOptions = () => loadCrudOptions(taskTypeService, (row) => row.Name);
export const loadSalesStageOptions = () => loadCrudOptions(salesStageService, (row) => row.Name);
export const loadIndustryOptions = () => loadCrudOptions(industryService, (row) => row.Name);
export const loadFollowupTypeOptions = () => loadCrudOptions(followupTypeService, (row) => row.Name);
export const loadLeadSourceOptions = () => loadCrudOptions(leadSourceService, (row) => row.Name);
export const loadAccountOptions = () => loadCrudOptions(accountService, (row) => row.Name);
export const loadContactOptions = () =>
  loadCrudOptions(contactService, (row) =>
    [row.FirstName, row.LastName].filter(Boolean).join(" ") || row.Email || `Contact ${row.Id}`
  );
export const loadLeadOptions = async () => {
  const response = await leadService.list({ limit: 200, offset: 0 });
  const rows = toArray(response);

  return sortByLabel(rows, buildLeadLabel).map((row) => ({
    value: String(row.Id),
    label: buildLeadLabel(row),
    leadName: [row.ContactName, row.FirstName, row.LastName].filter(Boolean).join(" ").trim() || row.AccountName || row.Description || `Lead ${row.Id}`,
    leadStatus: row.Status || "",
  }));
};
export const loadOpportunityOptions = () =>
  loadCrudOptions(
    opportunityService,
    (row) => row.OpportunityName || row.Description || `Opportunity ${row.Id}`
  );
export const loadQuoteOptions = () =>
  loadCrudOptions(quoteService, (row) => row.QuoteNumber || `Quote ${row.Id}`);
export const loadInvoiceOptions = () =>
  loadCrudOptions(invoiceService, (row) => row.InvoiceNumber || `Invoice ${row.Id}`);
