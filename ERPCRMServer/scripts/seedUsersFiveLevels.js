const bcrypt = require("bcryptjs");
const { appPool } = require("../config/db");

const DEFAULT_LEVELS = 5;
const DEFAULT_PER_LEVEL = 20;
const DEFAULT_PASSWORD = "Seed@123A";
const DEFAULT_SEED_PREFIX = "seed.l5x20";
const DEFAULT_EMAIL_DOMAIN = "example.com";

const parseArg = (name, fallback) => {
  const arg = process.argv.find((item) => item.startsWith(`--${name}=`));
  if (!arg) return fallback;
  const value = arg.split("=")[1]?.trim();
  return value || fallback;
};

const parseIntArg = (name, fallback) => {
  const parsed = Number.parseInt(parseArg(name, String(fallback)), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const ensureRole = async (client, roleName) => {
  const existing = await client.query(
    `SELECT "Id" FROM "Roles" WHERE "RoleName" = $1 LIMIT 1`,
    [roleName]
  );
  if (existing.rows.length) {
    return Number(existing.rows[0].Id);
  }

  const inserted = await client.query(
    `
      INSERT INTO "Roles" ("RoleName", "Description", "Level", "IsActive", "IsDeleted", "Flag")
      VALUES ($1, $2, $3, TRUE, FALSE, TRUE)
      RETURNING "Id"
    `,
    [roleName, `Seed role for ${roleName}`, 0]
  );
  return Number(inserted.rows[0].Id);
};

const ensureUserType = async (client, userTypeName) => {
  const existing = await client.query(
    `SELECT "Id" FROM "UserTypes" WHERE "UserType" = $1 LIMIT 1`,
    [userTypeName]
  );
  if (existing.rows.length) {
    return Number(existing.rows[0].Id);
  }

  const inserted = await client.query(
    `
      INSERT INTO "UserTypes" ("UserType")
      VALUES ($1)
      RETURNING "Id"
    `,
    [userTypeName]
  );
  return Number(inserted.rows[0].Id);
};

const ensureCompany = async (client, companyName, companyEmail) => {
  const existing = await client.query(
    `SELECT "Id" FROM "Companies" WHERE "Email" = $1 LIMIT 1`,
    [companyEmail]
  );
  if (existing.rows.length) {
    return Number(existing.rows[0].Id);
  }

  const inserted = await client.query(
    `
      INSERT INTO "Companies" ("CompanyName", "Email")
      VALUES ($1, $2)
      RETURNING "Id"
    `,
    [companyName, companyEmail]
  );
  return Number(inserted.rows[0].Id);
};

const pad2 = (value) => String(value).padStart(2, "0");

const buildMobileNumber = (level, index, runId) => {
  const base = `${level}${pad2(index)}${String(runId).slice(-7)}`;
  return base.slice(0, 10).padEnd(10, "0");
};

const run = async () => {
  const levels = parseIntArg("levels", DEFAULT_LEVELS);
  const perLevel = parseIntArg("per-level", DEFAULT_PER_LEVEL);
  const seedPrefix = parseArg("seed-prefix", DEFAULT_SEED_PREFIX);
  const emailDomain = parseArg("email-domain", DEFAULT_EMAIL_DOMAIN);
  const password = parseArg("password", DEFAULT_PASSWORD);
  const runId = Date.now();

  const roleNames = Array.from({ length: levels }, (_, index) => `Seed Level ${index + 1}`);
  const userTypeNames = Array.from({ length: levels }, (_, index) => `Seed Level ${index + 1}`);

  const client = await appPool.connect();
  try {
    await client.query("BEGIN");

    const roleIds = [];
    const userTypeIds = [];
    for (let i = 0; i < levels; i += 1) {
      roleIds.push(await ensureRole(client, roleNames[i]));
      userTypeIds.push(await ensureUserType(client, userTypeNames[i]));
    }

    const companyName = `Seed Company L${levels}x${perLevel}`;
    const companyEmail = `${seedPrefix}.company.${runId}@${emailDomain}`;
    const companyId = await ensureCompany(client, companyName, companyEmail);

    const hashedPassword = await bcrypt.hash(password, 10);
    const hierarchyPathByUserId = new Map();
    const insertedByLevel = [];

    let previousLevelUsers = [];
    for (let level = 1; level <= levels; level += 1) {
      const currentLevelUsers = [];
      for (let index = 1; index <= perLevel; index += 1) {
        const manager =
          previousLevelUsers.length > 0
            ? previousLevelUsers[(index - 1) % previousLevelUsers.length]
            : null;
        const managerId = manager ? manager.UserId : null;

        const name = `Level ${level} User ${pad2(index)}`;
        const email = `${seedPrefix}.${runId}.l${level}.u${pad2(index)}@${emailDomain}`;
        const mobileNumber = buildMobileNumber(level, index, runId);
        const roleId = roleIds[level - 1];
        const userTypeId = userTypeIds[level - 1];

        const insertResult = await client.query(
          `
            INSERT INTO "Users" (
              "Name",
              "Email",
              "Password",
              "MobileNumber",
              "CompanyId",
              "RoleId",
              "UserTypeId",
              "ReportingManagerId",
              "CreatedBy",
              "HierarchyLevel",
              "IsActive",
              "IsDelete"
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE, FALSE)
            RETURNING "UserId"
          `,
          [
            name,
            email,
            hashedPassword,
            mobileNumber,
            companyId,
            roleId,
            userTypeId,
            managerId,
            managerId,
            level,
          ]
        );

        const userId = Number(insertResult.rows[0].UserId);
        const hierarchyPath = managerId
          ? `${hierarchyPathByUserId.get(managerId)}/${userId}`
          : `${userId}`;

        await client.query(
          `
            UPDATE "Users"
            SET "HierarchyPath" = $1
            WHERE "UserId" = $2
          `,
          [hierarchyPath, userId]
        );

        hierarchyPathByUserId.set(userId, hierarchyPath);
        currentLevelUsers.push({ UserId: userId, ReportingManagerId: managerId });
      }

      insertedByLevel.push({
        level,
        count: currentLevelUsers.length,
        userIds: currentLevelUsers.map((user) => user.UserId),
      });
      previousLevelUsers = currentLevelUsers;
    }

    await client.query("COMMIT");

    const totalUsers = insertedByLevel.reduce((sum, levelInfo) => sum + levelInfo.count, 0);
    console.log("✅ User hierarchy seed completed");
    console.log(`Inserted users: ${totalUsers}`);
    insertedByLevel.forEach((info) => {
      console.log(`  Level ${info.level}: ${info.count}`);
    });
    console.log(`CompanyId: ${companyId}`);
    console.log(`Seed key: ${seedPrefix}.${runId}`);
    console.log(`Password for all seeded users: ${password}`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Failed to seed users hierarchy:", error);
    process.exitCode = 1;
  } finally {
    client.release();
    await appPool.end();
  }
};

run();
