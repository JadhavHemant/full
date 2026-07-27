const { appPool } = require('../config/db');

const checkSchema = async () => {
  try {
    // Check all RBAC related tables
    const tables = ['Roles', 'Modules', 'Permissions', 'Menus', 'RolePermissions', 'MenuPermissions', 'Users'];
    
    for (const table of tables) {
      try {
        const result = await appPool.query(
          `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = '${table}' ORDER BY ordinal_position`
        );
        console.log(`\n${table} columns:`);
        result.rows.forEach(row => console.log(`  ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`));
      } catch (err) {
        console.log(`\n${table}: ERROR - ${err.message}`);
      }
    }
    
    // Check Roles content (might have been partially committed)
    try {
      const rolesResult = await appPool.query('SELECT "Id", "RoleName", "IsActive" FROM "Roles" ORDER BY "Id"');
      console.log('\n\nRoles data:');
      if (rolesResult.rows.length === 0) console.log('  (empty)');
      rolesResult.rows.forEach(row => console.log(`  ID: ${row.Id} | ${row.RoleName}`));
    } catch (err) {
      console.log('\nRoles data: ERROR -', err.message);
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await appPool.end();
  }
};

checkSchema();