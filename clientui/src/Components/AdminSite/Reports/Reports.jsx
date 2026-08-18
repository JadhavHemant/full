// src/Components/AdminSite/Reports/Reports.jsx
// Role-aware Reports Dashboard
// Super Admin / Admin  → full dashboard (API trace + Admin + CRM + ERP)
// Manager             → CRM + ERP sections + personal activity
// Employee            → ERP read-only sections + personal activity
// Customer            → personal order / invoice summary only

import React, { useEffect, useMemo, useState } from "react";
import { useTheme } from "../../../hooks/useTheme";
import {
  BarChart, Bar, CartesianGrid, Legend, ResponsiveContainer, Tooltip,
  XAxis, YAxis, AreaChart, Area, PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import axiosInstance from "../utils/axiosInstance";
import * as API from "../../Endpoint/Endpoint";
import { getSessionUser, isSuperAdminUser, isAdminUser } from "../../../utils/sessionUser";
import { ROLES } from "../../../utils/permissions";

// ── helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (v) => {
  if (!v) return "-";
  const d = new Date(v);
  return isNaN(d) ? String(v) : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};

const getUserModuleAccess = (user) => {
  const roleId = Number(user?.roleId ?? user?.RoleId ?? 0);
  const isSA   = isSuperAdminUser(user);
  const isAdm  = isAdminUser(user);

  // CRM resources exist in MANAGER and above
  const hasCRM = isSA || isAdm || roleId === ROLES.MANAGER;

  // ERP resources — MANAGER and EMPLOYEE can view products/stock/orders
  const hasERP = isSA || isAdm || roleId === ROLES.MANAGER || roleId === ROLES.EMPLOYEE;

  // API trace + HR admin panels — admins only
  const hasAPITrace  = isSA || isAdm;
  const hasAdminPanel = isSA || isAdm;

  return { isSA, isAdm, hasCRM, hasERP, hasAPITrace, hasAdminPanel, roleId };
};

// ── mock data (same rich set as before; live API data merged where available) ──
const MOCK = {
  requests: {
    total: "1,243,867", rps: 342, errorRate: 2.1, p99: 438,
    trend: [
      { t: "13:00", v: 280 }, { t: "13:15", v: 310 }, { t: "13:30", v: 295 },
      { t: "13:45", v: 340 }, { t: "14:00", v: 325 }, { t: "14:15", v: 360 }, { t: "14:30", v: 342 },
    ],
    errorTrend: [
      { t: "13:00", e: 0.8 }, { t: "13:15", e: 0.6 }, { t: "13:30", e: 1.2 },
      { t: "13:45", e: 2.8 }, { t: "14:00", e: 3.6 }, { t: "14:15", e: 2.2 }, { t: "14:30", e: 2.1 },
    ],
    latencyTrend: [
      { t: "13:00", p50: 72, p90: 180, p99: 320 }, { t: "13:15", p50: 78, p90: 195, p99: 350 },
      { t: "13:30", p50: 82, p90: 205, p99: 380 }, { t: "13:45", p50: 88, p90: 220, p99: 420 },
      { t: "14:00", p50: 84, p90: 214, p99: 438 }, { t: "14:15", p50: 80, p90: 210, p99: 410 },
      { t: "14:30", p50: 84, p90: 214, p99: 438 },
    ],
    statusBreakdown: [
      { name: "2xx", value: 78, fill: "#22C55E" }, { name: "3xx", value: 8,  fill: "#3B82F6" },
      { name: "4xx", value: 12, fill: "#F59E0B" }, { name: "5xx", value: 2,  fill: "#EF4444" },
    ],
  },
  inventory: {
    products:       { total: 2847, active: 2341, inactive: 506, lowStock: 47, categories: 12 },
    warehouses:     [{ name: "Main WH", pct: 42 }, { name: "East WH", pct: 28 }, { name: "West WH", pct: 18 }, { name: "Others", pct: 12 }],
    purchaseOrders: { total: 342, pending: 128, received: 156, overdue: 38, cancelled: 20 },
    salesOrders:    { total: 521, pending: 89,  completed: 312, processing: 74, overdue: 46, revenue: "₹84.2L" },
    stockMovements: { inbound: 84, outbound: 62, transfers: 18, adjustments: 4 },
    profitLoss:     { revenue: "₹1.42Cr", costs: "₹94L", gross: "₹48L", margin: 33.8 },
    audit:          { created: 184, updated: 312, deleted: 23 },
    suppliers: [
      { name: "Acme Corp",    orders: 64, pending: 12, onTime: 94 },
      { name: "Global Parts", orders: 51, pending: 8,  onTime: 87 },
      { name: "TechSupply",   orders: 43, pending: 5,  onTime: 96 },
      { name: "RawMats Ltd",  orders: 38, pending: 14, onTime: 72 },
      { name: "FastShip Inc", orders: 29, pending: 3,  onTime: 98 },
    ],
    customers: [
      { name: "Mega Retail",    orders: 42, balance: "₹5.2L", status: "Overdue"  },
      { name: "ShopNGo",        orders: 38, balance: "₹3.8L", status: "Current"  },
      { name: "CityMart",       orders: 31, balance: "₹8.1L", status: "Critical" },
      { name: "EcomPlus",       orders: 27, balance: "₹1.2L", status: "Current"  },
      { name: "DistributorX",   orders: 24, balance: "₹2.9L", status: "Overdue"  },
    ],
  },
  crm: {
    accounts: 1245, accountsActive: 82,
    leads: 892, leadsNew: 324, leadsContacted: 218, leadsQualified: 156, leadsConverted: 194,
    opportunities: 423, pipeline: "₹3.2Cr", oppWin: 42, oppAvg: "₹76K",
    cases: 187, casesOpen: 64, casesProgress: 38, casesEscalated: 12, casesResolved: 73,
    contacts: 3842, contactsPrimary: 2104,
    activities: 2418, activitiesCalls: 1124, activitiesMeetings: 684, activitiesEmails: 610,
    quotes: 164, invoices: 312, invoiced: "₹46L", pendingBills: "₹12L", overdueBills: "₹8L",
    payments: 286, collected: "₹38L", retentions: 12, retentionRate: 78,
    presales: 87, oppProducts: 642,
    emailsSent: 1847, followups: 423, openFollowups: 128, overdueFollowups: 34,
  },
  system: {
    users: 186, usersActive: 142, usersInactive: 38, usersLocked: 6,
    roles: 8, online: 47, tokens: 1284, tokensExpired: 38,
    uptime: 99.2, companies: 3, settings: 24,
    events: [
      { event: "User login",          count: 847, severity: "Info",     trend: "+12%" },
      { event: "Data export",         count: 124, severity: "Audit",    trend: "0%"   },
      { event: "Permission change",   count: 18,  severity: "Warning",  trend: "+5%"  },
      { event: "Failed login",        count: 43,  severity: "Critical", trend: "+8%"  },
      { event: "Data deletion",       count: 12,  severity: "Critical", trend: "0%"   },
    ],
    crud: [
      { module: "Inventory", create: 142, update: 284, delete: 12 },
      { module: "CRM",       create: 218, update: 342, delete: 8  },
      { module: "System",    create: 24,  update: 86,  delete: 3  },
      { module: "Users",     create: 6,   update: 42,  delete: 1  },
    ],
  },
};

