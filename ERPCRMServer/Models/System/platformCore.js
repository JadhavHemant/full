const { appPool } = require("../../config/db");

const createPlatformCoreTables = async () => {
  const queries = [
    `
      CREATE TABLE IF NOT EXISTS "Modules" (
        "Id" SERIAL PRIMARY KEY,
        "ModuleName" VARCHAR(120) NOT NULL,
        "Code" VARCHAR(80) UNIQUE NOT NULL,
        "IsActive" BOOLEAN DEFAULT TRUE,
        "CreatedAt" TIMESTAMP DEFAULT NOW()
      );
    `,
    `
      CREATE TABLE IF NOT EXISTS "Permissions" (
        "Id" SERIAL PRIMARY KEY,
        "PermissionName" VARCHAR(150) NOT NULL,
        "Code" VARCHAR(120) UNIQUE NOT NULL,
        "CreatedAt" TIMESTAMP DEFAULT NOW()
      );
    `,
    `
      CREATE TABLE IF NOT EXISTS "RolePermissions" (
        "Id" SERIAL PRIMARY KEY,
        "RoleId" INT REFERENCES "Roles"("Id") ON DELETE CASCADE,
        "ModuleId" INT REFERENCES "Modules"("Id") ON DELETE CASCADE,
        "PermissionId" INT REFERENCES "Permissions"("Id") ON DELETE CASCADE,
        "Allowed" BOOLEAN DEFAULT TRUE,
        "CreatedAt" TIMESTAMP DEFAULT NOW(),
        UNIQUE ("RoleId", "ModuleId", "PermissionId")
      );
    `,
    `
      CREATE TABLE IF NOT EXISTS "UserPermissions" (
        "Id" SERIAL PRIMARY KEY,
        "UserId" INT REFERENCES "Users"("UserId") ON DELETE CASCADE,
        "PermissionId" INT REFERENCES "Permissions"("Id") ON DELETE CASCADE,
        "Allowed" BOOLEAN DEFAULT TRUE,
        "CreatedAt" TIMESTAMP DEFAULT NOW(),
        UNIQUE ("UserId", "PermissionId")
      );
    `,
    `
      CREATE TABLE IF NOT EXISTS "Departments" (
        "Id" SERIAL PRIMARY KEY,
        "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
        "DepartmentName" VARCHAR(150) NOT NULL,
        "IsActive" BOOLEAN DEFAULT TRUE,
        "CreatedAt" TIMESTAMP DEFAULT NOW(),
        UNIQUE ("CompanyId", "DepartmentName")
      );
    `,
    `
      CREATE TABLE IF NOT EXISTS "Designations" (
        "Id" SERIAL PRIMARY KEY,
        "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
        "DesignationName" VARCHAR(150) NOT NULL,
        "IsActive" BOOLEAN DEFAULT TRUE,
        "CreatedAt" TIMESTAMP DEFAULT NOW(),
        UNIQUE ("CompanyId", "DesignationName")
      );
    `,
    `
      CREATE TABLE IF NOT EXISTS "Notifications" (
        "Id" SERIAL PRIMARY KEY,
        "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
        "UserId" INT REFERENCES "Users"("UserId") ON DELETE CASCADE,
        "Title" VARCHAR(200) NOT NULL,
        "Message" TEXT NOT NULL,
        "Type" VARCHAR(80) NOT NULL,
        "Severity" VARCHAR(30) DEFAULT 'info',
        "EntityType" VARCHAR(80),
        "EntityId" INT,
        "IsRead" BOOLEAN DEFAULT FALSE,
        "ReadAt" TIMESTAMP,
        "ExpiresAt" TIMESTAMP,
        "CreatedAt" TIMESTAMP DEFAULT NOW()
      );
    `,
    `
      ALTER TABLE "Notifications"
      ADD COLUMN IF NOT EXISTS "ReadAt" TIMESTAMP;
    `,
    `
      ALTER TABLE "Notifications"
      ADD COLUMN IF NOT EXISTS "ExpiresAt" TIMESTAMP;
    `,
    `
      CREATE TABLE IF NOT EXISTS "NotificationTemplates" (
        "Id" SERIAL PRIMARY KEY,
        "Code" VARCHAR(100) UNIQUE NOT NULL,
        "TitleTemplate" VARCHAR(255) NOT NULL,
        "MessageTemplate" TEXT NOT NULL,
        "Channel" VARCHAR(30) DEFAULT 'InApp',
        "CreatedAt" TIMESTAMP DEFAULT NOW()
      );
    `,
    `
      CREATE TABLE IF NOT EXISTS "NotificationSettings" (
        "Id" SERIAL PRIMARY KEY,
        "UserId" INT UNIQUE REFERENCES "Users"("UserId") ON DELETE CASCADE,
        "EmailEnabled" BOOLEAN DEFAULT TRUE,
        "InAppEnabled" BOOLEAN DEFAULT TRUE,
        "SmsEnabled" BOOLEAN DEFAULT FALSE,
        "ApiFailureEnabled" BOOLEAN DEFAULT TRUE,
        "ApprovalEnabled" BOOLEAN DEFAULT TRUE,
        "StockAlertEnabled" BOOLEAN DEFAULT TRUE,
        "UpdatedAt" TIMESTAMP DEFAULT NOW()
      );
    `,
    `
      CREATE TABLE IF NOT EXISTS "ApiIntegrations" (
        "Id" SERIAL PRIMARY KEY,
        "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
        "IntegrationName" VARCHAR(150) NOT NULL,
        "BaseUrl" VARCHAR(500) NOT NULL,
        "AuthType" VARCHAR(50) DEFAULT 'none',
        "IsActive" BOOLEAN DEFAULT TRUE,
        "CreatedAt" TIMESTAMP DEFAULT NOW()
      );
    `,
    `
      CREATE TABLE IF NOT EXISTS "ApiEndpoints" (
        "Id" SERIAL PRIMARY KEY,
        "IntegrationId" INT REFERENCES "ApiIntegrations"("Id") ON DELETE CASCADE,
        "EndpointName" VARCHAR(150) NOT NULL,
        "Method" VARCHAR(10) NOT NULL,
        "EndpointUrl" VARCHAR(500) NOT NULL,
        "TimeoutSeconds" INT DEFAULT 30,
        "ExpectedStatusCode" INT DEFAULT 200,
        "IsCritical" BOOLEAN DEFAULT FALSE,
        "IsActive" BOOLEAN DEFAULT TRUE
      );
    `,
    `
      CREATE TABLE IF NOT EXISTS "ApiExecutionLogs" (
        "Id" SERIAL PRIMARY KEY,
        "IntegrationId" INT REFERENCES "ApiIntegrations"("Id") ON DELETE SET NULL,
        "EndpointId" INT REFERENCES "ApiEndpoints"("Id") ON DELETE SET NULL,
        "RequestId" VARCHAR(100),
        "RequestPayload" JSONB,
        "ResponsePayload" JSONB,
        "ResponseStatusCode" INT,
        "IsSuccess" BOOLEAN DEFAULT FALSE,
        "ErrorMessage" TEXT,
        "DurationMs" INT,
        "TriggeredByUserId" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
        "TriggerType" VARCHAR(30) DEFAULT 'Manual',
        "CreatedAt" TIMESTAMP DEFAULT NOW()
      );
    `,
    `
      CREATE TABLE IF NOT EXISTS "ApiFailureAlerts" (
        "Id" SERIAL PRIMARY KEY,
        "ApiExecutionLogId" INT REFERENCES "ApiExecutionLogs"("Id") ON DELETE CASCADE,
        "AlertType" VARCHAR(80) NOT NULL,
        "AlertSentToUserId" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
        "AlertChannel" VARCHAR(30) DEFAULT 'InApp',
        "AlertStatus" VARCHAR(30) DEFAULT 'Pending',
        "CreatedAt" TIMESTAMP DEFAULT NOW()
      );
    `,
    `
      CREATE TABLE IF NOT EXISTS "Documents" (
        "Id" SERIAL PRIMARY KEY,
        "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
        "EntityType" VARCHAR(80) NOT NULL,
        "EntityId" INT NOT NULL,
        "FileName" VARCHAR(255) NOT NULL,
        "OriginalFileName" VARCHAR(255),
        "FileExtension" VARCHAR(20),
        "MimeType" VARCHAR(120),
        "FileSizeKb" INT,
        "FileUrl" TEXT NOT NULL,
        "ThumbnailUrl" TEXT,
        "Category" VARCHAR(80),
        "IsImage" BOOLEAN DEFAULT FALSE,
        "VersionNo" INT DEFAULT 1,
        "UploadedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
        "UploadedAt" TIMESTAMP DEFAULT NOW(),
        "IsDeleted" BOOLEAN DEFAULT FALSE
      );
    `,
    `
      CREATE TABLE IF NOT EXISTS "DocumentAccessLogs" (
        "Id" SERIAL PRIMARY KEY,
        "DocumentId" INT REFERENCES "Documents"("Id") ON DELETE CASCADE,
        "AccessedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
        "AccessType" VARCHAR(30) NOT NULL,
        "AccessedAt" TIMESTAMP DEFAULT NOW()
      );
    `,
    `
      CREATE TABLE IF NOT EXISTS "DocumentVersions" (
        "Id" SERIAL PRIMARY KEY,
        "DocumentId" INT REFERENCES "Documents"("Id") ON DELETE CASCADE,
        "VersionNo" INT NOT NULL,
        "FileUrl" TEXT NOT NULL,
        "UploadedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
        "UploadedAt" TIMESTAMP DEFAULT NOW(),
        UNIQUE ("DocumentId", "VersionNo")
      );
    `,
    `
      CREATE TABLE IF NOT EXISTS "ApprovalWorkflows" (
        "Id" SERIAL PRIMARY KEY,
        "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
        "EntityType" VARCHAR(80) NOT NULL,
        "WorkflowName" VARCHAR(200) NOT NULL,
        "IsActive" BOOLEAN DEFAULT TRUE,
        "CreatedAt" TIMESTAMP DEFAULT NOW()
      );
    `,
    `
      CREATE TABLE IF NOT EXISTS "ApprovalSteps" (
        "Id" SERIAL PRIMARY KEY,
        "WorkflowId" INT REFERENCES "ApprovalWorkflows"("Id") ON DELETE CASCADE,
        "StepNo" INT NOT NULL,
        "RoleId" INT REFERENCES "Roles"("Id") ON DELETE SET NULL,
        "MinAmount" NUMERIC(15,2),
        "MaxAmount" NUMERIC(15,2),
        "IsMandatory" BOOLEAN DEFAULT TRUE,
        UNIQUE ("WorkflowId", "StepNo")
      );
    `,
    `
      CREATE TABLE IF NOT EXISTS "ApprovalTransactions" (
        "Id" SERIAL PRIMARY KEY,
        "EntityType" VARCHAR(80) NOT NULL,
        "EntityId" INT NOT NULL,
        "WorkflowId" INT REFERENCES "ApprovalWorkflows"("Id") ON DELETE SET NULL,
        "CurrentStepNo" INT DEFAULT 1,
        "Status" VARCHAR(40) DEFAULT 'Pending',
        "RequestedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
        "RequestedAt" TIMESTAMP DEFAULT NOW()
      );
    `,
    `
      CREATE TABLE IF NOT EXISTS "ApprovalActions" (
        "Id" SERIAL PRIMARY KEY,
        "ApprovalTransactionId" INT REFERENCES "ApprovalTransactions"("Id") ON DELETE CASCADE,
        "StepNo" INT NOT NULL,
        "ActionBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
        "ActionType" VARCHAR(40) NOT NULL,
        "Comments" TEXT,
        "ActionAt" TIMESTAMP DEFAULT NOW()
      );
    `,
    `
      CREATE TABLE IF NOT EXISTS "SecurityLogs" (
        "Id" SERIAL PRIMARY KEY,
        "UserId" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
        "EventType" VARCHAR(100) NOT NULL,
        "IpAddress" VARCHAR(64),
        "UserAgent" TEXT,
        "DeviceInfo" TEXT,
        "Status" VARCHAR(30) DEFAULT 'Success',
        "CreatedAt" TIMESTAMP DEFAULT NOW()
      );
    `,
    `
      CREATE TABLE IF NOT EXISTS "UserSessions" (
        "Id" SERIAL PRIMARY KEY,
        "UserId" INT REFERENCES "Users"("UserId") ON DELETE CASCADE,
        "Device" VARCHAR(120),
        "Browser" VARCHAR(120),
        "IpAddress" VARCHAR(64),
        "StartedAt" TIMESTAMP DEFAULT NOW(),
        "EndedAt" TIMESTAMP,
        "IsActive" BOOLEAN DEFAULT TRUE
      );
    `,
  ];

  for (const query of queries) {
    await appPool.query(query);
  }

  console.log("Platform core tables ready");
};

module.exports = { createPlatformCoreTables };
