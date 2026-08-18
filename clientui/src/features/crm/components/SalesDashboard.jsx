import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useAnimation, useInView, useScroll, useTransform } from "framer-motion";
import {
  ArrowTrendingUpIcon,
  BoltIcon,
  BriefcaseIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  CreditCardIcon,
  CurrencyRupeeIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  InboxStackIcon,
  QueueListIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import axiosInstance from "../../../Components/AdminSite/utils/axiosInstance";
import { getSessionUser } from "../../../utils/sessionUser";
import { CRM_ENDPOINTS } from "../config/endpoints";

const fetchCollection = async (url, params = {}) => {
  const response = await axiosInstance.get(url, {
    params: { limit: 6, offset: 0, ...params },
  });

  return {
    rows: Array.isArray(response.data?.data) ? response.data.data : [],
    total: Number(response.data?.pagination?.total || response.data?.data?.length || 0),
  };
};

const formatNumber = (value) =>
  new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatPercent = (value) => `${Math.round(Number(value || 0))}%`;

const toTitleCase = (value) =>
  String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const phaseStyles = {
  "Phase 1": "border-sky-200 bg-sky-50 text-sky-700",
  "Phase 2": "border-emerald-200 bg-emerald-50 text-emerald-700",
  "Phase 3": "border-amber-200 bg-amber-50 text-amber-700",
  "Phase 4": "border-rose-200 bg-rose-50 text-rose-700",
};

const statusStyles = {
  new: " text-slate-700 ring-slate-200",
  qualified: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  disqualified: "bg-rose-50 text-rose-700 ring-rose-200",
  open: "bg-sky-50 text-sky-700 ring-sky-200",
  won: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  lost: "bg-rose-50 text-rose-700 ring-rose-200",
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  overdue: "bg-rose-50 text-rose-700 ring-rose-200",
  received: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

const moduleCatalog = [
  {
    key: "accounts",
    label: "Accounts",
    phase: "Phase 1",
    description: "Organizations, ownership, industry, account context.",
    icon: BuildingOffice2Icon,
    adminTo: "/Admin/Accounts",
    userTo: "/user/accounts",
  },
  {
    key: "contacts",
    label: "Contacts",
    phase: "Phase 1",
    description: "People, contactability, ownership, linked accounts.",
    icon: UserGroupIcon,
    adminTo: "/Admin/Contact",
    userTo: "/user/contacts",
  },
  {
    key: "leads",
    label: "Leads",
    phase: "Phase 1",
    description: "Capture, qualify, assign, and progress new demand.",
    icon: InboxStackIcon,
    adminTo: "/Admin/Leads",
    userTo: "/user/leads",
  },
  {
    key: "opportunities",
    label: "Opportunities",
    phase: "Phase 1",
    description: "Pipeline, probability, stage movement, deal execution.",
    icon: BriefcaseIcon,
    adminTo: "/Admin/Opportunities",
    userTo: "/user/opportunities",
  },
  {
    key: "activities",
    label: "Activities",
    phase: "Phase 1",
    description: "Tasks, meetings, reminders, and follow-up ownership.",
    icon: CalendarDaysIcon,
    adminTo: "/Admin/Activities",
    userTo: "/user/activities",
  },
  {
    key: "cases",
    label: "Cases",
    phase: "Phase 1",
    description: "Issue resolution, account support, service handoffs.",
    icon: ClipboardDocumentListIcon,
    adminTo: "/Admin/Cases",
    userTo: "/user/cases",
  },
  {
    key: "quotes",
    label: "Quotes",
    phase: "Phase 2",
    description: "Commercial proposals, approvals, and proposal tracking.",
    icon: DocumentTextIcon,
    adminTo: "/Admin/Quotes",
    userTo: "/user/quotes",
  },
  {
    key: "invoices",
    label: "Invoices",
    phase: "Phase 2",
    description: "Invoice generation, due tracking, and downstream finance.",
    icon: QueueListIcon,
    adminTo: "/Admin/Invoices",
    userTo: "/user/invoices",
  },
  {
    key: "payments",
    label: "Payments",
    phase: "Phase 2",
    description: "Collections, references, payment status, reconciliation.",
    icon: CreditCardIcon,
    adminTo: "/Admin/Payments",
    userTo: "/user/payments",
  },
  {
    key: "presales",
    label: "Pre-sales",
    phase: "Phase 2",
    description: "Technical validations, solutioning, workshops, scoping.",
    icon: ShieldCheckIcon,
    adminTo: "/Admin/PreSales",
    userTo: "/user/presales",
  },
  {
    key: "retentions",
    label: "Retentions",
    phase: "Phase 3",
    description: "Renewal follow-through, save plays, retention motions.",
    icon: ArrowTrendingUpIcon,
    adminTo: "/Admin/Retentions",
    userTo: "/user/retentions",
  },
];

const phaseBlueprint = [
  {
    phase: "Phase 1",
    title: "Core CRM foundation",
    summary: "Identity, accounts, contacts, leads, opportunities, activities, notifications, and dashboards.",
    outcomes: ["Capture demand", "Assign ownership", "Move pipeline", "Track execution"],
  },
  {
    phase: "Phase 2",
    title: "Commercial growth stack",
    summary: "Quotes, invoices, payments, reporting, lead scoring, web forms, and extensibility.",
    outcomes: ["Monetize pipeline", "Standardize approvals", "Improve forecasting", "Add reporting depth"],
  },
  {
    phase: "Phase 3",
    title: "Scale and retention",
    summary: "Retention flows, multichannel follow-up, automation, mobile, and broader orchestration.",
    outcomes: ["Retain customers", "Expand channels", "Automate follow-up", "Support field teams"],
  },
  {
    phase: "Phase 4",
    title: "AI and intelligence",
    summary: "Deal health, next-best-action, conversation insights, and revenue intelligence.",
    outcomes: ["Prioritize risk", "Coach reps", "Predict outcomes", "Surface smarter actions"],
  },
];

const masterDataLinks = [
  { label: "Task Types", to: "/Admin/CRM/TaskTypes" },
  { label: "Sales Stages", to: "/Admin/CRM/SalesStages" },
  { label: "Industries", to: "/Admin/CRM/Industries" },
  { label: "Follow-up Types", to: "/Admin/CRM/FollowupTypes" },
  { label: "Lead Sources", to: "/Admin/CRM/LeadSources" },
];

const ErrorPanel = ({ title, message, details }) => (
  <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800 shadow-sm">
    <div className="flex items-start gap-3">
      <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 flex-none" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1">{message}</p>
        {details?.length ? (
          <p className="mt-2 text-xs text-rose-700">Unavailable sources: {details.join(", ")}</p>
        ) : null}
      </div>
    </div>
  </div>
);

const PhasePill = ({ phase }) => (
  <span
    className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
      phaseStyles[phase] || "border-slate-200 bg-slate-50 text-slate-700"
    }`}
  >
    {phase}
  </span>
);

const StatusBadge = ({ value }) => (
  <span
    className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${
      statusStyles[String(value || "").toLowerCase()] || " text-slate-700 ring-slate-200"
    }`}
  >
    {toTitleCase(value || "Open")}
  </span>
);

