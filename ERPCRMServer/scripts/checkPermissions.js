'use strict';

const { appPool } = require('../config/db');

(async () => {
  try {
    console.log('\n=== PERMISSIONS COUNT ===');
    const permCount = await appPool.query('SELECT COUNT(*) FROM "Permissions"');
    console.log(`  Total permissions: ${permCount.rows[0].count}`);

    console.log('\n=== ROLEPERMISSIONS COUNT ===');
    const rpCount = await appPool.query('SELECT "RoleId", COUNT(*) FROM "RolePermissions" GROUP BY "RoleId" ORDER BY "RoleId"');
    const roles = await appPool.query('SELECT "Id", "RoleName" FROM "Roles" ORDER BY "Id"');
    rpCount.rows.forEach(r => {
      const roleName = roles.rows.find(ro => ro.Id === r.RoleId)?.RoleName || 'Unknown';
      console.log(`  RoleId ${r.RoleId} (${roleName}): ${r.count} permissions`);
    });

    console.log('\n=== MENUPERMISSIONS COUNT ===');
    const mpCount = await appPool.query('SELECT "RoleId", COUNT(*) FROM "MenuPermissions" GROUP BY "RoleId" ORDER BY "RoleId"');
    mpCount.rows.forEach(r => {
      const roleName = roles.rows.find(ro => ro.Id === r.RoleId)?.RoleName || 'Unknown';
      console.log(`  RoleId ${r.RoleId} (${roleName}): ${r.count} menu permissions`);
    });

    console.log('\n=== USERS WITH THEIR ROLES ===');
    const users = await appPool.query(`
      SELECT u."UserId", u."Name", u."Email", u."RoleId", r."RoleName"
      FROM "Users" u
      LEFT JOIN "Roles" r ON r."Id" = u."RoleId"
      WHERE u."IsDelete" = FALSE
      ORDER BY u."UserId"
    `);
    users.rows.forEach(u => console.log(`  UserId: ${u.UserId} | ${u.Name} | Role: ${u.RoleName} (ID: ${u.RoleId})`));

    console.log('\n=== SAMPLE: CompanyAdmin (RoleId=2) permissions (first 10) ===');
    const adminPerms = await appPool.query(`
      SELECT p."PermissionKey"
      FROM "RolePermissions" rp
      JOIN "Permissions" p ON p."PermissionId" = rp."PermissionId"
      WHERE rp."RoleId" = 2 AND rp."Allowed" = TRUE
      ORDER BY p."PermissionKey"
      LIMIT 10
    `);
    adminPerms.rows.forEach(p => console.log(`    - ${p.PermissionKey}`));

    console.log('\n=== SAMPLE: Employee (RoleId=4) permissions (first 10) ===');
    const empPerms = await appPool.query(`
      SELECT p."PermissionKey"
      FROM "RolePermissions" rp
      JOIN "Permissions" p ON p."PermissionId" = rp."PermissionId"
      WHERE rp."RoleId" = 4 AND rp."Allowed" = TRUE
      ORDER BY p."PermissionKey"
      LIMIT 10
    `);
    empPerms.rows.forEach(p => console.log(`    - ${p.PermissionKey}`));

    console.log('\n✅ Role & permission check complete');
    await appPool.end();
  } catch (err) {
    console.error('Error:', err.message);
    try { await appPool.end(); } catch (e) {}
    process.exit(1);
  }
})();
