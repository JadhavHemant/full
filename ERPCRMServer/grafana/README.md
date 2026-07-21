# ERP API — Grafana + Prometheus Monitoring Setup

## Quick Start

### 1. Start the ERP API Server
```bash
cd ERPCRMServer
node server.js
# Server runs on http://localhost:5351
# Metrics endpoint: http://localhost:5351/metrics
```

### 2. Start Prometheus
```bash
# Download Prometheus from https://prometheus.io/download/
# Copy prometheus.yml to the Prometheus directory (or use the one in ERPCRMServer/)
prometheus --config.file=prometheus.yml --storage.tsdb.retention.time=30d
# Prometheus runs on http://localhost:9090
```

### 3. Start Grafana
```bash
# Download Grafana from https://grafana.com/grafana/download
# Default login: admin / admin
grafana-server
# Grafana runs on http://localhost:3000
```

### 4. Configure Grafana
1. Open http://localhost:3000
2. Go to **Configuration → Data Sources → Add data source**
3. Select **Prometheus**
4. Set URL to `http://localhost:9090`
5. Click **Save & Test**

### 5. Import the Dashboard
1. Go to **Dashboards → Import**
2. Upload `grafana/erp-api-dashboard.json`
3. Select your Prometheus data source
4. Click **Import**

---

## Files

| File | Description |
|------|-------------|
| `grafana/erp-api-dashboard.json` | Grafana dashboard JSON (import directly) |
| `grafana/alerting_rules.yml` | Prometheus alerting rules |
| `middlewares/prometheusMetrics.js` | Express middleware collecting all metrics |
| `prometheus.yml` | Prometheus scrape configuration |

---

## Metrics Collected

| Metric | Type | Description |
|--------|------|-------------|
| `http_requests_total` | Counter | Total HTTP requests (labels: method, route, status) |
| `http_request_duration_seconds` | Histogram | Request duration (buckets: 10ms–10s) |
| `http_requests_in_flight` | Gauge | Currently processing requests |
| `http_request_size_bytes` | Histogram | Request payload size |
| `http_response_size_bytes` | Histogram | Response payload size |
| `circuit_breaker_state` | Gauge | Downstream service health |
| `db_query_duration_seconds` | Histogram | Database query latency |
| `socket_events_total` | Counter | Socket.IO events (label: event) |
| `process_resident_memory_bytes` | Gauge | Node.js RSS memory |
| `nodejs_heap_size_*_bytes` | Gauge | Node.js heap metrics |
| `nodejs_eventloop_lag_seconds` | Gauge | Event loop lag |

---

## Dashboard Panels

### Overview (4 stat panels)
- Total Requests (1h)
- Requests/sec
- Error Rate (5xx)
- p99 Latency

### Request Rate & Latency (2 time-series)
- Requests Per Second by method (GET, POST, PUT, DELETE)
- Latency Percentiles (p50, p90, p95, p99)

### Error Analysis (2 time-series)
- Error Rate Over Time (5xx vs 4xx)
- HTTP Status Code Breakdown (2xx, 3xx, 4xx, 5xx)

### Endpoint Breakdown (2 tables)
- Top 10 Endpoints by Request Volume
- Slowest Endpoints (p99 Latency)

### Infrastructure & Saturation (4 stat + 2 time-series)
- Active Connections (In-Flight)
- p99 Latency by status (5xx, 4xx, 2xx)
- Rate Limit Hits (429)
- Upstream Timeout Rate (504)

### System Metrics (4 time-series)
- Memory Usage (Heap & RSS)
- Event Loop Lag
- DB Query Duration
- Socket.IO Events

### Latency Heatmap (1 heatmap)
- Request Duration Heatmap (all endpoints)

---

## Alerting Rules

| Alert | Condition | Severity |
|-------|-----------|----------|
| HighErrorRate_Warning | 5xx > 1% for 2min | warning |
| HighErrorRate_Critical | 5xx > 5% for 1min | critical |
| HighP99Latency | p99 > 500ms for 3min | warning |
| CriticalP99Latency | p99 > 2s for 2min | critical |
| TrafficDrop | >90% drop vs yesterday | critical |
| TrafficSpike | >2x normal traffic | warning |
| HighInFlightRequests | >50 concurrent | warning |
| HighRateLimitHits | >1 req/s rate-limited | warning |
| UpstreamTimeouts | 504 > 0.1/s for 3min | warning |
| HighMemoryUsage | >512MB for 5min | warning |
| HighEventLoopLag | >100ms for 5min | warning |
| SlowEndpoint | p99 > 5s for 5min | warning |

---

## PromQL Quick Reference

```promql
# Request rate
sum(rate(http_requests_total[5m]))

# Error rate
sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100

# p99 latency
histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))

# Top 10 endpoints
topk(10, sum(rate(http_requests_total[5m])) by (route))

# Slowest endpoints
histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route))

# Rate limit hits
sum(rate(http_requests_total{status="429"}[5m]))

# Memory usage
process_resident_memory_bytes / 1024 / 1024  # in MB