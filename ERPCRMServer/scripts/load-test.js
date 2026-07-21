const path = require("path");
const fs = require("fs");
const { performance } = require("perf_hooks");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const DEFAULT_PORT = process.env.PORT || 5351;

const parseArgs = (argv) => {
  const options = {
    baseUrl: process.env.LOAD_TEST_BASE_URL || `http://localhost:${DEFAULT_PORT}`,
    durationSeconds: Number(process.env.LOAD_TEST_DURATION_SECONDS || 30),
    concurrency: Number(process.env.LOAD_TEST_CONCURRENCY || 10),
    timeoutMs: Number(process.env.LOAD_TEST_TIMEOUT_MS || 10000),
    maxRps: Number(process.env.LOAD_TEST_MAX_RPS || 0),
    method: process.env.LOAD_TEST_METHOD || "GET",
    paths: (process.env.LOAD_TEST_PATHS || "/api/health")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
    email: process.env.LOAD_TEST_EMAIL,
    password: process.env.LOAD_TEST_PASSWORD,
    loginPath: process.env.LOAD_TEST_LOGIN_PATH || "/api/users/login",
    body: process.env.LOAD_TEST_BODY,
    reportDir: process.env.LOAD_TEST_REPORT_DIR || path.join(__dirname, "..", "load-test-reports"),
    reportName: process.env.LOAD_TEST_REPORT_NAME,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const readValue = () => {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${arg} requires a value`);
      }
      index += 1;
      return value;
    };

    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--base-url") {
      options.baseUrl = readValue();
    } else if (arg === "--duration") {
      options.durationSeconds = Number(readValue());
    } else if (arg === "--concurrency") {
      options.concurrency = Number(readValue());
    } else if (arg === "--timeout") {
      options.timeoutMs = Number(readValue());
    } else if (arg === "--max-rps") {
      options.maxRps = Number(readValue());
    } else if (arg === "--method") {
      options.method = readValue().toUpperCase();
    } else if (arg === "--path") {
      options.paths.push(readValue());
    } else if (arg === "--paths") {
      options.paths = readValue()
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
    } else if (arg === "--email") {
      options.email = readValue();
    } else if (arg === "--password") {
      options.password = readValue();
    } else if (arg === "--login-path") {
      options.loginPath = readValue();
    } else if (arg === "--body") {
      options.body = readValue();
    } else if (arg === "--report-dir") {
      options.reportDir = readValue();
    } else if (arg === "--report-name") {
      options.reportName = readValue();
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  options.paths = [...new Set(options.paths)];
  return options;
};

const printHelp = () => {
  console.log(`
Usage:
  npm run load:test -- [options]

Options:
  --base-url <url>       API base URL. Default: http://localhost:${DEFAULT_PORT}
  --duration <seconds>   Test duration. Default: 30
  --concurrency <n>      Parallel workers. Default: 10
  --timeout <ms>         Per-request timeout. Default: 10000
  --max-rps <n>          Maximum total requests per second. Default: unlimited
  --paths <csv>          Comma-separated paths. Default: /api/health
  --path <path>          Add one path. Can be repeated.
  --method <method>      HTTP method. Default: GET
  --body <json>          JSON request body for non-GET endpoints.
  --email <email>        Login email for authenticated endpoints.
  --password <password>  Login password for authenticated endpoints.
  --login-path <path>    Login endpoint. Default: /api/users/login
  --report-dir <dir>     Report output folder. Default: server/load-test-reports
  --report-name <name>   Report file name without extension.

Examples:
  npm run load:test -- --duration 20 --concurrency 25
  npm run load:test -- --paths /api/health,/api/users/profile --email admin@example.com --password "secret"
`);
};

const assertOptions = (options) => {
  if (!Number.isFinite(options.durationSeconds) || options.durationSeconds <= 0) {
    throw new Error("--duration must be a positive number");
  }
  if (!Number.isInteger(options.concurrency) || options.concurrency <= 0) {
    throw new Error("--concurrency must be a positive integer");
  }
  if (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0) {
    throw new Error("--timeout must be a positive number");
  }
  if (!Number.isFinite(options.maxRps) || options.maxRps < 0) {
    throw new Error("--max-rps must be zero or a positive number");
  }
  if (!options.paths.length) {
    throw new Error("At least one path is required");
  }
  if (options.body) {
    JSON.parse(options.body);
  }
};

const buildUrl = (baseUrl, requestPath) => {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const normalizedPath = requestPath.startsWith("/") ? requestPath : `/${requestPath}`;
  return `${normalizedBase}${normalizedPath}`;
};

const fetchWithTimeout = async (url, options, timeoutMs) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const login = async (options) => {
  if (!options.email && !options.password) {
    return null;
  }
  if (!options.email || !options.password) {
    throw new Error("Both --email and --password are required for authenticated load tests");
  }

  const response = await fetchWithTimeout(
    buildUrl(options.baseUrl, options.loginPath),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: options.email, password: options.password }),
    },
    options.timeoutMs
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.accessToken) {
    throw new Error(`Login failed with status ${response.status}: ${payload.message || "missing accessToken"}`);
  }

  return payload.accessToken;
};

const percentile = (sortedValues, percent) => {
  if (!sortedValues.length) return 0;
  const index = Math.ceil((percent / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
};

const summarize = ({ metrics, startedAt, endedAt }) => {
  const latencies = [...metrics.latencies].sort((a, b) => a - b);
  const total = metrics.completed;
  const elapsedSeconds = (endedAt - startedAt) / 1000;
  const avg = total ? metrics.totalLatencyMs / total : 0;
  const failed = metrics.errors + metrics.nonSuccess;

  return {
    elapsedSeconds,
    total,
    failed,
    requestsPerSecond: elapsedSeconds > 0 ? total / elapsedSeconds : 0,
    min: latencies[0] || 0,
    avg,
    p50: percentile(latencies, 50),
    p90: percentile(latencies, 90),
    p95: percentile(latencies, 95),
    p99: percentile(latencies, 99),
    max: latencies[latencies.length - 1] || 0,
  };
};

const formatMs = (value) => `${value.toFixed(1)} ms`;

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const toObject = (map) =>
  [...map.entries()]
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
    .reduce((result, [key, value]) => {
      result[key] = value;
      return result;
    }, {});

const emptyEndpointMetrics = () => ({
  completed: 0,
  errors: 0,
  nonSuccess: 0,
  totalLatencyMs: 0,
  latencies: [],
  statuses: new Map(),
  errorSamples: [],
});

const getApiName = (requestPath) => {
  const cleanPath = requestPath.split("?")[0];
  const knownNames = [
    ["/api/health", "Health Check"],
    ["/api/users/profile", "User Profile"],
    ["/api/users/getall/profiles", "User Profiles"],
    ["/api/teams-chat/users", "Teams Chat Users"],
    ["/api/teams-chat/teams", "Teams Chat Teams"],
    ["/api/chat-workspace/users", "Chat Workspace Users"],
    ["/api/chat-workspace/teams", "Chat Workspace Teams"],
    ["/api/crm/accounts", "CRM Accounts"],
    ["/api/crm/contacts", "CRM Contacts"],
    ["/api/crm/leads", "CRM Leads"],
    ["/api/crm/opportunities", "CRM Opportunities"],
    ["/api/crm/activities", "CRM Activities"],
    ["/api/crm/cases", "CRM Cases"],
    ["/api/products/list", "Products List"],
    ["/api/products/active", "Active Products"],
    ["/api/products/reports/stats", "Product Stats"],
    ["/api/warehouses", "Warehouses"],
    ["/api/customers", "Customers"],
    ["/api/suppliers", "Suppliers"],
    ["/api/sales-orders", "Sales Orders"],
    ["/api/purchase-orders", "Purchase Orders"],
  ];

  const match = knownNames.find(([prefix]) => cleanPath === prefix || cleanPath.startsWith(`${prefix}/`));
  if (match) return match[1];

  return cleanPath
    .replace(/^\/api\//, "")
    .split("/")
    .filter(Boolean)
    .map((part) =>
      part
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    )
    .join(" / ");
};

const getFailureReason = ({ statuses, errorSamples }) => {
  if (errorSamples.length) return errorSamples[0];
  const statusCodes = Object.keys(statuses).map(Number);
  if (statusCodes.includes(429)) return "Rate limited by backend";
  if (statusCodes.includes(401)) return "Authentication failed or token expired";
  if (statusCodes.includes(403)) return "Access denied";
  if (statusCodes.includes(404)) return "Endpoint not found";
  if (statusCodes.some((status) => status >= 500)) return "Server error";
  if (statusCodes.some((status) => status >= 400)) return "Client request error";
  return "";
};

const summarizeEndpoint = ({ endpointMetrics, elapsedSeconds }) => {
  const latencies = [...endpointMetrics.latencies].sort((a, b) => a - b);
  const total = endpointMetrics.completed;
  const failed = endpointMetrics.errors + endpointMetrics.nonSuccess;

  return {
    requests: total,
    failed,
    success: total - failed,
    errorRatePercent: total ? (failed / total) * 100 : 0,
    requestsPerSecond: elapsedSeconds > 0 ? total / elapsedSeconds : 0,
    min: latencies[0] || 0,
    avg: total ? endpointMetrics.totalLatencyMs / total : 0,
    p50: percentile(latencies, 50),
    p90: percentile(latencies, 90),
    p95: percentile(latencies, 95),
    p99: percentile(latencies, 99),
    max: latencies[latencies.length - 1] || 0,
    statuses: toObject(endpointMetrics.statuses),
    errorSamples: endpointMetrics.errorSamples,
  };
};

const createReportName = (options) => {
  if (options.reportName) {
    return options.reportName.replace(/[^a-zA-Z0-9._-]/g, "-");
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `load-test-${timestamp}`;
};

const buildReport = ({ options, summary, metrics, startedAtIso, endedAtIso }) => {
  const elapsedSeconds = summary.elapsedSeconds;
  const endpoints = [...metrics.byPath.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([requestPath, endpointMetrics]) => ({
      name: getApiName(requestPath),
      method: options.method,
      path: requestPath,
      url: buildUrl(options.baseUrl, requestPath),
      ...summarizeEndpoint({ endpointMetrics, elapsedSeconds }),
    }))
    .map((endpoint) => ({
      ...endpoint,
      failureReason: endpoint.failed
        ? getFailureReason({ statuses: endpoint.statuses, errorSamples: endpoint.errorSamples })
        : "",
    }));

  return {
    generatedAt: endedAtIso,
    startedAt: startedAtIso,
    endedAt: endedAtIso,
    config: {
      baseUrl: options.baseUrl,
      method: options.method,
      durationSeconds: options.durationSeconds,
      concurrency: options.concurrency,
      timeoutMs: options.timeoutMs,
      maxRps: options.maxRps,
      paths: options.paths,
      authenticated: Boolean(options.email),
    },
    summary: {
      requests: summary.total,
      failed: summary.failed,
      success: summary.total - summary.failed,
      errorRatePercent: summary.total ? (summary.failed / summary.total) * 100 : 0,
      requestsPerSecond: summary.requestsPerSecond,
      latencyMs: {
        min: summary.min,
        avg: summary.avg,
        p50: summary.p50,
        p90: summary.p90,
        p95: summary.p95,
        p99: summary.p99,
        max: summary.max,
      },
      statuses: toObject(metrics.statuses),
      errorSamples: metrics.errorSamples,
    },
    endpoints,
  };
};

const formatNumber = (value, digits = 2) => Number(value || 0).toFixed(digits);

const renderStatusBadges = (statuses) => {
  const entries = Object.entries(statuses);
  if (!entries.length) return "<span class=\"muted\">none</span>";

  return entries
    .map(([status, count]) => {
      const statusNumber = Number(status);
      const tone = statusNumber >= 500 ? "danger" : statusNumber >= 400 ? "warn" : "ok";
      return `<span class="badge ${tone}">${escapeHtml(status)}: ${escapeHtml(count)}</span>`;
    })
    .join(" ");
};

const renderHtmlReport = (report) => {
  const failedEndpoints = report.endpoints.filter((endpoint) => endpoint.failed > 0);
  const failedRows = failedEndpoints
    .map(
      (endpoint) => `
        <tr>
          <td><strong>${escapeHtml(endpoint.name)}</strong></td>
          <td><strong>${escapeHtml(endpoint.method)}</strong> <span class="path">${escapeHtml(endpoint.path)}</span></td>
          <td class="danger-text">${endpoint.failed}</td>
          <td>${formatNumber(endpoint.errorRatePercent)}%</td>
          <td>${renderStatusBadges(endpoint.statuses)}</td>
          <td>${escapeHtml(endpoint.failureReason)}</td>
        </tr>`
    )
    .join("");

  const rows = report.endpoints
    .map(
      (endpoint) => `
        <tr class="${endpoint.failed ? "failed-row" : ""}">
          <td><strong>${escapeHtml(endpoint.name)}</strong></td>
          <td><strong>${escapeHtml(endpoint.method)}</strong></td>
          <td class="path">${escapeHtml(endpoint.path)}</td>
          <td>${endpoint.requests}</td>
          <td>${endpoint.success}</td>
          <td class="${endpoint.failed ? "danger-text" : ""}">${endpoint.failed}</td>
          <td>${formatNumber(endpoint.errorRatePercent)}%</td>
          <td>${formatNumber(endpoint.requestsPerSecond)}</td>
          <td>${formatNumber(endpoint.avg, 1)}</td>
          <td>${formatNumber(endpoint.p50, 1)}</td>
          <td>${formatNumber(endpoint.p90, 1)}</td>
          <td>${formatNumber(endpoint.p95, 1)}</td>
          <td>${formatNumber(endpoint.p99, 1)}</td>
          <td>${formatNumber(endpoint.max, 1)}</td>
          <td>${renderStatusBadges(endpoint.statuses)}</td>
          <td>${escapeHtml(endpoint.failureReason || "-")}</td>
        </tr>`
    )
    .join("");

  const errors = report.endpoints
    .filter((endpoint) => endpoint.errorSamples.length)
    .map(
      (endpoint) => `
        <section class="panel">
          <h2>${escapeHtml(endpoint.method)} ${escapeHtml(endpoint.path)}</h2>
          <ul>${endpoint.errorSamples.map((sample) => `<li>${escapeHtml(sample)}</li>`).join("")}</ul>
        </section>`
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Load Test Report</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f6f7f9;
      --panel: #ffffff;
      --text: #18212f;
      --muted: #657184;
      --border: #d9dee7;
      --accent: #176b87;
      --ok: #137a43;
      --warn: #9a5a00;
      --danger: #b42318;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Arial, Helvetica, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.45;
    }
    header {
      padding: 28px 32px 18px;
      background: #ffffff;
      border-bottom: 1px solid var(--border);
    }
    h1 { margin: 0 0 8px; font-size: 28px; letter-spacing: 0; }
    h2 { margin: 0 0 14px; font-size: 18px; letter-spacing: 0; }
    main { padding: 24px 32px 40px; }
    .muted { color: var(--muted); }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin-bottom: 18px;
    }
    .metric, .panel {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
    }
    .metric span {
      display: block;
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0;
      margin-bottom: 6px;
    }
    .metric strong { font-size: 24px; }
    .panel { margin-top: 18px; overflow: auto; }
    table {
      width: 100%;
      min-width: 1100px;
      border-collapse: collapse;
      font-size: 14px;
    }
    th, td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--border);
      text-align: left;
      vertical-align: top;
      white-space: nowrap;
    }
    th {
      position: sticky;
      top: 0;
      background: #eef2f6;
      color: #344054;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0;
    }
    .path {
      max-width: 360px;
      white-space: normal;
      overflow-wrap: anywhere;
      font-family: Consolas, Monaco, monospace;
    }
    .badge {
      display: inline-block;
      border-radius: 999px;
      padding: 3px 8px;
      margin: 0 4px 4px 0;
      font-size: 12px;
      border: 1px solid var(--border);
      background: #f8fafc;
    }
    .badge.ok { color: var(--ok); border-color: #b8dec7; background: #eefbf3; }
    .badge.warn { color: var(--warn); border-color: #f1cf8a; background: #fff8e8; }
    .badge.danger { color: var(--danger); border-color: #f2b8b5; background: #fff1f0; }
    .danger-text { color: var(--danger); font-weight: 700; }
    .failed-row { background: #fff8f7; }
    .empty-state {
      color: var(--ok);
      font-weight: 700;
      padding: 12px 0 2px;
    }
    code {
      background: #eef2f6;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 2px 6px;
    }
    @media (max-width: 720px) {
      header, main { padding-left: 16px; padding-right: 16px; }
      h1 { font-size: 24px; }
    }
  </style>
</head>
<body>
  <header>
    <h1>Load Test Report</h1>
    <div class="muted">${escapeHtml(report.startedAt)} to ${escapeHtml(report.endedAt)}</div>
    <div class="muted">Base URL: <code>${escapeHtml(report.config.baseUrl)}</code></div>
  </header>
  <main>
    <section class="grid">
      <div class="metric"><span>Total Requests</span><strong>${report.summary.requests}</strong></div>
      <div class="metric"><span>Success</span><strong>${report.summary.success}</strong></div>
      <div class="metric"><span>Failed</span><strong>${report.summary.failed}</strong></div>
      <div class="metric"><span>Throughput</span><strong>${formatNumber(report.summary.requestsPerSecond)} req/s</strong></div>
      <div class="metric"><span>Average Latency</span><strong>${formatNumber(report.summary.latencyMs.avg, 1)} ms</strong></div>
      <div class="metric"><span>P95 Latency</span><strong>${formatNumber(report.summary.latencyMs.p95, 1)} ms</strong></div>
    </section>

    <section class="panel">
      <h2>Run Configuration</h2>
      <div>Duration: <strong>${report.config.durationSeconds}s</strong> | Concurrency: <strong>${report.config.concurrency}</strong> | Timeout: <strong>${report.config.timeoutMs}ms</strong> | Max RPS: <strong>${report.config.maxRps || "unlimited"}</strong> | Authenticated: <strong>${report.config.authenticated ? "yes" : "no"}</strong></div>
      <div style="margin-top: 8px;">Overall statuses: ${renderStatusBadges(report.summary.statuses)}</div>
    </section>

    <section class="panel">
      <h2>Failed APIs</h2>
      ${
        failedRows
          ? `<table>
              <thead>
                <tr>
                  <th>API Name</th>
                  <th>Endpoint</th>
                  <th>Failed</th>
                  <th>Error Rate</th>
                  <th>Status Codes</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>${failedRows}</tbody>
            </table>`
          : `<div class="empty-state">No failed APIs in this run.</div>`
      }
    </section>

    <section class="panel">
      <h2>API Wise Results</h2>
      <table>
        <thead>
          <tr>
            <th>API Name</th>
            <th>Method</th>
            <th>API</th>
            <th>Requests</th>
            <th>Success</th>
            <th>Failed</th>
            <th>Error Rate</th>
            <th>Req/S</th>
            <th>Avg ms</th>
            <th>P50</th>
            <th>P90</th>
            <th>P95</th>
            <th>P99</th>
            <th>Max</th>
            <th>Status Codes</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>

    ${errors || ""}
  </main>
</body>
</html>`;
};

const writeReports = ({ options, report }) => {
  fs.mkdirSync(options.reportDir, { recursive: true });
  const reportName = createReportName(options);
  const htmlPath = path.join(options.reportDir, `${reportName}.html`);
  const jsonPath = path.join(options.reportDir, `${reportName}.json`);

  fs.writeFileSync(htmlPath, renderHtmlReport(report));
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  return { htmlPath, jsonPath };
};

const run = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  assertOptions(options);

  const accessToken = await login(options);
  const headers = {
    Accept: "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
  const body = options.body ? JSON.stringify(JSON.parse(options.body)) : undefined;
  if (body) {
    headers["Content-Type"] = "application/json";
  }

  const metrics = {
    completed: 0,
    errors: 0,
    nonSuccess: 0,
    totalLatencyMs: 0,
    latencies: [],
    statuses: new Map(),
    errorSamples: [],
    byPath: new Map(options.paths.map((requestPath) => [requestPath, emptyEndpointMetrics()])),
  };

  const startedAt = performance.now();
  const startedAtIso = new Date().toISOString();
  const deadline = startedAt + options.durationSeconds * 1000;
  let nextPathIndex = 0;
  let nextAllowedRequestAt = startedAt;

  console.log(
    `Load test: ${options.method} ${options.paths.join(", ")} | base=${options.baseUrl} | duration=${options.durationSeconds}s | concurrency=${options.concurrency}`
  );

  const worker = async () => {
    while (performance.now() < deadline) {
      const pathIndex = nextPathIndex;
      nextPathIndex = (nextPathIndex + 1) % options.paths.length;
      const requestPath = options.paths[pathIndex];
      const endpointMetrics = metrics.byPath.get(requestPath);

      if (options.maxRps > 0) {
        const intervalMs = 1000 / options.maxRps;
        const now = performance.now();
        const waitMs = Math.max(0, nextAllowedRequestAt - now);
        nextAllowedRequestAt = Math.max(now, nextAllowedRequestAt) + intervalMs;
        if (waitMs > 0) {
          await sleep(waitMs);
        }
      }

      const requestStartedAt = performance.now();

      try {
        const response = await fetchWithTimeout(
          buildUrl(options.baseUrl, requestPath),
          {
            method: options.method,
            headers,
            ...(body && options.method !== "GET" ? { body } : {}),
          },
          options.timeoutMs
        );

        const latency = performance.now() - requestStartedAt;
        metrics.completed += 1;
        metrics.totalLatencyMs += latency;
        metrics.latencies.push(latency);
        metrics.statuses.set(response.status, (metrics.statuses.get(response.status) || 0) + 1);
        endpointMetrics.completed += 1;
        endpointMetrics.totalLatencyMs += latency;
        endpointMetrics.latencies.push(latency);
        endpointMetrics.statuses.set(
          response.status,
          (endpointMetrics.statuses.get(response.status) || 0) + 1
        );

        const isFailedStatus = response.status < 200 || response.status >= 400;
        let responseText = "";

        if (isFailedStatus) {
          metrics.nonSuccess += 1;
          endpointMetrics.nonSuccess += 1;
          responseText = await response.text().catch(() => "");
          const trimmedText = responseText.replace(/\s+/g, " ").trim();
          const sample = `${response.status} ${response.statusText}${trimmedText ? `: ${trimmedText.slice(0, 180)}` : ""}`;
          if (metrics.errorSamples.length < 5) {
            metrics.errorSamples.push(`${requestPath} - ${sample}`);
          }
          if (endpointMetrics.errorSamples.length < 5) {
            endpointMetrics.errorSamples.push(sample);
          }
        }

        if (!isFailedStatus) {
          await response.arrayBuffer().catch(() => {});
        }
      } catch (error) {
        const latency = performance.now() - requestStartedAt;
        metrics.completed += 1;
        metrics.errors += 1;
        metrics.totalLatencyMs += latency;
        metrics.latencies.push(latency);
        endpointMetrics.completed += 1;
        endpointMetrics.errors += 1;
        endpointMetrics.totalLatencyMs += latency;
        endpointMetrics.latencies.push(latency);
        if (metrics.errorSamples.length < 5) {
          metrics.errorSamples.push(error.name === "AbortError" ? "request timeout" : error.message);
        }
        if (endpointMetrics.errorSamples.length < 5) {
          endpointMetrics.errorSamples.push(error.name === "AbortError" ? "request timeout" : error.message);
        }
      }
    }
  };

  await Promise.all(Array.from({ length: options.concurrency }, () => worker()));
  const endedAt = performance.now();
  const endedAtIso = new Date().toISOString();
  const summary = summarize({ metrics, startedAt, endedAt });
  const report = buildReport({ options, summary, metrics, startedAtIso, endedAtIso });
  const reportPaths = writeReports({ options, report });

  console.log("\nResults");
  console.log(`  Requests: ${summary.total}`);
  console.log(`  Failed: ${summary.failed}`);
  console.log(`  Throughput: ${summary.requestsPerSecond.toFixed(2)} req/s`);
  console.log(`  Latency min/avg/p50/p90/p95/p99/max: ${[
    summary.min,
    summary.avg,
    summary.p50,
    summary.p90,
    summary.p95,
    summary.p99,
    summary.max,
  ]
    .map(formatMs)
    .join(" / ")}`);
  console.log(
    `  Statuses: ${[...metrics.statuses.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([status, count]) => `${status}=${count}`)
      .join(", ") || "none"}`
  );

  if (metrics.errorSamples.length) {
    console.log(`  Error samples: ${metrics.errorSamples.join(" | ")}`);
  }

  console.log(`  HTML report: ${reportPaths.htmlPath}`);
  console.log(`  JSON report: ${reportPaths.jsonPath}`);

  if (summary.failed > 0) {
    process.exitCode = 1;
  }
};

run().catch((error) => {
  console.error(`Load test failed: ${error.message}`);
  process.exitCode = 1;
});