const MetricCard = ({ title, value, note, tone = "dark", icon: Icon, delay = 0 }) => {
  const toneClassMap = {
    dark: "bg-slate-950 text-white",
    blue: "bg-sky-600 text-white",
    green: "bg-emerald-600 text-white",
    amber: "bg-amber-400 text-slate-950",
  };

  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -8, scale: 1.02, transition: { duration: 0.3 } }}
      className={`${toneClassMap[tone]} group cursor-pointer rounded-[28px] p-5 shadow-[0_20px_50px_rgba(15,23,42,0.14)] transition-shadow hover:shadow-[0_30px_70px_rgba(15,23,42,0.22)]`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 0.9 } : {}}
            transition={{ delay: delay + 0.2 }}
            className="text-sm font-medium"
          >
            {title}
          </motion.p>
          <motion.p
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: delay + 0.3, type: "spring", stiffness: 100 }}
            className="mt-3 text-3xl font-bold"
          >
            {value}
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 0.8 } : {}}
            transition={{ delay: delay + 0.4 }}
            className="mt-2 text-xs"
          >
            {note}
          </motion.p>
        </div>
        <motion.div
          whileHover={{ rotate: 360, scale: 1.1 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="rounded-2xl bg-white/15 p-3 backdrop-blur-sm"
        >
          <Icon className="h-6 w-6" />
        </motion.div>
      </div>
      
      {/* Animated gradient overlay on hover */}
      <motion.div
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="pointer-events-none absolute inset-0 rounded-[28px] bg-gradient-to-br from-white/10 via-transparent to-transparent"
      />
    </motion.article>
  );
};

