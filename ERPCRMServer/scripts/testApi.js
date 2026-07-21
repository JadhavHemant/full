const http = require("http");

const BASE = "http://localhost:5351";
let AUTH_TOKEN = "";

const request = (method, path, body = null, token = "") =>
  new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const options = { hostname: url.hostname, port: url.port, path: url.pathname, method, headers };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data: data.substring(0, 500) });
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });

const test = async (name, fn) => {
  try {
    const result = await fn();
    const ok = result.status >= 200 && result.status < 300;
    const icon = ok ? "✅" : "⚠️";
    const detail = typeof result.data === "object" ? JSON.stringify(result.data).substring(0, 200) : String(result.data).substring(0, 200);
    console.log(`${icon} [${result.status}] ${name}`);
    if (!ok) console.log(`   Detail: ${detail}`);
    return result;
  } catch (err) {
    console.log(`❌ FAIL: ${name} — ${err.message}`);
    return null;
  }
};

const run = async () => {
  console.log("═══════════════════════════════════════════════");
  console.log("  ERP API — Full Test Suite");
  console.log("═══════════════════════════════════════════════\n");

  // ── 1. Health & Metrics ──
  console.log("── 1. Health & Metrics ──");
  await test("GET /api/health", () => request("GET", "/api/health"));

  const metricsRes = await test("GET /metrics", () => request("GET", "/metrics"));
  if (metricsRes && metricsRes.data && typeof metricsRes.data === "string") {
    const hasHttpMetrics = metricsRes.data.includes("http_requests_total");
    const hasHistogram = metricsRes.data.includes("http_request_duration_seconds");
    const hasInFlight = metricsRes.data.includes("http_requests_in_flight");
    const hasDbMetrics = metricsRes.data.includes("db_query_duration_seconds");
    const hasSocketMetrics = metricsRes.data.includes("socket_events_total");
    console.log(`   Metrics: http_requests_total=${hasHttpMetrics} duration=${hasHistogram} inFlight=${hasInFlight} db=${hasDbMetrics} socket=${hasSocketMetrics}`);
  }

  // ── 2. Authentication ──
  console.log("\n── 2. Authentication ──");
  const loginRes = await test("POST /api/users/login (Rahul - Owner)", () =>
    request("POST", "/api/users/login", { email: "rahul.sharma@example.com", password: "Admin@123" })
  );
  if (loginRes && loginRes.data && loginRes.data.accessToken) {
    AUTH_TOKEN = loginRes.data.accessToken;
    console.log(`   Token received: ${AUTH_TOKEN.substring(0, 30)}...`);
  }

  await test("POST /api/users/login (wrong password)", () =>
    request("POST", "/api/users/login", { email: "rahul.sharma@example.com", password: "wrong" })
  );

  // ── 3. User APIs ──
  console.log("\n── 3. User APIs ──");
  await test("GET /api/users (list users)", () => request("GET", "/api/users", null, AUTH_TOKEN));
  await test("GET /api/roles", () => request("GET", "/api/roles", null, AUTH_TOKEN));
  await test("GET /api/usertypes", () => request("GET", "/api/usertypes", null, AUTH_TOKEN));

  // ── 4. Company APIs ──
  console.log("\n── 4. Company APIs ──");
  await test("GET /api/company", () => request("GET", "/api/company", null, AUTH_TOKEN));

  // ── 5. Dashboard API ──
  console.log("\n── 5. Dashboard API ──");
  const dashRes = await test("GET /api/dashboard", () => request("GET", "/api/dashboard", null, AUTH_TOKEN));
  if (dashRes && dashRes.data && dashRes.data.data) {
    const d = dashRes.data.data;
    console.log(`   Stock Value: ${d.totalStockValue}, Products: ${d.totalProducts}, Suppliers: ${d.totalSuppliers}, Customers: ${d.totalCustomers}`);
  }

  // ── 6. Product Management ──
  console.log("\n── 6. Product Management ──");
  await test("GET /api/products", () => request("GET", "/api/products", null, AUTH_TOKEN));
  await test("GET /api/productcategory", () => request("GET", "/api/productcategory", null, AUTH_TOKEN));
  await test("GET /api/brands", () => request("GET", "/api/brands", null, AUTH_TOKEN));
  await test("GET /api/units", () => request("GET", "/api/units", null, AUTH_TOKEN));
  await test("GET /api/taxes", () => request("GET", "/api/taxes", null, AUTH_TOKEN));

  // ── 7. Warehouse & Inventory ──
  console.log("\n── 7. Warehouse & Inventory ──");
  await test("GET /api/warehouses", () => request("GET", "/api/warehouses", null, AUTH_TOKEN));
  await test("GET /api/product-stock", () => request("GET", "/api/product-stock", null, AUTH_TOKEN));
  await test("GET /api/stock-movements", () => request("GET", "/api/stock-movements", null, AUTH_TOKEN));
  await test("GET /api/stock-transfers", () => request("GET", "/api/stock-transfers", null, AUTH_TOKEN));
  await test("GET /api/stock-adjustments", () => request("GET", "/api/stock-adjustments", null, AUTH_TOKEN));

  // ── 8. Purchase Management ──
  console.log("\n── 8. Purchase Management ──");
  await test("GET /api/suppliers", () => request("GET", "/api/suppliers", null, AUTH_TOKEN));
  await test("GET /api/purchase-orders", () => request("GET", "/api/purchase-orders", null, AUTH_TOKEN));
  await test("GET /api/grn", () => request("GET", "/api/grn", null, AUTH_TOKEN));
  await test("GET /api/batches", () => request("GET", "/api/batches", null, AUTH_TOKEN));

  // ── 9. Sales Management ──
  console.log("\n── 9. Sales Management ──");
  await test("GET /api/customers", () => request("GET", "/api/customers", null, AUTH_TOKEN));
  await test("GET /api/sales-orders", () => request("GET", "/api/sales-orders", null, AUTH_TOKEN));
  await test("GET /api/profit-loss-reports", () => request("GET", "/api/profit-loss-reports", null, AUTH_TOKEN));

  // ── 10. ERP Module APIs ──
  console.log("\n── 10. ERP Module APIs ──");
  await test("GET /api/erp/employees", () => request("GET", "/api/erp/employees", null, AUTH_TOKEN));
  await test("GET /api/erp/departments", () => request("GET", "/api/erp/departments", null, AUTH_TOKEN));
  await test("GET /api/erp/designations", () => request("GET", "/api/erp/designations", null, AUTH_TOKEN));
  await test("GET /api/erp/purchase-requisitions", () => request("GET", "/api/erp/purchase-requisitions", null, AUTH_TOKEN));
  await test("GET /api/erp/purchase-returns", () => request("GET", "/api/erp/purchase-returns", null, AUTH_TOKEN));
  await test("GET /api/erp/sales-quotations", () => request("GET", "/api/erp/sales-quotations", null, AUTH_TOKEN));
  await test("GET /api/erp/delivery-challans", () => request("GET", "/api/erp/delivery-challans", null, AUTH_TOKEN));
  await test("GET /api/erp/sales-returns", () => request("GET", "/api/erp/sales-returns", null, AUTH_TOKEN));
  await test("GET /api/erp/bom", () => request("GET", "/api/erp/bom", null, AUTH_TOKEN));
  await test("GET /api/erp/production-orders", () => request("GET", "/api/erp/production-orders", null, AUTH_TOKEN));
  await test("GET /api/erp/notifications", () => request("GET", "/api/erp/notifications", null, AUTH_TOKEN));
  await test("GET /api/erp/approvals", () => request("GET", "/api/erp/approvals", null, AUTH_TOKEN));
  await test("GET /api/erp/expenses", () => request("GET", "/api/erp/expenses", null, AUTH_TOKEN));
  await test("GET /api/erp/racks", () => request("GET", "/api/erp/racks", null, AUTH_TOKEN));
  await test("GET /api/erp/bins", () => request("GET", "/api/erp/bins", null, AUTH_TOKEN));

  // ── 11. CRM APIs ──
  console.log("\n── 11. CRM APIs ──");
  await test("GET /api/crm/accounts", () => request("GET", "/api/crm/accounts", null, AUTH_TOKEN));
  await test("GET /api/crm/contacts", () => request("GET", "/api/crm/contacts", null, AUTH_TOKEN));
  await test("GET /api/crm/leads", () => request("GET", "/api/crm/leads", null, AUTH_TOKEN));
  await test("GET /api/crm/opportunities", () => request("GET", "/api/crm/opportunities", null, AUTH_TOKEN));
  await test("GET /api/crm/activities", () => request("GET", "/api/crm/activities", null, AUTH_TOKEN));
  await test("GET /api/crm/quotes", () => request("GET", "/api/crm/quotes", null, AUTH_TOKEN));
  await test("GET /api/crm/invoices", () => request("GET", "/api/crm/invoices", null, AUTH_TOKEN));
  await test("GET /api/crm/payments", () => request("GET", "/api/crm/payments", null, AUTH_TOKEN));
  await test("GET /api/crm/cases", () => request("GET", "/api/crm/cases", null, AUTH_TOKEN));
  await test("GET /api/crm/presales", () => request("GET", "/api/crm/presales", null, AUTH_TOKEN));
  await test("GET /api/crm/task-types", () => request("GET", "/api/crm/task-types", null, AUTH_TOKEN));
  await test("GET /api/crm/sales-stages", () => request("GET", "/api/crm/sales-stages", null, AUTH_TOKEN));
  await test("GET /api/crm/industries", () => request("GET", "/api/crm/industries", null, AUTH_TOKEN));
  await test("GET /api/crm/lead-sources", () => request("GET", "/api/crm/lead-sources", null, AUTH_TOKEN));
  await test("GET /api/crm/followup-types", () => request("GET", "/api/crm/followup-types", null, AUTH_TOKEN));

  // ── 12. System APIs ──
  console.log("\n── 12. System APIs ──");
  await test("GET /api/reports/overview", () => request("GET", "/api/reports/overview", null, AUTH_TOKEN));
  await test("GET /api/system/company-settings", () => request("GET", "/api/system/company-settings", null, AUTH_TOKEN));
  await test("GET /api/system/notification-preferences", () => request("GET", "/api/system/notification-preferences", null, AUTH_TOKEN));
  await test("GET /api/system/audit-events", () => request("GET", "/api/system/audit-events", null, AUTH_TOKEN));

  // ── 13. Audit Logs ──
  console.log("\n── 13. Audit & Monitoring ──");
  await test("GET /api/audit-logs", () => request("GET", "/api/audit-logs", null, AUTH_TOKEN));
  await test("GET /api/monitoring", () => request("GET", "/api/monitoring", null, AUTH_TOKEN));

  // ── 14. Test CREATE operations ──
  console.log("\n── 14. Create Operations ──");
  await test("POST /api/brands (create brand)", () =>
    request("POST", "/api/brands", { Name: "TestBrand", CompanyId: 3 }, AUTH_TOKEN)
  );
  await test("POST /api/units (create unit)", () =>
    request("POST", "/api/units", { UnitName: "TestPcs", CompanyId: 3 }, AUTH_TOKEN)
  );

  console.log("\n═══════════════════════════════════════════════");
  console.log("  TEST SUITE COMPLETE");
  console.log("═══════════════════════════════════════════════");
};

run().catch(console.error);