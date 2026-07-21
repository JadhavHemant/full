const { appPool } = require('../config/db');

(async () => {
  const tables = await appPool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
  );
  console.log('=== TABLES ===');
  console.log(tables.rows.map(x => x.table_name).join('\n'));

  // Check key table columns
  const checkCols = ['Departments', 'Designations', 'Employees', 'ApprovalWorkflows'];
  for (const t of checkCols) {
    try {
      const cols = await appPool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
        [t]
      );
      console.log(`\n=== ${t} columns ===`);
      console.log(cols.rows.map(x => x.column_name).join(', '));
    } catch (e) {
      // Try quoted
      try {
        const cols = await appPool.query(
          `SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
          [`"${t}"`]
        );
        console.log(`\n=== ${t} columns (quoted) ===`);
        console.log(cols.rows.map(x => x.column_name).join(', '));
      } catch (e2) {
        console.log(`\n=== ${t}: NOT FOUND ===`);
      }
    }
  }

  await appPool.end();
})();