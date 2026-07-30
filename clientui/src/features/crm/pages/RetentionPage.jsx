import CrmWorkspace from "../components/CrmWorkspace";
import { retentionService } from "../services/entityServices";
import {
  loadAccountOptions,
  loadContactOptions,
  loadOpportunityOptions,
  loadUserOptions,
} from "../services/optionsService";

const RetentionPage = () => (
  <CrmWorkspace
    title="Retentions"
    description="Manage renewals, upsell opportunities, and customer retention follow-ups."
    service={retentionService}
    primaryField="Type"
    searchPlaceholder="Search retention records"
    rowActions={[
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
        getInitialValues: (row) => ({ assignedTo: row.AssignedTo || "" }),
        getPayload: (_row, values) => ({ assignedTo: values.assignedTo }),
        successMessage: "Retention reassigned",
      },
    ]}
    filters={[
      { name: "status", label: "Status", type: "select", options: [
        { value: "Planned", label: "Planned" },
        { value: "In Progress", label: "In Progress" },
        { value: "Completed", label: "Completed" },
      ]},
      { name: "assignedTo", label: "Assigned to", type: "select", loadOptions: loadUserOptions },
    ]}
    fields={[
      { name: "AccountId", label: "Account", type: "select", loadOptions: loadAccountOptions },
      { name: "ContactId", label: "Contact", type: "select", loadOptions: loadContactOptions },
      { name: "OpportunityId", label: "Opportunity", type: "select", loadOptions: loadOpportunityOptions },
      { name: "Type", label: "Type", required: true, placeholder: "Renewal / Upsell / Cross-sell" },
      { name: "Status", label: "Status", type: "select", options: [
        { value: "Planned", label: "Planned" },
        { value: "In Progress", label: "In Progress" },
        { value: "Completed", label: "Completed" },
      ]},
      { name: "NextActionDate", label: "Next action date", type: "date" },
      { name: "ReminderDate", label: "Reminder date", type: "date" },
      { name: "Notes", label: "Notes", type: "textarea" },
      { name: "AssignedTo", label: "Assigned to", type: "select", loadOptions: loadUserOptions },
      { name: "IsActive", label: "Active", type: "checkbox", defaultValue: true },
      { name: "IsDeleted", label: "Deleted", type: "checkbox", defaultValue: false },
      { name: "Flag", label: "Flagged", type: "checkbox", defaultValue: false },
    ]}
  />
);

export default RetentionPage;
