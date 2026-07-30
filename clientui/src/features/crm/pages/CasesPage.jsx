import CrmWorkspace from "../components/CrmWorkspace";
import { getSessionUser } from "../../../utils/sessionUser";
import { caseService } from "../services/entityServices";
import {
  loadAccountOptions,
  loadContactOptions,
  loadLeadOptions,
  loadOpportunityOptions,
  loadUserOptions,
} from "../services/optionsService";

const loadCurrentUserId = () => {
  const user = getSessionUser();
  return Number(user?.userId ?? user?.UserId ?? user?.id ?? 0) || null;
};

const CasesPage = () => (
  <CrmWorkspace
    title="Cases"
    description="Track customer issues, ownership, and resolution progress inside the CRM."
    service={caseService}
    primaryField="Subject"
    searchPlaceholder="Search cases"
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
        options: [
          { value: "Open", label: "Open" },
          { value: "In Progress", label: "In Progress" },
          { value: "Closed", label: "Closed" },
        ],
      },
      {
        name: "priority",
        label: "Priority",
        type: "select",
        options: [
          { value: "Low", label: "Low" },
          { value: "Medium", label: "Medium" },
          { value: "High", label: "High" },
        ],
      },
      { name: "assignedTo", label: "Assigned to", type: "select", loadOptions: loadUserOptions },
      { name: "createdBy", label: "Created by", type: "select", loadOptions: loadUserOptions },
    ]}
    rowActions={[
      {
        label: "Resolve",
        tone: "success",
        endpoint: "resolve",
        method: "patch",
        isVisible: (row) => row.Status !== "Closed",
        fields: [
          {
            name: "resolution",
            label: "Resolution",
            type: "textarea",
            required: true,
            placeholder: "Describe how this case was resolved",
          },
        ],
        getInitialValues: (row) => ({ resolution: row.Resolution || "" }),
        getPayload: (_row, values) => ({ resolution: values.resolution }),
        successMessage: "Case resolved",
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
        successMessage: "Case reassigned",
      },
    ]}
    fields={[
      { name: "AccountId", label: "Account", type: "select", loadOptions: loadAccountOptions, displayKey: "AccountName" },
      { name: "ContactId", label: "Contact", type: "select", loadOptions: loadContactOptions, displayKey: "ContactName" },
      { name: "LeadId", label: "Lead", type: "select", loadOptions: loadLeadOptions },
      {
        name: "OpportunityId",
        label: "Opportunity",
        type: "select",
        loadOptions: loadOpportunityOptions,
      },
      { name: "Subject", label: "Subject", placeholder: "Production issue", required: true },
      { name: "Status", label: "Status", placeholder: "Open" },
      { name: "Priority", label: "Priority", placeholder: "High" },
      { name: "Description", label: "Description", type: "textarea" },
      { name: "Resolution", label: "Resolution", type: "textarea" },
      { name: "AssignedTo", label: "Assigned to", type: "select", loadOptions: loadUserOptions, displayKey: "AssignedToName" },
      {
        name: "AssignedFrom",
        label: "Assigned from",
        type: "select",
        loadOptions: loadUserOptions,
      },
      { name: "IsActive", label: "Active", type: "checkbox", defaultValue: true },
      { name: "IsDeleted", label: "Deleted", type: "checkbox", defaultValue: false },
      { name: "Flag", label: "Flagged", type: "checkbox", defaultValue: false },
    ]}
  />
);

export default CasesPage;
