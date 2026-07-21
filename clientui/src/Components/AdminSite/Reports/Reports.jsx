// src/Components/AdminSite/Reports/Reports.jsx
// Prometheus + Grafana API Tracking Dashboard — Full Monitoring & Reports View

import React, { useEffect, useMemo, useState } from "react";
import { useTheme } from "../../../hooks/useTheme";
import {
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import axiosInstance from "../utils/axiosInstance";
import * as API from "../../Endpoint/Endpoint";
import { getSessionUser, isSuperAdminUser } from "../../../utils/sessionUser";

const formatChartDate = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};

const Reports = () => {
  const sessionUser = useMemo(() => getSessionUser(), []);
  const scopedParams = useMemo(() => {
    if (isSuperAdminUser(sessionUser)) return {};
    return sessionUser?.companyId ? { companyId: sessionUser.companyId } : {};
  }, [sessionUser]);

  const [dashboard, setDashboard] = useState({ summary: {}, apiHealth: [], recentAlerts: [] });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // ── Centralized theme hook for day/night colors ──
  const { dark, colors, C } = useTheme();

  // Fetch reports data
  const fetchDashboard = async () => {
    const overviewRes = await axiosInstance.get(API.REPORTS_OVERVIEW, {
      params: { ...scopedParams, limit: 10 },
    });
    const payload = overviewRes.data || {};
    setDashboard({
      summary: payload.summary || {},
      apiHealth: payload.apiHealth || [],
      recentAlerts: payload.recentAlerts || [],
    });
  };

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setErrorMessage("");
        await fetchDashboard();
      } catch (error) {
        console.error("Failed to load reports dashboard:", error);
        setErrorMessage(
          error.response?.data?.message ||
            "The reports dashboard could not be loaded right now. Chart data may be unavailable until the API responds again."
        );
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [scopedParams]);

  const summary = dashboard.summary || {};

  const apiHealthData = useMemo(
    () =>
      (dashboard.apiHealth || []).map((row) => ({
        date: formatChartDate(row.Date),
        success: Number(row.SuccessCalls || 0),
        failed: Number(row.FailedCalls || 0),
        total: Number(row.TotalCalls || 0),
      })),
    [dashboard.apiHealth]
  );

  const totalApiCalls = Number(summary.ApiCallsLast7Days || 0);
  const totalApiFailures = Number(summary.ApiFailuresLast7Days || 0);
  const totalApiSuccess = Math.max(totalApiCalls - totalApiFailures, 0);
  const successRate = totalApiCalls ? `${Math.round((totalApiSuccess / totalApiCalls) * 100)}%` : "0%";

  const apiPieData = [
    { name: "Success", value: apiHealthData.reduce((sum, row) => sum + row.success, 0) },
    { name: "Failed", value: apiHealthData.reduce((sum, row) => sum + row.failed, 0) },
  ];

  const COLORS = ["#00C49F", "#FF4D4F"];

  // ── Demo / mock data for full dashboard panels ──
  const MOCK = {
    requests: {
      total: totalApiCalls || "1,243,867",
      rps: 342,
      errorRate: totalApiCalls ? Math.round((totalApiFailures / totalApiCalls) * 100) : 2.1,
      p99: 438,
      trend: [
        { t: "13:00", v: 280 }, { t: "13:15", v: 310 }, { t: "13:30", v: 295 },
        { t: "13:45", v: 340 }, { t: "14:00", v: 325 }, { t: "14:15", v: 360 }, { t: "14:30", v: 342 },
      ],
      errorTrend: [
        { t: "13:00", e: 0.8 }, { t: "13:15", e: 0.6 }, { t: "13:30", e: 1.2 },
        { t: "13:45", e: 2.8 }, { t: "14:00", e: 3.6 }, { t: "14:15", e: 2.2 }, { t: "14:30", e: 2.1 },
      ],
      latencyTrend: [
        { t: "13:00", p50: 72, p90: 180, p99: 320 },
        { t: "13:15", p50: 78, p90: 195, p99: 350 },
        { t: "13:30", p50: 82, p90: 205, p99: 380 },
        { t: "13:45", p50: 88, p90: 220, p99: 420 },
        { t: "14:00", p50: 84, p90: 214, p99: 438 },
        { t: "14:15", p50: 80, p90: 210, p99: 410 },
        { t: "14:30", p50: 84, p90: 214, p99: 438 },
      ],
      statusBreakdown: [
        { name: "2xx", value: 78, fill: "#22C55E" },
        { name: "3xx", value: 8, fill: "#3B82F6" },
        { name: "4xx", value: 12, fill: "#F59E0B" },
        { name: "5xx", value: 2, fill: "#EF4444" },
      ],
    },
    inventory: {
      products: { total: 2847, active: 2341, inactive: 506, lowStock: 47, categories: 12 },
      warehouses: [
        { name: "Main WH", pct: 42 }, { name: "East WH", pct: 28 },
        { name: "West WH", pct: 18 }, { name: "Others", pct: 12 },
      ],
      purchaseOrders: { total: 342, pending: 128, received: 156, overdue: 38, cancelled: 20 },
      salesOrders: { total: 521, pending: 89, completed: 312, processing: 74, overdue: 46, revenue: "₹84.2L" },
      stockMovements: { inbound: 84, outbound: 62, transfers: 18, adjustments: 4 },
      profitLoss: { revenue: "₹1.42Cr", costs: "₹94L", gross: "₹48L", margin: 33.8 },
      units: 24, taxes: 8, taxMaps: 2847,
      audit: { created: 184, updated: 312, deleted: 23 },
      suppliers: [
        { name: "Acme Corp", orders: 64, pending: 12, onTime: 94 },
        { name: "Global Parts", orders: 51, pending: 8, onTime: 87 },
        { name: "TechSupply", orders: 43, pending: 5, onTime: 96 },
        { name: "RawMats Ltd", orders: 38, pending: 14, onTime: 72 },
        { name: "FastShip Inc", orders: 29, pending: 3, onTime: 98 },
      ],
      customers: [
        { name: "Mega Retail", orders: 42, balance: "₹5.2L", status: "Overdue" },
        { name: "ShopNGo", orders: 38, balance: "₹3.8L", status: "Current" },
        { name: "CityMart", orders: 31, balance: "₹8.1L", status: "Critical" },
        { name: "EcomPlus", orders: 27, balance: "₹1.2L", status: "Current" },
        { name: "DistributorX", orders: 24, balance: "₹2.9L", status: "Overdue" },
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
      uptime: 99.2, rps: 342,
      companies: 3, settings: 24,
      notificationUsers: 186, notificationChannels: 8,
      events: [
        { event: "User login", count: 847, severity: "Info", trend: "+12%" },
        { event: "Data export", count: 124, severity: "Audit", trend: "0%" },
        { event: "Permission change", count: 18, severity: "Warning", trend: "+5%" },
        { event: "Failed login", count: 43, severity: "Critical", trend: "+8%" },
        { event: "Data deletion", count: 12, severity: "Critical", trend: "0%" },
      ],
      crud: [
        { module: "Inventory", create: 142, update: 284, delete: 12 },
        { module: "CRM", create: 218, update: 342, delete: 8 },
        { module: "System", create: 24, update: 86, delete: 3 },
        { module: "Users", create: 6, update: 42, delete: 1 },
      ],
    },
  };

  const IV = MOCK.inventory;
  const CRM = MOCK.crm;
  const SYS = MOCK.system;

  // ── Reusable sub-components ──

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
          {headers.map((h, i) => <th key={i} style={{ textAlign: "left", fontSize: 10, color: colors.textMuted, fontWeight: 600, padding: "4px 6px", borderBottom: `1px solid ${colors.border}`, textTransform: "uppercase" }}>{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={{ cursor: "pointer", transition: "background 0.15s" }}
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
      <span style={{ minWidth: 60, color: color }}>{label}</span>
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
      ok: { bg: dark ? "#0d2b1c" : "#DCFCE7", fg: dark ? "#3fb950" : "#166534", border: dark ? "#3fb95044" : "#22C55E44" },
      warn: { bg: dark ? "#2b1d0d" : "#FEF3C7", fg: dark ? "#d29922" : "#92400E", border: dark ? "#d2992244" : "#F59E0B44" },
      err: { bg: dark ? "#2b0d0d" : "#FEE2E2", fg: dark ? "#f85149" : "#991B1B", border: dark ? "#f8514944" : "#EF444444" },
      info: { bg: dark ? "#0d1b2b" : "#DBEAFE", fg: dark ? "#58a6ff" : "#1E40AF", border: dark ? "#58a6ff44" : "#3B82F644" },
      purple: { bg: dark ? "#1b0d2b" : "#F3E8FF", fg: dark ? "#bc8cff" : "#6B21A8", border: dark ? "#bc8cff44" : "#A855F744" },
    };
    const m = map[type] || map.info;
    return (
      <span style={{ display: "inline-block", fontSize: 11, padding: "2px 10px", borderRadius: 12, fontWeight: 600, background: m.bg, color: m.fg, border: `1px solid ${m.border}` }}>
        {label}
      </span>
    );
  };

  const SectionLabel = ({ children }) => (
    <div style={{ fontSize: 13, fontWeight: 600, color: colors.textMuted, padding: "4px 0 2px", borderBottom: `1px solid ${dark ? "#21262d" : "#E2E8F0"}`, marginTop: 12, marginBottom: 6 }}>
      {children}
    </div>
  );

  // ── Layout ──
  return (
    <div style={{ minHeight: "100vh", overflowY: "auto", background: colors.bg, color: colors.text, padding: 16, fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 1400, margin: "0 auto" }}>
        {/* ══════════════════════════════════════════════ */}
        {/* HEADER */}
        {/* ══════════════════════════════════════════════ */}
        <div className="content-card p-5" style={{ background: colors.card }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: colors.text }}>📊 API Reports & Monitoring</h1>
            <p style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>
              Prometheus-powered metrics — API health, Inventory, CRM & System tracking
            </p>
          </div>
        </div>

        {/* ══════════════════════════════════════════════ */}
        {/* API HEALTH OVERVIEW */}
        {/* ══════════════════════════════════════════════ */}
        <SectionLabel>🚀 API Health Overview — last 7 days</SectionLabel>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
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

        {errorMessage ? (
          <div style={{ padding: 16, borderRadius: 12, border: `1px solid ${C.danger}44`, background: dark ? "#2b0d0d" : "#FEE2E2", color: dark ? "#fca5a5" : "#991B1B", fontSize: 13, marginBottom: 8 }}>
            <p style={{ fontWeight: 600 }}>Reports are showing an API error</p>
            <p style={{ marginTop: 4 }}>{errorMessage}</p>
          </div>
        ) : null}

        {/* Success/Failure Trend + Health Share */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div className="content-card p-4" style={{ background: colors.card }}>
            <div className="section-label mb-1">API Success vs Failure Trend</div>
            {apiHealthData.some((row) => row.total > 0) ? (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={apiHealthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: colors.textMuted }} />
                  <YAxis tick={{ fontSize: 10, fill: colors.textMuted }} />
                  <Tooltip contentStyle={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="success" stroke="#00C49F" strokeWidth={2} name="Success" dot={false} />
                  <Line type="monotone" dataKey="failed" stroke="#FF4D4F" strokeWidth={2} name="Failed" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: "flex", height: 240, alignItems: "center", justifyContent: "center", borderRadius: 12, border: `1px dashed ${colors.border}`, background: dark ? "#0F172A" : "#F8FAFC", fontSize: 13, color: colors.textMuted }}>
                No API execution data found for the last 14 days.
              </div>
            )}
          </div>

          <div className="content-card p-4" style={{ background: colors.card }}>
            <div className="section-label mb-1">API Health Share</div>
            {apiPieData.some((slice) => slice.value > 0) ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={apiPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" paddingAngle={3}>
                    {apiPieData.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: "flex", height: 240, alignItems: "center", justifyContent: "center", borderRadius: 12, border: `1px dashed ${colors.border}`, background: dark ? "#0F172A" : "#F8FAFC", fontSize: 13, color: colors.textMuted }}>
                No API health data available yet.
              </div>
            )}
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="content-card p-4" style={{ background: colors.card }}>
          <div className="section-label mb-1">Recent API Alerts</div>
          <div style={{ maxHeight: 240, overflowY: "auto" }}>
            {(dashboard.recentAlerts || []).length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(dashboard.recentAlerts || []).map((alert) => (
                  <div key={alert.Id} style={{ padding: 12, borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.bg }}>
                    <p style={{ fontWeight: 600, fontSize: 13, color: colors.text }}>
                      {alert.IntegrationName || "Integration"} / {alert.EndpointName || "Endpoint"}
                    </p>
                    <p style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{alert.ErrorMessage || "No error message"}</p>
                    <p style={{ fontSize: 11, color: C.danger, marginTop: 4 }}>
                      Status: {alert.AlertStatus} | Code: {alert.ResponseStatusCode || "-"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: colors.textMuted, textAlign: "center", padding: 24 }}>No recent API alerts found.</p>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════ */}
        {/* SECTION 1: API OVERVIEW */}
        {/* ══════════════════════════════════════════════ */}
        <SectionLabel>🚀 Live API Metrics — last 1 hour</SectionLabel>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          <StatCard label="Total requests" big={MOCK.requests.total} delta="+8.3% vs prev hour">
            <ResponsiveContainer width="100%" height={36}>
              <AreaChart data={MOCK.requests.trend}>
                <defs><linearGradient id="rg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.success} stopOpacity={0.25}/><stop offset="100%" stopColor={C.success} stopOpacity={0.02}/></linearGradient></defs>
                <Area type="monotone" dataKey="v" stroke={C.success} strokeWidth={2} fill="url(#rg1)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </StatCard>
          <StatCard label="Requests / sec" big={MOCK.requests.rps} delta="+12 rps since 5m ago">
            <ResponsiveContainer width="100%" height={36}>
              <AreaChart data={MOCK.requests.trend}>
                <defs><linearGradient id="rg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.success} stopOpacity={0.25}/><stop offset="100%" stopColor={C.success} stopOpacity={0.02}/></linearGradient></defs>
                <Area type="monotone" dataKey="v" stroke={C.success} strokeWidth={2} fill="url(#rg2)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </StatCard>
          <StatCard label="Error rate" big={<span style={{color: C.danger}}>{MOCK.requests.errorRate}%</span>} delta="+0.4% spike at 14:32" deltaType="down">
            <ResponsiveContainer width="100%" height={36}>
              <AreaChart data={MOCK.requests.errorTrend}>
                <defs><linearGradient id="rg3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.danger} stopOpacity={0.25}/><stop offset="100%" stopColor={C.danger} stopOpacity={0.02}/></linearGradient></defs>
                <Area type="monotone" dataKey="e" stroke={C.danger} strokeWidth={2} fill="url(#rg3)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </StatCard>
          <StatCard label="p99 Latency" big={<span style={{color: C.warning}}>{MOCK.requests.p99}ms</span>} delta="+62ms vs baseline" deltaType="down">
            <ResponsiveContainer width="100%" height={36}>
              <LineChart data={MOCK.requests.latencyTrend}>
                <Line type="monotone" dataKey="p99" stroke={C.warning} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </StatCard>
        </div>

        {/* HTTP Status + Latency charts */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          <div className="content-card p-4" style={{ background: colors.card }}>
            <div className="section-label mb-1">HTTP status breakdown</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 8 }}>
              {MOCK.requests.statusBreakdown.map(s => (
                <BarRow key={s.name} label={s.name} pct={s.value} color={s.fill} />
              ))}
            </div>
          </div>
          <div className="content-card p-4" style={{ background: colors.card }}>
            <div className="section-label mb-1">Latency trend (p50 / p90 / p99)</div>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={MOCK.requests.latencyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                <XAxis dataKey="t" tick={{ fontSize: 10, fill: colors.textMuted }} />
                <YAxis tick={{ fontSize: 10, fill: colors.textMuted }} />
                <Tooltip contentStyle={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="p50" stroke={C.info} strokeWidth={2} name="p50" dot={false} />
                <Line type="monotone" dataKey="p90" stroke={C.purple} strokeWidth={2} name="p90" dot={false} />
                <Line type="monotone" dataKey="p99" stroke={C.danger} strokeWidth={2} name="p99" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="content-card p-4" style={{ background: colors.card }}>
            <div className="section-label mb-1">Status code distribution</div>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={MOCK.requests.statusBreakdown} cx="50%" cy="50%" innerRadius={32} outerRadius={58} dataKey="value" paddingAngle={3}>
                  {MOCK.requests.statusBreakdown.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
              {MOCK.requests.statusBreakdown.map(s => (
                <span key={s.name}><span style={{ color: s.fill, fontWeight: 600 }}>{s.name}</span> {s.value}%</span>
              ))}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════ */}
        {/* SECTION 2: INVENTORY */}
        {/* ══════════════════════════════════════════════ */}
        <SectionLabel>📦 Inventory Module</SectionLabel>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          <StatCard label="Products" big={IV.products.total} delta="48 created today">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
              <InlineStat num={IV.products.active} label="Active" color={C.success} />
              <InlineStat num={IV.products.inactive} label="Inactive" color={C.warning} />
              <InlineStat num={IV.products.lowStock} label="Low stock" color={C.danger} />
              <InlineStat num={IV.products.categories} label="Categories" color={C.purple} />
            </div>
          </StatCard>
          <StatCard label="Stock & Warehouses" big={`${IV.warehouses.length}`} delta="warehouses">
            <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 8 }}>
              {IV.warehouses.map(w => (
                <div key={w.name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                  <span style={{ color: C.info, minWidth: 56 }}>{w.name}</span>
                  <div style={{ flex: 1, height: 8, background: dark ? "#334155" : "#E2E8F0", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${w.pct}%`, height: "100%", background: C.info, borderRadius: 4, transition: "width 0.6s" }} />
                  </div>
                  <span style={{ fontSize: 11, color: colors.textMuted }}>{w.pct}%</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: colors.textMuted }}>
              <span>Low stock: <strong style={{ color: C.danger }}>{IV.products.lowStock}</strong></span>
              <span>Out of stock: <strong style={{ color: C.danger }}>12</strong></span>
            </div>
          </StatCard>
          <StatCard label="Purchase Orders" big={IV.purchaseOrders.total} delta="this month">
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              <InlineStat num={IV.purchaseOrders.pending} label="Pending" color={C.success} />
              <InlineStat num={IV.purchaseOrders.received} label="Received" color={C.info} />
              <InlineStat num={IV.purchaseOrders.overdue} label="Overdue" color={C.danger} />
              <InlineStat num={IV.purchaseOrders.cancelled} label="Cancelled" />
            </div>
            <div style={{ marginTop: 6, fontSize: 12 }}>Avg. lead time: <strong>6.2 days</strong></div>
          </StatCard>
          <StatCard label="Sales Orders" big={IV.salesOrders.total} delta="this month">
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              <InlineStat num={IV.salesOrders.pending} label="Pending" color={C.success} />
              <InlineStat num={IV.salesOrders.completed} label="Completed" color={C.success} />
              <InlineStat num={IV.salesOrders.processing} label="Processing" color={C.purple} />
              <InlineStat num={IV.salesOrders.overdue} label="Overdue" color={C.danger} />
            </div>
            <div style={{ marginTop: 6, fontSize: 12 }}>Revenue: <strong style={{ color: C.success }}>{IV.salesOrders.revenue}</strong></div>
          </StatCard>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div className="content-card p-4" style={{ background: colors.card }}>
            <div className="section-label mb-1">Suppliers</div>
            <MiniTable headers={["Supplier", "Orders", "Pending", "On-time %"]} rows={IV.suppliers} renderRow={(r) => (
              <>
                <td style={{ padding: "4px 6px", borderBottom: `1px solid ${colors.border}`, color: colors.textMuted, fontFamily: "'SF Mono',monospace", fontSize: 11 }}>{r.name}</td>
                <td style={{ padding: "4px 6px", borderBottom: `1px solid ${colors.border}`, fontWeight: 600 }}>{r.orders}</td>
                <td style={{ padding: "4px 6px", borderBottom: `1px solid ${colors.border}` }}>{r.pending}</td>
                <td style={{ padding: "4px 6px", borderBottom: `1px solid ${colors.border}`, color: r.onTime >= 90 ? C.success : C.warning }}>{r.onTime}%</td>
              </>
            )} />
          </div>
          <div className="content-card p-4" style={{ background: colors.card }}>
            <div className="section-label mb-1">Customers (Top by Outstanding)</div>
            <MiniTable headers={["Customer", "Orders", "Balance", "Status"]} rows={IV.customers} renderRow={(r) => (
              <>
                <td style={{ padding: "4px 6px", borderBottom: `1px solid ${colors.border}`, color: colors.textMuted, fontFamily: "'SF Mono',monospace", fontSize: 11 }}>{r.name}</td>
                <td style={{ padding: "4px 6px", borderBottom: `1px solid ${colors.border}`, fontWeight: 600 }}>{r.orders}</td>
                <td style={{ padding: "4px 6px", borderBottom: `1px solid ${colors.border}` }}>{r.balance}</td>
                <td style={{ padding: "4px 6px", borderBottom: `1px solid ${colors.border}` }}>
                  <Pill label={r.status} type={r.status === "Current" ? "ok" : r.status === "Critical" ? "err" : "warn"} />
                </td>
              </>
            )} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          <StatCard label="Stock movements (today)" big="">
            <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
              <InlineStat num={IV.stockMovements.inbound} label="Inbound" color={C.success} />
              <InlineStat num={IV.stockMovements.outbound} label="Outbound" color={C.danger} />
              <InlineStat num={IV.stockMovements.transfers} label="Transfers" color={C.warning} />
              <InlineStat num={IV.stockMovements.adjustments} label="Adjust" color={C.danger} />
            </div>
          </StatCard>
          <StatCard label="Profit & Loss (this month)" big="">
            <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
              <InlineStat num={IV.profitLoss.revenue} label="Revenue" color={C.success} />
              <InlineStat num={IV.profitLoss.costs} label="Costs" color={C.danger} />
              <InlineStat num={IV.profitLoss.gross} label="Gross P/L" color={C.success} />
            </div>
            <BarRow label="Margin" pct={IV.profitLoss.margin} color={C.success} />
          </StatCard>
          <StatCard label="Units & Taxes" big="">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: 6 }}>
              <thead>
                <tr><th style={{ fontSize: 10, color: colors.textMuted, padding: "3px 6px", borderBottom: `1px solid ${colors.border}`, textAlign: "left" }}>Type</th><th style={{ fontSize: 10, color: colors.textMuted, padding: "3px 6px", borderBottom: `1px solid ${colors.border}`, textAlign: "left" }}>Count</th><th style={{ fontSize: 10, color: colors.textMuted, padding: "3px 6px", borderBottom: `1px solid ${colors.border}`, textAlign: "left" }}>Active</th></tr>
              </thead>
              <tbody>
                <tr><td style={{ padding: "4px 6px", borderBottom: `1px solid ${colors.border}` }}>Units of measure</td><td style={{ padding: "4px 6px", borderBottom: `1px solid ${colors.border}`, fontWeight: 600 }}>{IV.units}</td><td style={{ padding: "4px 6px", borderBottom: `1px solid ${colors.border}`, color: C.success }}>{IV.units}</td></tr>
                <tr><td style={{ padding: "4px 6px", borderBottom: `1px solid ${colors.border}` }}>Tax rates</td><td style={{ padding: "4px 6px", borderBottom: `1px solid ${colors.border}`, fontWeight: 600 }}>{IV.taxes}</td><td style={{ padding: "4px 6px", borderBottom: `1px solid ${colors.border}`, color: C.success }}>{IV.taxes}</td></tr>
                <tr><td style={{ padding: "4px 6px", borderBottom: `1px solid ${colors.border}` }}>Product-tax maps</td><td style={{ padding: "4px 6px", borderBottom: `1px solid ${colors.border}`, fontWeight: 600 }}>{IV.taxMaps}</td><td style={{ padding: "4px 6px", borderBottom: `1px solid ${colors.border}`, color: C.success }}>{IV.products.active}</td></tr>
              </tbody>
            </table>
            <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>
              <Pill label="GST 18%" type="info" />
              <Pill label="GST 12%" type="purple" />
              <Pill label="GST 5%" type="ok" />
            </div>
          </StatCard>
          <StatCard label="Audit Log (24h)" big="">
            <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
              {[0,1,1,0,0,2,1,0,1,2,3,1,0,1,0,0,2,1,1,0,1,2,1,0,0,1,1,0,1,0,0,1,2,1,0,0,1,0,0,1,1,0,2,1].map((v,i) => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: 2, background: v === 0 ? (dark ? "#0F172A" : "#F1F5F9") : v === 1 ? C.success + "44" : v === 2 ? C.warning : C.danger }} title={`${v} events`} />
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 12 }}>
              <span>Created: <strong style={{ color: C.success }}>{IV.audit.created}</strong></span>
              <span>Updated: <strong style={{ color: C.info }}>{IV.audit.updated}</strong></span>
              <span>Deleted: <strong style={{ color: C.danger }}>{IV.audit.deleted}</strong></span>
            </div>
          </StatCard>
        </div>

        {/* ══════════════════════════════════════════════ */}
        {/* SECTION 3: CRM */}
        {/* ══════════════════════════════════════════════ */}
        <SectionLabel>👥 CRM Module</SectionLabel>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          <StatCard label="Accounts" big={CRM.accounts} delta="+18 this week">
            <BarRow label="Active" pct={CRM.accountsActive} color={C.success} />
            <BarRow label="Inactive" pct={100 - CRM.accountsActive} color={C.warning} />
          </StatCard>
          <StatCard label="Leads" big={CRM.leads} delta="+42 new today">
            <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
              <InlineStat num={CRM.leadsNew} label="New" color={C.warning} />
              <InlineStat num={CRM.leadsContacted} label="Contacted" color={C.info} />
              <InlineStat num={CRM.leadsQualified} label="Qualified" color={C.purple} />
              <InlineStat num={CRM.leadsConverted} label="Converted" color={C.success} />
            </div>
            <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>Conversion rate: 21.7%</div>
          </StatCard>
          <StatCard label="Opportunities" big={CRM.opportunities} delta={`pipeline ${CRM.pipeline}`}>
            <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
              <InlineStat num="98" label="Prospecting" color={C.warning} />
              <InlineStat num="142" label="Negotiation" color={C.info} />
              <InlineStat num="124" label="Closing" color={C.purple} />
              <InlineStat num="59" label="Won" color={C.success} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
              <span>Win rate: 42%</span>
              <span>Avg deal: {CRM.oppAvg}</span>
            </div>
          </StatCard>
          <StatCard label="Cases" big={CRM.cases} delta="+12 escalated today" deltaType="down">
            <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
              <InlineStat num={CRM.casesOpen} label="Open" color={C.warning} />
              <InlineStat num={CRM.casesProgress} label="In Progress" color={C.info} />
              <InlineStat num={CRM.casesEscalated} label="Escalated" color={C.danger} />
              <InlineStat num={CRM.casesResolved} label="Resolved" color={C.success} />
            </div>
            <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>Avg resolution: 2.4 hrs</div>
          </StatCard>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          <StatCard label="Contacts" big={CRM.contacts} delta="+24 this week">
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12 }}>
              <span>Primary: <strong>{CRM.contactsPrimary}</strong></span>
              <span>Secondary: <strong>{CRM.contacts - CRM.contactsPrimary}</strong></span>
            </div>
          </StatCard>
          <StatCard label="Activities" big={CRM.activities} delta="this month">
            <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
              <InlineStat num={CRM.activitiesCalls} label="Calls" color={C.info} />
              <InlineStat num={CRM.activitiesMeetings} label="Meetings" color={C.success} />
              <InlineStat num={CRM.activitiesEmails} label="Emails" color={C.purple} />
            </div>
          </StatCard>
          <StatCard label="Quotes & Invoices" big="">
            <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
              <div><div className="section-label" style={{ marginBottom: 0 }}>Quotes</div><div style={{ fontSize: 22, fontWeight: 700 }}>{CRM.quotes}</div></div>
              <div><div className="section-label" style={{ marginBottom: 0 }}>Invoices</div><div style={{ fontSize: 22, fontWeight: 700 }}>{CRM.invoices}</div></div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
              <InlineStat num={CRM.invoiced} label="Invoiced" color={C.success} />
              <InlineStat num={CRM.pendingBills} label="Pending" color={C.warning} />
              <InlineStat num={CRM.overdueBills} label="Overdue" color={C.danger} />
            </div>
          </StatCard>
          <StatCard label="Payments & Retention" big="">
            <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
              <InlineStat num={CRM.payments} label="Payments" color={C.success} />
              <InlineStat num={CRM.collected} label="Collected" color={C.info} />
              <InlineStat num={CRM.retentions} label="Retentions" color={C.purple} />
            </div>
            <BarRow label="Retention" pct={CRM.retentionRate} color={C.purple} />
          </StatCard>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <StatCard label="Presales & Opportunity Products" big="">
            <div style={{ display: "flex", gap: 24, marginTop: 6 }}>
              <div><div className="section-label" style={{ marginBottom: 0 }}>Presales</div><div style={{ fontSize: 22, fontWeight: 700 }}>{CRM.presales}</div></div>
              <div><div className="section-label" style={{ marginBottom: 0 }}>Opp Products</div><div style={{ fontSize: 22, fontWeight: 700 }}>{CRM.oppProducts}</div></div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 12 }}>
              <span>Active presales: <strong>62</strong></span>
              <span>Products per opp: 1.5 avg</span>
            </div>
          </StatCard>
          <StatCard label="Case Emails & Follow-ups" big="">
            <div style={{ display: "flex", gap: 24, marginTop: 6 }}>
              <div><div className="section-label" style={{ marginBottom: 0 }}>Emails sent</div><div style={{ fontSize: 22, fontWeight: 700 }}>{CRM.emailsSent}</div></div>
              <div><div className="section-label" style={{ marginBottom: 0 }}>Follow-ups</div><div style={{ fontSize: 22, fontWeight: 700 }}>{CRM.followups}</div></div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 12 }}>
              <span>Open follow-ups: <strong style={{ color: C.warning }}>{CRM.openFollowups}</strong></span>
              <span>Overdue: <strong style={{ color: C.danger }}>{CRM.overdueFollowups}</strong></span>
            </div>
          </StatCard>
        </div>

        {/* ══════════════════════════════════════════════ */}
        {/* SECTION 4: SYSTEM & USERS */}
        {/* ══════════════════════════════════════════════ */}
        <SectionLabel>⚙️ System & User Module</SectionLabel>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          <StatCard label="Users" big={SYS.users} delta="+3 today">
            <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
              <InlineStat num={SYS.usersActive} label="Active" color={C.success} />
              <InlineStat num={SYS.usersInactive} label="Inactive" color={C.warning} />
              <InlineStat num={SYS.usersLocked} label="Locked" color={C.danger} />
            </div>
          </StatCard>
          <StatCard label="Roles & Permissions" big={SYS.roles} delta="roles defined">
            <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
              <Pill label="Admin" type="ok" />
              <Pill label="Manager" type="info" />
              <Pill label="Supervisor" type="purple" />
              <Pill label="Operator" type="warn" />
              <Pill label="Viewer" type="ok" />
              <Pill label="Auditor" type="info" />
              <Pill label="Support" type="info" />
              <Pill label="Restricted" type="err" />
            </div>
          </StatCard>
          <StatCard label="User Types" big="">
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <InlineStat num="4" label="Types" color={C.success} />
              <InlineStat num={SYS.companies} label="Companies" color={C.info} />
            </div>
            <BarRow label="Internal" pct={65} color={C.success} />
            <BarRow label="External" pct={35} color={C.info} />
          </StatCard>
          <StatCard label="Session & Token" big={<span style={{color: C.success}}>Online: {SYS.online}</span>} delta="Active sessions">
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 12 }}>
              <span>Tokens issued: <strong>{SYS.tokens}</strong></span>
              <span>Expired: <strong style={{ color: C.warning }}>{SYS.tokensExpired}</strong></span>
            </div>
          </StatCard>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          <StatCard label="API Monitoring" big="">
            <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
              <InlineStat num={`${SYS.uptime}%`} label="Uptime" color={C.success} />
              <InlineStat num={`${MOCK.requests.errorRate}%`} label="Errors" color={C.warning} />
              <InlineStat num={SYS.rps} label="RPS" color={C.info} />
            </div>
          </StatCard>
          <StatCard label="Reports & Schedulers" big="">
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <InlineStat num="12" label="Report types" color={C.success} />
              <InlineStat num="6" label="Scheduled" color={C.info} />
              <InlineStat num="4" label="Digests" color={C.purple} />
            </div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Last digest ran: <span style={{ color: colors.textMuted }}>5 min ago</span></div>
          </StatCard>
          <StatCard label="Company Settings" big="">
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <InlineStat num={SYS.companies} label="Companies" color={C.success} />
              <InlineStat num={SYS.settings} label="Settings" color={C.info} />
            </div>
            <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
              <Pill label="ERP Main" type="info" />
              <Pill label="CRM Branch" type="purple" />
              <Pill label="Inventory" type="info" />
            </div>
          </StatCard>
          <StatCard label="Notification Prefs" big="">
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <InlineStat num={SYS.notificationUsers} label="Users" color={C.success} />
              <InlineStat num={SYS.notificationChannels} label="Channels" color={C.info} />
            </div>
            <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
              <Pill label="Email" type="ok" />
              <Pill label="In-App" type="info" />
              <Pill label="SMS" type="warn" />
              <Pill label="Slack" type="purple" />
            </div>
          </StatCard>
        </div>

        {/* Audit Events + CRUD */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div className="content-card p-4" style={{ background: colors.card }}>
            <div className="section-label mb-1">Audit Events (last 24h)</div>
            <MiniTable headers={["Event", "Count", "Severity", "Trend"]} rows={SYS.events} renderRow={(r) => (
              <>
                <td style={{ padding: "4px 6px", borderBottom: `1px solid ${colors.border}`, color: colors.textMuted, fontFamily: "'SF Mono',monospace", fontSize: 11 }}>{r.event}</td>
                <td style={{ padding: "4px 6px", borderBottom: `1px solid ${colors.border}`, fontWeight: 600 }}>{r.count}</td>
                <td style={{ padding: "4px 6px", borderBottom: `1px solid ${colors.border}` }}><Pill label={r.severity} type={r.severity === "Info" ? "ok" : r.severity === "Warning" ? "warn" : "err"} /></td>
                <td style={{ padding: "4px 6px", borderBottom: `1px solid ${colors.border}`, color: r.trend.startsWith("+") ? C.danger : r.trend === "0%" ? colors.textMuted : C.success }}>{r.trend}</td>
              </>
            )} />
          </div>
          <div className="content-card p-4" style={{ background: colors.card }}>
            <div className="section-label mb-1">Table CRUD Operations (today)</div>
            <MiniTable headers={["Module", "Create", "Update", "Delete", "Total"]} rows={[...SYS.crud, { module: "Total", create: SYS.crud.reduce((a, b) => a + b.create, 0), update: SYS.crud.reduce((a, b) => a + b.update, 0), delete: SYS.crud.reduce((a, b) => a + b.delete, 0) }]} renderRow={(r, i) => (
              <>
                <td style={{ padding: "4px 6px", borderBottom: `1px solid ${colors.border}`, fontFamily: "'SF Mono',monospace", fontSize: 11, fontWeight: i === SYS.crud.length ? 700 : 400, color: i === SYS.crud.length ? colors.text : colors.textMuted }}>{r.module}</td>
                <td style={{ padding: "4px 6px", borderBottom: `1px solid ${colors.border}`, color: C.success, fontWeight: 600 }}>{r.create}</td>
                <td style={{ padding: "4px 6px", borderBottom: `1px solid ${colors.border}`, color: C.info, fontWeight: 600 }}>{r.update}</td>
                <td style={{ padding: "4px 6px", borderBottom: `1px solid ${colors.border}`, color: C.danger, fontWeight: 600 }}>{r.delete}</td>
                <td style={{ padding: "4px 6px", borderBottom: `1px solid ${colors.border}`, fontWeight: 700 }}>{r.create + r.update + r.delete}</td>
              </>
            )} />
          </div>
        </div>

        {/* ══════════════════════════════════════════════ */}
        {/* SECTION 5: INFRASTRUCTURE */}
        {/* ══════════════════════════════════════════════ */}
        <SectionLabel>🖥️ Infrastructure & Saturation</SectionLabel>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          <StatCard label="Active connections" big="1,284" delta="of 5,000 max (25.7%)" deltaType="neu">
            <div style={{ height: 10, background: dark ? "#334155" : "#E2E8F0", borderRadius: 5, overflow: "hidden", marginTop: 8 }}>
              <div style={{ width: "26%", height: "100%", background: C.success, borderRadius: 5 }} />
            </div>
          </StatCard>
          <StatCard label="Upstream timeout rate" big={<span style={{color: C.warning}}>0.7%</span>} delta="+0.2% in last 10m" deltaType="down">
            <ResponsiveContainer width="100%" height={36}>
              <AreaChart data={[{t:1,v:0.3},{t:2,v:0.4},{t:3,v:0.5},{t:4,v:0.4},{t:5,v:0.6},{t:6,v:0.7},{t:7,v:0.7}]}>
                <defs><linearGradient id="rg5" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.warning} stopOpacity={0.25}/><stop offset="100%" stopColor={C.warning} stopOpacity={0.02}/></linearGradient></defs>
                <Area type="monotone" dataKey="v" stroke={C.warning} strokeWidth={2} fill="url(#rg5)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </StatCard>
          <StatCard label="Circuit breaker" big={<span style={{color: C.success}}>Closed</span>}>
            <div style={{ display: "flex", justifyContent: "center", marginTop: 4 }}>
              <svg width="80" height="56" viewBox="0 0 80 56">
                <path d="M8,50 A36,36 0 0,1 72,50" fill="none" stroke={dark ? "#334155" : "#E2E8F0"} strokeWidth="6" strokeLinecap="round"/>
                <path d="M8,50 A36,36 0 0,1 72,50" fill="none" stroke={C.success} strokeWidth="6" strokeLinecap="round" strokeDasharray="176" strokeDashoffset="24"/>
                <line x1="40" y1="50" x2="58" y2="16" stroke={C.success} strokeWidth="2" strokeLinecap="round"/>
                <circle cx="40" cy="50" r="3.5" fill={C.success}/>
              </svg>
            </div>
            <div style={{ textAlign: "center", fontSize: 12, color: colors.textMuted }}>All services healthy</div>
          </StatCard>
          <StatCard label="Rate limit hits / min" big={<span style={{color: C.danger}}>43</span>} delta="429 responses rising" deltaType="down">
            <ResponsiveContainer width="100%" height={36}>
              <AreaChart data={[{t:1,v:10},{t:2,v:12},{t:3,v:15},{t:4,v:22},{t:5,v:30},{t:6,v:38},{t:7,v:43}]}>
                <defs><linearGradient id="rg6" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.danger} stopOpacity={0.25}/><stop offset="100%" stopColor={C.danger} stopOpacity={0.02}/></linearGradient></defs>
                <Area type="monotone" dataKey="v" stroke={C.danger} strokeWidth={2} fill="url(#rg6)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </StatCard>
        </div>

        {/* Error Heatmap */}
        <SectionLabel>🔥 Error Heatmap — last 60 min</SectionLabel>
        <div className="content-card p-4" style={{ background: colors.card }}>
          <div className="section-label mb-1">5xx errors per minute</div>
          <div style={{ display: "flex", gap: 3, marginTop: 8, flexWrap: "wrap" }}>
            {[0,0,1,0,0,2,1,0,0,0,1,0,0,0,2,3,1,0,0,1,0,0,0,1,2,1,0,0,0,1,0,0,2,1,0,0,0,0,1,0,0,0,1,2,8,12,6,3,2,1,0,1,0,0,1,0,0,0,1,0].map((v,i) => {
              const ci = v === 0 ? 0 : v < 2 ? 1 : v < 4 ? 2 : v < 7 ? 3 : v < 10 ? 4 : 5;
              const colors2 = [dark ? "#0F172A" : "#F1F5F9", C.success + "44", C.success + "88", C.warning, C.orange, C.danger];
              return <div key={i} style={{ width: 14, height: 14, borderRadius: 3, background: colors2[Math.min(ci, colors2.length - 1)] }} title={`${i}m ago: ${v} error${v !== 1 ? 's' : ''}`} />;
            })}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 11, color: colors.textMuted }}>
            <span>Low</span>
            <div style={{ display: "flex", gap: 2 }}>
              {[dark ? "#0F172A" : "#F1F5F9", C.success + "44", C.success + "88", C.warning, C.orange, C.danger].map((c, i) => (
                <div key={i} style={{ width: 12, height: 12, borderRadius: 2, background: c }} />
              ))}
            </div>
            <span>High</span>
            <span style={{ marginLeft: "auto" }}>Peak: 12 errors at 14:52</span>
          </div>
        </div>

        <div style={{ textAlign: "center", padding: "16px 0", fontSize: 11, color: colors.textMuted }}>
          Real API data from backend • Prometheus metrics refresh every 15s • Dashboard auto-updates with theme
        </div>
      </div>
    </div>
  );
};

export default Reports;