/**
 * RBAC System Test Suite
 * 
 * Tests the 5-role permission system:
 * - Each role can access what it should
 * - Each role cannot access what it shouldn't
 * - Scoped roles only see their own data
 * - Superadmin bypass works
 * - Customer lockdown works
 * 
 * Usage: node scripts/testRBAC.js
 */

const { appPool } = require('../config/db');
const { can, getEffectivePermissions, SUPER_ADMIN_ID, ADMIN_ID, MANAGER_ID, EMPLOYEE_ID, CUSTOMER_ID } = require('../utils/permissionChecker');

// ── Test Helpers ───────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const errors = [];

const assert = (condition, message) => {
  if (condition) {
    passed++;
    process.stdout.write('✅');
  } else {
    failed++;
    process.stdout.write('❌');
    errors.push(message);
  }
  console.log(` ${message}`);
};

const makeUser = (roleId, roleName, companyId = 1) => ({
  userId: 999,
  roleId,
  roleName,
  companyId,
  Email: 'test@test.com',
});

// ── Tests ──────────────────────────────────────────────────────────────

const runTests = async () => {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 RBAC System Test Suite');
  console.log('='.repeat(60) + '\n');

  // ── 1. Superadmin Tests ──
  console.log('📋 1. Superadmin (roleId=1) — Full Access');
  console.log('-'.repeat(40));

  const superadmin = makeUser(SUPER_ADMIN_ID, 'superadmin');

  const saPerms = await getEffectivePermissions(superadmin);
  assert(saPerms.permissions === null, 'Superadmin permissions should be null (full access)');
  assert(saPerms.roleName === 'superadmin', 'Superadmin roleName should be "superadmin"');

  const saTests = [
    ['users:view', true],
    ['users:create', true],
    ['users:edit', true],
    ['users:delete', true],
    ['settings:view', true],
    ['settings:manage', true],
    ['billing:read', true],
    ['billing:manage', true],
    ['reports:export', true],
    ['products:delete', true],
  ];

  for (const [perm, expected] of saTests) {
    const result = await can(superadmin, perm);
    assert(result.allowed === expected, `Superadmin ${perm} → ${expected ? 'ALLOWED' : 'DENIED'}`);
  }

  // ── 2. Admin Tests ──
  console.log('\n📋 2. Admin (roleId=2) — Full Access Within Company');
  console.log('-'.repeat(40));

  const admin = makeUser(ADMIN_ID, 'admin');

  const adminPerms = await getEffectivePermissions(admin);
  assert(adminPerms.permissions === null, 'Admin permissions should be null (full access within company)');

  const adminTests = [
    ['users:view', true],
    ['users:create', true],
    ['users:edit', true],
    ['users:delete', true],
    ['products:view', true],
    ['products:create', true],
    ['products:edit', true],
    ['products:delete', true],
    ['reports:view', true],
    ['reports:export', true],
    ['billing:view', true],
    ['billing:read', true],
    ['settings:view', false], // admin cannot access system settings
    ['settings:manage', false],
    ['roles:create', false], // admin cannot create roles
    ['roles:delete', false],
    ['companies:create', false], // admin cannot create companies
  ];

  for (const [perm, expected] of adminTests) {
    const result = await can(admin, perm);
    assert(result.allowed === expected, `Admin ${perm} → ${expected ? 'ALLOWED' : 'DENIED'}`);
  }

  // ── 3. Manager Tests ──
  console.log('\n📋 3. Manager (roleId=3) — Team-Scoped Access');
  console.log('-'.repeat(40));

  const manager = makeUser(MANAGER_ID, 'manager');

  const managerPerms = await getEffectivePermissions(manager);
  assert(managerPerms.permissions !== null, 'Manager permissions should not be null');
  assert(managerPerms.roleName === 'manager', 'Manager roleName should be "manager"');

  const managerTests = [
    ['dashboard:view', true],
    ['users:view', true],
    ['users:edit', true],
    ['users:create', false], // manager cannot create users
    ['users:delete', false], // manager cannot delete users
    ['products:view', true],
    ['products:create', true],
    ['products:edit', true],
    ['products:delete', false], // manager cannot delete products
    ['products:export', true],
    ['purchaseOrders:view', true],
    ['purchaseOrders:create', true],
    ['purchaseOrders:edit', true],
    ['purchaseOrders:delete', false],
    ['salesOrders:view', true],
    ['salesOrders:create', true],
    ['salesOrders:edit', true],
    ['salesOrders:delete', false],
    ['reports:view', true],
    ['reports:export', true],
    ['settings:view', false], // manager cannot access settings
    ['roles:view', false], // manager cannot view roles
    ['companies:view', false], // manager cannot view companies
    ['billing:view', true], // manager can view billing
    ['billing:manage', false], // manager cannot manage billing
    ['chat:view', true],
    ['chat:create', true],
    ['chat:edit', true],
    ['notifications:view', true],
  ];

  for (const [perm, expected] of managerTests) {
    const result = await can(manager, perm);
    assert(result.allowed === expected, `Manager ${perm} → ${expected ? 'ALLOWED' : 'DENIED'}`);
  }

  // ── 4. Employee Tests ──
  console.log('\n📋 4. Employee (roleId=4) — Read-Only Access');
  console.log('-'.repeat(40));

  const employee = makeUser(EMPLOYEE_ID, 'employee');

  const employeePerms = await getEffectivePermissions(employee);
  assert(employeePerms.permissions !== null, 'Employee permissions should not be null');

  const employeeTests = [
    ['dashboard:view', true],
    ['dashboard:create', false],
    ['dashboard:edit', false],
    ['products:view', true],
    ['products:create', false],
    ['products:edit', false],
    ['products:delete', false],
    ['products:export', true],
    ['categories:view', true],
    ['categories:create', false],
    ['stock:view', true],
    ['stock:create', false],
    ['stock:edit', false],
    ['purchaseOrders:view', true],
    ['purchaseOrders:create', false],
    ['salesOrders:view', true],
    ['salesOrders:create', false],
    ['customers:view', true],
    ['customers:create', false],
    ['users:view', false], // employee cannot view users
    ['users:create', false],
    ['settings:view', false],
    ['roles:view', false],
    ['companies:view', false],
    ['billing:view', false],
    ['chat:view', true],
    ['chat:create', false],
    ['notifications:view', true],
  ];

  for (const [perm, expected] of employeeTests) {
    const result = await can(employee, perm);
    assert(result.allowed === expected, `Employee ${perm} → ${expected ? 'ALLOWED' : 'DENIED'}`);
  }

  // ── 5. Customer/Viewer Tests ──
  console.log('\n📋 5. Customer/Viewer (roleId=5) — Own Data Only');
  console.log('-'.repeat(40));

  const customer = makeUser(CUSTOMER_ID, 'customer');

  const customerPerms = await getEffectivePermissions(customer);
  assert(customerPerms.permissions !== null, 'Customer permissions should not be null');
  assert(customerPerms.roleName === 'customer', 'Customer roleName should be "customer"');

  const customerTests = [
    ['salesOrders:view', true],
    ['salesOrders:create', false],
    ['salesOrders:edit', false],
    ['salesOrders:delete', false],
    ['invoices:view', true],
    ['invoices:create', false],
    ['invoices:edit', false],
    ['customers:view', true],
    ['customers:create', false],
    ['customers:edit', false],
    ['notifications:view', true],
    ['products:view', false], // customer cannot view products
    ['products:create', false],
    ['users:view', false],
    ['settings:view', false],
    ['roles:view', false],
    ['companies:view', false],
    ['billing:view', false],
    ['reports:view', false],
    ['dashboard:view', false],
    ['chat:view', false],
    ['purchaseOrders:view', false],
    ['stock:view', false],
  ];

  for (const [perm, expected] of customerTests) {
    const result = await can(customer, perm);
    assert(result.allowed === expected, `Customer ${perm} → ${expected ? 'ALLOWED' : 'DENIED'}`);
  }

  // ── 6. Edge Cases ──
  console.log('\n📋 6. Edge Cases');
  console.log('-'.repeat(40));

  // No user
  const noUserResult = await can(null, 'users:view');
  assert(!noUserResult.allowed, 'No user should be denied');

  // Unknown role
  const unknownUser = makeUser(99, 'unknown');
  const unknownResult = await can(unknownUser, 'users:view');
  assert(!unknownResult.allowed, 'Unknown role should be denied');

  // Unknown permission
  const unknownPermResult = await can(manager, 'nonexistent:view');
  assert(!unknownPermResult.allowed, 'Unknown permission should be denied');

  // Case insensitive role name
  const adminByName = makeUser(null, 'Admin');
  const adminByNameResult = await can(adminByName, 'users:view');
  assert(adminByNameResult.allowed, 'Admin by roleName should work');

  // ── 7. Database Verification ──
  console.log('\n📋 7. Database Verification');
  console.log('-'.repeat(40));

  try {
    const rolesResult = await appPool.query(
      `SELECT "Id", "RoleName", "Level" FROM "Roles" WHERE "IsActive" = TRUE AND "IsDeleted" = FALSE ORDER BY "Id"`
    );
    
    const activeRoles = rolesResult.rows;
    assert(activeRoles.length >= 5, `At least 5 active roles exist (found ${activeRoles.length})`);

    // Verify the 5 canonical roles exist
    const roleNames = activeRoles.map(r => r.RoleName.toLowerCase());
    assert(roleNames.includes('superadmin'), 'superadmin role exists');
    assert(roleNames.includes('admin'), 'admin role exists');
    assert(roleNames.includes('manager'), 'manager role exists');
    assert(roleNames.includes('employee'), 'employee role exists');
    assert(roleNames.includes('viewer') || roleNames.includes('customer'), 'viewer/customer role exists');

    // Check Users table has RoleId column
    const usersColResult = await appPool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'Users' AND column_name = 'RoleId'
    `);
    assert(usersColResult.rows.length > 0, 'Users table has RoleId column');

    // Check AuditLogs table exists
    const auditResult = await appPool.query(`
      SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'AuditLogs')
    `);
    assert(auditResult.rows[0].exists, 'AuditLogs table exists');

  } catch (dbError) {
    console.error('   ❌ Database verification error:', dbError.message);
    failed++;
  }

  // ── Summary ──
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results');
  console.log('='.repeat(60));
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📝 Total: ${passed + failed}`);

  if (errors.length > 0) {
    console.log('\n⚠️  Errors:');
    errors.forEach((e, i) => console.log(`   ${i + 1}. ${e}`));
  }

  if (failed === 0) {
    console.log('\n🎉 All tests passed! RBAC system is working correctly.\n');
  } else {
    console.log(`\n🔧 ${failed} test(s) failed. Review errors above.\n`);
  }

  await appPool.end();
  process.exit(failed > 0 ? 1 : 0);
};

// Run if called directly
if (require.main === module) {
  runTests().catch((err) => {
    console.error('\n❌ Test suite error:', err);
    process.exit(1);
  });
}

module.exports = { runTests };