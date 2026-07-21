import InventoryWorkspace from "../../components/InventoryWorkspace";
import { ERP } from "../../../../Components/Endpoint/Endpoint";
import { ArrowUturnLeftIcon } from "@heroicons/react/24/outline";

const columns = [
  { key: "ReturnNumber", label: "Number" },
  { key: "CustomerName", label: "Customer" },
  { key: "Status", label: "Status", type: "badge" },
  { key: "ReturnDate", label: "Return Date", type: "date" },
  { key: "GrandTotal", label: "Amount", type: "currency" },
];

const fieldConfig = [
  { key: "ReturnDate", label: "Return Date", type: "date" },
  { key: "Reason", label: "Reason", type: "textarea" },
];

const statusOptions = ["Draft", "Pending", "Approved", "Processed", "Rejected"];

export default function SalesReturnsPage() {
  return (
    <InventoryWorkspace
      title="Sales Returns"
      description="Manage sales returns and refunds"
      icon={ArrowUturnLeftIcon}
      endpoint={ERP.SALES_RETURNS}
      columns={columns}
      fieldConfig={fieldConfig}
      statusOptions={statusOptions}
    />
  );
}