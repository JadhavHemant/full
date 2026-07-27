# Module-Specific Grafana Dashboards

This guide explains how to set up and use the CRM, Inventory, and User/RBAC Grafana dashboards with Prometheus.

## 📊 Dashboards Created

| Dashboard | UID | Description |
|-----------|-----|-------------|
| CRM Module | `crm-dashboard` | Leads, opportunities, pipeline, cases, activities |
| Inventory Module | `inventory-dashboard` | Stock, orders, suppliers, warehouses, expiry |
| User & RBAC | `user-rbac-dashboard` | Users, roles, permissions, login attempts, sessions |

## 🚀 Quick Start

### 1. Start the ERP CRM API Server

```bash
cd ERPCRMServer
node server.js
# Server runs on http://localhost:5351
# Metrics endpoint: http://localhost:5351/metrics
```

### 2. Start Prometheus

```bash
# Download from https://prometheus.io/download/
# Use the prometheus.yml in ERPCRMServer/
prometheus --config.file=prometheus.yml --storage.tsdb.retention.time=30d
# Prometheus runs on http://localhost:9090
```

### 3. Start Grafana

```bash
# Download from https://grafana.com/grafana/download
# Default login: admin / admin
grafana-server
# Grafana runs on http://localhost:3000
```

### 4. Configure Grafana Data Source

1. Open http://localhost:3000
2. Go to **Configuration → Data Sources → Add data source**
3. Select **Prometheus**
4. Set URL to `http://localhost:9090`
5. Click **Save & Test**

### 5. Import Dashboards

#### CRM Dashboard
1. Go to **Dashboards → Import**
2. Upload `grafana/crm-dashboard.json`
3. Select your Prometheus data source
4. Click **Import**

#### Inventory Dashboard
1. Go to **Dashboards → Import**
2. Upload `grafana/inventory-dashboard.json`
3. Select your Prometheus data source
4. Click **Import**

#### User & RBAC Dashboard
1. Go to **Dashboards → Import**
2. Upload `grafana/user-rbac-dashboard.json`
3. Select your Prometheus data source
4. Click **Import**

---

## 📈 CRM Dashboard Metrics

### Overview Panels
| Panel | Metric | Description |
|-------|--------|-------------|
| Total Leads | `crm_records_total{entity="leads"}` | Lead count |
| Total Opportunities | `crm_records_total{entity="opportunities"}` | Opportunity count |
| Total Accounts | `crm_records_total{entity="accounts"}` | Account count |
| Total Contacts | `crm_records_total{entity="contacts"}` | Contact count |
| Open Cases | `crm_records_total{entity="cases"}` | Case count |
| Lead Conversion Rate | `crm_lead_conversion_rate` | Lead to opportunity % |

### Pipeline & Revenue
| Panel | Metric | Description |
|-------|--------|-------------|
| Total Pipeline Value | `sum(crm_pipeline_value)` | Total opportunity budget |
| Pipeline by Stage | `crm_pipeline_value` | Pipeline broken by sales stage |
| Creation Rate | `rate(crm_records_created_total)` | Records created per second |

### Case & Activity Metrics
| Panel | Metric | Description |
|-------|--------|-------------|
| Activity Completion Rate | `crm_activity_completion_rate` | % activities completed |
| Case Resolution Time | `crm_case_resolution_seconds` | Time to resolve by priority |
| Record Count Trend | `crm_records_total` | Historical record counts |

### API Performance
| Panel | Metric | Description |
|-------|--------|-------------|
| CRM API Request Rate | `rate(http_requests_total)` | Requests per second to `/api/crm/*` |
| CRM API Latency | `http_request_duration_seconds` | p95, p99 latency |
| CRM Errors | `http_requests_total{status=~"4..|5.."}` | 4xx and 5xx errors |

---

## 📦 Inventory Dashboard Metrics

### Overview Panels
| Panel | Metric | Description |
|-------|--------|-------------|
| Total Stock Value | `sum(inventory_stock_value)` | Inventory value in INR |
| Total Stock Units | `sum(inventory_stock_units)` | Total units across warehouses |
| Low Stock Count | `sum(inventory_low_stock_count)` | Products below reorder level |
| Out of Stock Count | `sum(inventory_out_of_stock_count)` | Products with 0 stock |
| Expiry Alerts | `inventory_expiry_alerts` | Products expiring in 30 days |
| Total Orders | `sum(inventory_orders_total)` | Order count by type |

### Stock & Warehouse
| Panel | Metric | Description |
|-------|--------|-------------|
| Stock Value by Warehouse | `inventory_stock_value` | Value breakdown |
| Stock Units by Warehouse | `inventory_stock_units` | Unit breakdown |

### Orders
| Panel | Metric | Description |
|-------|--------|-------------|
| Order Creation Rate | `rate(inventory_orders_total)` | New orders per second |
| Order Value | `inventory_order_value` | Value by type/status |

### Alerts & Turnover
| Panel | Metric | Description |
|-------|--------|-------------|
| Low/Out of Stock Trend | `inventory_low_stock_count` | Stock alert trends |
| Stock Turnover | `inventory_stock_turnover_ratio` | Turnover by category |

---

## 👥 User & RBAC Dashboard Metrics

### Overview Panels
| Panel | Metric | Description |
|-------|--------|-------------|
| Active Users | `rbac_users_total{status="active"}` | User count |
| Active Sessions | `rbac_active_sessions` | Current sessions |
| Total Roles | `rbac_roles_total` | Role count |
| Total Permissions | `sum(rbac_permissions_total)` | Permission count |
| Locked Accounts | `rbac_locked_accounts` | Locked user count |
| Audit Logs (24h) | `increase(rbac_audit_logs_total[24h])` | Audit entries |

