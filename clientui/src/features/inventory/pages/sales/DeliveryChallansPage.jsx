import InventoryWorkspace from "../../components/InventoryWorkspace";
import { ERP } from "../../../../Components/Endpoint/Endpoint";
import { TruckIcon } from "@heroicons/react/24/outline";

const columns = [
  { key: "ChallanNumber", label: "Number" },
  { key: "CustomerName", label: "Customer" },
  { key: "Status", label: "Status", type: "badge" },
  { key: "DeliveryDate", label: "Delivery Date", type: "date" },
  { key: "TotalItems", label: "Items" },
];

const fieldConfig = [
  { key: "DeliveryDate", label: "Delivery Date", type: "date" },
  { key: "VehicleNumber", label: "Vehicle Number", type: "text" },
  { key: "DriverName", label: "Driver Name", type: "text" },
  { key: "DriverPhone", label: "Driver Phone", type: "text" },
  { key: "ShippingAddress", label: "Shipping Address", type: "textarea" },
  { key: "Notes", label: "Notes", type: "textarea" },
];

const statusOptions = ["Draft", "Pending", "In Transit", "Delivered", "Cancelled"];

export default function DeliveryChallansPage() {
  return (
    <InventoryWorkspace
      title="Delivery Challans"
      description="Manage delivery challans for shipments"
      icon={TruckIcon}
      endpoint={ERP.DELIVERY_CHALLANS}
      columns={columns}
      fieldConfig={fieldConfig}
      statusOptions={statusOptions}
    />
  );
}