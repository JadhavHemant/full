import InventoryWorkspace from "../../components/InventoryWorkspace";
import { ERP } from "../../../Components/Endpoint/Endpoint";
import { ArrowUturnUpIcon } from "@heroicons/react/24/outline";

const columns = [
  { key: "ReturnNumber", label: "Number" },
  { key: "SupplierName", label: "Supplier" },
  { key: "Status", label: "Status", type: "badge" },
  { key: "ReturnDate", label: "Return Date", type: "date" },
  { key: "GrandTotal", label: "Amount", type: "currency" },
];

const fieldConfig = [
  { key: "ReturnDate", label: "Return Date", type: "date" },
  { key: "Reason", label: "Reason", type: "textarea" },
];

const statusOptions = ["Draft", "Pending", "Approved", "Processed", "Rejected"];

export default function PurchaseReturnsPage() {
  return (
    <InventoryWorkspace
      title="Purchase Returns"
      description="Manage returns to suppliers"
      icon={ArrowUturnUpIcon}
      endpoint={ERP.PURCHASE_RETURNS}
      columns={columns}
      fieldConfig={fieldConfig}
      statusOptions={statusOptions}
    />
  );
}