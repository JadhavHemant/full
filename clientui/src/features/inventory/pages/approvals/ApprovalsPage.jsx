import InventoryWorkspace from "../../components/InventoryWorkspace";
import { ERP } from "../../../../Components/Endpoint/Endpoint";
import { ShieldCheckIcon } from "@heroicons/react/24/outline";

const columns = [
  { key: "WorkflowName", label: "Workflow" },
  { key: "ModuleType", label: "Module" },
  { key: "RequestedByName", label: "Requested By" },
  { key: "Status", label: "Status", type: "badge" },
  { key: "Priority", label: "Priority", type: "badge" },
  { key: "CreatedAt", label: "Date", type: "date" },
];

// No create form for approvals — they come from other modules automatically
const fieldConfig = [];

const statusOptions = ["Pending", "Approved", "Rejected"];

/**
 * Approval Workflows Page
 * 
 * How it works:
 * 1. When a record (Purchase Order, Expense, etc.) requires approval, 
 *    the backend automatically creates an approval request via the ERP.APPROVALS endpoint.
 * 2. Approvers see pending requests here and can Approve or Reject them.
 * 3. The action is sent to the ERP.APPROVALS.PROCESS endpoint which updates
 *    both the approval record and the source record's status.
 * 
 * To create a workflow definition (which modules need approvals, who approves):
 * - This would require a Workflow Definitions admin page
 * - The backend already supports this via the ApprovalWorkflows table
 * - Currently, approvals are created by the controllers when status changes to "Pending Approval"
 */
export default function ApprovalsPage() {
  return (
    <InventoryWorkspace
      title="Approvals"
      description="Review and process approval requests from all modules"
      icon={ShieldCheckIcon}
      endpoint={ERP.APPROVALS}
      columns={columns}
      fieldConfig={fieldConfig}
      statusOptions={statusOptions}
      enableCreate={false}
      enableStatusUpdate={false}
      enableApproveReject={true}
      enableDelete={false}
    />
  );
}