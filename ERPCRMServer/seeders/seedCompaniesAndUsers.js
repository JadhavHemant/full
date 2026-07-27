'use strict';

/**
 * Companies & Users Seeder
 *
 * Creates:
 *   - 2 Companies
 *   - Each company has 2 Owners (CompanyAdmin, roleId=2)
 *   - Each company has 5 Users  (Employee,    roleId=4)
 *
 * Total: 2 companies, 4 owners, 10 users (14 users)
 *
 * Usage:  node seeders/seedCompaniesAndUsers.js
 *
 * Safe to re-run: uses ON CONFLICT / DO NOTHING for companies and
 * skips users whose email already exists.
 */

const bcrypt = require('bcryptjs');
const { appPool } = require('../config/db');

// ── Configuration ─────────────────────────────────────────────────────────────

const DEFAULT_PASSWORD = 'Pass@1234';

const COMPANIES = [
  {
    CompanyName: 'TechCorp Solutions',
    BusinessType: 'Software Development',
    GstNumber: '27AABCCTECH001',
    Address: '101 Tech Park, Hinjewadi',
    City: 'Pune',
    State: 'Maharashtra',
    Country: 'India',
    PostalCode: '411057',
    Website: 'https://techcorp.example.com',
    OwnerName: 'Rajesh Kumar',
    Email: 'contact@techcorp.example.com',
    Phone: '0201234567',
  },
  {
    CompanyName: 'Global Innovations Inc.',
    BusinessType: 'Manufacturing',
    GstNumber: '27AABCCTINNOV02',
    Address: '45 Industrial Area, Phase 3',
    City: 'Ahmedabad',
    State: 'Gujarat',
    Country: 'India',
    PostalCode: '380054',
    Website: 'https://globalinnovations.example.com',
    OwnerName: 'Priya Sharma',
    Email: 'info@globalinnovations.example.com',
    Phone: '0799876543',
  },
];

// roleId mapping (must match rbacSeeder.js / Roles table)
const ROLE_IDS = {
  SUPERADMIN: 1,
  COMPANY_ADMIN: 2,   // "Owner"
  MANAGER: 3,
  EMPLOYEE: 4,
  CUSTOMER: 5,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Ensure the Roles table has the five standard roles. */
const ensureRoles = async (client) => {
  const roles = [
    { id: 1, name: 'SuperAdmin' },
    { id: 2, name: 'CompanyAdmin' },
    { id: 3, name: 'Manager' },
    { id: 4, name: 'Employee' },
    { id: 5, name: 'Customer' },
  ];

  for (const role of roles) {
    await client.query(
      `INSERT INTO "Roles" ("Id", "RoleName", "IsActive", "IsDeleted", "Flag")
       VALUES ($1, $2, TRUE, FALSE, TRUE)
       ON CONFLICT ("Id") DO UPDATE
         SET "RoleName" = EXCLUDED."RoleName",
             "IsActive" = TRUE,
             "IsDeleted" = FALSE`,
      [role.id, role.name]
    );
  }

  // Advance the sequence past the manually inserted IDs
  await client.query(
    `SELECT setval(pg_get_serial_sequence('"Roles"', 'Id'), GREATEST((SELECT MAX("Id") FROM "Roles"), 5), true)`
  );

  console.log('  ✓ Roles ensured (SuperAdmin, CompanyAdmin, Manager, Employee, Customer)');
};

/** Create a company if it doesn't already exist (by email). Returns the company Id. */
const createCompany = async (client, company) => {
  const existing = await client.query(
    `SELECT "Id" FROM "Companies" WHERE LOWER("Email") = LOWER($1) AND "IsDelete" = FALSE`,
    [company.Email]
  );

  if (existing.rows.length > 0) {
    console.log(`  ✓ Company already exists: ${company.CompanyName} (Id: ${existing.rows[0].Id})`);
    return existing.rows[0].Id;
  }

  const result = await client.query(
    `INSERT INTO "Companies"
       ("CompanyName", "BusinessType", "GstNumber", "Address", "City", "State",
        "Country", "PostalCode", "Website", "OwnerName", "Email", "Phone",
        "IsActive", "Flag", "IsDelete", "CreatedAt", "UpdatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
             TRUE, TRUE, FALSE, NOW(), NOW())
     RETURNING "Id"`,
    [
      company.CompanyName, company.BusinessType, company.GstNumber,
      company.Address, company.City, company.State, company.Country,
      company.PostalCode, company.Website, company.OwnerName,
      company.Email, company.Phone,
    ]
  );

  console.log(`  ✓ Company created: ${company.CompanyName} (Id: ${result.rows[0].Id})`);
  return result.rows[0].Id;
};

/** Create a user if their email doesn't already exist. Returns the UserId. */
const createUser = async (client, params) => {
  const {
    name, email, roleId, companyId,
    reportingManagerId = null,
    hierarchyLevel = 0,
    userTypeId = null,
    createdBy = null,
  } = params;

  const normalizedEmail = email.toLowerCase();

  // Skip if user already exists
  const existing = await client.query(
    `SELECT "UserId" FROM "Users" WHERE LOWER("Email") = $1 AND "IsDelete" = FALSE`,
    [normalizedEmail]
  );

  if (existing.rows.length > 0) {
    console.log(`    ✓ User already exists: ${email} (UserId: ${existing.rows[0].UserId})`);
    return existing.rows[0].UserId;
  }

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 12);

  const result = await client.query(
    `INSERT INTO "Users"
       ("Name", "Email", "Password", "MobileNumber", "RoleId", "CompanyId",
        "UserTypeId", "ReportingManagerId", "HierarchyLevel", "HierarchyPath",
        "CreatedBy", "IsActive", "IsDelete", "EmailVerified", "Status",
        "PasswordChangedAt", "CreatedAt", "UpdatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, TRUE, FALSE, TRUE, 'active',
             NOW(), NOW(), NOW())
     RETURNING "UserId"`,
    [
      name, normalizedEmail, hashedPassword, null,
      roleId, companyId, userTypeId, reportingManagerId,
      hierarchyLevel, reportingManagerId ? `/${reportingManagerId}` : null,
      createdBy,
    ]
  );

  // Recalculate hierarchy path for this user
  await client.query(
    `UPDATE "Users"
     SET "HierarchyPath" = CASE
           WHEN "ReportingManagerId" IS NULL THEN '/' || "UserId"::text
           ELSE COALESCE(
             (SELECT "HierarchyPath" FROM "Users" WHERE "UserId" = "ReportingManagerId"),
             '/' || "ReportingManagerId"::text
           ) || '/' || "UserId"::text
         END
     WHERE "UserId" = $1`,
    [result.rows[0].UserId]
  );

  console.log(`    ✓ User created: ${email} (UserId: ${result.rows[0].UserId}, RoleId: ${roleId})`);
  return result.rows[0].UserId;
};

