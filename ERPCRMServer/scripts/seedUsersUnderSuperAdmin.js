const bcrypt = require("bcryptjs");
const { appPool } = require("../config/db");

const DEFAULT_BATCH_SIZE = 60;
const DEFAULT_SEED_PREFIX = "seed.sa60";
const DEFAULT_EMAIL_DOMAIN = "example.com";
const DEFAULT_PASSWORD = "Seed@123A";

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

const ensureRoleId = async (client, roleName) => {
  const existing = await client.query(
    `SELECT "Id" FROM "Roles" WHERE "RoleName" = $1 LIMIT 1`,
    [roleName]
  );
  if (existing.rows.length) return Number(existing.rows[0].Id);

  const inserted = await client.query(
    `
      INSERT INTO "Roles" ("RoleName", "Description", "Level", "IsActive", "IsDeleted", "Flag")
      VALUES ($1, $2, 0, TRUE, FALSE, TRUE)
      RETURNING "Id"
    `,
    [roleName, `Auto-created role: ${roleName}`]
  );
  return Number(inserted.rows[0].Id);
};

const findUserTypeId = async (client, preferredNames = [], fallbackName = "Admin") => {
  for (const name of preferredNames) {
    const result = await client.query(
      `SELECT "Id" FROM "UserTypes" WHERE "UserType" = $1 LIMIT 1`,
      [name]
    );
    if (result.rows.length) return Number(result.rows[0].Id);
  }

  const fallback = await client.query(
    `SELECT "Id" FROM "UserTypes" WHERE "UserType" = $1 LIMIT 1`,
    [fallbackName]
  );
  return fallback.rows.length ? Number(fallback.rows[0].Id) : null;
};

const buildMobile = (bucket, index, runId) => {
  const raw = `${bucket}${String(index).padStart(3, "0")}${String(runId).slice(-6)}`;
  return raw.slice(0, 10).padEnd(10, "0");
};

