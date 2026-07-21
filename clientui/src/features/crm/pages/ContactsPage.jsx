import CrmWorkspace from "../components/CrmWorkspace";
import { contactService } from "../services/entityServices";
import {
  loadAccountOptions,
  loadUserOptions,
} from "../services/optionsService";

const ContactsPage = () => (
  <CrmWorkspace
    title="Contacts"
    description="Store contact details linked to CRM accounts and companies."
    service={contactService}
    primaryField="FirstName"
    searchPlaceholder="Search contacts"
    filters={[
      {
        name: "isActive",
        label: "Active",
        type: "select",
        options: [
          { value: "true", label: "Active" },
          { value: "false", label: "Inactive" },
        ],
      },
      { name: "accountId", label: "Account", type: "select", loadOptions: loadAccountOptions },
      { name: "createdBy", label: "Created by", type: "select", loadOptions: loadUserOptions },
    ]}
    fields={[
      {
        name: "AccountId",
        label: "Account",
        type: "select",
        loadOptions: loadAccountOptions,
        displayKey: "AccountName",
      },
      { name: "FirstName", label: "First name", placeholder: "Riya" },
      { name: "MiddleName", label: "Middle name" },
      { name: "LastName", label: "Last name", placeholder: "Sharma" },
      { name: "Email", label: "Email", type: "email", placeholder: "riya@example.com" },
      { name: "Phone", label: "Phone", placeholder: "9876543210" },
      { name: "AltPhone", label: "Alt phone" },
      { name: "LinkedinUrl", label: "LinkedIn URL", placeholder: "https://linkedin.com/in/name" },
      { name: "Title", label: "Title", placeholder: "Manager" },
      { name: "IsActive", label: "Active", type: "checkbox", defaultValue: true },
      { name: "IsDeleted", label: "Deleted", type: "checkbox", defaultValue: false },
      { name: "Flag", label: "Flagged", type: "checkbox", defaultValue: false },
    ]}
  />
);

export default ContactsPage;
