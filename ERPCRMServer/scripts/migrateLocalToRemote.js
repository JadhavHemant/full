require('dotenv').config();
const { Pool } = require('pg');

const {
  LOCAL_DB_NAME,
  LOCAL_DB_USER,
  LOCAL_DB_PASSWORD,
  LOCAL_DB_HOST,
  REMOTE_DB_NAME,
  REMOTE_DB_USER,
  REMOTE_DB_PASSWORD,
  REMOTE_DB_HOST,
} = process.env;

const args = process.argv.slice(2);
const isDryRun = !args.includes('--execute');
const batchSizeArg = args.find((arg) => arg.startsWith('--batch-size='));
const batchSize = batchSizeArg ? Number(batchSizeArg.split('=')[1]) : 250;

if (!Number.isInteger(batchSize) || batchSize <= 0) {
  console.error('Invalid batch size. Use --batch-size=<positive integer>.');
  process.exit(1);
}

const sourcePool = new Pool({
  user: LOCAL_DB_USER,
  host: LOCAL_DB_HOST,
  password: LOCAL_DB_PASSWORD,
  database: LOCAL_DB_NAME,
  ssl: false,
});

const targetPool = new Pool({
  user: REMOTE_DB_USER,
  host: REMOTE_DB_HOST,
  password: REMOTE_DB_PASSWORD,
  database: REMOTE_DB_NAME,
  ssl: { rejectUnauthorized: false },
});

const SYSTEM_TABLES = new Set([
  'pg_stat_statements',
]);

const DEFERRED_COLUMNS_BY_TABLE = {
  ChatAppChannels: ['LastMessageId'],
};