/** Find the SuperAdmin user (RoleId=1) to use as reporting manager for owners. */
const findSuperAdmin = async (client) => {
  const result = await client.query(
    `SELECT "UserId" FROM "Users" WHERE "RoleId" = 1 AND "IsDelete" = FALSE AND "IsActive" = TRUE LIMIT 1`
  );
  return result.rows.length > 0 ? result.rows[0].UserId : null;
};

// ── Main seeder ───────────────────────────────────────────────────────────────

const seedCompaniesAndUsers = async () => {
  const client = await appPool.connect();

  try {
    console.log('\n🌱 Starting Companies & Users seeder...\n');
    await client.query('BEGIN');

    // 1. Ensure roles exist
    await ensureRoles(client);

    // 2. Find SuperAdmin (for reporting manager of owners)
    const superAdminId = await findSuperAdmin(client);
    if (superAdminId) {
      console.log(`  ✓ SuperAdmin found (UserId: ${superAdminId}) — owners will report to them`);
    } else {
      console.log('  ⚠️  No SuperAdmin found — owners will have no reporting manager');
    }

    let totalOwners = 0;
    let totalUsers = 0;

    // 3. Create companies and their users
    for (let c = 0; c < COMPANIES.length; c++) {
      const company = COMPANIES[c];
      const companyId = await createCompany(client, company);

      console.log(`\n  ── Company ${c + 1}: ${company.CompanyName} (Id: ${companyId}) ──`);

      // --- 2 Owners (CompanyAdmin / roleId=2) ---
      const ownerEmails = [
        `owner${c + 1}a@${company.Email.split('@')[1]}`,
        `owner${c + 1}b@${company.Email.split('@')[1]}`,
      ];
      const ownerNames = [
        `${company.OwnerName} (Primary)`,
        `${company.OwnerName} (Secondary)`,
      ];

      const ownerIds = [];
      for (let i = 0; i < 2; i++) {
        const ownerId = await createUser(client, {
          name: ownerNames[i],
          email: ownerEmails[i],
          roleId: ROLE_IDS.COMPANY_ADMIN,
          companyId,
          reportingManagerId: superAdminId,
          hierarchyLevel: superAdminId ? 1 : 0,
          createdBy: superAdminId,
        });
        ownerIds.push(ownerId);
        totalOwners++;
      }

      // --- 5 Users (Employee / roleId=4) ---
      const userEmails = [
        `user${c + 1}1@${company.Email.split('@')[1]}`,
        `user${c + 1}2@${company.Email.split('@')[1]}`,
        `user${c + 1}3@${company.Email.split('@')[1]}`,
        `user${c + 1}4@${company.Email.split('@')[1]}`,
        `user${c + 1}5@${company.Email.split('@')[1]}`,
      ];
      const userNames = [
        `Employee One (${company.CompanyName})`,
        `Employee Two (${company.CompanyName})`,
        `Employee Three (${company.CompanyName})`,
        `Employee Four (${company.CompanyName})`,
        `Employee Five (${company.CompanyName})`,
      ];

      for (let i = 0; i < 5; i++) {
        // Alternate reporting manager between the 2 owners
        const managerId = ownerIds[i % 2];
        await createUser(client, {
          name: userNames[i],
          email: userEmails[i],
          roleId: ROLE_IDS.EMPLOYEE,
          companyId,
          reportingManagerId: managerId,
          hierarchyLevel: superAdminId ? 2 : 1,
          createdBy: ownerIds[0],
        });
        totalUsers++;
      }
    }

    // 4. Summary
    console.log('\n  ────────────────────────────────────────────');
    console.log(`  📊 Summary:`);
    console.log(`     Companies:  ${COMPANIES.length}`);
    console.log(`     Owners:     ${totalOwners} (CompanyAdmin, roleId=2)`);
    console.log(`     Users:      ${totalUsers} (Employee, roleId=4)`);
    console.log(`     Total:      ${totalOwners + totalUsers} users`);
    console.log(`     Password:   ${DEFAULT_PASSWORD} (all users)`);
    console.log('  ────────────────────────────────────────────\n');

    await client.query('COMMIT');
    console.log('✅ Companies & Users seeder completed successfully.\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Companies & Users seeder failed — transaction rolled back:', err.message);
    throw err;
  } finally {
    client.release();
  }
};

// Allow direct execution
if (require.main === module) {
  seedCompaniesAndUsers()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { seedCompaniesAndUsers };
