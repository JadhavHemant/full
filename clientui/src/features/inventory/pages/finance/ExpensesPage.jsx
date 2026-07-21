import InventoryWorkspace from "../../components/InventoryWorkspace";
import { ERP } from "../../../../Components/Endpoint/Endpoint";
import { CurrencyRupeeIcon } from "@heroicons/react/24/outline";

const columns = [
  { key: "ExpenseNumber", label: "Number" },
  { key: "Category", label: "Category" },
  { key: "TotalAmount", label: "Amount", type: "currency" },
  { key: "PaymentMode", label: "Payment" },
  { key: "Status", label: "Status", type: "badge" },
  { key: "ExpenseDate", label: "Date", type: "date" },
];

const fieldConfig = [
  { key: "Category", label: "Category", type: "text" },
  { key: "Description", label: "Description", type: "textarea" },
  { key: "Amount", label: "Amount", type: "number", required: true },
  { key: "TaxAmount", label: "Tax Amount", type: "number" },
  { key: "ExpenseDate", label: "Expense Date", type: "date" },
  { key: "PaymentMode", label: "Payment Mode", type: "select", options: ["Cash", "Bank Transfer", "Credit Card", "UPI", "Cheque"] },
  { key: "Notes", label: "Notes", type: "textarea" },
];

const statusOptions = ["Draft", "Pending", "Approved", "Rejected", "Paid"];

export default function ExpensesPage() {
  return (
    <InventoryWorkspace
      title="Expenses"
      description="Track and manage operational expenses"
      icon={CurrencyRupeeIcon}
      endpoint={ERP.EXPENSES}
      columns={columns}
      fieldConfig={fieldConfig}
      statusOptions={statusOptions}
    />
  );
}