import InventoryWorkspace from "../../components/InventoryWorkspace";
import { ERP } from "../../../../Components/Endpoint/Endpoint";
import { WrenchScrewdriverIcon } from "@heroicons/react/24/outline";

const columns = [
  { key: "OrderNumber", label: "Order #" },
  { key: "ProductName", label: "Product" },
  { key: "PlannedQuantity", label: "Planned" },
  { key: "ProducedQuantity", label: "Produced" },
  { key: "Status", label: "Status", type: "badge" },
  { key: "Priority", label: "Priority", type: "badge" },
];

const fieldConfig = [
  { key: "OrderNumber", label: "Order Number", type: "text" },
  { key: "PlannedQuantity", label: "Planned Quantity", type: "number", required: true },
  { key: "Priority", label: "Priority", type: "select", options: ["Low", "Medium", "High"] },
  { key: "PlannedStartDate", label: "Planned Start Date", type: "date" },
  { key: "PlannedEndDate", label: "Planned End Date", type: "date" },
  { key: "Remarks", label: "Remarks", type: "textarea" },
];

const statusOptions = ["Planned", "In Progress", "Completed", "On Hold", "Cancelled"];

export default function ProductionOrdersPage() {
  return (
    <InventoryWorkspace
      title="Production Orders"
      description="Manage production orders and track manufacturing progress"
      icon={WrenchScrewdriverIcon}
      endpoint={ERP.PRODUCTION_ORDERS}
      columns={columns}
      fieldConfig={fieldConfig}
      statusOptions={statusOptions}
    />
  );
}