require("dotenv").config();

const { appPool } = require("../config/db");

const ROLE_DEFINITIONS = [
  { Id: 1, RoleName: "Super Admin", Description: "Platform owner", Level: 0 },
  { Id: 2, RoleName: "Admin", Description: "Organization administrator", Level: 1 },
  { Id: 3, RoleName: "Company Owner", Description: "Company owner", Level: 2 },
  { Id: 4, RoleName: "Manager", Description: "Team manager", Level: 3 },
  { Id: 5, RoleName: "Team Lead", Description: "Team lead", Level: 4 },
  { Id: 6, RoleName: "Sales Executive", Description: "Sales user", Level: 5 },
  { Id: 7, RoleName: "Support Executive", Description: "Support user", Level: 6 },
  { Id: 8, RoleName: "Employee", Description: "Regular employee", Level: 7 },
  { Id: 9, RoleName: "Viewer", Description: "Read-only user", Level: 8 },
];

const USER_TYPE_DEFINITIONS = [
  { Id: 1, UserType: "Super Admin" },
  { Id: 2, UserType: "Admin" },
  { Id: 3, UserType: "Company Owner" },
  { Id: 4, UserType: "Manager" },
  { Id: 5, UserType: "Team Lead" },
  { Id: 6, UserType: "Sales Executive" },
  { Id: 7, UserType: "Support Executive" },
  { Id: 8, UserType: "Employee" },
  { Id: 9, UserType: "Viewer" },
];

const quote = (column) => `"${column}"`;

const getTableColumns = async (client, tableName) => {
  const { rows } = await client.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1;
    `,
    [tableName]
  );

  return new Set(rows.map((row) => row.column_name));
};

const ensureRoles = async (client) => {
  const roleColumns = await getTableColumns(client, "Roles");
  let inserted = 0;

  for (const role of ROLE_DEFINITIONS) {
    const existingByName = await client.query(
      `SELECT "Id" FROM "Roles" WHERE LOWER("RoleName") = LOWER($1) LIMIT 1;`,
      [role.RoleName]
    );

    if (existingByName.rows.length) {
      continue;
    }

    const columns = ["RoleName"];
    const values = [role.RoleName];

    if (roleColumns.has("Description")) {
      columns.push("Description");
      values.push(role.Description);
    }

    if (roleColumns.has("Level")) {
      columns.push("Level");
      values.push(role.Level);
    }

    if (roleColumns.has("IsActive")) {
      columns.push("IsActive");
      values.push(true);
    }

    if (roleColumns.has("IsDeleted")) {
      columns.push("IsDeleted");
      values.push(false);
    }

    if (roleColumns.has("Flag")) {
      columns.push("Flag");
      values.push(true);
    }

    await client.query(
      `
        INSERT INTO "Roles" (${columns.map(quote).join(", ")})
        VALUES (${columns.map((_, index) => `$${index + 1}`).join(", ")});
      `,
      values
    );
    inserted += 1;
  }

  return inserted;
};

const ensureUserTypes = async (client) => {
  let inserted = 0;

  for (const userType of USER_TYPE_DEFINITIONS) {
    const existing = await client.query(
      `SELECT "Id" FROM "UserTypes" WHERE LOWER("UserType") = LOWER($1) LIMIT 1;`,
      [userType.UserType]
    );

    if (existing.rows.length) {
      continue;
    }

    await client.query(
      `
        INSERT INTO "UserTypes" ("UserType")
        VALUES ($1);
      `,
      [userType.UserType]
    );
    inserted += 1;
  }

  return inserted;
};

const main = async () => {
  const client = await appPool.connect();
  try {
    await client.query("BEGIN");

    const rolesInserted = await ensureRoles(client);
    const userTypesInserted = await ensureUserTypes(client);

    await client.query("COMMIT");

    console.log("Seed summary:");
    console.log(`Roles inserted: ${rolesInserted}`);
    console.log(`UserTypes inserted: ${userTypesInserted}`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to seed roles and user types:", error);
    process.exitCode = 1;
  } finally {
    client.release();
    await appPool.end();
  }
};

main();
