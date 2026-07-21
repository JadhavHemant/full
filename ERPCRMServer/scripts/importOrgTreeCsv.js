const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { appPool } = require("../config/db");

const DEFAULT_PASSWORD = "Temp@123A";
const DEFAULT_UNASSIGNED_EMAIL = "unassigned.block@system.local";
const DEFAULT_UNASSIGNED_NAME = "Unassigned";

const parseArg = (name, fallback = "") => {
  const arg = process.argv.find((item) => item.startsWith(`--${name}=`));
  if (!arg) return fallback;
  const value = arg.split("=")[1];
  return value == null || value === "" ? fallback : value;
};

const normalizeBool = (value) =>
  String(value || "")
    .trim()
    .toLowerCase() === "true";

const normalizeEmail = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const stripBOM = (value) => value.replace(/^\uFEFF/, "");

const parseCsv = (content) => {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const ch = content[i];
    const next = content[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += ch;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
};

const sanitizeLocalPart = (value) => {
  const cleaned = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._+-]/g, ".");
  return cleaned.replace(/\.{2,}/g, ".").replace(/^\.+|\.+$/g, "") || "user";
};

const buildFallbackEmail = (employeeId, index) => {
  const key = sanitizeLocalPart(employeeId || `row${index + 1}`);
  return `${key}@org-import.local`;
};

const ensureUniqueEmail = (candidate, usedEmails, fallbackKey) => {
  const raw = normalizeEmail(candidate);
  let email = raw;

  if (!email || !email.includes("@")) {
    email = buildFallbackEmail(fallbackKey, 0);
  }

  if (!usedEmails.has(email)) {
    usedEmails.add(email);
    return email;
  }

  const [localPartRaw, domainPartRaw] = email.split("@");
  const localPart = sanitizeLocalPart(localPartRaw);
  const domainPart = sanitizeLocalPart(domainPartRaw || "org-import.local");
  const suffix = sanitizeLocalPart(fallbackKey || Date.now());
  const deduped = `${localPart}+${suffix}@${domainPart}`;

  if (!usedEmails.has(deduped)) {
    usedEmails.add(deduped);
    return deduped;
  }

  let counter = 1;
  let finalEmail = deduped;
  while (usedEmails.has(finalEmail)) {
    finalEmail = `${localPart}+${suffix}${counter}@${domainPart}`;
    counter += 1;
  }

  usedEmails.add(finalEmail);
  return finalEmail;
};

const getRoleAndUserType = ({ isRoot, isManager, ids }) => {
  if (isRoot) {
    return {
      roleId: ids.roleCompanyOwner,
      userTypeId: ids.userTypeAdmin,
    };
  }

  if (isManager) {
    return {
      roleId: ids.roleManager,
      userTypeId: ids.userTypeManager,
    };
  }

  return {
    roleId: ids.roleEmployee,
    userTypeId: ids.userTypeEmployee,
  };
};

