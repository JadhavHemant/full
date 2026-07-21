import CrmWorkspace from "../components/CrmWorkspace";
import { presalesService } from "../services/entityServices";
import {
  loadLeadOptions,
  loadOpportunityOptions,
  loadTaskTypeOptions,
  loadUserOptions,
} from "../services/optionsService";

const PreSalesPage = () => (
  <CrmWorkspace
    title="PreSales"
    description="Track presales activities, timing, status, and related task types."
    service={presalesService}
    primaryField="ClientName"
    searchPlaceholder="Search presales records"
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
          { value: "Pending", label: "Pending" },
          { value: "In Progress", label: "In Progress" },
          { value: "Completed", label: "Completed" },
        ],
      },
      { name: "assignedTo", label: "Assigned to", type: "select", loadOptions: loadUserOptions },
      { name: "createdBy", label: "Created by", type: "select", loadOptions: loadUserOptions },
      { name: "taskTypeId", label: "Task type", type: "select", loadOptions: loadTaskTypeOptions },
    ]}
    fields={[
      { name: "LeadId", label: "Lead", type: "select", loadOptions: loadLeadOptions },
      {
        name: "OpportunityId",
        label: "Opportunity",
        type: "select",
        loadOptions: loadOpportunityOptions,
        displayKey: "OpportunityName",
      },
      { name: "ClientName", label: "Client name", placeholder: "Acme Corp" },
      { name: "RelatedTo", label: "Related to", placeholder: "Cloud migration" },
      { name: "StartDate", label: "Start date", type: "datetime-local" },
      { name: "EndDate", label: "End date", type: "datetime-local" },
      { name: "ETA", label: "ETA", type: "datetime-local" },
      { name: "DurationMinutes", label: "Duration minutes", type: "number", placeholder: "60" },
      { name: "Status", label: "Status", placeholder: "Pending" },
      { name: "Hyperscaler", label: "Hyperscaler", placeholder: "AWS" },
      { name: "FollowUpTriggerStatus", label: "Follow-up trigger status", placeholder: "Open" },
      { name: "TaskTypeId", label: "Task type", type: "select", loadOptions: loadTaskTypeOptions, displayKey: "TaskTypeName" },
      { name: "DetailedSummary", label: "Detailed summary", type: "textarea" },
      { name: "Description", label: "Description", type: "textarea" },
      { name: "Comments", label: "Comments", type: "textarea" },
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

export default PreSalesPage;
