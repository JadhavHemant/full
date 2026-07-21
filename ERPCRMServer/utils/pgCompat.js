/**
 * PostgreSQL compatibility wrapper for MSSQL-style named parameters.
 * Converts @param style queries to $n positional params.
 * Converts result.recordset to result.rows compatibility.
 * Automatically quotes unquoted identifiers for PostgreSQL case sensitivity.
 */

// SQL keywords that should NOT be quoted
const SQL_KEYWORDS = new Set([
  'select', 'from', 'where', 'and', 'or', 'not', 'in', 'on', 'as', 'is', 'null',
  'insert', 'into', 'values', 'update', 'set', 'delete', 'create', 'drop', 'alter',
  'table', 'index', 'join', 'left', 'right', 'inner', 'outer', 'cross', 'full',
  'group', 'by', 'order', 'having', 'limit', 'offset', 'union', 'all', 'exists',
  'case', 'when', 'then', 'else', 'end', 'like', 'between', 'distinct', 'count',
  'sum', 'avg', 'min', 'max', 'coalesce', 'asc', 'desc', 'true', 'false',
  'returning', 'limit', 'offset', 'rows', 'only', 'fetch', 'next',
  'int', 'integer', 'varchar', 'text', 'boolean', 'numeric', 'timestamp', 'date',
  'serial', 'primary', 'key', 'references', 'default', 'now', 'current_timestamp',
  'current_date', 'interval', 'day', 'month', 'year', 'hour', 'minute', 'second',
  'upper', 'lower', 'trim', 'length', 'replace', 'substring', 'concat',
  'row_number', 'rank', 'dense_rank', 'over', 'partition', 'window',
  'with', 'recursive', 'lateral', 'unnest', 'array', 'json', 'jsonb',
  'ilike', 'similarity', 'trgm', 'using', 'natural', 'USING',
]);

// Common SQL functions that should NOT be quoted
const SQL_FUNCTIONS = new Set([
  'now', 'current_timestamp', 'current_date', 'current_time',
  'count', 'sum', 'avg', 'min', 'max', 'coalesce', 'nullif',
  'upper', 'lower', 'trim', 'length', 'replace', 'substring', 'concat',
  'to_char', 'to_date', 'to_timestamp', 'extract', 'date_trunc',
  'abs', 'round', 'ceil', 'floor', 'power', 'sqrt',
  'cast', 'convert', 'case', 'when', 'then', 'else', 'end',
  'row_number', 'rank', 'dense_rank', 'lag', 'lead', 'first_value', 'last_value',
  'string_agg', 'array_agg', 'json_agg', 'jsonb_agg',
  'generate_series', 'unnest', 'array_length',
  'pg_typeof', 'txid_current', 'md5', 'encode', 'decode',
  'scope_identity', 'getdate', 'isnull',
]);

/**
 * Quote unquoted identifiers to preserve case sensitivity in PostgreSQL.
 * Handles table names, column names, and aliases.
 */
function quoteIdentifiers(sql) {
  // Match identifiers: word chars preceded by certain chars or start of string
  // This is a heuristic approach - not perfect but handles most common cases
  return sql.replace(
    /(?<=[\s,\.(\[{]|^)([a-zA-Z_]\w*)(?=[\s,\.)\]}]|$)/gm,
    (match, ident) => {
      const lower = ident.toLowerCase();
      // Skip SQL keywords, functions, numbers, and already-quoted identifiers
      if (SQL_KEYWORDS.has(lower) || SQL_FUNCTIONS.has(lower) || /^\d+$/.test(ident)) {
        return match;
      }
      // Skip if already quoted
      if (ident.startsWith('"')) return match;
      // Quote the identifier
      return `"${ident}"`;
    }
  );
}

const pgQuery = async (pool, sql, params = {}) => {
  // If params is already an array, use text protocol to avoid prepared statement cache issues
  if (Array.isArray(params)) {
    const result = await pool.query({ text: sql, values: params });
    return { rows: result.rows, recordset: result.rows, rowCount: result.rowCount };
  }

  // Convert MSSQL @param style to PostgreSQL $n style
  let paramIdx = 0;
  const values = [];
  const convertedSql = sql.replace(/@(\w+)/g, (match, name) => {
    if (params.hasOwnProperty(name)) {
      paramIdx++;
      values.push(params[name]);
      return `$${paramIdx}`;
    }
    return match;
  });

  // Convert SCOPE_IDENTITY() to RETURNING "Id" if needed
  let finalSql = convertedSql;
  if (finalSql.includes('SCOPE_IDENTITY()')) {
    finalSql = finalSql.replace(/;\s*SELECT SCOPE_IDENTITY\(\)\s*AS\s*Id\s*;?/i, '');
    if (!finalSql.toUpperCase().includes('RETURNING')) {
      finalSql += ' RETURNING "Id"';
    }
  }

  // Convert GETDATE() to NOW()
  finalSql = finalSql.replace(/GETDATE\(\)/gi, 'NOW()');

  // Convert OFFSET @x ROWS FETCH NEXT @y ROWS ONLY to OFFSET $n LIMIT $n
  const offsetFetchMatch = finalSql.match(/OFFSET\s+\$(\d+)\s+ROWS\s+FETCH\s+NEXT\s+\$(\d+)\s+ROWS\s+ONLY/i);
  if (offsetFetchMatch) {
    const limitParam = values[parseInt(offsetFetchMatch[2]) - 1];
    const offsetParam = values[parseInt(offsetFetchMatch[1]) - 1];
    values[parseInt(offsetFetchMatch[1]) - 1] = offsetParam;
    values[parseInt(offsetFetchMatch[2]) - 1] = limitParam;
    finalSql = finalSql.replace(
      /OFFSET\s+\$\d+\s+ROWS\s+FETCH\s+NEXT\s+\$\d+\s+ROWS\s+ONLY/i,
      `OFFSET $${offsetFetchMatch[1]} LIMIT $${offsetFetchMatch[2]}`
    );
  }

  // Quote identifiers to handle PostgreSQL case sensitivity
  finalSql = quoteIdentifiers(finalSql);

  const result = await pool.query(finalSql, values);
  return { rows: result.rows, recordset: result.rows, rowCount: result.rowCount };
};

module.exports = { pgQuery, quoteIdentifiers };
