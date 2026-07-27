/**
 * Reset All Tables Script
 * 
 * Truncates ALL tables in the database and resets all sequences to start from ID=1.
 * WARNING: This will DELETE ALL DATA permanently!
 * 
 * Usage: node scripts/resetAllTables.js
 * 
 * After running, re-run seeders: node seeders/runSeeders.js
 */

const { appPool } = require('../config/db');

const resetAllTables = async () => {
  const client = await appPool.connect();
  
  try {
    console.log('🔴 WARNING: This will delete ALL data from ALL tables!');
    console.log('Starting database reset...\n');

    // Step 1: Get all user-defined table names (excluding system tables)
    const tablesResult = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    
    const tableNames = tablesResult.rows.map(r => r.tablename);
    console.log(`Found ${tableNames.length} tables to reset.\n`);

    // Step 2: Disable triggers temporarily to handle foreign keys
    await client.query('SET session_replication_role = replica;');
    console.log('✅ Triggers disabled');

    // Step 3: Truncate all tables with CASCADE
    for (const table of tableNames) {
      try {
        await client.query(`TRUNCATE TABLE "${table}" CASCADE;`);
        console.log(`  ✓ Truncated: ${table}`);
      } catch (err) {
        console.log(`  ⚠ Skipped ${table}: ${err.message}`);
      }
    }

    // Step 4: Re-enable triggers
    await client.query('SET session_replication_role = DEFAULT;');
    console.log('\n✅ Triggers re-enabled');

    // Step 5: Reset all sequences to start from 1
    const sequencesResult = await client.query(`
      SELECT sequence_name 
      FROM information_schema.sequences 
      WHERE sequence_schema = 'public'
    `);
    
    const sequenceNames = sequencesResult.rows.map(r => r.sequence_name);
    console.log(`\nResetting ${sequenceNames.length} sequences...`);

    for (const seq of sequenceNames) {
      try {
        await client.query(`ALTER SEQUENCE "${seq}" RESTART WITH 1;`);
        console.log(`  ✓ Reset sequence: ${seq} → 1`);
      } catch (err) {
        console.log(`  ⚠ Skipped sequence ${seq}: ${err.message}`);
      }
    }

    console.log('\n✅ Database reset complete!');
    console.log('   All tables truncated and sequences reset to start from ID=1.');
    console.log('\n📌 Next steps:');
    console.log('   Run seeders: node seeders/runSeeders.js');
    console.log('   Or run RBAC seeder: node seeders/rbacSeeder.js');

  } catch (error) {
    console.error('\n❌ Reset failed:', error.message);
    // Re-enable triggers on error
    try {
      await client.query('SET session_replication_role = DEFAULT;');
    } catch (_) {}
    throw error;
  } finally {
    client.release();
    await appPool.end();
  }
};

resetAllTables().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});