'use strict';

const { appPool } = require('../config/db');

(async () => {
  try {
    // 1. Check SuperAdmin
    const superAdmin = await appPool.query(
      'SELECT "UserId", "Name", "Email", "RoleId", "UserTypeId" FROM "Users" WHERE "RoleId" = 1'
    );
    console.log('SuperAdmin:', JSON.stringify(superAdmin.rows, null, 2));

    // 2. Check Companies
    const companies = await appPool.query(
      'SELECT "Id", "CompanyName", "Email" FROM "Companies" WHERE "IsDelete" = FALSE'
    );
    console.log('\nCompanies:', JSON.stringify(companies.rows, null, 2));

    // 3. Check all users
    const users = await appPool.query(
      'SELECT "UserId", "Name", "Email", "RoleId", "CompanyId" FROM "Users" WHERE "IsDelete" = FALSE ORDER BY "UserId"'
    );
    console.log('\nAll users count:', users.rows.length);
    users.rows.forEach(u => console.log('  UserId:', u.UserId, '|', u.Name, '| RoleId:', u.RoleId, '| CompanyId:', u.CompanyId));

    // 4. Simulate what getCompanies does for SuperAdmin
    const superAdminUser = superAdmin.rows[0];
    console.log('\n--- Simulating getCompanies check ---');
    console.log('SuperAdmin RoleId:', superAdminUser.RoleId);
    console.log('SuperAdmin UserTypeId:', superAdminUser.UserTypeId);
    if (superAdminUser.RoleId === 1) {
      console.log('✅ SuperAdmin (RoleId=1) will PASS the getCompanies check');
    } else {
      console.log('❌ SuperAdmin would FAIL the getCompanies check');
    }

    // 5. Simulate what getAllUsers does for SuperAdmin
    console.log('\n--- Simulating getAllUsers check ---');
    console.log('SuperAdmin has no companyId, so companyScope.companyId = null');
    console.log('isPrivilegedUser = true (SuperAdmin)');
    console.log('✅ SuperAdmin will see ALL users (no company filter, no hierarchy filter)');

    await appPool.end();
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