const run = async () => {
  const csvPathArg = parseArg(
    "csv-path",
    "C:\\Users\\Soft\\Downloads\\Org Tree Master.csv"
  );
  const password = parseArg("password", DEFAULT_PASSWORD);
  const unassignedEmail = parseArg("unassigned-email", DEFAULT_UNASSIGNED_EMAIL);
  const unassignedName = parseArg("unassigned-name", DEFAULT_UNASSIGNED_NAME);

  const resolvedCsvPath = path.resolve(csvPathArg);
  if (!fs.existsSync(resolvedCsvPath)) {
    throw new Error(`CSV file not found: ${resolvedCsvPath}`);
  }

  const rawContent = fs.readFileSync(resolvedCsvPath, "utf8");
  const content = stripBOM(rawContent);
  const lines = content.split(/\r?\n/);
  const headerLineIndex = lines.findIndex((line) =>
    line.startsWith(
      '"Title","EmployeeId","Email","JobTitle","ManagerId","ManagerName","Department","DepartmentPath","ManagerStatus","IsManager","IsRoot","Active","PhotoUrl","HasPhoto","PrimaryEmail"'
    )
  );

  if (headerLineIndex < 0) {
    throw new Error("CSV header row was not found in the provided file.");
  }

  const csvOnly = lines.slice(headerLineIndex).join("\n");
  const parsedRows = parseCsv(csvOnly);
  if (parsedRows.length <= 1) {
    throw new Error("CSV contains no data rows.");
  }

  const headers = parsedRows[0].map((h) => String(h || "").trim());
  const indexByHeader = new Map(headers.map((h, idx) => [h, idx]));
  const requiredHeaders = [
    "Title",
    "EmployeeId",
    "Email",
    "PrimaryEmail",
    "ManagerId",
    "ManagerName",
    "Department",
    "DepartmentPath",
    "IsManager",
    "IsRoot",
    "Active",
  ];

  for (const requiredHeader of requiredHeaders) {
    if (!indexByHeader.has(requiredHeader)) {
      throw new Error(`Missing required header: ${requiredHeader}`);
    }
  }

  const rows = parsedRows
    .slice(1)
    .map((cols, idx) => {
      const get = (name) => String(cols[indexByHeader.get(name)] || "").trim();
      const title = get("Title");
      const employeeId = get("EmployeeId");
      const managerId = get("ManagerId");
      const department = get("Department");
      const departmentPath = get("DepartmentPath");
      const primaryEmail = get("PrimaryEmail");
      const email = get("Email");
      const active = normalizeBool(get("Active")) || get("Active") === "";
      const isManager = normalizeBool(get("IsManager"));
      const isRoot = normalizeBool(get("IsRoot"));

      return {
        rowNumber: idx + 2,
        name: title || `User ${idx + 1}`,
        employeeId: employeeId || `missing-emp-${idx + 1}`,
        managerId: managerId || "",
        managerName: get("ManagerName"),
        department,
        departmentPath,
        isManager,
        isRoot,
        isActive: active,
        primaryEmail,
        email,
      };
    })
    .filter((row) => row.name);

  const client = await appPool.connect();
  try {
    await client.query("BEGIN");

    const superAdminRes = await client.query(
      `
      SELECT u."UserId", u."Name", u."Email", u."CompanyId", u."RoleId", u."UserTypeId", u."HierarchyLevel", u."HierarchyPath"
      FROM "Users" u
      JOIN "Roles" r ON r."Id" = u."RoleId"
      WHERE LOWER(r."RoleName") = 'super admin'
        AND COALESCE(u."IsDelete", FALSE) = FALSE
      ORDER BY
        CASE WHEN LOWER(COALESCE(u."Name", '')) = 'super admin' THEN 0 ELSE 1 END,
        u."UserId"
      LIMIT 1;
    `
    );

    if (!superAdminRes.rows.length) {
      throw new Error("No active Super Admin was found.");
    }

    const superAdmin = superAdminRes.rows[0];
    const companyId = Number(superAdmin.CompanyId);

    const rolesRes = await client.query(`SELECT "Id", "RoleName" FROM "Roles";`);
    const roleByName = new Map(
      rolesRes.rows.map((r) => [String(r.RoleName || "").toLowerCase(), Number(r.Id)])
    );

    const userTypesRes = await client.query(`SELECT "Id", "UserType" FROM "UserTypes";`);
    const userTypeByName = new Map(
      userTypesRes.rows.map((r) => [String(r.UserType || "").toLowerCase(), Number(r.Id)])
    );

    const ids = {
      roleCompanyOwner:
        roleByName.get("company owner") ||
        roleByName.get("admin") ||
        Number(superAdmin.RoleId),
      roleManager:
        roleByName.get("manager") ||
        roleByName.get("team lead") ||
        roleByName.get("admin") ||
        Number(superAdmin.RoleId),
      roleEmployee:
        roleByName.get("employee") ||
        roleByName.get("viewer") ||
        roleByName.get("admin") ||
        Number(superAdmin.RoleId),
      userTypeAdmin:
        userTypeByName.get("admin") ||
        userTypeByName.get("super admin") ||
        Number(superAdmin.UserTypeId),
      userTypeManager:
        userTypeByName.get("manager") ||
        userTypeByName.get("team lead") ||
        userTypeByName.get("admin") ||
        Number(superAdmin.UserTypeId),
      userTypeEmployee:
        userTypeByName.get("support executive") ||
        userTypeByName.get("sales executive") ||
        userTypeByName.get("manager") ||
        userTypeByName.get("admin") ||
        Number(superAdmin.UserTypeId),
    };

    const defaultPasswordHash = await bcrypt.hash(password, 10);
    // Deduplicate only within current CSV rows. Existing DB emails are handled by upsert.
    const usedEmails = new Set();

    const employeeIdToUserId = new Map();
    const importedUserIds = [];

    const ensureUpsertUserByEmail = async ({
      name,
      email,
      roleId,
      userTypeId,
      isActive,
      createdBy,
      address = null,
      city = null,
      state = null,
      country = null,
      postalCode = null,
    }) => {
      const normalizedEmail = normalizeEmail(email);
      const existing = await client.query(
        `SELECT "UserId" FROM "Users" WHERE LOWER("Email") = $1 LIMIT 1`,
        [normalizedEmail]
      );

      if (existing.rows.length) {
        const userId = Number(existing.rows[0].UserId);
        await client.query(
          `
          UPDATE "Users"
          SET
            "Name" = $1,
            "Email" = LOWER($2),
            "CompanyId" = $3,
            "RoleId" = $4,
            "UserTypeId" = $5,
            "Address" = $6,
            "City" = $7,
            "State" = $8,
            "Country" = $9,
            "PostalCode" = $10,
            "CreatedBy" = COALESCE("CreatedBy", $11),
            "IsActive" = $12,
            "IsDelete" = FALSE
          WHERE "UserId" = $13
        `,
          [
            name,
            normalizedEmail,
            companyId,
            roleId,
            userTypeId,
            address,
            city,
            state,
            country,
            postalCode,
            createdBy,
            Boolean(isActive),
            userId,
          ]
        );
        return { userId, action: "updated" };
      }

      const inserted = await client.query(
        `
        INSERT INTO "Users" (
          "Name", "Email", "Password", "CompanyId", "RoleId", "UserTypeId",
          "CreatedBy", "Address", "City", "State", "Country", "PostalCode",
          "IsActive", "Flag", "IsDelete"
        )
        VALUES ($1, LOWER($2), $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, TRUE, FALSE)
        RETURNING "UserId"
      `,
        [
          name,
          normalizedEmail,
          defaultPasswordHash,
          companyId,
          roleId,
          userTypeId,
          createdBy,
          address,
          city,
          state,
          country,
          postalCode,
          Boolean(isActive),
        ]
      );
      return { userId: Number(inserted.rows[0].UserId), action: "inserted" };
    };

    const unassignedRoleId = ids.roleManager;
    const unassignedUserTypeId = ids.userTypeManager;
    const unassignedUser = await ensureUpsertUserByEmail({
      name: unassignedName,
      email: unassignedEmail,
      roleId: unassignedRoleId,
      userTypeId: unassignedUserTypeId,
      isActive: true,
      createdBy: Number(superAdmin.UserId),
      address: "System block for users without manager",
    });

    const unassignedUserId = Number(unassignedUser.userId);

    let insertedCount = 0;
    let updatedCount = 0;

    for (let idx = 0; idx < rows.length; idx += 1) {
      const row = rows[idx];
      const primary = normalizeEmail(row.primaryEmail);
      const backup = normalizeEmail(row.email);
      const resolvedEmail = ensureUniqueEmail(
        primary || backup || buildFallbackEmail(row.employeeId, idx),
        usedEmails,
        row.employeeId
      );

      const { roleId, userTypeId } = getRoleAndUserType({
        isRoot: row.isRoot,
        isManager: row.isManager,
        ids,
      });

      const upserted = await ensureUpsertUserByEmail({
        name: row.name,
        email: resolvedEmail,
        roleId,
        userTypeId,
        isActive: row.isActive,
        createdBy: Number(superAdmin.UserId),
        address: row.departmentPath || row.department || null,
        city: null,
        state: null,
        country: null,
        postalCode: null,
      });

      if (upserted.action === "inserted") insertedCount += 1;
      if (upserted.action === "updated") updatedCount += 1;

      employeeIdToUserId.set(row.employeeId, upserted.userId);
      importedUserIds.push(upserted.userId);
    }

    let unassignedMembers = 0;

    for (const row of rows) {
      const userId = employeeIdToUserId.get(row.employeeId);
      const mappedManager = row.managerId
        ? employeeIdToUserId.get(row.managerId) || null
        : null;

      let reportingManagerId = null;
      if (mappedManager && mappedManager !== userId) {
        reportingManagerId = mappedManager;
      } else if (row.isRoot) {
        reportingManagerId = Number(superAdmin.UserId);
      } else {
        reportingManagerId = unassignedUserId;
        unassignedMembers += 1;
      }

      await client.query(
        `
        UPDATE "Users"
        SET
          "ReportingManagerId" = $1,
          "CreatedBy" = COALESCE("CreatedBy", $1),
          "IsDelete" = FALSE
        WHERE "UserId" = $2
      `,
        [reportingManagerId, userId]
      );
    }

    await client.query(
      `
      UPDATE "Users"
      SET
        "ReportingManagerId" = $1,
        "CreatedBy" = COALESCE("CreatedBy", $1),
        "IsDelete" = FALSE,
        "IsActive" = TRUE
      WHERE "UserId" = $2
    `,
      [Number(superAdmin.UserId), unassignedUserId]
    );

    const recalcIds = [Number(superAdmin.UserId), unassignedUserId, ...importedUserIds];
    const uniqueRecalcIds = Array.from(new Set(recalcIds));

    const recalcRows = await client.query(
      `
      SELECT "UserId", "ReportingManagerId", "HierarchyLevel", "HierarchyPath"
      FROM "Users"
      WHERE "UserId" = ANY($1::int[])
    `,
      [uniqueRecalcIds]
    );

    const rowByUserId = new Map(
      recalcRows.rows.map((r) => [Number(r.UserId), { ...r, UserId: Number(r.UserId) }])
    );

    const computed = new Map();
    const inProgress = new Set();
    const superAdminId = Number(superAdmin.UserId);
    const superAdminBaseLevel =
      Number(superAdmin.HierarchyLevel) || Number(rowByUserId.get(superAdminId)?.HierarchyLevel) || 1;
    const superAdminBasePath =
      String(superAdmin.HierarchyPath || rowByUserId.get(superAdminId)?.HierarchyPath || superAdminId);

    const computeNode = (userId) => {
      if (computed.has(userId)) return computed.get(userId);
      if (userId === superAdminId) {
        const node = { level: superAdminBaseLevel, path: superAdminBasePath };
        computed.set(userId, node);
        return node;
      }

      if (inProgress.has(userId)) {
        const node = {
          level: superAdminBaseLevel + 1,
          path: `${superAdminBasePath}/${userId}`,
        };
        computed.set(userId, node);
        return node;
      }

      const row = rowByUserId.get(userId);
      if (!row) {
        return {
          level: superAdminBaseLevel + 1,
          path: `${superAdminBasePath}/${userId}`,
        };
      }

      inProgress.add(userId);
      const managerId = Number(row.ReportingManagerId || superAdminId);
      const managerNode = computeNode(managerId);
      const node = {
        level: Number(managerNode.level) + 1,
        path: `${managerNode.path}/${userId}`,
      };
      inProgress.delete(userId);
      computed.set(userId, node);
      return node;
    };

    const usersToRecalc = uniqueRecalcIds.filter((id) => id !== superAdminId);
    for (const id of usersToRecalc) {
      const node = computeNode(id);
      await client.query(
        `
        UPDATE "Users"
        SET "HierarchyLevel" = $1, "HierarchyPath" = $2
        WHERE "UserId" = $3
      `,
        [node.level, node.path, id]
      );
    }

    await client.query("COMMIT");

    console.log("Import complete.");
    console.log(`CSV rows processed: ${rows.length}`);
    console.log(`Inserted users: ${insertedCount}`);
    console.log(`Updated users: ${updatedCount}`);
    console.log(`Unassigned block userId: ${unassignedUserId}`);
    console.log(`Users assigned to Unassigned block: ${unassignedMembers}`);
    console.log(`Super Admin kept as root userId: ${superAdminId}`);
    console.log(`Default password for newly inserted users: ${password}`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Import failed:", error);
    process.exitCode = 1;
  } finally {
    client.release();
    await appPool.end();
  }
};

run();
