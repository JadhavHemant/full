const client = require('prom-client');
const express = require('express');

// Create a Registry to hold all metrics
const register = new client.Registry();

// Set default labels (app name)
register.setDefaultLabels({
  app: 'erp-api-server',
});

// Enable collection of default metrics (CPU, memory, Node.js event loop, etc.)
client.collectDefaultMetrics({ register });

// ── Core API Metrics ──────────────────────────────────────────────

// Counter: Total HTTP requests, labelled by method, route, status
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

// Histogram: Request duration in seconds, with configurable buckets
const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers: [register],
});

// Gauge: Number of requests currently in-flight
const httpRequestsInFlight = new client.Gauge({
  name: 'http_requests_in_flight',
  help: 'Number of HTTP requests currently being processed',
  registers: [register],
});

// Histogram: Request size in bytes
const httpRequestSizeBytes = new client.Histogram({
  name: 'http_request_size_bytes',
  help: 'HTTP request size in bytes',
  labelNames: ['method', 'route'],
  buckets: [100, 1000, 5000, 10000, 50000, 100000, 500000, 1000000],
  registers: [register],
});

// Histogram: Response size in bytes
const httpResponseSizeBytes = new client.Histogram({
  name: 'http_response_size_bytes',
  help: 'HTTP response size in bytes',
  labelNames: ['method', 'route', 'status'],
  buckets: [100, 1000, 5000, 10000, 50000, 100000, 500000, 1000000],
  registers: [register],
});

// Gauge: Circuit breaker state per downstream service (0=closed, 1=open)
const circuitBreakerState = new client.Gauge({
  name: 'circuit_breaker_state',
  help: 'Circuit breaker state per downstream service (0=closed, 1=open)',
  labelNames: ['service'],
  registers: [register],
});

// Counter: Database query duration histogram
const dbQueryDurationSeconds = new client.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['query_name'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

// Counter: Socket events
const socketEventsTotal = new client.Counter({
  name: 'socket_events_total',
  help: 'Total number of socket.io events',
  labelNames: ['event'],
  registers: [register],
});

// ── Middleware ────────────────────────────────────────────────────

/**
 * Express middleware to track all HTTP requests with Prometheus metrics.
 * Place this BEFORE all route handlers in the middleware chain.
 * 
 * Records:
 * - http_requests_total (counter)
 * - http_request_duration_seconds (histogram)
 * - http_requests_in_flight (gauge)
 * - http_request_size_bytes (histogram)
 * - http_response_size_bytes (histogram)
 */
function metricsMiddleware(req, res, next) {
  // Skip metrics endpoint itself to avoid infinite recursion
  if (req.path === '/metrics') {
    return next();
  }

  // Increment in-flight requests
  httpRequestsInFlight.inc();

  // Start duration timer
  const endTimer = httpRequestDurationSeconds.startTimer();

  // Capture the original end to modify response body tracking
  const originalEnd = res.end;
  let responseBodySize = 0;

  // Override res.end to capture response size
  res.end = function(chunk, encoding, callback) {
    if (chunk) {
      responseBodySize = Buffer.byteLength(chunk);
    }
    originalEnd.call(this, chunk, encoding, callback);
  };

  // When response finishes, record metrics
  res.on('finish', () => {
    const route = req.route?.path || req.path || 'unknown';
    const status = res.statusCode.toString();

    // Record request count and duration
    httpRequestsTotal.inc({ method: req.method, route, status });
    endTimer({ method: req.method, route, status });

    // Record response size
    httpResponseSizeBytes.observe({ method: req.method, route, status }, responseBodySize);

    // Record request size
    const reqSizeBytes = parseInt(req.headers['content-length'], 10) || 0;
    httpRequestSizeBytes.observe({ method: req.method, route }, reqSizeBytes);

    // Decrement in-flight requests
    httpRequestsInFlight.dec();
  });

  next();
}

/**
 * Express GET route handler for /metrics endpoint.
 * Exposes all collected metrics in Prometheus text format.
 */
function metricsRouteHandler(req, res) {
  res.set('Content-Type', register.contentType);
  register.metrics().then(data => {
    res.end(data);
  }).catch(err => {
    console.error('Error collecting metrics:', err);
    res.status(500).end('Error collecting metrics');
  });
}

/**
 * Creates a router with the /metrics endpoint exposed.
 * Usage: app.use('/metrics', prometheusRouter);
 */
const prometheusRouter = express.Router();
prometheusRouter.get('/', metricsRouteHandler);

// ── Export all metrics, middleware, and helpers ───────────────────

module.exports = {
  register,
  metricsMiddleware,
  prometheusRouter,
  metricsRouteHandler,
  
  // Metric references for direct use in other modules
  httpRequestsTotal,
  httpRequestDurationSeconds,
  httpRequestsInFlight,
  httpRequestSizeBytes,
  httpResponseSizeBytes,
  circuitBreakerState,
  dbQueryDurationSeconds,
  socketEventsTotal,
};