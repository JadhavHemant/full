const { appPool } = require("../../config/db");
const { isPrivilegedUser, getAccessibleUserIds } = require("../../utils/hierarchyAccess");
const { generateAndSendCrmDigest } = require("../../services/crmDigestReportService");

const REPORT_CACHE_TTL_MS = 30 * 1000;
const reportCache = new Map();

const toInt = (value, fallback = null) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const createHttpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const buildWhereClause = (conditions) => (conditions.length ? `WHERE ${conditions.join(" AND ")}` : "");

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toDateKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
};

const buildDateSeries = (rows = [], days = 14) => {
  const now = new Date();
  const normalizedRows = new Map(
    (Array.isArray(rows) ? rows : [])
      .map((row) => {
        const key = toDateKey(row.Date);
        return key ? [key, row] : null;
      })
      .filter(Boolean)
  );

  const series = [];
  for (let index = days - 1; index >= 0; index -= 1) {
    const current = new Date(now);
    current.setDate(now.getDate() - index);
    const dateKey = toDateKey(current);
    const row = normalizedRows.get(dateKey);

    series.push({
      Date: dateKey,
      TotalCalls: Number(row?.TotalCalls || 0),
      SuccessCalls: Number(row?.SuccessCalls || 0),
      FailedCalls: Number(row?.FailedCalls || 0),
    });
  }

  return series;
};

const buildCacheKey = (prefix, payload) => `${prefix}:${JSON.stringify(payload)}`;

const getCachedReport = (key) => {
  const cached = reportCache.get(key);
  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    reportCache.delete(key);
    return null;
  }

  return cached.value;
};

const setCachedReport = (key, value) => {
  reportCache.set(key, {
    value,
    expiresAt: Date.now() + REPORT_CACHE_TTL_MS,
  });
};

const resolveReportScope = async (req) => {
  const userId = toInt(req.user?.userId, null);
  let roleId = toInt(req.user?.roleId, null);
  let tokenCompanyId = toInt(req.user?.companyId, null);
  const requestedCompanyId = toInt(req.query.companyId, null);
  const requestedUserId = toInt(req.query.userId, null);

  if (!userId) {
    throw createHttpError(401, "Invalid user context. Please login again.");
  }

  if (!roleId || !tokenCompanyId) {
    const contextResult = await appPool.query(
      'SELECT "RoleId", "CompanyId" FROM "Users" WHERE "UserId" = $1 LIMIT 1',
      [userId]
    );
    const dbUser = contextResult.rows[0] || null;
    if (dbUser) {
      roleId = roleId || toInt(dbUser.RoleId, null);
      tokenCompanyId = tokenCompanyId || toInt(dbUser.CompanyId, null);
    }
  }

  const isSuperAdmin = roleId === 1;
  const privileged = isPrivilegedUser({ ...req.user, roleId });

  if (!isSuperAdmin && !tokenCompanyId) {
    throw createHttpError(401, "Company context missing. Please login again.");
  }

  if (!isSuperAdmin && requestedCompanyId && requestedCompanyId !== tokenCompanyId) {
    throw createHttpError(403, "You are not allowed to access another company.");
  }

  const companyId = isSuperAdmin ? requestedCompanyId : tokenCompanyId;
  let userIds = null;

  if (!privileged) {
    userIds = await getAccessibleUserIds({ userId, companyId });
  }

  if (requestedUserId) {
    if (isSuperAdmin || privileged) {
      userIds = [requestedUserId];
    } else {
      const allowedUsers = new Set((userIds || []).map((id) => Number(id)));
      if (!allowedUsers.has(requestedUserId)) {
        throw createHttpError(403, "You are not allowed to access this user's report data.");
      }
      userIds = [requestedUserId];
    }
  }

  return { companyId, userIds };
};

const getScopeParams = (scope) => {
  const params = [];
  let companyParamIdx = null;
  let userIdsParamIdx = null;

  if (scope.companyId) {
    params.push(scope.companyId);
    companyParamIdx = params.length;
  }

  if (Array.isArray(scope.userIds)) {
    params.push(scope.userIds);
    userIdsParamIdx = params.length;
  }

  return { params, companyParamIdx, userIdsParamIdx };
};

