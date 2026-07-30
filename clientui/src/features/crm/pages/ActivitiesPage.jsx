import CrmWorkspace from "../components/CrmWorkspace";
import { getSessionUser } from "../../../utils/sessionUser";
import { activityService } from "../services/entityServices";
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

const ActivitiesPage = () => (
  <CrmWorkspace
    title="Activities"
    description="Track calls, meetings, emails, and follow-up tasks across the sales cycle."
    service={activityService}
    primaryField="Subject"
    searchPlaceholder="Search activities"
    rowActions={[
      {
        label: "Complete",
        tone: "success",
        endpoint: "complete",
        method: "patch",
        isVisible: (row) => row.Status !== "Completed",
        confirmMessage: () => "Mark this activity as completed?",
        getPayload: () => ({}),
        successMessage: "Activity completed",
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
        successMessage: "Activity reassigned",
      },
    ]}
    filters={[
      { name: "status", label: "Status", type: "select", options: [
        { value: "Pending", label: "Pending" },
        { value: "Completed", label: "Completed" },
      ]},
      { name: "priority", label: "Priority", type: "select", options: [
        { value: "Low", label: "Low" },
        { value: "Medium", label: "Medium" },
        { value: "High", label: "High" },
      ]},
      { name: "assignedTo", label: "Assigned to", type: "select", loadOptions: loadUserOptions },
    ]}
    fields={[
      { name: "LeadId", label: "Lead", type: "select", loadOptions: loadLeadOptions },
      {
        name: "LeadNamePreview",
        label: "Lead name",
        placeholder: "Select a lead to view its name",
        readOnly: true,
        submit: false,
        tableHidden: true,
        deriveValue: ({ formData, fieldOptions }) => {
          const selectedLead = (fieldOptions.LeadId || []).find(
            (option) => String(option.value) === String(formData.LeadId || "")
          );

          return selectedLead?.leadName || "";
        },
      },
      {
        name: "LeadStatusPreview",
        label: "Lead status",
        placeholder: "Select a lead to view its current status",
        readOnly: true,
        submit: false,
        tableHidden: true,
        deriveValue: ({ formData, fieldOptions }) => {
          const selectedLead = (fieldOptions.LeadId || []).find(
            (option) => String(option.value) === String(formData.LeadId || "")
          );

          return selectedLead?.leadStatus || "";
        },
      },
      { name: "AccountId", label: "Account", type: "select", loadOptions: loadAccountOptions },
      { name: "ContactId", label: "Contact", type: "select", loadOptions: loadContactOptions },
      { name: "OpportunityId", label: "Opportunity", type: "select", loadOptions: loadOpportunityOptions },
      { name: "Type", label: "Type", type: "select", required: true, options: [
        { value: "Call", label: "Call" },
        { value: "Email", label: "Email" },
        { value: "Meeting", label: "Meeting" },
        { value: "Task", label: "Task" },
      ]},
      { name: "Subject", label: "Subject", required: true, placeholder: "Discovery call with client" },
      { name: "Description", label: "Description", type: "textarea" },
      { name: "DueDate", label: "Due date", type: "datetime-local" },
      { name: "Status", label: "Status", type: "select", options: [
        { value: "Pending", label: "Pending" },
        { value: "Completed", label: "Completed" },
      ]},
      { name: "Priority", label: "Priority", type: "select", options: [
        { value: "Low", label: "Low" },
        { value: "Medium", label: "Medium" },
        { value: "High", label: "High" },
      ]},
      { name: "AssignedTo", label: "Assigned to", type: "select", loadOptions: loadUserOptions },
      { name: "ReminderAt", label: "Reminder at", type: "datetime-local" },
      { name: "IsActive", label: "Active", type: "checkbox", defaultValue: true, userVisible: false },
      { name: "IsDeleted", label: "Deleted", type: "checkbox", defaultValue: false, userVisible: false },
      { name: "Flag", label: "Flagged", type: "checkbox", defaultValue: false, userVisible: false },
    ]}
  />
);

export default ActivitiesPage;
