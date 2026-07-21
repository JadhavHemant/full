import InventoryWorkspace from "../components/InventoryWorkspace";
import { ERP } from "../../../Components/Endpoint/Endpoint";
import { ClipboardDocumentCheckIcon } from "@heroicons/react/24/outline";

const columns = [
  { key: "RequisitionNumber", label: "Number" },
  { key: "Priority", label: "Priority", type: "badge" },
  { key: "Status", label: "Status", type: "badge" },
  { key: "RequiredByDate", label: "Required By" },
  { key: "CreatedAt", label: "Created", type: "date" },
];

const fieldConfig = [
  { key: "Priority", label: "Priority", type: "select", options: ["Low", "Medium", "High", "Urgent"] },
  { key: "RequiredByDate", label: "Required By", type: "date" },
  { key: "Remarks", label: "Remarks", type: "textarea" },
];

const statusOptions = ["Draft", "Pending", "Approved", "Ordered", "Rejected", "Cancelled"];

export default function PurchaseRequisitionsPage() {
  return (
    <InventoryWorkspace
      title="Purchase Requisitions"
      description="Internal purchase requests from departments"
      icon={ClipboardDocumentCheckIcon}
      endpoint={ERP.PURCHASE_REQUISITIONS}
      columns={columns}
      fieldConfig={fieldConfig}
      statusOptions={statusOptions}
    />
  );
}