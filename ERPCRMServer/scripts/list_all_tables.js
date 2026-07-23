const { appPool } = require('../config/db');

async function listAllTables() {
  try {
    const res = await appPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE' 
      ORDER BY table_name
    `);
    
    console.log('📋 All tables in database:\n');
    res.rows.forEach((r, i) => console.log(`${(i+1).toString().padStart(3)}. ${r.table_name}`));
    console.log(`\nTotal: ${res.rows.length} tables`);
    
    await appPool.end();
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

listAllTables();
