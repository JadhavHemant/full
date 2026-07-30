import CrmWorkspace from "../components/CrmWorkspace";
import { paymentService } from "../services/entityServices";
import { loadInvoiceOptions } from "../services/optionsService";

const PaymentsPage = () => (
  <CrmWorkspace
    title="Payments"
    description="Track payment collections and their status against invoices."
    service={paymentService}
    primaryField="ReferenceNumber"
    searchPlaceholder="Search payments"
    filters={[
      { name: "status", label: "Status", type: "select", options: [
        { value: "Pending", label: "Pending" },
        { value: "Received", label: "Received" },
        { value: "Failed", label: "Failed" },
      ]},
    ]}
    fields={[
      { name: "InvoiceId", label: "Invoice", type: "select", loadOptions: loadInvoiceOptions },
      { name: "Amount", label: "Amount", type: "number", required: true },
      { name: "PaymentDate", label: "Payment date", type: "date" },
      { name: "PaymentMethod", label: "Payment method", placeholder: "Razorpay / Bank / UPI" },
      { name: "ReferenceNumber", label: "Reference number", placeholder: "TXN12345" },
      { name: "Status", label: "Status", type: "select", options: [
        { value: "Pending", label: "Pending" },
        { value: "Received", label: "Received" },
        { value: "Failed", label: "Failed" },
      ], defaultValue: "Received" },
      { name: "Notes", label: "Notes", type: "textarea" },
      { name: "IsActive", label: "Active", type: "checkbox", defaultValue: true },
      { name: "IsDeleted", label: "Deleted", type: "checkbox", defaultValue: false },
      { name: "Flag", label: "Flagged", type: "checkbox", defaultValue: false },
    ]}
  />
);

export default PaymentsPage;