const addDateRangeFilters = ({ filters, alias, field, startDate, endDate, params }) => {
  if (startDate) {
    params.push(startDate);
    filters.push(`${alias}."${field}" >= $${params.length}`);
  }

  if (endDate) {
    params.push(endDate);
    filters.push(`${alias}."${field}" <= $${params.length}`);
  }
};

const fetchDashboardData = async (scope) => {
  const { params, companyParamIdx, userIdsParamIdx } = getScopeParams(scope);

  const companyFilters = ['"IsDelete" = FALSE'];
  if (companyParamIdx) {
    companyFilters.push(`"Id" = $${companyParamIdx}`);
  }

  const userFilters = ['"IsDelete" = FALSE'];
  if (companyParamIdx) {
    userFilters.push(`"CompanyId" = $${companyParamIdx}`);
  }
  if (userIdsParamIdx) {
    userFilters.push(`"UserId" = ANY($${userIdsParamIdx}::int[])`);
  }

  const leadFilters = ['"IsDeleted" = FALSE'];
  if (companyParamIdx) {
    leadFilters.push(`"CompanyId" = $${companyParamIdx}`);
  }
  if (userIdsParamIdx) {
    leadFilters.push(
      `("CreatedBy" = ANY($${userIdsParamIdx}::int[]) OR "AssignedTo" = ANY($${userIdsParamIdx}::int[]) OR "AssignedFrom" = ANY($${userIdsParamIdx}::int[]))`
    );
  }

  const oppFilters = ['"IsDeleted" = FALSE'];
  if (companyParamIdx) {
    oppFilters.push(`"CompanyId" = $${companyParamIdx}`);
  }
  if (userIdsParamIdx) {
    oppFilters.push(
      `("CreatedBy" = ANY($${userIdsParamIdx}::int[]) OR "AssignedTo" = ANY($${userIdsParamIdx}::int[]) OR "AssignedFrom" = ANY($${userIdsParamIdx}::int[]))`
    );
  }

  const salesFilters = ['"IsDeleted" = FALSE'];
  if (companyParamIdx) {
    salesFilters.push(`"CompanyId" = $${companyParamIdx}`);
  }
  if (userIdsParamIdx) {
    salesFilters.push(`"CreatedBy" = ANY($${userIdsParamIdx}::int[])`);
  }

  const apiScopeFilters = [];
  if (companyParamIdx) {
    apiScopeFilters.push(`COALESCE(ai."CompanyId", u_api."CompanyId") = $${companyParamIdx}`);
  }
  if (userIdsParamIdx) {
    apiScopeFilters.push(`l."TriggeredByUserId" = ANY($${userIdsParamIdx}::int[])`);
  }

  const apiAlertScopeFilters = [];
  if (companyParamIdx) {
    apiAlertScopeFilters.push(`COALESCE(ai."CompanyId", u_api."CompanyId") = $${companyParamIdx}`);
  }
  if (userIdsParamIdx) {
    apiAlertScopeFilters.push(`l."TriggeredByUserId" = ANY($${userIdsParamIdx}::int[])`);
  }

  const summaryQuery = `
    SELECT
      (SELECT COUNT(*)::int FROM "Companies" ${buildWhereClause(companyFilters)}) AS "TotalCompanies",
      (SELECT COUNT(*)::int FROM "Users" ${buildWhereClause(userFilters)}) AS "TotalUsers",
      (SELECT COUNT(*)::int FROM "Users" ${buildWhereClause([...userFilters, '"IsActive" = TRUE'])}) AS "ActiveUsers",
      (SELECT COUNT(*)::int FROM "Leads" ${buildWhereClause(leadFilters)}) AS "ActiveLeads",
      (SELECT COUNT(*)::int FROM "Opportunities" ${buildWhereClause(oppFilters)}) AS "ActiveOpportunities",
      (
        SELECT COALESCE(SUM("NetAmount"), 0)::numeric(18,2)
        FROM "SalesOrders"
        ${buildWhereClause(salesFilters)}
      ) AS "TotalRevenue",
      (
        SELECT COUNT(*)::int
        FROM "ApiExecutionLogs" l
        LEFT JOIN "ApiIntegrations" ai ON ai."Id" = l."IntegrationId"
        LEFT JOIN "Users" u_api ON u_api."UserId" = l."TriggeredByUserId"
        ${buildWhereClause([
          'l."IsSuccess" = FALSE',
          `l."CreatedAt" >= NOW() - INTERVAL '7 days'`,
          ...apiScopeFilters,
        ])}
      ) AS "ApiFailuresLast7Days",
      (
        SELECT COUNT(*)::int
        FROM "ApiExecutionLogs" l
        LEFT JOIN "ApiIntegrations" ai ON ai."Id" = l."IntegrationId"
        LEFT JOIN "Users" u_api ON u_api."UserId" = l."TriggeredByUserId"
        ${buildWhereClause([
          `l."CreatedAt" >= NOW() - INTERVAL '7 days'`,
          ...apiScopeFilters,
        ])}
      ) AS "ApiCallsLast7Days";
  `;

  const apiHealthQuery = `
    SELECT
      DATE(l."CreatedAt") AS "Date",
      COUNT(*)::int AS "TotalCalls",
      COUNT(*) FILTER (WHERE l."IsSuccess" = TRUE)::int AS "SuccessCalls",
      COUNT(*) FILTER (WHERE l."IsSuccess" = FALSE)::int AS "FailedCalls"
    FROM "ApiExecutionLogs" l
    LEFT JOIN "ApiIntegrations" ai ON ai."Id" = l."IntegrationId"
    LEFT JOIN "Users" u_api ON u_api."UserId" = l."TriggeredByUserId"
    ${buildWhereClause([
      `l."CreatedAt" >= NOW() - INTERVAL '14 days'`,
      ...apiScopeFilters,
    ])}
    GROUP BY DATE(l."CreatedAt")
    ORDER BY DATE(l."CreatedAt");
  `;

  const recentAlertsQuery = `
    SELECT
      a."Id",
      a."AlertType",
      a."AlertStatus",
      a."AlertChannel",
      a."CreatedAt",
      l."ErrorMessage",
      l."ResponseStatusCode",
      ai."IntegrationName",
      ae."EndpointName"
    FROM "ApiFailureAlerts" a
    LEFT JOIN "ApiExecutionLogs" l ON l."Id" = a."ApiExecutionLogId"
    LEFT JOIN "ApiIntegrations" ai ON ai."Id" = l."IntegrationId"
    LEFT JOIN "ApiEndpoints" ae ON ae."Id" = l."EndpointId"
    LEFT JOIN "Users" u_api ON u_api."UserId" = l."TriggeredByUserId"
    ${buildWhereClause(apiAlertScopeFilters)}
    ORDER BY a."CreatedAt" DESC
    LIMIT 10;
  `;

  const [summaryResult, apiHealthResult, alertsResult] = await Promise.all([
    appPool.query(summaryQuery, params),
    appPool.query(apiHealthQuery, params),
    appPool.query(recentAlertsQuery, params),
  ]);

  return {
    summary: summaryResult.rows[0] || {},
    apiHealth: buildDateSeries(apiHealthResult.rows || [], 14),
    recentAlerts: alertsResult.rows || [],
  };
};