function quoteIdent(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`;
}

function makeRowValuePlaceholders(rowIndex, columnCount) {
  const start = rowIndex * columnCount;
  const placeholders = Array.from({ length: columnCount }, (_, columnIndex) => `$${start + columnIndex + 1}`);
  return `(${placeholders.join(', ')})`;
}

async function getTables(pool) {
  const query = `
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `;
  const { rows } = await pool.query(query);
  return rows
    .map((row) => row.tablename)
    .filter((tableName) => !SYSTEM_TABLES.has(tableName));
}

async function getTableColumns(pool, tableName) {
  const query = `
    SELECT
      column_name,
      ordinal_position
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
  `;
  const { rows } = await pool.query(query, [tableName]);
  return rows.map((row) => row.column_name);
}

function intersectColumns(sourceColumns, targetColumns) {
  const targetSet = new Set(targetColumns);
  return sourceColumns.filter((column) => targetSet.has(column));
}

async function getColumnMetaMap(pool, tableName) {
  const query = `
    SELECT column_name, data_type, is_generated, is_identity
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
  `;
  const { rows } = await pool.query(query, [tableName]);
  return new Map(rows.map((row) => [row.column_name, row]));
}

function normalizeJsonValue(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    try {
      JSON.parse(value);
      return value;
    } catch (error) {
      return JSON.stringify(value);
    }
  }

  return JSON.stringify(value);
}

function normalizeValueForTargetType(value, targetType) {
  if (targetType === 'json' || targetType === 'jsonb') {
    return normalizeJsonValue(value);
  }
  return value;
}

async function getPrimaryKeyColumns(pool, tableName) {
  const query = `
    SELECT kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
      AND tc.table_name = kcu.table_name
    WHERE tc.table_schema = 'public'
      AND tc.table_name = $1
      AND tc.constraint_type = 'PRIMARY KEY'
    ORDER BY kcu.ordinal_position
  `;
  const { rows } = await pool.query(query, [tableName]);
  return rows.map((row) => row.column_name);
}

async function getDependencyMap(pool, tableNames) {
  const query = `
    SELECT
      tc.table_name AS child_table,
      kcu.column_name AS child_column,
      ccu.table_name AS parent_table
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
      AND tc.table_name = kcu.table_name
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
      AND tc.table_schema = ccu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
  `;

  const { rows } = await pool.query(query);
  const knownTables = new Set(tableNames);
  const dependencyMap = new Map(tableNames.map((tableName) => [tableName, new Set()]));

  for (const row of rows) {
    const childTable = row.child_table;
    const childColumn = row.child_column;
    const parentTable = row.parent_table;
    if (!knownTables.has(childTable) || !knownTables.has(parentTable)) {
      continue;
    }
    const deferredColumns = DEFERRED_COLUMNS_BY_TABLE[childTable] || [];
    if (deferredColumns.includes(childColumn)) {
      continue;
    }
    if (childTable === parentTable) {
      continue;
    }
    dependencyMap.get(childTable).add(parentTable);
  }

  return dependencyMap;
}

function sortTablesByDependencies(tableNames, dependencyMap) {
  const sorted = [];
  const temporary = new Set();
  const permanent = new Set();

  function visit(tableName) {
    if (permanent.has(tableName)) {
      return;
    }
    if (temporary.has(tableName)) {
      return;
    }

    temporary.add(tableName);
    const dependencies = dependencyMap.get(tableName) || new Set();
    for (const dependency of dependencies) {
      visit(dependency);
    }
    temporary.delete(tableName);
    permanent.add(tableName);
    sorted.push(tableName);
  }

  for (const tableName of tableNames) {
    visit(tableName);
  }

  return sorted;
}

async function fetchRowCount(pool, tableName) {
  const query = `SELECT COUNT(*)::int AS count FROM public.${quoteIdent(tableName)}`;
  const { rows } = await pool.query(query);
  return rows[0]?.count || 0;
}

async function migrateTable(tableName, options = {}) {
  const deferredColumns = new Set(DEFERRED_COLUMNS_BY_TABLE[tableName] || []);
  const includeDeferredColumnsOnly = options.includeDeferredColumnsOnly || false;

  const [sourceColumns, targetColumns] = await Promise.all([
    getTableColumns(sourcePool, tableName),
    getTableColumns(targetPool, tableName),
  ]);

  if (sourceColumns.length === 0 || targetColumns.length === 0) {
    return { tableName, copied: 0, skipped: true, reason: 'no columns found' };
  }

  const sharedColumns = intersectColumns(sourceColumns, targetColumns);
  const columns = sharedColumns.filter((column) => {
    const isDeferred = deferredColumns.has(column);
    return includeDeferredColumnsOnly ? isDeferred : !isDeferred;
  });
  if (columns.length === 0) {
    return {
      tableName,
      copied: 0,
      skipped: true,
      reason: includeDeferredColumnsOnly ? 'no deferred columns to backfill' : 'no shared columns found',
    };
  }

  const primaryKeyColumns = await getPrimaryKeyColumns(targetPool, tableName);
  if (primaryKeyColumns.length === 0) {
    return { tableName, copied: 0, skipped: true, reason: 'no primary key found' };
  }

  const sharedPrimaryKeyColumns = primaryKeyColumns.filter((column) => columns.includes(column));
  if (includeDeferredColumnsOnly) {
    for (const primaryKeyColumn of primaryKeyColumns) {
      if (!columns.includes(primaryKeyColumn)) {
        columns.unshift(primaryKeyColumn);
      }
    }
  }

  const effectivePrimaryKeyColumns = primaryKeyColumns.filter((column) => columns.includes(column));
  if (effectivePrimaryKeyColumns.length !== primaryKeyColumns.length) {
    return { tableName, copied: 0, skipped: true, reason: 'primary key mismatch between source and target' };
  }

  const targetColumnMetaMap = await getColumnMetaMap(targetPool, tableName);
  const writableColumns = columns.filter((column) => {
    const meta = targetColumnMetaMap.get(column);
    if (!meta) {
      return false;
    }
    return meta.is_generated === 'NEVER';
  });

  if (writableColumns.length === 0) {
    return { tableName, copied: 0, skipped: true, reason: 'no writable shared columns found' };
  }

  columns.length = 0;
  columns.push(...writableColumns);

  const sourceCount = await fetchRowCount(sourcePool, tableName);
  if (sourceCount === 0) {
    return { tableName, copied: 0, skipped: false, reason: 'no source rows' };
  }

  if (isDryRun) {
    return { tableName, copied: sourceCount, skipped: false, reason: 'dry run' };
  }

  const columnListSql = columns.map(quoteIdent).join(', ');
  const pkListSql = effectivePrimaryKeyColumns.map(quoteIdent).join(', ');
  const updateColumns = columns.filter((column) => !effectivePrimaryKeyColumns.includes(column));
  const updateSql = updateColumns.length
    ? updateColumns.map((column) => `${quoteIdent(column)} = EXCLUDED.${quoteIdent(column)}`).join(', ')
    : `${quoteIdent(effectivePrimaryKeyColumns[0])} = EXCLUDED.${quoteIdent(effectivePrimaryKeyColumns[0])}`;

  let offset = 0;
  while (offset < sourceCount) {
    const sourceQuery = `
      SELECT ${columnListSql}
      FROM public.${quoteIdent(tableName)}
      ORDER BY ${pkListSql}
      OFFSET $1
      LIMIT $2
    `;
    const { rows } = await sourcePool.query(sourceQuery, [offset, batchSize]);
    if (rows.length === 0) {
      break;
    }

    const values = [];
    const valuesSql = rows
      .map((row, rowIndex) => {
        for (const column of columns) {
          const meta = targetColumnMetaMap.get(column);
          values.push(normalizeValueForTargetType(row[column], meta?.data_type));
        }
        return makeRowValuePlaceholders(rowIndex, columns.length);
      })
      .join(', ');

    const insertSql = `
      INSERT INTO public.${quoteIdent(tableName)} (${columnListSql})
      VALUES ${valuesSql}
      ON CONFLICT (${pkListSql})
      DO UPDATE SET ${updateSql}
    `;

    try {
      await targetPool.query(insertSql, values);
    } catch (error) {
      error.message = `${tableName}: ${error.message}`;
      throw error;
    }
    offset += rows.length;
  }

  return { tableName, copied: sourceCount, skipped: false, reason: 'migrated' };
}

async function backfillDeferredColumns(tableNames) {
  const deferredTables = tableNames.filter((tableName) => (DEFERRED_COLUMNS_BY_TABLE[tableName] || []).length > 0);
  const results = [];

  for (const tableName of deferredTables) {
    const deferredColumns = DEFERRED_COLUMNS_BY_TABLE[tableName] || [];
    const primaryKeyColumns = await getPrimaryKeyColumns(targetPool, tableName);
    const sourceCount = await fetchRowCount(sourcePool, tableName);

    if (deferredColumns.length === 0 || primaryKeyColumns.length === 0 || sourceCount === 0) {
      const result = {
        tableName,
        copied: sourceCount,
        skipped: deferredColumns.length === 0 || primaryKeyColumns.length === 0,
        reason: sourceCount === 0 ? 'no source rows' : 'deferred columns backfilled',
      };
      results.push(result);
      const status = result.skipped ? 'SKIPPED' : 'OK';
      console.log(`${status} ${tableName} deferred columns: ${result.copied} rows (${result.reason})`);
      continue;
    }

    if (!isDryRun) {
      const selectedColumns = [...primaryKeyColumns, ...deferredColumns];
      const selectSql = `
        SELECT ${selectedColumns.map(quoteIdent).join(', ')}
        FROM public.${quoteIdent(tableName)}
        ORDER BY ${primaryKeyColumns.map(quoteIdent).join(', ')}
      `;
      const { rows } = await sourcePool.query(selectSql);

      for (const row of rows) {
        for (const deferredColumn of deferredColumns) {
          const setSql = `
            UPDATE public.${quoteIdent(tableName)}
            SET ${quoteIdent(deferredColumn)} = $1
            WHERE ${primaryKeyColumns.map((column, index) => `${quoteIdent(column)} = $${index + 2}`).join(' AND ')}
          `;
          const params = [row[deferredColumn], ...primaryKeyColumns.map((column) => row[column])];
          await targetPool.query(setSql, params);
        }
      }
    }

    const result = { tableName, copied: sourceCount, skipped: false, reason: isDryRun ? 'dry run' : 'deferred columns backfilled' };
    results.push(result);
    const status = result.skipped ? 'SKIPPED' : 'OK';
    console.log(`${status} ${tableName} deferred columns: ${result.copied} rows (${result.reason})`);
  }

  return results;
}

async function updateSequences(pool, tableNames) {
  const query = `
    SELECT
      table_name,
      column_name,
      pg_get_serial_sequence(format('%I.%I', table_schema, table_name), column_name) AS sequence_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ANY($1::text[])
      AND column_default LIKE 'nextval(%'
  `;

  const { rows } = await pool.query(query, [tableNames]);

  for (const row of rows) {
    if (!row.sequence_name) {
      continue;
    }

    const sql = `
      SELECT setval(
        $1,
        COALESCE((SELECT MAX(${quoteIdent(row.column_name)}) FROM public.${quoteIdent(row.table_name)}), 1),
        COALESCE((SELECT COUNT(*) > 0 FROM public.${quoteIdent(row.table_name)}), false)
      )
    `;
    await pool.query(sql, [row.sequence_name]);
  }
}

async function main() {
  try {
    const [sourceTables, targetTables] = await Promise.all([
      getTables(sourcePool),
      getTables(targetPool),
    ]);

    const targetSet = new Set(targetTables);
    const commonTables = sourceTables.filter((tableName) => targetSet.has(tableName));

    if (commonTables.length === 0) {
      throw new Error('No matching public tables found between local and remote databases.');
    }

    const dependencyMap = await getDependencyMap(targetPool, commonTables);
    const orderedTables = sortTablesByDependencies(commonTables, dependencyMap);

    console.log(isDryRun ? 'DRY RUN: no changes will be written.' : 'EXECUTE MODE: writing data to remote database.');
    console.log(`Tables to process: ${orderedTables.length}`);

    const results = [];
    for (const tableName of orderedTables) {
      const result = await migrateTable(tableName);
      results.push(result);
      const status = result.skipped ? 'SKIPPED' : 'OK';
      console.log(`${status} ${tableName}: ${result.copied} rows (${result.reason})`);
    }

    if (!isDryRun) {
      const deferredResults = await backfillDeferredColumns(orderedTables);
      results.push(...deferredResults);
      await updateSequences(targetPool, orderedTables);
      console.log('Sequence values updated on remote database.');
    }

    const totalRows = results.reduce((sum, item) => sum + item.copied, 0);
    const migratedTables = results.filter((item) => !item.skipped).length;
    const skippedTables = results.filter((item) => item.skipped).length;

    console.log(`Done. ${migratedTables} tables processed, ${skippedTables} tables skipped, ${totalRows} total rows considered.`);
  } finally {
    await Promise.allSettled([sourcePool.end(), targetPool.end()]);
  }
}

main().catch((error) => {
  console.error('Migration failed:', error.message);
  process.exit(1);
});