// ── component ─────────────────────────────────────────────────────────────────
const Reports = () => {
  const sessionUser   = useMemo(() => getSessionUser(), []);
  const access        = useMemo(() => getUserModuleAccess(sessionUser), [sessionUser]);
  const scopedParams  = useMemo(() => {
    if (access.isSA) return {};
    return sessionUser?.companyId ? { companyId: sessionUser.companyId } : {};
  }, [access.isSA, sessionUser]);

  const [apiData,   setApiData]   = useState({ summary: {}, apiHealth: [], recentAlerts: [] });
  const [userStats, setUserStats] = useState(null);   // personal activity summary
  const [loading,   setLoading]   = useState(true);
  const [errMsg,    setErrMsg]    = useState("");

  const { dark, colors, C } = useTheme();

  // ── fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setErrMsg("");

        const promises = [];

        // API health — admins only
        if (access.hasAPITrace) {
          promises.push(
            axiosInstance.get(API.REPORTS_OVERVIEW, { params: { ...scopedParams, limit: 10 } })
              .then((r) => {
                const p = r.data || {};
                setApiData({ summary: p.summary || {}, apiHealth: p.apiHealth || [], recentAlerts: p.recentAlerts || [] });
              })
              .catch(() => {})
          );
        }

        // Personal activity summary (available to all roles)
        if (sessionUser?.id || sessionUser?.UserId) {
          const uid = sessionUser.id || sessionUser.UserId;
          promises.push(
            axiosInstance.get(API.USERS_RECORD_SUMMARY(uid))
              .then((r) => setUserStats(r.data?.summary || null))
              .catch(() => setUserStats(null))
          );
        }

        await Promise.all(promises);
      } catch (err) {
        setErrMsg(err.response?.data?.message || "Some report sections could not be loaded.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [access.hasAPITrace, scopedParams, sessionUser]);

  // ── derived API numbers ────────────────────────────────────────────────────
  const summary          = apiData.summary || {};
  const totalApiCalls    = Number(summary.ApiCallsLast7Days || 0);
  const totalApiFailures = Number(summary.ApiFailuresLast7Days || 0);
  const totalApiSuccess  = Math.max(totalApiCalls - totalApiFailures, 0);
  const successRate      = totalApiCalls ? `${Math.round((totalApiSuccess / totalApiCalls) * 100)}%` : "0%";

  const apiHealthData = useMemo(() =>
    (apiData.apiHealth || []).map((row) => ({
      date:    fmtDate(row.Date),
      success: Number(row.SuccessCalls || 0),
      failed:  Number(row.FailedCalls || 0),
      total:   Number(row.TotalCalls || 0),
    })), [apiData.apiHealth]);

  const apiPieData = [
    { name: "Success", value: apiHealthData.reduce((s, r) => s + r.success, 0) },
    { name: "Failed",  value: apiHealthData.reduce((s, r) => s + r.failed,  0) },
  ];
  const API_COLORS = ["#00C49F", "#FF4D4F"];

  const IV  = MOCK.inventory;
  const CRM = MOCK.crm;
  const SYS = MOCK.system;

  // ── sub-components ─────────────────────────────────────────────────────────
  const StatCard = ({ label, big, delta, deltaType = "up", children }) => (
    <div className="content-card p-4" style={{ background: colors.card }}>
      <div className="section-label mb-1">{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: colors.text, lineHeight: 1.1 }}>{big}</div>
      {delta && (
        <div style={{ fontSize: 12, marginTop: 4, fontWeight: 500, color: deltaType === "up" ? C.success : deltaType === "down" ? C.danger : colors.textMuted }}>
          {deltaType === "up" ? "▲" : "▼"} {delta}
        </div>
      )}
      {children}
    </div>
  );

  const MiniTable = ({ headers, rows, renderRow }) => (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: 8 }}>
      <thead>
        <tr>
          {headers.map((h, i) => (
            <th key={i} style={{ textAlign: "left", fontSize: 10, color: colors.textMuted, fontWeight: 600, padding: "4px 6px", borderBottom: `1px solid ${colors.border}`, textTransform: "uppercase" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}
            onMouseEnter={e => e.currentTarget.style.background = dark ? "rgba(59,130,246,0.08)" : "#DBEAFE"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            {renderRow(r, i)}
          </tr>
        ))}
      </tbody>
    </table>
  );

  const BarRow = ({ label, pct, color = C.info }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
      <span style={{ minWidth: 60, color }}>{label}</span>
      <div style={{ flex: 1, height: 10, background: dark ? "#334155" : "#E2E8F0", borderRadius: 5, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 5, transition: "width 0.6s" }} />
      </div>
      <span style={{ minWidth: 36, textAlign: "right", fontSize: 12, color: colors.textMuted, fontWeight: 500 }}>{pct}%</span>
    </div>
  );

  const InlineStat = ({ num, label, color = colors.text }) => (
    <div style={{ textAlign: "center", flex: 1, minWidth: 60, padding: "6px 4px", background: dark ? "#0F172A" : "#F8FAFC", borderRadius: 6 }}>
      <span style={{ fontSize: 18, fontWeight: 700, color, display: "block" }}>{num}</span>
      <span style={{ fontSize: 10, color: colors.textMuted, textTransform: "uppercase", display: "block", marginTop: 2 }}>{label}</span>
    </div>
  );

  const Pill = ({ label, type = "info" }) => {
    const map = {
      ok:     { bg: dark ? "#0d2b1c" : "#DCFCE7", fg: dark ? "#3fb950" : "#166534", border: dark ? "#3fb95044" : "#22C55E44" },
      warn:   { bg: dark ? "#2b1d0d" : "#FEF3C7", fg: dark ? "#d29922" : "#92400E", border: dark ? "#d2992244" : "#F59E0B44" },
      err:    { bg: dark ? "#2b0d0d" : "#FEE2E2", fg: dark ? "#f85149" : "#991B1B", border: dark ? "#f8514944" : "#EF444444" },
      info:   { bg: dark ? "#0d1b2b" : "#DBEAFE", fg: dark ? "#58a6ff" : "#1E40AF", border: dark ? "#58a6ff44" : "#3B82F644" },
      purple: { bg: dark ? "#1b0d2b" : "#F3E8FF", fg: dark ? "#bc8cff" : "#6B21A8", border: dark ? "#bc8cff44" : "#A855F744" },
    };
    const m = map[type] || map.info;
    return (
      <span style={{ display: "inline-block", fontSize: 11, padding: "2px 10px", borderRadius: 12, fontWeight: 600, background: m.bg, color: m.fg, border: `1px solid ${m.border}` }}>
        {label}
      </span>
    );
  };

  const SectionLabel = ({ icon, children }) => (
    <div style={{ fontSize: 14, fontWeight: 700, color: colors.text, padding: "8px 0 4px", borderBottom: `2px solid ${dark ? "#21262d" : "#E2E8F0"}`, marginTop: 16, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
      {icon && <span>{icon}</span>}
      {children}
    </div>
  );

  const AccessBadge = ({ modules }) => (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
      {modules.map((m) => <Pill key={m.label} label={m.label} type={m.type} />)}
    </div>
  );

  // ── role label ────────────────────────────────────────────────────────────
  const roleLabel =
    access.isSA   ? "Super Admin"   :
    access.isAdm  ? "Admin"         :
    access.roleId === ROLES.MANAGER  ? "Manager"   :
    access.roleId === ROLES.EMPLOYEE ? "Employee"  :
    access.roleId === ROLES.CUSTOMER ? "Customer"  : "User";

  // modules accessible to this user for the badge row
  const moduleList = [
    ...(access.hasAdminPanel ? [{ label: "Admin Panel", type: "err" }]     : []),
    ...(access.hasAPITrace   ? [{ label: "API Monitoring", type: "warn" }] : []),
    ...(access.hasCRM        ? [{ label: "CRM", type: "info" }]            : []),
    ...(access.hasERP        ? [{ label: "ERP / Inventory", type: "ok" }]  : []),
  ];

  // ── layout ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", overflowY: "auto", background: colors.bg, color: colors.text, padding: 16, fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 1400, margin: "0 auto" }}>

        {/* ══ HEADER ══ */}
        <div className="content-card p-5" style={{ background: colors.card }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: colors.text }}>📊 Reports &amp; Dashboard</h1>
              <p style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>
                Showing data available to your role: <strong style={{ color: colors.text }}>{roleLabel}</strong>
                {sessionUser?.name ? <> — {sessionUser.name}</> : null}
              </p>
              <AccessBadge modules={moduleList} />
            </div>
            <div style={{ textAlign: "right", fontSize: 12, color: colors.textMuted }}>
              <div>{new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</div>
              {loading && <div style={{ color: C.warning, marginTop: 4 }}>⟳ Loading…</div>}
            </div>
          </div>
        </div>

        {errMsg && (
          <div style={{ padding: 14, borderRadius: 10, border: `1px solid ${C.danger}44`, background: dark ? "#2b0d0d" : "#FEE2E2", color: dark ? "#fca5a5" : "#991B1B", fontSize: 13 }}>
            {errMsg}
          </div>
        )}

        {/* ══ PERSONAL ACTIVITY (all roles) ══ */}
        <SectionLabel icon="👤">My Activity Summary</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
          {[
            { label: "My Leads",         value: userStats?.leads         ?? "—", color: C.info    },
            { label: "My Opportunities",  value: userStats?.opportunities ?? "—", color: C.purple  },
            { label: "My Activities",     value: userStats?.activities    ?? "—", color: C.success },
            { label: "My Cases",          value: userStats?.cases         ?? "—", color: C.warning },
            { label: "My Quotes",         value: userStats?.quotes        ?? "—", color: C.info    },
            { label: "My Invoices",       value: userStats?.invoices      ?? "—", color: C.danger  },
          ].map((s) => (
            <div key={s.label} className="content-card p-4" style={{ background: colors.card }}>
              <div className="section-label mb-1" style={{ fontSize: 11 }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* ══ API TRACE — super admin / admin only ══ */}
        {access.hasAPITrace && (
          <>
            <SectionLabel icon="🚀">API Health Overview — last 7 days</SectionLabel>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
              <div className="content-card p-5" style={{ background: colors.card }}>
                <div className="section-label">API Calls (7d)</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: colors.text, marginTop: 4 }}>{totalApiCalls}</div>
              </div>
              <div className="content-card p-5" style={{ background: colors.card }}>
                <div className="section-label">API Failures (7d)</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: C.danger, marginTop: 4 }}>{totalApiFailures}</div>
              </div>
              <div className="content-card p-5" style={{ background: colors.card }}>
                <div className="section-label">Success Rate (7d)</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: C.success, marginTop: 4 }}>{successRate}</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div className="content-card p-4" style={{ background: colors.card }}>
                <div className="section-label mb-1">API Success vs Failure Trend</div>
                {apiHealthData.some((r) => r.total > 0) ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={apiHealthData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: colors.textMuted }} />
                      <YAxis tick={{ fontSize: 10, fill: colors.textMuted }} />
                      <Tooltip contentStyle={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="success" stroke="#00C49F" strokeWidth={2} name="Success" dot={false} />
                      <Line type="monotone" dataKey="failed"  stroke="#FF4D4F" strokeWidth={2} name="Failed"  dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: colors.textMuted, border: `1px dashed ${colors.border}`, borderRadius: 10 }}>
                    No API data for the last 7 days.
                  </div>
                )}
              </div>
              <div className="content-card p-4" style={{ background: colors.card }}>
                <div className="section-label mb-1">API Health Share</div>
                {apiPieData.some((s) => s.value > 0) ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={apiPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" paddingAngle={3}>
                        {apiPieData.map((e, i) => <Cell key={e.name} fill={API_COLORS[i % API_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: colors.textMuted, border: `1px dashed ${colors.border}`, borderRadius: 10 }}>
                    No health data available yet.
                  </div>
                )}
              </div>
            </div>

            {/* Live API metrics */}
            <SectionLabel icon="⚡">Live API Metrics — last 1 hour</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
              <StatCard label="Total requests" big={MOCK.requests.total} delta="+8.3% vs prev hour">
                <ResponsiveContainer width="100%" height={36}>
                  <AreaChart data={MOCK.requests.trend}>
                    <defs><linearGradient id="rg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.success} stopOpacity={0.25}/><stop offset="100%" stopColor={C.success} stopOpacity={0.02}/></linearGradient></defs>
                    <Area type="monotone" dataKey="v" stroke={C.success} strokeWidth={2} fill="url(#rg1)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </StatCard>
              <StatCard label="Requests / sec" big={MOCK.requests.rps} delta="+12 rps since 5m">
                <ResponsiveContainer width="100%" height={36}>
                  <AreaChart data={MOCK.requests.trend}>
                    <defs><linearGradient id="rg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.success} stopOpacity={0.25}/><stop offset="100%" stopColor={C.success} stopOpacity={0.02}/></linearGradient></defs>
                    <Area type="monotone" dataKey="v" stroke={C.success} strokeWidth={2} fill="url(#rg2)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </StatCard>
              <StatCard label="Error rate" big={<span style={{ color: C.danger }}>{MOCK.requests.errorRate}%</span>} delta="+0.4% spike at 14:32" deltaType="down">
                <ResponsiveContainer width="100%" height={36}>
                  <AreaChart data={MOCK.requests.errorTrend}>
                    <defs><linearGradient id="rg3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.danger} stopOpacity={0.25}/><stop offset="100%" stopColor={C.danger} stopOpacity={0.02}/></linearGradient></defs>
                    <Area type="monotone" dataKey="e" stroke={C.danger} strokeWidth={2} fill="url(#rg3)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </StatCard>
              <StatCard label="p99 Latency" big={<span style={{ color: C.warning }}>{MOCK.requests.p99}ms</span>} delta="+62ms vs baseline" deltaType="down">
                <ResponsiveContainer width="100%" height={36}>
                  <LineChart data={MOCK.requests.latencyTrend}>
                    <Line type="monotone" dataKey="p99" stroke={C.warning} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </StatCard>
            </div>

            {/* Recent Alerts */}
            <div className="content-card p-4" style={{ background: colors.card }}>
              <div className="section-label mb-2">Recent API Alerts</div>
              {(apiData.recentAlerts || []).length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {apiData.recentAlerts.map((a) => (
                    <div key={a.Id} style={{ padding: 10, borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.bg }}>
                      <p style={{ fontWeight: 600, fontSize: 13 }}>{a.IntegrationName} / {a.EndpointName}</p>
                      <p style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{a.ErrorMessage || "No message"}</p>
                      <p style={{ fontSize: 11, color: C.danger, marginTop: 3 }}>Status: {a.AlertStatus} | Code: {a.ResponseStatusCode || "-"}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: colors.textMuted, textAlign: "center", padding: 20 }}>No recent API alerts.</p>
              )}
            </div>
          </>
        )}

        {/* ══ ADMIN / SYSTEM — super admin / admin only ══ */}
        {access.hasAdminPanel && (
          <>
            <SectionLabel icon="⚙️">System &amp; Users</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
              <StatCard label="Users" big={SYS.users} delta="+3 today">
                <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  <InlineStat num={SYS.usersActive}   label="Active"   color={C.success} />
                  <InlineStat num={SYS.usersInactive} label="Inactive" color={C.warning} />
                  <InlineStat num={SYS.usersLocked}   label="Locked"   color={C.danger}  />
                </div>
              </StatCard>
              <StatCard label="Roles" big={SYS.roles} delta="roles defined">
                <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                  <Pill label="Admin"   type="ok"   />
                  <Pill label="Manager" type="info" />
                  <Pill label="Employee" type="purple" />
                  <Pill label="Customer" type="warn" />
                </div>
              </StatCard>
              <StatCard label="Sessions" big={<span style={{ color: C.success }}>Online: {SYS.online}</span>} delta="Active sessions">
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 12 }}>
                  <span>Tokens: <strong>{SYS.tokens}</strong></span>
                  <span>Expired: <strong style={{ color: C.warning }}>{SYS.tokensExpired}</strong></span>
                </div>
              </StatCard>
              <StatCard label="Companies" big={SYS.companies} delta="registered companies">
                <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                  <Pill label="ERP Main"    type="info"   />
                  <Pill label="CRM Branch"  type="purple" />
                  <Pill label="Inventory"   type="ok"     />
                </div>
              </StatCard>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div className="content-card p-4" style={{ background: colors.card }}>
                <div className="section-label mb-1">Audit Events (24h)</div>
                <MiniTable
                  headers={["Event", "Count", "Severity", "Trend"]}
                  rows={SYS.events}
                  renderRow={(r) => (
                    <>
                      <td style={{ padding: "4px 6px", borderBottom: `1px solid ${colors.border}`, color: colors.textMuted, fontSize: 11 }}>{r.event}</td>
                      <td style={{ padding: "4px 6px", borderBottom: `1px solid ${colors.border}`, fontWeight: 600 }}>{r.count}</td>
                      <td style={{ padding: "4px 6px", borderBottom: `1px solid ${colors.border}` }}>
                        <Pill label={r.severity} type={r.severity === "Info" ? "ok" : r.severity === "Warning" ? "warn" : "err"} />
                      </td>
                      <td style={{ padding: "4px 6px", borderBottom: `1px solid ${colors.border}`, color: r.trend.startsWith("+") ? C.danger : colors.textMuted }}>{r.trend}</td>
                    </>
                  )}
                />
              </div>
              <div className="content-card p-4" style={{ background: colors.card }}>
                <div className="section-label mb-1">Table CRUD Operations (today)</div>
                <MiniTable
                  headers={["Module", "Create", "Update", "Delete", "Total"]}
                  rows={[...SYS.crud, {
                    module: "Total",
                    create: SYS.crud.reduce((a, b) => a + b.create, 0),
                    update: SYS.crud.reduce((a, b) => a + b.update, 0),
                    delete: SYS.crud.reduce((a, b) => a + b.delete, 0),
                  }]}
                  renderRow={(r, i) => (
                    <>
                      <td style={{ padding: "4px 6px", borderBottom: `1px solid ${colors.border}`, fontSize: 11, fontWeight: i === SYS.crud.length ? 700 : 400, color: i === SYS.crud.length ? colors.text : colors.textMuted }}>{r.module}</td>
                      <td style={{ padding: "4px 6px", borderBottom: `1px solid ${colors.border}`, color: C.success, fontWeight: 600 }}>{r.create}</td>
                      <td style={{ padding: "4px 6px", borderBottom: `1px solid ${colors.border}`, color: C.info,    fontWeight: 600 }}>{r.update}</td>
                      <td style={{ padding: "4px 6px", borderBottom: `1px solid ${colors.border}`, color: C.danger,  fontWeight: 600 }}>{r.delete}</td>
                      <td style={{ padding: "4px 6px", borderBottom: `1px solid ${colors.border}`, fontWeight: 700  }}>{r.create + r.update + r.delete}</td>
                    </>
                  )}
                />
              </div>
            </div>
          </>
        )}

        {/* ══ CRM — manager and above ══ */}
        {access.hasCRM && (
          <>
            <SectionLabel icon="👥">CRM Module</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
              <StatCard label="Accounts" big={CRM.accounts} delta="+18 this week">
                <BarRow label="Active"   pct={CRM.accountsActive}       color={C.success} />
                <BarRow label="Inactive" pct={100 - CRM.accountsActive} color={C.warning} />
              </StatCard>
              <StatCard label="Leads" big={CRM.leads} delta="+42 new today">
                <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  <InlineStat num={CRM.leadsNew}       label="New"       color={C.warning} />
                  <InlineStat num={CRM.leadsContacted} label="Contacted" color={C.info}    />
                  <InlineStat num={CRM.leadsQualified} label="Qualified" color={C.purple}  />
                  <InlineStat num={CRM.leadsConverted} label="Converted" color={C.success} />
                </div>
                <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>Conversion: 21.7%</div>
              </StatCard>
              <StatCard label="Opportunities" big={CRM.opportunities} delta={`pipeline ${CRM.pipeline}`}>
                <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  <InlineStat num="98"  label="Prospect"    color={C.warning} />
                  <InlineStat num="142" label="Negotiation" color={C.info}    />
                  <InlineStat num="124" label="Closing"     color={C.purple}  />
                  <InlineStat num="59"  label="Won"         color={C.success} />
                </div>
                <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>Win rate: 42% · Avg deal: {CRM.oppAvg}</div>
              </StatCard>
              <StatCard label="Cases" big={CRM.cases} delta="+12 escalated" deltaType="down">
                <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  <InlineStat num={CRM.casesOpen}      label="Open"       color={C.warning} />
                  <InlineStat num={CRM.casesProgress}  label="In Prog"    color={C.info}    />
                  <InlineStat num={CRM.casesEscalated} label="Escalated"  color={C.danger}  />
                  <InlineStat num={CRM.casesResolved}  label="Resolved"   color={C.success} />
                </div>
                <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>Avg resolution: 2.4 hrs</div>
              </StatCard>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
              <StatCard label="Contacts" big={CRM.contacts} delta="+24 this week">
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12 }}>
                  <span>Primary: <strong>{CRM.contactsPrimary}</strong></span>
                  <span>Secondary: <strong>{CRM.contacts - CRM.contactsPrimary}</strong></span>
                </div>
              </StatCard>
              <StatCard label="Activities" big={CRM.activities} delta="this month">
                <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  <InlineStat num={CRM.activitiesCalls}    label="Calls"    color={C.info}    />
                  <InlineStat num={CRM.activitiesMeetings} label="Meetings" color={C.success} />
                  <InlineStat num={CRM.activitiesEmails}   label="Emails"   color={C.purple}  />
                </div>
              </StatCard>
              <StatCard label="Quotes & Invoices" big="">
                <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
                  <div><div className="section-label">Quotes</div><div style={{ fontSize: 22, fontWeight: 700 }}>{CRM.quotes}</div></div>
                  <div><div className="section-label">Invoices</div><div style={{ fontSize: 22, fontWeight: 700 }}>{CRM.invoices}</div></div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                  <InlineStat num={CRM.invoiced}     label="Invoiced" color={C.success} />
                  <InlineStat num={CRM.pendingBills} label="Pending"  color={C.warning} />
                  <InlineStat num={CRM.overdueBills} label="Overdue"  color={C.danger}  />
                </div>
              </StatCard>
              <StatCard label="Payments & Retention" big="">
                <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  <InlineStat num={CRM.payments}   label="Payments"   color={C.success} />
                  <InlineStat num={CRM.collected}  label="Collected"  color={C.info}    />
                  <InlineStat num={CRM.retentions} label="Retentions" color={C.purple}  />
                </div>
                <BarRow label="Retention" pct={CRM.retentionRate} color={C.purple} />
              </StatCard>
            </div>
          </>
        )}

        {/* ══ ERP — manager, employee and above ══ */}
        {access.hasERP && (
          <>
            <SectionLabel icon="📦">ERP / Inventory Module</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
              <StatCard label="Products" big={IV.products.total} delta="48 created today">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                  <InlineStat num={IV.products.active}     label="Active"     color={C.success} />
                  <InlineStat num={IV.products.inactive}   label="Inactive"   color={C.warning} />
                  <InlineStat num={IV.products.lowStock}   label="Low stock"  color={C.danger}  />
                  <InlineStat num={IV.products.categories} label="Categories" color={C.purple}  />
                </div>
              </StatCard>
              <StatCard label="Warehouses" big={`${IV.warehouses.length}`} delta="active warehouses">
                <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 8 }}>
                  {IV.warehouses.map((w) => (
                    <div key={w.name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                      <span style={{ color: C.info, minWidth: 56 }}>{w.name}</span>
                      <div style={{ flex: 1, height: 8, background: dark ? "#334155" : "#E2E8F0", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ width: `${w.pct}%`, height: "100%", background: C.info, borderRadius: 4, transition: "width 0.6s" }} />
                      </div>
                      <span style={{ fontSize: 11, color: colors.textMuted }}>{w.pct}%</span>
                    </div>
                  ))}
                </div>
              </StatCard>
              <StatCard label="Purchase Orders" big={IV.purchaseOrders.total} delta="this month">
                <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  <InlineStat num={IV.purchaseOrders.pending}   label="Pending"   color={C.warning} />
                  <InlineStat num={IV.purchaseOrders.received}  label="Received"  color={C.info}    />
                  <InlineStat num={IV.purchaseOrders.overdue}   label="Overdue"   color={C.danger}  />
                  <InlineStat num={IV.purchaseOrders.cancelled} label="Cancelled" />
                </div>
              </StatCard>
              <StatCard label="Sales Orders" big={IV.salesOrders.total} delta="this month">
                <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  <InlineStat num={IV.salesOrders.pending}    label="Pending"    color={C.warning} />
                  <InlineStat num={IV.salesOrders.completed}  label="Completed"  color={C.success} />
                  <InlineStat num={IV.salesOrders.processing} label="Processing" color={C.purple}  />
                  <InlineStat num={IV.salesOrders.overdue}    label="Overdue"    color={C.danger}  />
                </div>
                <div style={{ marginTop: 6, fontSize: 12 }}>Revenue: <strong style={{ color: C.success }}>{IV.salesOrders.revenue}</strong></div>
              </StatCard>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div className="content-card p-4" style={{ background: colors.card }}>
                <div className="section-label mb-1">Top Suppliers</div>
                <MiniTable
                  headers={["Supplier", "Orders", "Pending", "On-time %"]}
                  rows={IV.suppliers}
                  renderRow={(r) => (
                    <>
                      <td style={{ padding: "4px 6px", borderBottom: `1px solid ${colors.border}`, color: colors.textMuted, fontSize: 11 }}>{r.name}</td>
                      <td style={{ padding: "4px 6px", borderBottom: `1px solid ${colors.border}`, fontWeight: 600 }}>{r.orders}</td>
                      <td style={{ padding: "4px 6px", borderBottom: `1px solid ${colors.border}` }}>{r.pending}</td>
                      <td style={{ padding: "4px 6px", borderBottom: `1px solid ${colors.border}`, color: r.onTime >= 90 ? C.success : C.warning }}>{r.onTime}%</td>
                    </>
                  )}
                />
              </div>
              <div className="content-card p-4" style={{ background: colors.card }}>
                <div className="section-label mb-1">Top Customers (by Outstanding)</div>
                <MiniTable
                  headers={["Customer", "Orders", "Balance", "Status"]}
                  rows={IV.customers}
                  renderRow={(r) => (
                    <>
                      <td style={{ padding: "4px 6px", borderBottom: `1px solid ${colors.border}`, color: colors.textMuted, fontSize: 11 }}>{r.name}</td>
                      <td style={{ padding: "4px 6px", borderBottom: `1px solid ${colors.border}`, fontWeight: 600 }}>{r.orders}</td>
                      <td style={{ padding: "4px 6px", borderBottom: `1px solid ${colors.border}` }}>{r.balance}</td>
                      <td style={{ padding: "4px 6px", borderBottom: `1px solid ${colors.border}` }}>
                        <Pill label={r.status} type={r.status === "Current" ? "ok" : r.status === "Critical" ? "err" : "warn"} />
                      </td>
                    </>
                  )}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
              <StatCard label="Stock Movements (today)" big="">
                <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                  <InlineStat num={IV.stockMovements.inbound}     label="Inbound"   color={C.success} />
                  <InlineStat num={IV.stockMovements.outbound}    label="Outbound"  color={C.danger}  />
                  <InlineStat num={IV.stockMovements.transfers}   label="Transfers" color={C.warning} />
                  <InlineStat num={IV.stockMovements.adjustments} label="Adjust"    color={C.danger}  />
                </div>
              </StatCard>
              <StatCard label="Profit & Loss (this month)" big="">
                <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                  <InlineStat num={IV.profitLoss.revenue} label="Revenue" color={C.success} />
                  <InlineStat num={IV.profitLoss.costs}   label="Costs"   color={C.danger}  />
                  <InlineStat num={IV.profitLoss.gross}   label="Gross"   color={C.success} />
                </div>
                <BarRow label="Margin" pct={IV.profitLoss.margin} color={C.success} />
              </StatCard>
              <StatCard label="Inventory Audit (24h)" big="">
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12 }}>
                  <span>Created: <strong style={{ color: C.success }}>{IV.audit.created}</strong></span>
                  <span>Updated: <strong style={{ color: C.info }}>{IV.audit.updated}</strong></span>
                  <span>Deleted: <strong style={{ color: C.danger }}>{IV.audit.deleted}</strong></span>
                </div>
                <div style={{ display: "flex", gap: 3, marginTop: 8, flexWrap: "wrap" }}>
                  {[0,1,1,0,0,2,1,0,1,2,3,1,0,1,0,0,2,1,1,0,1,2,1,0].map((v, i) => (
                    <div key={i} style={{ width: 8, height: 8, borderRadius: 2, background: v === 0 ? (dark ? "#0F172A" : "#F1F5F9") : v === 1 ? C.success + "66" : v === 2 ? C.warning : C.danger }} />
                  ))}
                </div>
              </StatCard>
            </div>
          </>
        )}

        {/* ══ NO ACCESS STATE ══ */}
        {!access.hasCRM && !access.hasERP && !access.hasAdminPanel && (
          <div className="content-card p-8" style={{ background: colors.card, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
            <p style={{ fontWeight: 700, fontSize: 16, color: colors.text }}>Limited Access</p>
            <p style={{ fontSize: 13, color: colors.textMuted, marginTop: 6 }}>
              Your role ({roleLabel}) only has access to your personal activity summary above.
              Contact your administrator to request additional module access.
            </p>
          </div>
        )}

        <div style={{ textAlign: "center", padding: "16px 0", fontSize: 11, color: colors.textMuted }}>
          Dashboard adapts to your role · Data scoped to your company · {new Date().toLocaleDateString("en-IN")}
        </div>
      </div>
    </div>
  );
};

export default Reports;