const fetchEmployeeActivityData = async (scope, query = {}) => {
  const startDate = parseDate(query.startDate);
  const endDate = parseDate(query.endDate);
  const { params, companyParamIdx, userIdsParamIdx } = getScopeParams(scope);

  const userFilters = ['u."IsDelete" = FALSE'];
  if (companyParamIdx) {
    userFilters.push(`u."CompanyId" = $${companyParamIdx}`);
  }
  if (userIdsParamIdx) {
    userFilters.push(`u."UserId" = ANY($${userIdsParamIdx}::int[])`);
  }

  const leadFilters = ['l."IsDeleted" = FALSE'];
  if (companyParamIdx) {
    leadFilters.push(`l."CompanyId" = $${companyParamIdx}`);
  }
  if (userIdsParamIdx) {
    leadFilters.push(`l."CreatedBy" = ANY($${userIdsParamIdx}::int[])`);
  }
  addDateRangeFilters({
    filters: leadFilters,
    alias: "l",
    field: "CreatedAt",
    startDate,
    endDate,
    params,
  });

  const oppFilters = ['o."IsDeleted" = FALSE'];
  if (companyParamIdx) {
    oppFilters.push(`o."CompanyId" = $${companyParamIdx}`);
  }
  if (userIdsParamIdx) {
    oppFilters.push(`o."CreatedBy" = ANY($${userIdsParamIdx}::int[])`);
  }
  addDateRangeFilters({
    filters: oppFilters,
    alias: "o",
    field: "CreatedAt",
    startDate,
    endDate,
    params,
  });

  const salesFilters = ['s."IsDeleted" = FALSE'];
  if (companyParamIdx) {
    salesFilters.push(`s."CompanyId" = $${companyParamIdx}`);
  }
  if (userIdsParamIdx) {
    salesFilters.push(`s."CreatedBy" = ANY($${userIdsParamIdx}::int[])`);
  }
  addDateRangeFilters({
    filters: salesFilters,
    alias: "s",
    field: "CreatedAt",
    startDate,
    endDate,
    params,
  });

  const queryText = `
    WITH lead_agg AS (
      SELECT
        l."CreatedBy" AS "UserId",
        COUNT(*)::int AS "LeadsCreated"
      FROM "Leads" l
      ${buildWhereClause(leadFilters)}
      GROUP BY l."CreatedBy"
    ),
    opp_agg AS (
      SELECT
        o."CreatedBy" AS "UserId",
        COUNT(*)::int AS "OpportunitiesCreated"
      FROM "Opportunities" o
      ${buildWhereClause(oppFilters)}
      GROUP BY o."CreatedBy"
    ),
    sales_agg AS (
      SELECT
        s."CreatedBy" AS "UserId",
        COUNT(*)::int AS "SalesOrdersCreated",
        COALESCE(SUM(s."NetAmount"), 0)::numeric(18,2) AS "RevenueGenerated"
      FROM "SalesOrders" s
      ${buildWhereClause(salesFilters)}
      GROUP BY s."CreatedBy"
    )
    SELECT
      u."UserId",
      u."Name",
      u."Email",
      u."CompanyId",
      COALESCE(l."LeadsCreated", 0) AS "LeadsCreated",
      COALESCE(o."OpportunitiesCreated", 0) AS "OpportunitiesCreated",
      COALESCE(s."SalesOrdersCreated", 0) AS "SalesOrdersCreated",
      COALESCE(s."RevenueGenerated", 0)::numeric(18,2) AS "RevenueGenerated"
    FROM "Users" u
    LEFT JOIN lead_agg l ON l."UserId" = u."UserId"
    LEFT JOIN opp_agg o ON o."UserId" = u."UserId"
    LEFT JOIN sales_agg s ON s."UserId" = u."UserId"
    WHERE ${userFilters.join(" AND ")}
    ORDER BY "RevenueGenerated" DESC, "LeadsCreated" DESC, u."Name" ASC;
  `;

  const { rows } = await appPool.query(queryText, params);
  return rows;
};

