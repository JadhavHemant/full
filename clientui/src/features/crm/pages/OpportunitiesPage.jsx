import CrmWorkspace from "../components/CrmWorkspace";
import { getSessionUser } from "../../../utils/sessionUser";
import { opportunityService } from "../services/entityServices";
import {
  loadAccountOptions,
  loadCategoryOptions,
  loadContactOptions,
  loadIndustryOptions,
  loadLeadSourceOptions,
  loadSalesStageOptions,
  loadUserOptions,
} from "../services/optionsService";

const OPPORTUNITY_STATUS_OPTIONS = [
  { value: "Open", label: "Open" },
  { value: "Won", label: "Closed Won" },
  { value: "Lost", label: "Closed Lost" },
];

const loadCurrentUserId = () => {
  const user = getSessionUser();
  return Number(user?.userId ?? user?.UserId ?? user?.id ?? 0) || null;
};

const renderProgressBar = (value, row) => {
  const rawValue = value ?? row?.Probability ?? 0;
  const progress = Math.max(0, Math.min(100, Number(rawValue || 0)));

  return (
    <div className="min-w-[150px]">
      <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-blueGray-500">
        <span>Progress</span>
        <span>{progress}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-blueGray-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

const OpportunitiesPage = () => (
  <CrmWorkspace
    title="Opportunities"
    description="Manage active opportunities with sales stage, budget, and ownership."
    service={opportunityService}
    primaryField="OpportunityName"
    searchPlaceholder="Search opportunities"
    defaultQueryParams={{ lifecycleScope: "active" }}
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
      { name: "assignedTo", label: "Assigned to", type: "select", loadOptions: loadUserOptions },
      { name: "createdBy", label: "Created by", type: "select", loadOptions: loadUserOptions },
      { name: "status", label: "Status", type: "select", options: OPPORTUNITY_STATUS_OPTIONS },
      { name: "salesStageId", label: "Sales stage", type: "select", loadOptions: loadSalesStageOptions },
      { name: "leadSourceId", label: "Lead source", type: "select", loadOptions: loadLeadSourceOptions },
    ]}
    rowActions={[
      {
        label: "Move Stage",
        tone: "success",
        endpoint: "stage",
        method: "patch",
        isVisible: (row) => Boolean(row.Id),
        fields: [
          {
            name: "salesStageId",
            label: "Sales stage",
            type: "select",
            loadOptions: loadSalesStageOptions,
            required: true,
          },
          {
            name: "closeReason",
            label: "Close reason",
            type: "textarea",
            placeholder: "Required when moving to a lost stage",
          },
        ],
        getInitialValues: (row) => ({
          salesStageId: row.SalesStageId || "",
          closeReason: row.CloseReason || "",
        }),
        getPayload: (_row, values) => ({
          salesStageId: values.salesStageId,
          closeReason: values.closeReason || undefined,
        }),
        validate: (values) => {
          const stageValue = String(values?.salesStageId ?? "").toLowerCase();
          const closeReason = String(values?.closeReason ?? "").trim();
          const requiresCloseReason = stageValue.includes("lost");

          if (requiresCloseReason && !closeReason) {
            return { closeReason: "Close reason is required when moving to a lost stage" };
          }

          return {};
        },
        successMessage: "Opportunity stage updated",
      },
      {
        label: "Assign",
        tone: "info",
        endpoint: "assign",
        method: "patch",
        isVisible: (row) => Boolean(row.Id),
        fields: [
          {
            name: "assignedTo",
            label: "Assign to",
            type: "select",
            loadOptions: loadUserOptions,
            required: true,
          },
        ],
        getInitialValues: () => ({ assignedTo: loadCurrentUserId() || "" }),
        getPayload: (_row, values) => ({ assignedTo: values.assignedTo }),
        successMessage: "Opportunity reassigned",
      },
    ]}
    fields={[
      { name: "AccountId", label: "Account", type: "select", loadOptions: loadAccountOptions, displayKey: "AccountName" },
      { name: "ContactId", label: "Contact", type: "select", loadOptions: loadContactOptions, displayKey: "ContactName" },
      {
        name: "AutoAccountName",
        label: "New account name",
        placeholder: "Create account automatically if none selected",
        createOnly: true,
        tableHidden: true,
      },
      {
        name: "AutoContactFirstName",
        label: "New contact first name",
        placeholder: "Create contact automatically if none selected",
        createOnly: true,
        tableHidden: true,
      },
      {
        name: "AutoContactLastName",
        label: "New contact last name",
        placeholder: "Doe",
        createOnly: true,
        tableHidden: true,
      },
      {
        name: "AutoContactEmail",
        label: "New contact email",
        type: "email",
        placeholder: "contact@company.com",
        createOnly: true,
        tableHidden: true,
      },
      {
        name: "AutoContactPhone",
        label: "New contact phone",
        placeholder: "+1 555 0101",
        createOnly: true,
        tableHidden: true,
      },
      { name: "OpportunityName", label: "Opportunity name", placeholder: "Q3 renewal", required: true },
      {
        name: "SalesStageId",
        label: "Sales stage",
        type: "select",
        loadOptions: loadSalesStageOptions,
        displayKey: "SalesStageName",
      },
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
      { name: "IndustryId", label: "Industry", type: "select", loadOptions: loadIndustryOptions, displayKey: "IndustryName" },
      { name: "BudgetAmount", label: "Budget amount", type: "number", placeholder: "250000" },
      { name: "EstCloseDate", label: "Estimated close date", type: "date" },
      {
        name: "Status",
        label: "Opportunity status",
        bulkLabel: "Opportunity status",
        type: "select",
        options: OPPORTUNITY_STATUS_OPTIONS,
        placeholder: "Open",
        defaultValue: "Open",
        required: true,
      },
      {
        name: "ProgressPercentage",
        label: "Opportunity progress",
        type: "number",
        placeholder: "60",
        min: 0,
        max: 100,
        step: 1,
        renderCell: renderProgressBar,
      },
      { name: "Probability", label: "Probability %", type: "number", placeholder: "60", min: 0, max: 100, step: 1 },
      { name: "Description", label: "Description", type: "textarea" },
      { name: "QualificationComments", label: "Qualification comments", type: "textarea" },
      { name: "DetailedSummary", label: "Detailed summary", type: "textarea" },
      { name: "AssignedTo", label: "Assigned to", type: "select", loadOptions: loadUserOptions, displayKey: "AssignedToName" },
      {
        name: "AssignedFrom",
        label: "Assigned from",
        type: "select",
        loadOptions: loadUserOptions,
      },
      { name: "IsActive", label: "Active", type: "checkbox", defaultValue: true, userVisible: true },
      { name: "IsDeleted", label: "Deleted", type: "checkbox", defaultValue: false },
      { name: "Flag", label: "Flagged", type: "checkbox", defaultValue: false },
    ]}
  />
);

export default OpportunitiesPage;