const insertUser = async ({
  client,
  name,
  email,
  passwordHash,
  mobile,
  companyId,
  roleId,
  userTypeId,
  managerId,
  createdBy,
  hierarchyLevel,
  hierarchyPath,
}) => {
  const result = await client.query(
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
        "HierarchyPath",
        "IsActive",
        "IsDelete"
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,TRUE,FALSE)
      RETURNING "UserId"
    `,
    [
      name,
      email,
      passwordHash,
      mobile,
      companyId,
      roleId,
      userTypeId,
      managerId,
      createdBy,
      hierarchyLevel,
      hierarchyPath,
    ]
  );
  return Number(result.rows[0].UserId);
};

const seedBatch = async ({
  client,
  batchSize,
  batchLabel,
  runId,
  seedPrefix,
  emailDomain,
  passwordHash,
  parent,
  roleId,
  userTypeId,
  outputIds,
}) => {
  for (let index = 1; index <= batchSize; index += 1) {
    const name = `${batchLabel} ${String(index).padStart(2, "0")}`;
    const email = `${seedPrefix}.${runId}.${batchLabel.replace(/\s+/g, "").toLowerCase()}.${String(index).padStart(2, "0")}@${emailDomain}`;
    const mobile = buildMobile(batchLabel.charCodeAt(0), index, runId);
    const hierarchyLevel = Number(parent.HierarchyLevel || 0) + 1;

    const userId = await insertUser({
      client,
      name,
      email,
      passwordHash,
      mobile,
      companyId: parent.CompanyId,
      roleId,
      userTypeId,
      managerId: parent.UserId,
      createdBy: parent.UserId,
      hierarchyLevel,
      hierarchyPath: `${parent.HierarchyPath || parent.UserId}/${parent.UserId}-PENDING`,
    });

    const finalPath = `${parent.HierarchyPath || parent.UserId}/${userId}`;
    await client.query(
      `UPDATE "Users" SET "HierarchyPath" = $1 WHERE "UserId" = $2`,
      [finalPath, userId]
    );

    outputIds.push(userId);
  }
};

const run = async () => {
  const batchSize = parseIntArg("batch-size", DEFAULT_BATCH_SIZE);
  const seedPrefix = parseArg("seed-prefix", DEFAULT_SEED_PREFIX);
  const emailDomain = parseArg("email-domain", DEFAULT_EMAIL_DOMAIN);
  const password = parseArg("password", DEFAULT_PASSWORD);
  const runId = Date.now();

  const client = await appPool.connect();
  try {
    await client.query("BEGIN");

    const superAdminResult = await client.query(
      `
        SELECT u."UserId", u."CompanyId", COALESCE(u."HierarchyLevel", 0) AS "HierarchyLevel", u."HierarchyPath"
        FROM "Users" u
        JOIN "Roles" r ON r."Id" = u."RoleId"
        WHERE u."IsDelete" = FALSE
          AND r."RoleName" ILIKE 'Super Admin'
        ORDER BY u."UserId"
        LIMIT 1
      `
    );

    if (!superAdminResult.rows.length) {
      throw new Error("No Super Admin user found.");
    }

    const superAdmin = superAdminResult.rows[0];
    const superAdminNode = {
      UserId: Number(superAdmin.UserId),
      CompanyId: Number(superAdmin.CompanyId),
      HierarchyLevel: Number(superAdmin.HierarchyLevel || 0),
      HierarchyPath: superAdmin.HierarchyPath || String(superAdmin.UserId),
    };

    const roleAdmin = await ensureRoleId(client, "Admin");
    const roleCompanyOwner = await ensureRoleId(client, "Company Owner");
    const roleManager = await ensureRoleId(client, "Manager");
    const roleEmployee = await ensureRoleId(client, "Employee");

    const userTypeAdmin = await findUserTypeId(client, ["Admin", "Super Admin"]);
    const userTypeCompany = await findUserTypeId(client, ["Admin", "Manager"]);
    const userTypeManager = await findUserTypeId(client, ["Manager", "Admin"]);
    const userTypeEmployee = await findUserTypeId(client, ["Support Executive", "Sales Executive", "Admin"]);

    const passwordHash = await bcrypt.hash(password, 10);

    const level1Ids = [];
    await seedBatch({
      client,
      batchSize,
      batchLabel: "AdminUser",
      runId,
      seedPrefix,
      emailDomain,
      passwordHash,
      parent: superAdminNode,
      roleId: roleAdmin,
      userTypeId: userTypeAdmin,
      outputIds: level1Ids,
    });

    const chosenAdminId = level1Ids[0];
    const chosenAdminResult = await client.query(
      `SELECT "UserId", "CompanyId", "HierarchyLevel", "HierarchyPath" FROM "Users" WHERE "UserId" = $1 LIMIT 1`,
      [chosenAdminId]
    );
    const chosenAdmin = chosenAdminResult.rows[0];

    const level2Ids = [];
    await seedBatch({
      client,
      batchSize,
      batchLabel: "CompanyUser",
      runId,
      seedPrefix,
      emailDomain,
      passwordHash,
      parent: {
        UserId: Number(chosenAdmin.UserId),
        CompanyId: Number(chosenAdmin.CompanyId),
        HierarchyLevel: Number(chosenAdmin.HierarchyLevel || 0),
        HierarchyPath: chosenAdmin.HierarchyPath || String(chosenAdmin.UserId),
      },
      roleId: roleCompanyOwner,
      userTypeId: userTypeCompany,
      outputIds: level2Ids,
    });

    const chosenCompanyUserId = level2Ids[0];
    const chosenCompanyUserResult = await client.query(
      `SELECT "UserId", "CompanyId", "HierarchyLevel", "HierarchyPath" FROM "Users" WHERE "UserId" = $1 LIMIT 1`,
      [chosenCompanyUserId]
    );
    const chosenCompanyUser = chosenCompanyUserResult.rows[0];

    const level3Ids = [];
    await seedBatch({
      client,
      batchSize,
      batchLabel: "ManagerUser",
      runId,
      seedPrefix,
      emailDomain,
      passwordHash,
      parent: {
        UserId: Number(chosenCompanyUser.UserId),
        CompanyId: Number(chosenCompanyUser.CompanyId),
        HierarchyLevel: Number(chosenCompanyUser.HierarchyLevel || 0),
        HierarchyPath: chosenCompanyUser.HierarchyPath || String(chosenCompanyUser.UserId),
      },
      roleId: roleManager,
      userTypeId: userTypeManager,
      outputIds: level3Ids,
    });

    const chosenManagerId = level3Ids[0];
    const chosenManagerResult = await client.query(
      `SELECT "UserId", "CompanyId", "HierarchyLevel", "HierarchyPath" FROM "Users" WHERE "UserId" = $1 LIMIT 1`,
      [chosenManagerId]
    );
    const chosenManager = chosenManagerResult.rows[0];

    const level4Ids = [];
    await seedBatch({
      client,
      batchSize,
      batchLabel: "AnyUser",
      runId,
      seedPrefix,
      emailDomain,
      passwordHash,
      parent: {
        UserId: Number(chosenManager.UserId),
        CompanyId: Number(chosenManager.CompanyId),
        HierarchyLevel: Number(chosenManager.HierarchyLevel || 0),
        HierarchyPath: chosenManager.HierarchyPath || String(chosenManager.UserId),
      },
      roleId: roleEmployee,
      userTypeId: userTypeEmployee,
      outputIds: level4Ids,
    });

    await client.query("COMMIT");

    const totalInserted = level1Ids.length + level2Ids.length + level3Ids.length + level4Ids.length;
    console.log("✅ Seed complete: Super Admin cascading 60-child batches");
    console.log(`Super Admin UserId: ${superAdminNode.UserId}`);
    console.log(`Level A (under Super Admin): ${level1Ids.length}`);
    console.log(`Chosen Admin UserId: ${chosenAdminId}`);
    console.log(`Level B (under chosen Admin): ${level2Ids.length}`);
    console.log(`Chosen Company UserId: ${chosenCompanyUserId}`);
    console.log(`Level C (under chosen Company User): ${level3Ids.length}`);
    console.log(`Chosen Manager UserId: ${chosenManagerId}`);
    console.log(`Level D (under chosen Manager): ${level4Ids.length}`);
    console.log(`Total inserted: ${totalInserted}`);
    console.log(`Seed key: ${seedPrefix}.${runId}`);
    console.log(`Password for seeded users: ${password}`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Failed to seed cascading users:", error);
    process.exitCode = 1;
  } finally {
    client.release();
    await appPool.end();
  }
};

run();
