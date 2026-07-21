/**
 * Check if default users exist in the database and create them if they don't.
 * 
 * Usage: node scripts/checkAndSeedUsers.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const cleanEnvValue = (value) => {
  if (typeof value !== 'string') return value;
  return value.split('#')[0].trim();
};

const DB_CONFIG = {
  user: cleanEnvValue(process.env.LOCAL_DB_USER) || 'postgres',
  password: cleanEnvValue(process.env.LOCAL_DB_PASSWORD) || '',
  host: cleanEnvValue(process.env.LOCAL_DB_HOST) || 'localhost',
  database: cleanEnvValue(process.env.LOCAL_DB_NAME) || 'erptestingdatabase',
};

const PASSWORD = '@Hfghksdfsj737this';

const USERS = [
  { Name: 'Super Admin', Email: 'superadmin@erp.local', Password: PASSWORD, Role: 'SuperAdmin' },
  { Name: 'Admin User', Email: 'admin@erp.local', Password: PASSWORD, Role: 'Admin' },
  { Name: 'Manager User', Email: 'manager@erp.local', Password: PASSWORD, Role: 'Manager' },
  { Name: 'Employee User', Email: 'employee@erp.local', Password: PASSWORD, Role: 'Employee' },
  { Name: 'Viewer User', Email: 'viewer@erp.local', Password: PASSWORD, Role: 'Viewer' },
  { Name: 'Test Admin', Email: 'testadmin@erp.test', Password: 'Test@Admin123', Role: 'Admin' },
  { Name: 'Rahul Sharma', Email: 'rahul.sharma@example.com', Password: 'Admin@123', Role: 'Admin' },
];

const run = async () => {
  const pool = new Pool(DB_CONFIG);

  try {
    await pool.connect();
    console.log('Connected to local database\n');

    // Get existing users
    const existingResult = await pool.query('SELECT "Email" FROM "Users"');
    const existingEmails = new Set(existingResult.rows.map((r) => r.Email.toLowerCase()));
    console.log('Found ' + existingEmails.size + ' existing users in database.\n');

    // Get roles mapping (RoleName column, NOT Name)
    const rolesResult = await pool.query('SELECT "Id", "RoleName" FROM "Roles"');
    const roleMap = {};
    rolesResult.rows.forEach((r) => {
      roleMap[r.RoleName.toLowerCase().replace(/\s+/g, '')] = r.Id;
    });
    console.log('Available roles: ' + Object.keys(roleMap).join(', '));

    // Get user types (UserType column, NOT Name)
    const typesResult = await pool.query('SELECT "Id", "UserType" FROM "UserTypes"');
    const typeMap = {};
    typesResult.rows.forEach((t) => {
      typeMap[t.UserType.toLowerCase()] = t.Id;
    });
    console.log('Available user types: ' + Object.keys(typeMap).join(', '));

    // Get default company
    const companyResult = await pool.query('SELECT "Id" FROM "Companies" ORDER BY "Id" LIMIT 1');
    const companyId = companyResult.rows[0] ? companyResult.rows[0].Id : null;
    console.log('Default company ID: ' + (companyId || 'NONE') + '\n');

    let created = 0;
    let skipped = 0;

    for (const user of USERS) {
      const emailLower = user.Email.toLowerCase();
      if (existingEmails.has(emailLower)) {
        console.log('  SKIP: ' + user.Email + ' (already exists)');
        skipped++;
        continue;
      }

      // Find role - try exact match first, then normalized
      let roleId = roleMap[user.Role.toLowerCase()];
      if (!roleId) {
        // Try without spaces
        roleId = roleMap[user.Role.toLowerCase().replace(/\s+/g, '')];
      }
      if (!roleId) {
        // Fallback to admin role
        roleId = roleMap['admin'] || roleMap['superadmin'];
      }

      const userTypeId = typeMap['internal'];
      const passwordHash = await bcrypt.hash(user.Password, 10);

      if (!roleId) {
        console.log('  ERROR: No role found for ' + user.Email + ' (role: ' + user.Role + ')');
        continue;
      }

      await pool.query(
        'INSERT INTO "Users" ("Name", "Email", "Password", "RoleId", "UserTypeId", "CompanyId", "IsActive") VALUES ($1, $2, $3, $4, $5, $6, true)',
        [user.Name, user.Email, passwordHash, roleId, userTypeId || null, companyId || null]
      );
      console.log('  CREATED: ' + user.Email + ' / ' + user.Password + ' (' + user.Role + ')');
      created++;
    }

    console.log('\nDone! Created: ' + created + ', Skipped: ' + skipped + '\n');
    console.log('=== Available Login Credentials ===');
    for (const user of USERS) {
      console.log('  Email: ' + user.Email + '  |  Password: ' + user.Password);
    }
  } catch (error) {
    console.error('Error: ' + error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

run();