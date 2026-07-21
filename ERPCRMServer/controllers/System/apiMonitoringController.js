const { appPool } = require("../../config/db");
const { sendEmail, isEmailConfigured } = require("../../utils/email");

const FAILURE_THRESHOLD = 10;

const getSuperAdminUsers = async () => {
  const query = `
    SELECT DISTINCT u."UserId", u."CompanyId", u."Name", u."Email"
    FROM "Users" u
    LEFT JOIN "Roles" r ON r."Id" = u."RoleId"
    WHERE u."IsDelete" = FALSE
      AND u."IsActive" = TRUE
      AND (
        u."UserTypeId" = 1
        OR LOWER(COALESCE(r."RoleName", '')) LIKE '%super admin%'
        OR LOWER(COALESCE(r."RoleName", '')) LIKE '%superadmin%'
      );
  `;
  const { rows } = await appPool.query(query);
  return rows;
};

const hasRecentEmailEscalation = async ({ integrationId, endpointId }) => {
  const query = `
    SELECT 1
    FROM "ApiFailureAlerts" a
    INNER JOIN "ApiExecutionLogs" l ON l."Id" = a."ApiExecutionLogId"
    WHERE a."AlertType" = 'API_FAILURE_EMAIL'
      AND a."CreatedAt" >= NOW() - INTERVAL '24 hours'
      AND COALESCE(l."IntegrationId", 0) = COALESCE($1, 0)
      AND COALESCE(l."EndpointId", 0) = COALESCE($2, 0)
    LIMIT 1;
  `;
  const { rows } = await appPool.query(query, [integrationId || null, endpointId || null]);
  return Boolean(rows.length);
};

const buildApiFailureEmail = ({
  integrationName,
  endpointName,
  failureCount,
  statusCode,
  message,
}) => {
  const subject = `API failed ${failureCount}+ times: ${integrationName} / ${endpointName}`;
  const text = [
    `API failure escalation`,
    ``,
    `Integration: ${integrationName}`,
    `Endpoint: ${endpointName}`,
    `Failures in last 24 hours: ${failureCount}`,
    `Latest status code: ${statusCode || "Unknown"}`,
    `Latest error: ${message || "No error message captured."}`,
    ``,
    `Please check this API immediately from the monitoring dashboard.`,
  ].join("\n");

  return { subject, text };
};

const sendSuperAdminFailureEmail = async ({
  users,
  integrationName,
  endpointName,
  failureCount,
  statusCode,
  message,
}) => {
  if (!isEmailConfigured()) {
    console.warn("Skipping API failure email because email credentials are not configured.");
    return false;
  }

  const recipients = [
    ...new Set(users.map((user) => String(user.Email || "").trim()).filter(Boolean)),
  ];

  if (!recipients.length) {
    console.warn("Skipping API failure email because no Super Admin email was found.");
    return false;
  }

  const email = buildApiFailureEmail({
    integrationName,
    endpointName,
    failureCount,
    statusCode,
    message,
  });

  await sendEmail({
    to: recipients,
    subject: email.subject,
    text: email.text,
  });

  return true;
};

