const { appPool } = require("../config/db");

const main = async () => {
  const client = await appPool.connect();

  try {
    await client.query("BEGIN");

    const notificationResult = await client.query(`
      WITH seeded_alerts AS (
        SELECT a."Id"
        FROM "ApiFailureAlerts" a
        INNER JOIN "ApiExecutionLogs" l ON l."Id" = a."ApiExecutionLogId"
        WHERE l."IsSuccess" = FALSE
          AND (
            l."ErrorMessage" LIKE 'Seeded % failure for monitoring trend coverage.%'
            OR l."RequestPayload"->>'source' = 'seedHierarchyAndVolume'
          )
      )
      DELETE FROM "Notifications" n
      USING seeded_alerts sa
      WHERE n."EntityType" = 'ApiFailureAlert'
        AND n."EntityId" = sa."Id";
    `);

    const alertResult = await client.query(`
      DELETE FROM "ApiFailureAlerts" a
      USING "ApiExecutionLogs" l
      WHERE a."ApiExecutionLogId" = l."Id"
        AND l."IsSuccess" = FALSE
        AND (
          l."ErrorMessage" LIKE 'Seeded % failure for monitoring trend coverage.%'
          OR l."RequestPayload"->>'source' = 'seedHierarchyAndVolume'
        );
    `);

    const logResult = await client.query(`
      DELETE FROM "ApiExecutionLogs" l
      WHERE l."IsSuccess" = FALSE
        AND (
          l."ErrorMessage" LIKE 'Seeded % failure for monitoring trend coverage.%'
          OR l."RequestPayload"->>'source' = 'seedHierarchyAndVolume'
        );
    `);

    await client.query("COMMIT");

    console.log("Cleared seeded monitoring failures");
    console.log(`Notifications deleted: ${notificationResult.rowCount}`);
    console.log(`Failure alerts deleted: ${alertResult.rowCount}`);
    console.log(`Execution logs deleted: ${logResult.rowCount}`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to clear seeded monitoring failures:", error);
    process.exitCode = 1;
  } finally {
    client.release();
    await appPool.end();
  }
};

main();