const fetchRecentNotificationsData = async (scope, limit = 20) => {
  const cappedLimit = Math.min(100, Math.max(1, toInt(limit, 20)));
  const params = [cappedLimit];
  const conditions = ['(n."ExpiresAt" IS NULL OR n."ExpiresAt" > NOW())'];

  if (scope.companyId) {
    params.push(scope.companyId);
    conditions.push(`n."CompanyId" = $${params.length}`);
  }

  if (Array.isArray(scope.userIds)) {
    params.push(scope.userIds);
    conditions.push(`n."UserId" = ANY($${params.length}::int[])`);
  }

  const query = `
    SELECT
      n."Id",
      n."Title",
      n."Message",
      n."Type",
      n."Severity",
      n."EntityType",
      n."EntityId",
      n."IsRead",
      n."ReadAt",
      n."ExpiresAt",
      n."CreatedAt",
      u."Name" AS "UserName"
    FROM "Notifications" n
    LEFT JOIN "Users" u ON u."UserId" = n."UserId"
    ${buildWhereClause(conditions)}
    ORDER BY n."CreatedAt" DESC
    LIMIT $1;
  `;

  const { rows } = await appPool.query(query, params);
  return rows;
};

const getSuperAdminDashboard = async (req, res) => {
  try {
    const scope = await resolveReportScope(req);
    const dashboard = await fetchDashboardData(scope);
    res.json(dashboard);
  } catch (error) {
    console.error("Error loading report dashboard:", error);
    res.status(error.status || 500).json({
      message: error.status ? error.message : "Failed to load dashboard data",
    });
  }
};

