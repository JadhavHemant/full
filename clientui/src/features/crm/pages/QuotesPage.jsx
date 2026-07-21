import CrmWorkspace from "../components/CrmWorkspace";
import { quoteService } from "../services/entityServices";
import {
  loadAccountOptions,
  loadContactOptions,
  loadOpportunityOptions,
} from "../services/optionsService";

const QuotesPage = () => (
  <CrmWorkspace
    title="Quotes"
    description="Prepare and track quotations linked to accounts, contacts, and opportunities."
    service={quoteService}
    primaryField="QuoteNumber"
    searchPlaceholder="Search quotes"
    filters={[
      { name: "status", label: "Status", type: "select", options: [
        { value: "Draft", label: "Draft" },
        { value: "Sent", label: "Sent" },
        { value: "Accepted", label: "Accepted" },
        { value: "Rejected", label: "Rejected" },
      ]},
    ]}
    fields={[
      { name: "QuoteNumber", label: "Quote number", required: true, placeholder: "QT-2026-0001" },
      { name: "AccountId", label: "Account", type: "select", loadOptions: loadAccountOptions },
      { name: "ContactId", label: "Contact", type: "select", loadOptions: loadContactOptions },
      { name: "OpportunityId", label: "Opportunity", type: "select", loadOptions: loadOpportunityOptions },
      { name: "ValidTillDate", label: "Valid till", type: "date" },
      { name: "Status", label: "Status", type: "select", options: [
        { value: "Draft", label: "Draft" },
        { value: "Sent", label: "Sent" },
        { value: "Accepted", label: "Accepted" },
        { value: "Rejected", label: "Rejected" },
      ]},
      { name: "Subtotal", label: "Subtotal", type: "number", placeholder: "100000" },
      { name: "DiscountAmount", label: "Discount", type: "number", placeholder: "5000" },
      { name: "TaxAmount", label: "Tax", type: "number", placeholder: "18000" },
      { name: "TotalAmount", label: "Total", type: "number", placeholder: "113000" },
      { name: "TermsAndConditions", label: "Terms", type: "textarea" },
      { name: "Notes", label: "Notes", type: "textarea" },
      { name: "IsActive", label: "Active", type: "checkbox", defaultValue: true },
      { name: "IsDeleted", label: "Deleted", type: "checkbox", defaultValue: false },
      { name: "Flag", label: "Flagged", type: "checkbox", defaultValue: false },
    ]}
  />
);

export default QuotesPage;
