const { appPool } = require('../config/db');

const checkRoles = async () => {
  try {
    const result = await appPool.query('SELECT "Id", "RoleName", "IsActive" FROM "Roles" ORDER BY "Id"');
    console.log('Roles in database:');
    result.rows.forEach(row => {
      console.log(`  ID: ${row.Id} | Name: ${row.RoleName} | Active: ${row.IsActive}`);
    });
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await appPool.end();
  }
};

checkRoles();