const getEmployeeActivity = async (req, res) => {
  try {
    const scope = await resolveReportScope(req);
    const rows = await fetchEmployeeActivityData(scope, req.query);
    res.json({ data: rows });
  } catch (error) {
    console.error("Error loading employee activity report:", error);
    res.status(error.status || 500).json({
      message: error.status ? error.message : "Failed to load employee activity report",
    });
  }
};

const getRecentNotifications = async (req, res) => {
  try {
    const scope = await resolveReportScope(req);
    const rows = await fetchRecentNotificationsData(scope, req.query.limit);
    res.json({ data: rows });
  } catch (error) {
    console.error("Error loading notifications:", error);
    res.status(error.status || 500).json({
      message: error.status ? error.message : "Failed to load notifications",
    });
  }
};

const getReportOverview = async (req, res) => {
  try {
    const scope = await resolveReportScope(req);
    const cacheKey = buildCacheKey("report-overview", {
      companyId: scope.companyId || null,
      userIds: scope.userIds || null,
      userId: req.query.userId || null,
      startDate: req.query.startDate || null,
      endDate: req.query.endDate || null,
      limit: req.query.limit || 10,
    });

    const cached = getCachedReport(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const [dashboard, employeeActivity, notifications] = await Promise.all([
      fetchDashboardData(scope),
      fetchEmployeeActivityData(scope, req.query),
      fetchRecentNotificationsData(scope, req.query.limit || 10),
    ]);

    const payload = {
      ...dashboard,
      employeeActivity,
      notifications,
    };

    setCachedReport(cacheKey, payload);
    res.json(payload);
  } catch (error) {
    console.error("Error loading report overview:", error);
    res.status(error.status || 500).json({
      message: error.status ? error.message : "Failed to load report overview",
    });
  }
};

const triggerCrmDigestReport = async (req, res) => {
  try {
    const requestedCompanyId =
      toInt(req.body?.companyId, null) ??
      toInt(req.query?.companyId, null) ??
      toInt(req.user?.companyId, null);

    if (!requestedCompanyId && !isPrivilegedUser(req.user)) {
      return res.status(400).json({ message: "CompanyId is required" });
    }

    if (
      !isPrivilegedUser(req.user) &&
      Number(requestedCompanyId) !== Number(req.user?.companyId)
    ) {
      return res.status(403).json({ message: "You are not allowed to run another company's report" });
    }

    const rawPeriods = Array.isArray(req.body?.periods)
      ? req.body.periods
      : typeof req.body?.period === "string"
      ? [req.body.period]
      : [];

    const periodTypes = rawPeriods
      .map((value) => String(value || "").toLowerCase())
      .filter((value) => value === "weekly" || value === "monthly");

    const payload = await generateAndSendCrmDigest({
      companyId: requestedCompanyId || null,
      periodTypes: periodTypes.length ? periodTypes : ["weekly", "monthly"],
      triggeredByUserId: toInt(req.user?.userId, null),
      force: Boolean(req.body?.force),
    });

    return res.status(200).json(payload);
  } catch (error) {
    console.error("Error triggering CRM digest report:", error);
    return res.status(500).json({ message: "Failed to trigger CRM digest report" });
  }
};

module.exports = {
  getSuperAdminDashboard,
  getEmployeeActivity,
  getRecentNotifications,
  getReportOverview,
  triggerCrmDigestReport,
};