const SectionCard = ({ eyebrow, title, action, children, delay = 0 }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] transition-shadow hover:shadow-[0_25px_70px_rgba(15,23,42,0.1)]"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {eyebrow ? (
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: delay + 0.1 }}
              className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400"
            >
              {eyebrow}
            </motion.p>
          ) : null}
          <motion.h2
            initial={{ opacity: 0, x: -10 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: delay + 0.2 }}
            className="mt-2 text-xl font-semibold text-slate-950"
          >
            {title}
          </motion.h2>
        </div>
        {action}
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ delay: delay + 0.3, duration: 0.5 }}
        className="mt-5"
      >
        {children}
      </motion.div>
    </motion.section>
  );
};

function AdminCrmDashboard() {
  const sessionUser = useMemo(() => getSessionUser() || {}, []);
  const [loading, setLoading] = useState(true);
  const [errorSummary, setErrorSummary] = useState(null);
  const [snapshot, setSnapshot] = useState({
    totals: {},
    recentLeads: [],
    recentOpportunities: [],
    recentActivities: [],
    recentQuotes: [],
    phaseCoverage: {},
    pipelineValue: 0,
    qualifiedLeadRate: 0,
    paymentValue: 0,
  });

  const { scrollYProgress } = useScroll();
  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.3], [1, 0.6]);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setErrorSummary(null);

      const resultEntries = await Promise.allSettled([
        fetchCollection(CRM_ENDPOINTS.accounts),
        fetchCollection(CRM_ENDPOINTS.contacts),
        fetchCollection(CRM_ENDPOINTS.leads),
        fetchCollection(CRM_ENDPOINTS.leads, { status: "Qualified" }),
        fetchCollection(CRM_ENDPOINTS.opportunities),
        fetchCollection(CRM_ENDPOINTS.activities, { status: "Pending" }),
        fetchCollection(CRM_ENDPOINTS.cases, { status: "Open" }),
        fetchCollection(CRM_ENDPOINTS.quotes),
        fetchCollection(CRM_ENDPOINTS.invoices),
        fetchCollection(CRM_ENDPOINTS.payments, { status: "Received" }),
        fetchCollection(CRM_ENDPOINTS.retentions),
        fetchCollection(CRM_ENDPOINTS.presales),
      ]);

      const failedSources = [
        ["accounts", resultEntries[0]],
        ["contacts", resultEntries[1]],
        ["leads", resultEntries[2]],
        ["qualified leads", resultEntries[3]],
        ["opportunities", resultEntries[4]],
        ["activities", resultEntries[5]],
        ["cases", resultEntries[6]],
        ["quotes", resultEntries[7]],
        ["invoices", resultEntries[8]],
        ["payments", resultEntries[9]],
        ["retentions", resultEntries[10]],
        ["presales", resultEntries[11]],
      ]
        .filter(([, result]) => result.status === "rejected")
        .map(([label]) => label);

      const values = resultEntries.map((entry) =>
        entry.status === "fulfilled" ? entry.value : { rows: [], total: 0 }
      );

      const [
        accounts,
        contacts,
        leads,
        qualifiedLeads,
        opportunities,
        activities,
        cases,
        quotes,
        invoices,
        payments,
        retentions,
        presales,
      ] = values;

      const pipelineValue = opportunities.rows.reduce(
        (sum, row) => sum + Number(row.BudgetAmount || 0),
        0
      );
      const paymentValue = payments.rows.reduce((sum, row) => sum + Number(row.Amount || 0), 0);
      const qualifiedLeadRate = leads.total ? (qualifiedLeads.total / leads.total) * 100 : 0;

      const phaseCoverage = moduleCatalog.reduce((acc, module) => {
        const total = values[moduleCatalog.findIndex((item) => item.key === module.key)]?.total || 0;
        acc[module.key] = total;
        return acc;
      }, {});

      setSnapshot({
        totals: {
          accounts: accounts.total,
          contacts: contacts.total,
          leads: leads.total,
          qualifiedLeads: qualifiedLeads.total,
          opportunities: opportunities.total,
          activities: activities.total,
          cases: cases.total,
          quotes: quotes.total,
          invoices: invoices.total,
          payments: payments.total,
          retentions: retentions.total,
          presales: presales.total,
        },
        recentLeads: leads.rows,
        recentOpportunities: opportunities.rows,
        recentActivities: activities.rows,
        recentQuotes: quotes.rows,
        phaseCoverage,
        pipelineValue,
        qualifiedLeadRate,
        paymentValue,
      });

      if (failedSources.length) {
        setErrorSummary({
          title: "Some CRM modules could not be loaded",
          message:
            "The command center is still usable, but a few widgets are showing partial data from the modules that responded.",
          details: failedSources,
        });
      }

      setLoading(false);
    };

    loadDashboard();
  }, []);

  const metrics = [
    {
      title: "Leads in motion",
      value: loading ? "..." : formatNumber(snapshot.totals.leads),
      note: "Live demand capture across the CRM.",
      tone: "dark",
      icon: InboxStackIcon,
      delay: 0,
    },
    {
      title: "Open pipeline",
      value: loading ? "..." : formatCurrency(snapshot.pipelineValue),
      note: "Opportunity budget value from current records.",
      tone: "blue",
      icon: CurrencyRupeeIcon,
      delay: 0.1,
    },
    {
      title: "Qualified lead rate",
      value: loading ? "..." : formatPercent(snapshot.qualifiedLeadRate),
      note: "Qualified leads divided by total leads.",
      tone: "green",
      icon: CheckCircleIcon,
      delay: 0.2,
    },
    {
      title: "Payments received",
      value: loading ? "..." : formatCurrency(snapshot.paymentValue),
      note: "Sum of received payment rows in the latest snapshot.",
      tone: "amber",
      icon: CreditCardIcon,
      delay: 0.3,
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-sky-50 to-emerald-50 p-6">
      {/* Animated background orbs */}
      <motion.div
        style={{ y: backgroundY, opacity }}
        className="pointer-events-none absolute inset-0"
      >
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -80, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-gradient-to-br from-sky-300/30 to-cyan-300/20 blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, -120, 0],
            y: [0, 100, 0],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
          className="absolute right-0 top-40 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-emerald-300/25 to-teal-300/15 blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, 80, 0],
            y: [0, -60, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 5,
          }}
          className="absolute bottom-20 left-1/3 h-80 w-80 rounded-full bg-gradient-to-br from-amber-300/20 to-yellow-300/10 blur-3xl"
        />
      </motion.div>

      {/* Floating particles */}
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 100 }}
          animate={{
            opacity: [0.2, 0.5, 0.2],
            y: [-20, -100, -20],
            x: [0, Math.sin(i) * 50, 0],
          }}
          transition={{
            duration: 10 + i * 2,
            repeat: Infinity,
            delay: i * 0.5,
            ease: "easeInOut",
          }}
          className="pointer-events-none absolute h-2 w-2 rounded-full bg-sky-400/40"
          style={{
            left: `${10 + (i * 6)}%`,
            bottom: '10%',
          }}
        />
      ))}

      <motion.section
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
      >
        {metrics.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </motion.section>

      <section className="relative z-10 mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard
          eyebrow="Implementation Map"
          title="CRM module coverage"
          delay={0.2}
          action={
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600"
            >
              Live coverage by current routes
            </motion.div>
          }
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {moduleCatalog.map((module, index) => {
              const Icon = module.icon;
              const total = snapshot.phaseCoverage[module.key] || 0;

              return (
                <motion.div
                  key={module.key}
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{
                    delay: 0.3 + index * 0.05,
                    duration: 0.5,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <Link
                    to={module.adminTo}
                    className="group block"
                  >
                    <motion.div
                      whileHover={{ y: -6, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ duration: 0.2 }}
                      className="h-full rounded-[24px] border border-slate-200 bg-slate-50 p-4 transition-all hover:border-sky-200 hover:bg-white hover:shadow-lg"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <motion.div
                          whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                          transition={{ duration: 0.5 }}
                          className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200"
                        >
                          <Icon className="h-6 w-6 text-slate-700 transition-colors group-hover:text-sky-600" />
                        </motion.div>
                        <PhasePill phase={module.phase} />
                      </div>
                      <div className="mt-4">
                        <h3 className="text-base font-semibold text-slate-950 transition-colors group-hover:text-sky-700">
                          {module.label}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{module.description}</p>
                        <div className="mt-4 flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Records
                          </span>
                          <motion.span
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.5 + index * 0.05 }}
                            className="text-lg font-bold text-slate-950"
                          >
                            {loading ? "..." : formatNumber(total)}
                          </motion.span>
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard eyebrow="Roadmap" title="Phase blueprint" delay={0.3}>
          <div className="space-y-4">
            {phaseBlueprint.map((phase, index) => (
              <motion.article
                key={phase.phase}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: 0.4 + index * 0.1,
                  duration: 0.5,
                }}
                whileHover={{ x: 4, transition: { duration: 0.2 } }}
                className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 transition-all hover:bg-white hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <PhasePill phase={phase.phase} />
                    <h3 className="mt-3 text-base font-semibold text-slate-950">{phase.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{phase.summary}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {phase.outcomes.map((outcome, idx) => (
                    <motion.span
                      key={outcome}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 + index * 0.1 + idx * 0.05 }}
                      className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200"
                    >
                      {outcome}
                    </motion.span>
                  ))}
                </div>
              </motion.article>
            ))}
          </div>
        </SectionCard>
      </section>

      <section className="relative z-10 mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <SectionCard
          eyebrow="Lead Flow"
          title="Recent leads"
          delay={0.4}
          action={
            <Link className="text-sm font-semibold text-sky-700 transition-colors hover:text-sky-600" to="/Admin/Leads">
              Open leads
            </Link>
          }
        >
          <div className="space-y-4">
            {snapshot.recentLeads.length ? (
              snapshot.recentLeads.map((lead, index) => (
                <motion.div
                  key={lead.Id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  whileHover={{ x: 4, scale: 1.01 }}
                  className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 transition-all hover:bg-white hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">
                        {lead.AccountName || lead.ContactName || `Lead #${lead.Id}`}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">{lead.Description || "Lead captured and awaiting progression."}</p>
                    </div>
                    <StatusBadge value={lead.Status || "New"} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>Assigned to {lead.AssignedToName || "Unassigned"}</span>
                    <span>{formatPercent(lead.ProgressPercentage)}</span>
                  </div>
                </motion.div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No leads available yet.</p>
            )}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Pipeline"
          title="Recent opportunities"
          delay={0.5}
          action={
            <Link className="text-sm font-semibold text-sky-700 transition-colors hover:text-sky-600" to="/Admin/Opportunities">
              Open pipeline
            </Link>
          }
        >
          <div className="space-y-4">
            {snapshot.recentOpportunities.length ? (
              snapshot.recentOpportunities.map((opportunity, index) => (
                <motion.div
                  key={opportunity.Id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  whileHover={{ x: 4, scale: 1.01 }}
                  className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 transition-all hover:bg-white hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{opportunity.OpportunityName || `Opportunity #${opportunity.Id}`}</p>
                      <p className="mt-1 text-sm text-slate-600">{opportunity.AccountName || "No account linked"}</p>
                    </div>
                    <StatusBadge value={opportunity.Status || "Open"} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>{opportunity.SalesStageName || "No stage"}</span>
                    <span>{formatCurrency(opportunity.BudgetAmount)}</span>
                  </div>
                </motion.div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No opportunities available yet.</p>
            )}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Commercials"
          title="Recent quotes and activities"
          delay={0.6}
          action={
            <Link className="text-sm font-semibold text-sky-700 transition-colors hover:text-sky-600" to="/Admin/Quotes">
              Open quotes
            </Link>
          }
        >
          <div className="space-y-4">
            {snapshot.recentQuotes.slice(0, 3).map((quote, index) => (
              <motion.div
                key={`quote-${quote.Id}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                whileHover={{ x: 4, scale: 1.01 }}
                className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 transition-all hover:bg-white hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{quote.QuoteNumber || `Quote #${quote.Id}`}</p>
                    <p className="mt-1 text-sm text-slate-600">{quote.AccountName || quote.OpportunityName || "Commercial proposal"}</p>
                  </div>
                  <StatusBadge value={quote.Status || "Draft"} />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-800">{formatCurrency(quote.TotalAmount)}</p>
              </motion.div>
            ))}

            {snapshot.recentActivities.slice(0, 3).map((activity, index) => (
              <motion.div
                key={`activity-${activity.Id}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + index * 0.1 }}
                whileHover={{ x: 4, scale: 1.01 }}
                className="rounded-[22px] border border-slate-200 bg-white p-4 transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{activity.Subject || activity.Type || `Activity #${activity.Id}`}</p>
                    <p className="mt-1 text-sm text-slate-600">{activity.Description || "Follow-up activity linked to CRM execution."}</p>
                  </div>
                  <StatusBadge value={activity.Status || "Pending"} />
                </div>
              </motion.div>
            ))}

            {!snapshot.recentQuotes.length && !snapshot.recentActivities.length ? (
              <p className="text-sm text-slate-500">No quote or activity data available yet.</p>
            ) : null}
          </div>
        </SectionCard>
      </section>
    </div>
  );
}

function UserCrmDashboard({ portal }) {
  const sessionUser = useMemo(() => getSessionUser() || {}, []);
  const [loading, setLoading] = useState(true);
  const [errorSummary, setErrorSummary] = useState(null);
  const [snapshot, setSnapshot] = useState({
    leads: 0,
    opportunities: 0,
    activities: 0,
    cases: 0,
    quotes: 0,
    invoices: 0,
    payments: 0,
    recentLeads: [],
    recentOpportunities: [],
    recentActivities: [],
  });

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setErrorSummary(null);

      const resultEntries = await Promise.allSettled([
        fetchCollection(CRM_ENDPOINTS.leads),
        fetchCollection(CRM_ENDPOINTS.opportunities),
        fetchCollection(CRM_ENDPOINTS.activities, { status: "Pending" }),
        fetchCollection(CRM_ENDPOINTS.cases, { status: "Open" }),
        fetchCollection(CRM_ENDPOINTS.quotes),
        fetchCollection(CRM_ENDPOINTS.invoices),
        fetchCollection(CRM_ENDPOINTS.payments, { status: "Received" }),
      ]);

      const failedSources = [
        ["leads", resultEntries[0]],
        ["opportunities", resultEntries[1]],
        ["activities", resultEntries[2]],
        ["cases", resultEntries[3]],
        ["quotes", resultEntries[4]],
        ["invoices", resultEntries[5]],
        ["payments", resultEntries[6]],
      ]
        .filter(([, result]) => result.status === "rejected")
        .map(([label]) => label);

      const [leads, opportunities, activities, cases, quotes, invoices, payments] = resultEntries.map((entry) =>
        entry.status === "fulfilled" ? entry.value : { rows: [], total: 0 }
      );

      setSnapshot({
        leads: leads.total,
        opportunities: opportunities.total,
        activities: activities.total,
        cases: cases.total,
        quotes: quotes.total,
        invoices: invoices.total,
        payments: payments.total,
        recentLeads: leads.rows,
        recentOpportunities: opportunities.rows,
        recentActivities: activities.rows,
      });

      if (failedSources.length) {
        setErrorSummary({
          title: "Some CRM widgets could not be loaded",
          message:
            "Your execution workspace is still available, but a few modules are returning incomplete data right now.",
          details: failedSources,
        });
      }

      setLoading(false);
    };

    loadDashboard();
  }, []);

  const quickLinks = moduleCatalog
    .filter((module) => ["accounts", "contacts", "leads", "opportunities", "activities", "quotes", "cases"].includes(module.key))
    .map((module) => ({ label: module.label, to: module.userTo }));

  const cards = [
    { title: "Active leads", value: snapshot.leads, note: "New demand waiting on action.", tone: "dark", icon: InboxStackIcon },
    { title: "Open opportunities", value: snapshot.opportunities, note: "Pipeline you can move today.", tone: "blue", icon: BriefcaseIcon },
    { title: "Pending activities", value: snapshot.activities, note: "Tasks and follow-ups due now.", tone: "green", icon: BoltIcon },
    { title: "Open cases", value: snapshot.cases, note: "Customer issues still in flight.", tone: "amber", icon: SparklesIcon },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(251,191,36,0.15),_transparent_22%),linear-gradient(180deg,#fffdf5_0%,#f8fafc_42%,#eff6ff_100%)] p-6">
      <section className="rounded-[34px] border border-slate-200 bg-white/95 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-amber-500">Sales Hub</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">Daily CRM workspace</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Built around the same CRM scope, but focused on what an individual user needs right now:
              follow up, move deals, issue commercials, and resolve customer conversations without getting
              buried in admin-only setup.
            </p>
          </div>

          <div className="rounded-[26px] border border-amber-100 bg-amber-50 px-5 py-4 text-sm text-slate-700 shadow-sm">
            Workspace for <span className="font-semibold text-slate-950">{sessionUser.name || sessionUser.Name || "current user"}</span>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {quickLinks.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700"
            >
              {item.label}
            </Link>
          ))}
        </div>

        {errorSummary ? <div className="mt-6"><ErrorPanel {...errorSummary} /></div> : null}
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <MetricCard
            key={card.title}
            title={card.title}
            value={loading ? "..." : formatNumber(card.value)}
            note={card.note}
            tone={card.tone}
            icon={card.icon}
          />
        ))}
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard eyebrow="Execution Queue" title="What needs attention">
          <div className="grid grid-cols-1 gap-4">
            {snapshot.recentActivities.length ? (
              snapshot.recentActivities.map((activity) => (
                <div key={activity.Id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{activity.Subject || activity.Type || `Activity #${activity.Id}`}</p>
                      <p className="mt-1 text-sm text-slate-600">{activity.Description || "Pending CRM follow-up."}</p>
                    </div>
                    <StatusBadge value={activity.Status || "Pending"} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>{activity.Type || "Task"}</span>
                    <span>{activity.AccountName || activity.OpportunityName || "CRM record linked"}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No pending activities available.</p>
            )}
          </div>
        </SectionCard>

        <SectionCard eyebrow="Phase Context" title="Roadmap you are operating inside">
          <div className="space-y-4">
            {phaseBlueprint.map((phase) => (
              <div key={phase.phase} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <PhasePill phase={phase.phase} />
                    <h3 className="mt-3 text-base font-semibold text-slate-950">{phase.title}</h3>
                  </div>
                  {phase.phase === "Phase 1" ? (
                    <span className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-semibold text-white">Live now</span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{phase.summary}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard
          eyebrow="Recent Demand"
          title="Latest leads"
          action={<Link className="text-sm font-semibold text-amber-700" to={portal === "admin" ? "/Admin/Leads" : "/user/leads"}>Open leads</Link>}
        >
          <div className="space-y-4">
            {snapshot.recentLeads.length ? (
              snapshot.recentLeads.map((lead) => (
                <div key={lead.Id} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-950">{lead.AccountName || lead.ContactName || `Lead #${lead.Id}`}</p>
                      <p className="mt-1 text-sm text-slate-600">{lead.Description || "Lead captured and ready for qualification."}</p>
                    </div>
                    <StatusBadge value={lead.Status || "New"} />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No leads available.</p>
            )}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Pipeline"
          title="Latest opportunities"
          action={<Link className="text-sm font-semibold text-amber-700" to={portal === "admin" ? "/Admin/Opportunities" : "/user/opportunities"}>Open pipeline</Link>}
        >
          <div className="space-y-4">
            {snapshot.recentOpportunities.length ? (
              snapshot.recentOpportunities.map((opportunity) => (
                <div key={opportunity.Id} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-950">{opportunity.OpportunityName || `Opportunity #${opportunity.Id}`}</p>
                      <p className="mt-1 text-sm text-slate-600">{opportunity.AccountName || "No linked account"}</p>
                    </div>
                    <StatusBadge value={opportunity.Status || "Open"} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>{opportunity.SalesStageName || "Pipeline stage pending"}</span>
                    <span>{formatCurrency(opportunity.BudgetAmount)}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No opportunities available.</p>
            )}
          </div>
        </SectionCard>
      </section>
    </div>
  );
}

export default function SalesDashboard({ portal = "admin" }) {
  if (portal === "admin") {
    return <AdminCrmDashboard />;
  }

  return <UserCrmDashboard portal={portal} />;
}
