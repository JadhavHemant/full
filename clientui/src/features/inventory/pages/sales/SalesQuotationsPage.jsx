import InventoryWorkspace from "../../components/InventoryWorkspace";
import { ERP } from "../../../../Components/Endpoint/Endpoint";
import { DocumentTextIcon } from "@heroicons/react/24/outline";

const columns = [
  { key: "QuotationNumber", label: "Number" },
  { key: "CustomerName", label: "Customer" },
  { key: "Status", label: "Status", type: "badge" },
  { key: "GrandTotal", label: "Amount", type: "currency" },
  { key: "ValidUntil", label: "Valid Until", type: "date" },
];

const fieldConfig = [
  { key: "ValidUntil", label: "Valid Until", type: "date" },
  { key: "Terms", label: "Terms & Conditions", type: "textarea" },
  { key: "Notes", label: "Notes", type: "textarea" },
];

const statusOptions = ["Draft", "Pending", "Approved", "Converted", "Rejected", "Expired"];

export default function SalesQuotationsPage() {
  return (
    <InventoryWorkspace
      title="Sales Quotations"
      description="Create and manage sales quotations"
      icon={DocumentTextIcon}
      endpoint={ERP.SALES_QUOTATIONS}
      columns={columns}
      fieldConfig={fieldConfig}
      statusOptions={statusOptions}
    />
  );
}