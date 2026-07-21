import InventoryWorkspace from "../../components/InventoryWorkspace";
import { ERP } from "../../../../Components/Endpoint/Endpoint";
import { ClipboardDocumentListIcon } from "@heroicons/react/24/outline";

const columns = [
  { key: "BOMCode", label: "Code" },
  { key: "ProductName", label: "Product" },
  { key: "Version", label: "Version" },
  { key: "Quantity", label: "Qty" },
  { key: "IsActive", label: "Status", type: "badge" },
];

const fieldConfig = [
  { key: "BOMCode", label: "BOM Code", type: "text" },
  { key: "ProductName", label: "Product Name", type: "text" },
  { key: "Version", label: "Version", type: "text" },
  { key: "Quantity", label: "Quantity", type: "number" },
  { key: "Description", label: "Description", type: "textarea" },
];

export default function BomPage() {
  return (
    <InventoryWorkspace
      title="Bill of Materials"
      description="Manage BOMs for production"
      icon={ClipboardDocumentListIcon}
      endpoint={ERP.BOM}
      columns={columns}
      fieldConfig={fieldConfig}
      enableStatusUpdate={false}
    />
  );
}