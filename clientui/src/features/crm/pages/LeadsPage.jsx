import CrmWorkspace from "../components/CrmWorkspace";
import { getSessionUser } from "../../../utils/sessionUser";
import { leadService } from "../services/entityServices";
import {
  loadAccountOptions,
  loadCategoryOptions,
  loadContactOptions,
  loadFollowupTypeOptions,
  loadIndustryOptions,
  loadLeadSourceOptions,
  loadUserOptions,
} from "../services/optionsService";

const LEAD_STATUS_OPTIONS = [
  { value: "New", label: "New Lead" },
  { value: "Contacted", label: "Contacted" },
  { value: "Qualified", label: "Qualified" },
  { value: "Disqualified", label: "Disqualified" },
  { value: "Converted", label: "Converted" },
  { value: "Lost", label: "Lost" },
];

const loadCurrentUserId = () => {
  const user = getSessionUser();
  return Number(user?.userId ?? user?.UserId ?? user?.id ?? 0) || null;
};

const renderProgressBar = (value) => {
  const progress = Math.max(0, Math.min(100, Number(value || 0)));

  return (
    <div className="min-w-[150px]">
      <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-blueGray-500">
        <span>Progress</span>
        <span>{progress}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-blueGray-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

const LeadsPage = () => (
  <CrmWorkspace
    title="Leads"
    description="Capture incoming CRM leads and track who owns the next action."
    service={leadService}
    primaryField="Status"
    searchPlaceholder="Search leads"
    defaultQueryParams={{ lifecycleScope: "active" }}
    defaultSortBy="CreatedAt"
    defaultSortOrder="DESC"
    defaultTableFieldNames={[
      "LeadSourceId",
      "AssignedTo",
      "CreatedBy",
      "ProgressPercentage",
      "Description",
    ]}
    filters={[
      {
        name: "isActive",
        label: "Active",
        type: "select",
        options: [
          { value: "true", label: "Active" },
          { value: "false", label: "Inactive" },
        ],
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        options: LEAD_STATUS_OPTIONS,
      },
      { name: "assignedTo", label: "Assigned to", type: "select", loadOptions: loadUserOptions },
      { name: "createdBy", label: "Created by", type: "select", loadOptions: loadUserOptions },
      { name: "leadSourceId", label: "Lead source", type: "select", loadOptions: loadLeadSourceOptions },
    ]}
    rowActions={[
      {
        label: "Convert",
        tone: "success",
        endpoint: "convert",
        method: "post",
        isVisible: (row) => !["Converted", "Qualified"].includes(row.Status),
        fields: [
          {
            name: "OpportunityName",
            label: "Opportunity name",
            required: true,
            placeholder: "Opportunity name",
          },
          {
            name: "accountId",
            label: "Account",
            type: "select",
            loadOptions: loadAccountOptions,
          },
          {
            name: "contactId",
            label: "Contact",
            type: "select",
            loadOptions: loadContactOptions,
          },
        ],
        getInitialValues: (row) => ({
          OpportunityName: row.Description || `Opportunity from Lead ${row.Id}`,
          accountId: row.AccountId || "",
          contactId: row.ContactId || "",
        }),
        getPayload: (_row, values) => ({
          OpportunityName: values.OpportunityName,
          accountId: values.accountId || undefined,
          contactId: values.contactId || undefined,
        }),
        successMessage: "Lead converted",
        getSuccessNavigation: ({ updatedRecord, isUserPortal }) => {
          const opportunityId = Number(updatedRecord?.data?.opportunity?.Id || 0);
          if (!opportunityId) {
            return null;
          }

          return `${isUserPortal ? "/user/opportunities" : "/Admin/Opportunities"}?openId=${opportunityId}`;
        },
      },
      {
        label: "Mark Lost",
        tone: "danger",
        endpoint: "lost",
        method: "patch",
        isVisible: (row) => !["Lost", "Converted"].includes(row.Status),
        fields: [
          {
            name: "lostReason",
            label: "Lost reason",
            type: "textarea",
            required: true,
            placeholder: "Why was this lead lost?",
          },
        ],
        getPayload: (_row, values) => ({ lostReason: values.lostReason }),
        successMessage: "Lead marked as lost",
      },
      {
        label: "Assign to me",
        tone: "info",
        endpoint: "assign",
        method: "patch",
        isVisible: (row) => Boolean(row.Id),
        confirmMessage: () => "Assign this lead to you?",
        getPayload: () => ({ assignedTo: loadCurrentUserId() }),
        successMessage: "Lead reassigned",
      },
    ]}
    fields={[
      {
        name: "LeadSourceId",
        label: "Lead source",
        type: "select",
        loadOptions: loadLeadSourceOptions,
        displayKey: "LeadSourceName",
      },
      {
        name: "ProductCategoryId",
        label: "Product category",
        type: "select",
        loadOptions: loadCategoryOptions,
      },
      {
        name: "FollowupTypeId",
        label: "Follow-up type",
        type: "select",
        loadOptions: loadFollowupTypeOptions,
        displayKey: "FollowupTypeName",
      },
      { name: "IndustryId", label: "Industry", type: "select", loadOptions: loadIndustryOptions, displayKey: "IndustryName" },
      {
        name: "Status",
        label: "Lead status",
        bulkLabel: "Lead status",
        type: "select",
        options: LEAD_STATUS_OPTIONS,
        placeholder: "New",
        required: true,
      },
      { name: "Rating", label: "Rating", type: "number", placeholder: "4" },
      {
        name: "ProgressPercentage",
        label: "Lead progress",
        type: "number",
        placeholder: "40",
        min: 0,
        max: 100,
        step: 1,
        renderCell: renderProgressBar,
      },
      { name: "Description", label: "Description", type: "textarea" },
      { name: "Comments", label: "Comments", type: "textarea" },
      { name: "AssignedTo", label: "Assigned to", type: "select", loadOptions: loadUserOptions, displayKey: "AssignedToName" },
      {
        name: "AssignedFrom",
        label: "Assigned from",
        type: "select",
        loadOptions: loadUserOptions,
        displayKey: "AssignedFromName",
      },
      {
        name: "ProspectAccountName",
        label: "Prospect company name",
        placeholder: "Create account only when this lead is qualified",
      },
      {
        name: "ProspectAccountWebsite",
        label: "Prospect company website",
        placeholder: "https://company.com",
      },
      {
        name: "ProspectContactFirstName",
        label: "Prospect first name",
        placeholder: "Contact first name used when qualifying the lead",
      },
      {
        name: "ProspectContactLastName",
        label: "Prospect last name",
        placeholder: "Doe",
      },
      {
        name: "ProspectContactEmail",
        label: "Prospect email",
        type: "email",
        placeholder: "contact@company.com",
      },
      {
        name: "ProspectContactPhone",
        label: "Prospect phone",
        placeholder: "+91 98765 01010",
      },
      {
        name: "ProspectContactTitle",
        label: "Prospect title",
        placeholder: "Operations Head",
      },
      {
        name: "AccountId",
        label: "Existing account (optional)",
        type: "select",
        loadOptions: loadAccountOptions,
        displayKey: "AccountName",
      },
      {
        name: "ContactId",
        label: "Existing contact (optional)",
        type: "select",
        loadOptions: loadContactOptions,
        displayKey: "ContactName",
      },
      { name: "IsActive", label: "Active", type: "checkbox", defaultValue: true, userVisible: true },
      { name: "IsDeleted", label: "Deleted", type: "checkbox", defaultValue: false },
      { name: "Flag", label: "Flagged", type: "checkbox", defaultValue: false },
    ]}
  />
);

export default LeadsPage;