const createEscalationNotifications = async ({
  integrationId,
  endpointId,
  apiExecutionLogId,
  failureCount,
  companyId,
  message,
  statusCode,
}) => {
  const users = await getSuperAdminUsers();
  if (!users.length) return { notificationsCreated: 0, emailSent: false };

  const integrationQuery = `
    SELECT
      ai."IntegrationName",
      ae."EndpointName"
    FROM "ApiIntegrations" ai
    LEFT JOIN "ApiEndpoints" ae ON ae."Id" = $2
    WHERE ai."Id" = $1
    LIMIT 1;
  `;
  const integrationData = await appPool.query(integrationQuery, [
    integrationId || null,
    endpointId || null,
  ]);

  const integrationName = integrationData.rows[0]?.IntegrationName || "Unknown Integration";
  const endpointName = integrationData.rows[0]?.EndpointName || "Unknown Endpoint";
  const alreadySentEmail = await hasRecentEmailEscalation({ integrationId, endpointId });

  if (alreadySentEmail) {
    return { notificationsCreated: 0, emailSent: false };
  }

  const title = `API Failure Escalation (${failureCount})`;
  const finalMessage = `${integrationName} / ${endpointName} failed ${failureCount} times in 24 hours. ${
    message || ""
  }`.trim();

  const insertNotification = `
    INSERT INTO "Notifications"
    ("CompanyId", "UserId", "Title", "Message", "Type", "Severity", "EntityType", "EntityId")
    VALUES ($1, $2, $3, $4, 'API_FAILURE_ESCALATION', 'critical', 'ApiEndpoint', $5);
  `;

  for (const user of users) {
    await appPool.query(insertNotification, [
      companyId || user.CompanyId || null,
      user.UserId,
      title,
      finalMessage,
      endpointId || null,
    ]);
  }

  let emailSent = false;

  if (apiExecutionLogId) {
    try {
      emailSent = await sendSuperAdminFailureEmail({
        users,
        integrationName,
        endpointName,
        failureCount,
        statusCode,
        message,
      });

      if (emailSent) {
        await appPool.query(
          `
            INSERT INTO "ApiFailureAlerts"
            ("ApiExecutionLogId", "AlertType", "AlertSentToUserId", "AlertChannel", "AlertStatus")
            VALUES ($1, 'API_FAILURE_EMAIL', $2, 'Email', 'Sent');
          `,
          [apiExecutionLogId, users[0]?.UserId || null]
        );
      }
    } catch (error) {
      console.error("Failed to send API failure escalation email:", error);
      await appPool.query(
        `
          INSERT INTO "ApiFailureAlerts"
          ("ApiExecutionLogId", "AlertType", "AlertSentToUserId", "AlertChannel", "AlertStatus")
          VALUES ($1, 'API_FAILURE_EMAIL', $2, 'Email', 'Failed');
        `,
        [apiExecutionLogId, users[0]?.UserId || null]
      );
    }

    if (!emailSent && !isEmailConfigured()) {
      await appPool.query(
        `
          INSERT INTO "ApiFailureAlerts"
          ("ApiExecutionLogId", "AlertType", "AlertSentToUserId", "AlertChannel", "AlertStatus")
          VALUES ($1, 'API_FAILURE_EMAIL', $2, 'Email', 'Skipped');
        `,
        [apiExecutionLogId, users[0]?.UserId || null]
      );
    }
  }

  return { notificationsCreated: users.length, emailSent };
};

const recordApiExecution = async (req, res) => {
  const {
    IntegrationId,
    EndpointId,
    RequestId,
    RequestPayload,
    ResponsePayload,
    ResponseStatusCode,
    IsSuccess,
    ErrorMessage,
    DurationMs,
    TriggerType,
    CompanyId,
  } = req.body;

  try {
    const insertQuery = `
      INSERT INTO "ApiExecutionLogs"
      ("IntegrationId", "EndpointId", "RequestId", "RequestPayload", "ResponsePayload",
       "ResponseStatusCode", "IsSuccess", "ErrorMessage", "DurationMs", "TriggeredByUserId", "TriggerType")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *;
    `;

    const { rows } = await appPool.query(insertQuery, [
      IntegrationId || null,
      EndpointId || null,
      RequestId || null,
      RequestPayload || null,
      ResponsePayload || null,
      ResponseStatusCode || null,
      Boolean(IsSuccess),
      ErrorMessage || null,
      DurationMs || null,
      req.user?.userId || null,
      TriggerType || "Manual",
    ]);

    const logRow = rows[0];

    if (!Boolean(IsSuccess)) {
      const alertInsert = `
        INSERT INTO "ApiFailureAlerts"
        ("ApiExecutionLogId", "AlertType", "AlertSentToUserId", "AlertChannel", "AlertStatus")
        VALUES ($1, 'API_FAILURE', $2, 'InApp', 'Pending')
        RETURNING *;
      `;
      await appPool.query(alertInsert, [logRow.Id, req.user?.userId || null]);

      const failureCountQuery = `
        SELECT COUNT(*)::int AS "FailureCount"
        FROM "ApiExecutionLogs"
        WHERE "IsSuccess" = FALSE
          AND "CreatedAt" >= NOW() - INTERVAL '24 hours'
          AND COALESCE("IntegrationId", 0) = COALESCE($1, 0)
          AND COALESCE("EndpointId", 0) = COALESCE($2, 0);
      `;
      const failureCountResult = await appPool.query(failureCountQuery, [
        IntegrationId || null,
        EndpointId || null,
      ]);
      const failureCount = failureCountResult.rows[0]?.FailureCount || 0;

      if (failureCount >= FAILURE_THRESHOLD) {
        await createEscalationNotifications({
          integrationId: IntegrationId || null,
          endpointId: EndpointId || null,
          apiExecutionLogId: logRow.Id,
          failureCount,
          companyId: CompanyId || null,
          message: ErrorMessage || "Check integration health immediately.",
          statusCode: ResponseStatusCode || null,
        });
      }
    }

    res.status(201).json({
      message: "API execution logged successfully",
      data: logRow,
    });
  } catch (error) {
    console.error("Error recording API execution:", error);
    res.status(500).json({ message: "Failed to log API execution" });
  }
};

module.exports = { recordApiExecution };
