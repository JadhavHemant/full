import { Link } from "react-router-dom";
import CrmWorkspace from "../components/CrmWorkspace";
import {
  followupTypeService,
  industryService,
  leadSourceService,
  salesStageService,
  taskTypeService,
} from "../services/masterDataService";

const masterModules = {
  taskTypes: {
    title: "Task Types",
    description: "Manage CRM task templates used by the presales workflow.",
    service: taskTypeService,
    primaryField: "Name",
    searchPlaceholder: "Search task types",
    fields: [
      { name: "Name", label: "Task name", placeholder: "Discovery Call" },
      {
        name: "DefaultDurationMinutes",
        label: "Default duration",
        type: "number",
        placeholder: "30",
      },
    ],
  },
  salesStages: {
    title: "Sales Stages",
    description: "Track opportunity progression using consistent pipeline stages.",
    service: salesStageService,
    primaryField: "Name",
    searchPlaceholder: "Search sales stages",
    fields: [{ name: "Name", label: "Stage name", placeholder: "Qualified" }],
  },
  industries: {
    title: "Industries",
    description: "Keep a clean list of customer industries for CRM segmentation.",
    service: industryService,
    primaryField: "Name",
    searchPlaceholder: "Search industries",
    fields: [{ name: "Name", label: "Industry name", placeholder: "Healthcare" }],
  },
  followupTypes: {
    title: "Follow-up Types",
    description: "Standardize the types of follow-ups the CRM team can schedule.",
    service: followupTypeService,
    primaryField: "Name",
    searchPlaceholder: "Search follow-up types",
    fields: [{ name: "Name", label: "Follow-up type", placeholder: "Email" }],
  },
  leadSources: {
    title: "Lead Sources",
    description: "Maintain the channels that generate incoming leads and opportunities.",
    service: leadSourceService,
    primaryField: "Name",
    searchPlaceholder: "Search lead sources",
    fields: [{ name: "Name", label: "Lead source", placeholder: "Website" }],
  },
};

const masterCategories = [
  {
    title: "⚙️ System Config",
    items: [
      { title: "Task Types", description: "Configure activity types used by the presales team.", href: "/Admin/CRM/TaskTypes" },
      { title: "Sales Stages", description: "Define stages for your opportunity pipeline.", href: "/Admin/CRM/SalesStages" },
      { title: "Industries", description: "Keep a clean industry list for accounts and leads.", href: "/Admin/CRM/Industries" },
      { title: "Follow-up Types", description: "Standardize follow-up methods used across CRM.", href: "/Admin/CRM/FollowupTypes" },
      { title: "Lead Sources", description: "Track where leads and opportunities come from.", href: "/Admin/CRM/LeadSources" },
    ],
  },
  {
    title: "👤 Users & Roles",
    items: [
      { title: "Roles & Permissions", description: "Manage RBAC roles and module access permissions.", href: "/Admin/HR/Roles" },
      { title: "User Roles", description: "Configure role types and user classifications.", href: "/Admin/HR/Users" },
      { title: "Org Chart", description: "View organizational hierarchy structure.", href: "/Admin/HR/OrgChart" },
    ],
  },
  {
    title: "🏢 Organizations",
    items: [
      { title: "Companies", description: "Manage company profiles and business entities.", href: "/Admin/HR/Companies" },
      { title: "Departments", description: "Configure department structures.", href: "/Admin/ERP" },
      { title: "Designations", description: "Manage job titles and designations.", href: "/Admin/ERP" },
    ],
  },
  {
    title: "📦 Product & Inventory",
    items: [
      { title: "Product Categories", description: "Manage product classification categories.", href: "/Admin/ERP/ProductCategory" },
      { title: "Units", description: "Configure measurement units for products.", href: "/Admin/ERP/Units" },
      { title: "Brands", description: "Manage product brand catalog.", href: "/Admin/ERP/Brands" },
    ],
  },
  {
    title: "🏭 Warehouse & Location",
    items: [
      { title: "Warehouses", description: "Manage warehouse locations and storage.", href: "/Admin/ERP/Warehouse" },
      { title: "Warehouse Racks", description: "Configure rack systems in warehouses.", href: "/Admin/ERP" },
      { title: "Warehouse Bins", description: "Configure bin locations in racks.", href: "/Admin/ERP" },
    ],
  },
  {
    title: "📋 System Settings",
    items: [
      { title: "System Modules", description: "View all registered API modules and endpoints.", href: "/Admin/modules" },
      { title: "App Settings", description: "Configure global application preferences.", href: "/Admin/settings" },
      { title: "Import / Export", description: "Bulk data import and export tools.", href: "/Admin/ERP/ImportExport" },
    ],
  },
];

const MasterDetailsPage = () => {
  return (
    <section className="min-h-screen p-4 sm:p-6 bg-gray-50">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">MASTER</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Master Data Management</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Central hub for all reference data, configurations, and system settings.
            Manage CRM masters, roles, organizations, products, warehouses, and more.
          </p>
        </div>

        {/* Category Sections */}
        {masterCategories.map((category) => (
          <div key={category.title}>
            <h2 className="text-xl font-bold text-slate-800 mb-4">{category.title}</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {category.items.map((card) => (
                <Link
                  key={card.href}
                  to={card.href}
                  className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <h3 className="text-lg font-semibold text-slate-900">{card.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{card.description}</p>
                  <span className="mt-4 inline-flex text-sm font-semibold text-orange-600">
                    Open →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export const TaskTypesPage = () => <CrmWorkspace {...masterModules.taskTypes} />;
export const SalesStagesPage = () => <CrmWorkspace {...masterModules.salesStages} />;
export const IndustriesPage = () => <CrmWorkspace {...masterModules.industries} />;
export const FollowupTypesPage = () => <CrmWorkspace {...masterModules.followupTypes} />;
export const LeadSourcesPage = () => <CrmWorkspace {...masterModules.leadSources} />;

export default MasterDetailsPage;
