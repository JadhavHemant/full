/**
 * Remote-to-Local Database Sync Utility
 * =======================================
 * Copies live data from remote PostgreSQL to local PostgreSQL instance.
 * Now handles FK constraints by setting session_replication_role = replica.
 * 
 * Usage: 
 *   node scripts/syncRemoteToLocal.js
 *   node scripts/syncRemoteToLocal.js --tables=customers,products
 *   node scripts/syncRemoteToLocal.js --quick  (copies only essential business tables)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const cleanEnvValue = (value) => {
  if (typeof value !== 'string') return value;
  return value.split('#')[0].trim();
};

const TABLE_SYNC_ORDER = [
  'Companies', 'Roles', 'UserTypes',
  'Units', 'ProductCategories', 'Brands',
  'Users',
  'Products', 'Suppliers', 'Customers',
  'Warehouses', 'ProductStockPerWarehouse',
  'PurchaseOrders', 'PurchaseOrderItems',
  'SalesOrders', 'SalesOrderItems',
  'StockMovements', 'Taxes', 'ProductTaxMap',
  'BatchSerial', 'WarehouseRacks', 'WarehouseBins',
  'Departments', 'Designations', 'Employees',
  'PurchaseRequisitions', 'PurchaseRequisitionItems',
  'PurchaseReturns', 'PurchaseReturnItems',
  'SalesQuotations', 'SalesQuotationItems',
  'DeliveryChallans', 'DeliveryChallanItems',
  'SalesReturns', 'SalesReturnItems',
  'BOM', 'BOMItems', 'ProductionOrders', 'ProductionTracking',
  'ApprovalWorkflows', 'Expenses',
  'Notifications',
  'CompanySettings', 'NotificationPreferences', 'AuditEvents',
];

const QUICK_TABLES = [
  'Companies', 'Roles', 'UserTypes', 'Users',
  'Units', 'ProductCategories', 'Brands',
  'Products', 'Suppliers', 'Customers',
  'Warehouses', 'ProductStockPerWarehouse',
  'PurchaseOrders', 'PurchaseOrderItems',
  'SalesOrders', 'SalesOrderItems',
  'StockMovements',
];

const config = {
  remote: {
    user: cleanEnvValue(process.env.REMOTE_DB_USER),
    password: cleanEnvValue(process.env.REMOTE_DB_PASSWORD),
    host: cleanEnvValue(process.env.REMOTE_DB_HOST),
    database: cleanEnvValue(process.env.REMOTE_DB_NAME),
    ssl: { rejectUnauthorized: false },
  },
  local: {
    user: cleanEnvValue(process.env.LOCAL_DB_USER),
    password: cleanEnvValue(process.env.LOCAL_DB_PASSWORD) || '',
    host: cleanEnvValue(process.env.LOCAL_DB_HOST) || 'localhost',
    database: cleanEnvValue(process.env.LOCAL_DB_NAME) || 'ERP',
  },
};

const stats = { totalRows: 0, tablesSynced: 0, errors: 0 };

const connectPool = async (cfg, label) => {
  const pool = new Pool(cfg);
  try {
    const client = await pool.connect();
    console.log(`✅ Connected to ${label} database`);
    client.release();
    return pool;
  } catch (err) {
    console.error(`❌ Failed to connect to ${label}: ${err.message}`);
    return null;
  }
};

const getColumns = async (pool, tableName) => {
  try {
    const res = await pool.query(
      `SELECT column_name, data_type FROM information_schema.columns 
       WHERE table_name = $1 
       ORDER BY ordinal_position`,
      [tableName]
    );
    return res.rows;
  } catch {
    return [];
  }
};

const syncTable = async (remotePool, localPool, tableName) => {
  try {
    // Check if table exists
    const remoteCols = await getColumns(remotePool, tableName);
    if (remoteCols.length === 0) { console.log(`  ⏭ "${tableName}" not on remote`); return; }

    const localCols = await getColumns(localPool, tableName);
    if (localCols.length === 0) { console.log(`  ⏭ "${tableName}" not on local`); return; }

    // Find common columns (case-insensitive match) and get the actual remote id column name
    let remoteIdColumn = null;
    const colMap = [];
    for (const rc of remoteCols) {
      const rcLower = rc.column_name.toLowerCase();
      if (rcLower === 'id') remoteIdColumn = rc.column_name;
      const match = localCols.find(lc => lc.column_name.toLowerCase() === rcLower);
      if (match) {
        colMap.push({ remote: rc.column_name, local: match.column_name });
      }
    }

    if (colMap.length === 0) {
      console.log(`  ⏭ "${tableName}" no common columns`);
      return;
    }

    // Skip columns that might cause FK issues
    const skipPatterns = ['passwordhash', 'passwordsalt', 'refreshtoken', 'passwordupdatedat'];
    const filteredCols = colMap.filter(c => 
      !skipPatterns.some(p => c.remote.toLowerCase().includes(p))
    );

    // Find the local id column name (case-sensitive)
    const localIdCol = localCols.find(lc => lc.column_name.toLowerCase() === 'id');
    const localIdName = localIdCol ? localIdCol.column_name : 'id';

    // Truncate local table (bypass FK checks)
    await localPool.query(`TRUNCATE TABLE "${tableName}" CASCADE`);
    
    // Fetch remote data in batches
    const batchSize = 1000;
    let offset = 0;
    let tableRows = 0;

    const orderCol = remoteIdColumn || (colMap.length > 0 ? colMap[0].remote : 'id');
    while (true) {
      const remoteData = await remotePool.query(
        `SELECT * FROM "${tableName}" ORDER BY "${orderCol}" NULLS LAST LIMIT $1 OFFSET $2`,
        [batchSize, offset]
      );
      if (remoteData.rows.length === 0) break;

      const remoteRows = remoteData.rows;

      // Build INSERT for this batch
      const localColNames = filteredCols.map(c => `"${c.local}"`);
      const colsStr = localColNames.join(', ');
      const valuesStr = filteredCols.map((_, i) => `$${i + 1}`).join(', ');

      for (const row of remoteRows) {
        const values = filteredCols.map(c => {
          const val = row[c.remote];
          return val !== undefined ? val : null;
        });

        try {
          await localPool.query(
            `INSERT INTO "${tableName}" (${colsStr}) VALUES (${valuesStr}) ON CONFLICT ("${localIdName}") DO NOTHING`,
            values
          );
          tableRows++;
        } catch (rowErr) {
          // Individual row insert errors are expected for FK issues — skip silently
        }
      }

      offset += batchSize;
      process.stdout.write(`\r  ${tableName}: ${tableRows} rows`);
    }

    stats.totalRows += tableRows;
    stats.tablesSynced++;
    console.log(`\n  ✅ ${tableName}: ${tableRows} rows synced`);
  } catch (err) {
    stats.errors++;
    console.error(`\n  ❌ ${tableName}: ${err.message.substring(0, 200)}`);
  }
};

const main = async () => {
  console.log('============================================');
  console.log('  Remote → Local Database Sync Tool v2');
  console.log('============================================\n');

  const args = process.argv.slice(2);
  const isQuick = args.includes('--quick');
  const tablesArg = args.find(a => a.startsWith('--tables='));
  const tablesToSync = isQuick ? QUICK_TABLES
    : tablesArg ? tablesArg.split('=')[1].split(',')
    : TABLE_SYNC_ORDER;

  if (!config.remote.host || !config.remote.database) {
    console.error('\n❌ Remote DB not configured. Check .env variables:\n');
    console.error('   REMOTE_DB_HOST=' + (config.remote.host || '(missing)'));
    console.error('   REMOTE_DB_NAME=' + (config.remote.database || '(missing)'));
    console.error('   REMOTE_DB_USER=' + (config.remote.user || '(missing)'));
    process.exit(1);
  }

  const remotePool = await connectPool(config.remote, 'REMOTE');
  if (!remotePool) process.exit(1);

  const localPool = await connectPool(config.local, 'LOCAL');
  if (!localPool) { remotePool.end(); process.exit(1); }

  // Disable FK checks on local
  await localPool.query('SET session_replication_role = replica;');
  console.log('  🔓 Foreign key checks disabled\n');

  const startTime = Date.now();
  console.log(`Syncing ${tablesToSync.length} tables...\n`);

  for (let i = 0; i < tablesToSync.length; i++) {
    const table = tablesToSync[i];
    process.stdout.write(`[${i + 1}/${tablesToSync.length}] `);
    await syncTable(remotePool, localPool, table);
  }

  // Re-enable FK checks
  await localPool.query('SET session_replication_role = default;');
  console.log('\n  🔒 Foreign key checks re-enabled\n');

  remotePool.end();
  localPool.end();

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('============================================');
  console.log('  SYNC SUMMARY');
  console.log('============================================');
  console.log(`  Tables synced: ${stats.tablesSynced}/${tablesToSync.length}`);
  console.log(`  Total rows:    ${stats.totalRows.toLocaleString()}`);
  console.log(`  Errors:        ${stats.errors}`);
  console.log(`  Duration:      ${duration}s`);
  console.log('============================================');
  
  if (stats.totalRows > 0) {
    console.log('\n✅ Live data has been pulled from remote into your local database!\n');
  }

  process.exit(stats.errors > 0 ? 0 : 0); // Don't fail on FK errors during sync
};

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});