### Users & Roles
| Panel | Metric | Description |
|-------|--------|-------------|
| Users by Status & Role | `rbac_users_total` | User breakdown |
| Permissions by Module | `rbac_permissions_total` | Permission breakdown |

### Authentication & Sessions
| Panel | Metric | Description |
|-------|--------|-------------|
| Login Attempts | `rate(rbac_login_attempts_total)` | Success/failure rate |
| Password Resets | `rate(rbac_password_resets_total)` | Reset requests |

### Audit & Security
| Panel | Metric | Description |
|-------|--------|-------------|
| Audit Logs by Action | `rate(rbac_audit_logs_total)` | Action breakdown |
| Active Sessions Trend | `rbac_active_sessions` | Session history |

---

## 🔧 Using Module Metrics in Code

The metrics are defined in `ERPCRMServer/middlewares/moduleMetrics.js`. Use them in controllers and services to track business metrics.

### Example: Track CRM Records

```javascript
const moduleMetrics = require('../middlewares/moduleMetrics');

// After creating a lead
moduleMetrics.crmRecordsTotal.set({ entity: 'leads' }, totalLeadsCount);
moduleMetrics.crmRecordsCreatedTotal.inc({ entity: 'leads' });

// Update pipeline value
moduleMetrics.crmPipelineValue.set({ stage: 'Proposal' }, pipelineValue);
```

### Example: Track Inventory

```javascript
const moduleMetrics = require('../middlewares/moduleMetrics');

// After stock update
moduleMetrics.inventoryStockValue.set({ warehouse: 'WH-001' }, stockValue);
moduleMetrics.inventoryStockUnits.set({ warehouse: 'WH-001' }, unitCount);
moduleMetrics.inventoryLowStockCount.set({ warehouse: 'WH-001' }, lowStockCount);
```

### Example: Track RBAC

```javascript
const moduleMetrics = require('../middlewares/moduleMetrics');

// On login attempt
moduleMetrics.rbacLoginAttemptsTotal.inc({ result: 'success' });
moduleMetrics.rbacActiveSessions.set(activeSessionCount);
moduleMetrics.rbacUsersTotal.set({ status: 'active', role: 'Admin' }, userCount);
```

---

## 🎨 Grafana Dashboard Customization

### Change Refresh Interval
1. Open any dashboard
2. Click the **Refresh** dropdown in the top bar
3. Select your preferred interval (e.g., 5s, 10s, 30s)

### Adjust Time Range
1. Use the time picker in the top-right corner
2. Options: Last 5 minutes, Last 1 hour, Last 24 hours, etc.

### Add Variables
1. Go to **Dashboard Settings** (gear icon)
2. Click **Variables** → **Add variable**
3. Configure filters for module, warehouse, entity type, etc.

### Create Alerts
1. Open a panel → **Edit**
2. Go to the **Alert** tab
3. Set conditions (e.g., error rate > 5%)
4. Configure notification channels

---

## 🔍 Troubleshooting

### Metrics Not Showing

1. **Check Prometheus targets:**
   - Go to http://localhost:9090/targets
   - Ensure `erp-api-server` is marked as **UP**

2. **Verify metrics endpoint:**
   - Visit http://localhost:5351/metrics
   - Should see `http_requests_total`, `crm_records_total`, etc.

3. **Restart Prometheus:**
   ```bash
   # Kill existing Prometheus
   taskkill /F /IM prometheus.exe
   
   # Restart
   prometheus --config.file=prometheus.yml --storage.tsdb.retention.time=30d
   ```

### Dashboard Import Fails

1. Ensure you selected the correct Prometheus data source
2. Check that `DS_PROMETHEUS` variable exists in Grafana
3. Try importing with a different UID if UID collision occurs

### No Data in Panels

1. Verify the application is running and emitting metrics
2. Check Prometheus query in **Explore** mode (http://localhost:9090/explore)
3. Ensure metric labels match your data (e.g., `entity="leads"`)

---

## 📚 Related Files

| File | Purpose |
|------|---------|
| `middlewares/prometheusMetrics.js` | Core HTTP metrics (requests, latency, errors) |
| `middlewares/moduleMetrics.js` | Module-specific metrics (CRM, Inventory, RBAC) |
| `grafana/crm-dashboard.json` | CRM Grafana dashboard |
| `grafana/inventory-dashboard.json` | Inventory Grafana dashboard |
| `grafana/user-rbac-dashboard.json` | User/RBAC Grafana dashboard |
| `grafana/erp-api-dashboard.json` | Original ERP API monitoring dashboard |
| `prometheus.yml` | Prometheus scrape configuration |
| `server.js` | Server setup with metrics middleware |

---

## 🚀 Next Steps

1. **Instrument controllers** to emit business metrics:
   - Call `moduleMetrics.crmRecordsTotal.set()` after CRUD operations
   - Update `inventoryStockValue` after stock movements
   - Track `rbacLoginAttemptsTotal` in auth flows

2. **Add alerting rules** in Prometheus:
   - High error rate (>5% 5xx)
   - Low stock alerts
   - Failed login spikes
   - Unusual activity patterns

3. **Create additional dashboards**:
   - Sales analytics
   - Customer lifetime value
   - Supply chain optimization
   - Security & compliance

---

## 📞 Support

For issues or questions, check:
- `ERPCRMServer/README.md` - Server setup
- `ERPCRMServer/grafana/README.md` - Original monitoring setup
- Prometheus docs: https://prometheus.io/docs/
- Grafana docs: https://grafana.com/docs/