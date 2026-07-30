import CrmWorkspace from "../components/CrmWorkspace";
import { invoiceService } from "../services/entityServices";
import {
  loadAccountOptions,
  loadOpportunityOptions,
  loadQuoteOptions,
} from "../services/optionsService";

const InvoicesPage = () => (
  <CrmWorkspace
    title="Invoices"
    description="Generate invoices from accepted quotes and follow the billing status."
    service={invoiceService}
    primaryField="InvoiceNumber"
    searchPlaceholder="Search invoices"
    rowActions={[
      {
        label: "Record Payment",
        tone: "success",
        endpoint: "",
        method: "post",
        isVisible: (row) => Boolean(row.Id) && row.PaymentStatus !== "Paid",
        fields: [
          {
            name: "amount",
            label: "Amount",
            type: "number",
            required: true,
            min: 0.01,
            step: "0.01",
          },
          {
            name: "paymentDate",
            label: "Payment date",
            type: "date",
          },
          {
            name: "paymentMethod",
            label: "Payment method",
            placeholder: "UPI / Bank / Card",
          },
          {
            name: "referenceNumber",
            label: "Reference number",
            placeholder: "TXN12345",
          },
          {
            name: "notes",
            label: "Notes",
            type: "textarea",
            placeholder: "Collection details",
          },
        ],
        getInitialValues: (row) => ({
          amount: row.TotalAmount || "",
          paymentDate: "",
          paymentMethod: row.PaymentMethod || "",
          referenceNumber: "",
          notes: "",
        }),
        getPayload: (_row, values) => ({
          amount: values.amount,
          paymentDate: values.paymentDate || undefined,
          paymentMethod: values.paymentMethod || undefined,
          referenceNumber: values.referenceNumber || undefined,
          notes: values.notes || undefined,
        }),
        successMessage: "Payment recorded",
      },
    ]}
    filters={[
      { name: "paymentStatus", label: "Payment status", type: "select", options: [
        { value: "Pending", label: "Pending" },
        { value: "Paid", label: "Paid" },
        { value: "Partial", label: "Partial" },
        { value: "Overdue", label: "Overdue" },
      ]},
    ]}
    fields={[
      { name: "InvoiceNumber", label: "Invoice number", required: true, placeholder: "INV-2026-0001" },
      { name: "AccountId", label: "Account", type: "select", loadOptions: loadAccountOptions },
      { name: "OpportunityId", label: "Opportunity", type: "select", loadOptions: loadOpportunityOptions },
      { name: "QuoteId", label: "Quote", type: "select", loadOptions: loadQuoteOptions },
      { name: "Subtotal", label: "Subtotal", type: "number" },
      { name: "TaxAmount", label: "Tax", type: "number" },
      { name: "TotalAmount", label: "Total", type: "number" },
      { name: "PaymentStatus", label: "Payment status", type: "select", options: [
        { value: "Pending", label: "Pending" },
        { value: "Paid", label: "Paid" },
        { value: "Partial", label: "Partial" },
        { value: "Overdue", label: "Overdue" },
      ]},
      { name: "PaymentMethod", label: "Payment method", placeholder: "UPI / Bank / Card" },
      { name: "DueDate", label: "Due date", type: "date" },
      { name: "GeneratedDate", label: "Generated date", type: "date" },
      { name: "Notes", label: "Notes", type: "textarea" },
      { name: "IsActive", label: "Active", type: "checkbox", defaultValue: true },
      { name: "IsDeleted", label: "Deleted", type: "checkbox", defaultValue: false },
      { name: "Flag", label: "Flagged", type: "checkbox", defaultValue: false },
    ]}
  />
);

export default InvoicesPage;
