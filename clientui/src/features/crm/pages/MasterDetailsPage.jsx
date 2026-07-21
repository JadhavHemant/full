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

const MasterDetailsPage = () => {
  const cards = [
    {
      title: "Task Types",
      description: "Configure the activity types used by the presales team.",
      href: "/Admin/CRM/TaskTypes",
    },
    {
      title: "Sales Stages",
      description: "Define the stages for your opportunity pipeline.",
      href: "/Admin/CRM/SalesStages",
    },
    {
      title: "Industries",
      description: "Keep a clean industry list for account and lead tagging.",
      href: "/Admin/CRM/Industries",
    },
    {
      title: "Follow-up Types",
      description: "Standardize follow-up methods used across the CRM.",
      href: "/Admin/CRM/FollowupTypes",
    },
    {
      title: "Lead Sources",
      description: "Track where leads and opportunities are coming from.",
      href: "/Admin/CRM/LeadSources",
    },
  ];

  return (
    <section className="min-h-screen  p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">CRM</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Master Details</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Manage the reference data that powers lead capture, opportunity stages, follow-ups,
            and presales workflows.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <Link
              key={card.href}
              to={card.href}
              className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <h2 className="text-lg font-semibold text-slate-900">{card.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{card.description}</p>
              <span className="mt-4 inline-flex text-sm font-semibold text-orange-600">
                Open workspace
              </span>
            </Link>
          ))}
        </div>
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
