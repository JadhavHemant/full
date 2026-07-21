import CrmWorkspace from "../components/CrmWorkspace";
import { accountService } from "../services/entityServices";
import {
  loadIndustryOptions,
  loadUserOptions,
} from "../services/optionsService";

const AccountsPage = () => (
  <CrmWorkspace
    title="Accounts"
    description="Create and maintain CRM accounts in a dedicated workspace."
    service={accountService}
    primaryField="Name"
    searchPlaceholder="Search accounts"
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
      { name: "industryId", label: "Industry", type: "select", loadOptions: loadIndustryOptions },
      { name: "createdBy", label: "Created by", type: "select", loadOptions: loadUserOptions },
    ]}
    fields={[
      { name: "Name", label: "Account name", placeholder: "Acme Corp", required: true },
      { name: "Website", label: "Website", placeholder: "https://acme.com" },
      { name: "Description", label: "Description", type: "textarea" },
      {
        name: "IndustryId",
        label: "Industry",
        type: "select",
        loadOptions: loadIndustryOptions,
        displayKey: "IndustryName",
      },
      { name: "IsActive", label: "Active", type: "checkbox", defaultValue: true },
      { name: "IsDeleted", label: "Deleted", type: "checkbox", defaultValue: false },
      { name: "Flag", label: "Flagged", type: "checkbox", defaultValue: false },
    ]}
  />
);

export default AccountsPage;
