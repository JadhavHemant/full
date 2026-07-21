const { appPool } = require("../../config/db");

const toInt = (value, fallback = null) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const createHttpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const quoteIdent = (value) => {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw createHttpError(400, "Invalid identifier");
  }
  return `"${value}"`;
};

const resolveRoleId = async (req) => {
  const tokenRoleId = toInt(req.user?.roleId, null);
  if (tokenRoleId) return tokenRoleId;

  const userId = toInt(req.user?.userId, null);
  if (!userId) return null;

  const { rows } = await appPool.query(
    'SELECT "RoleId" FROM "Users" WHERE "UserId" = $1 LIMIT 1',
    [userId]
  );

  return toInt(rows[0]?.RoleId, null);
};

const ensureSuperAdmin = async (req) => {
  const roleId = await resolveRoleId(req);
  if (roleId !== 1) {
    throw createHttpError(403, "Only Super Admin can access table CRUD");
  }
};

const getAllTables = async () => {
  const { rows } = await appPool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  return rows.map((row) => row.table_name);
};

const resolveTableName = async (rawTableName) => {
  const requested = String(rawTableName || "").trim();
  if (!requested) {
    throw createHttpError(400, "Table name is required");
  }

  const tables = await getAllTables();
  const match = tables.find((table) => table.toLowerCase() === requested.toLowerCase());
  if (!match) {
    throw createHttpError(404, "Table not found");
  }

  return match;
};

const getTableColumns = async (tableName) => {
  const { rows } = await appPool.query(
    `
      SELECT
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        c.is_identity
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
      AND c.table_name = $1
      ORDER BY c.ordinal_position;
    `,
    [tableName]
  );

  return rows.map((row) => ({
    name: row.column_name,
    dataType: row.data_type,
    nullable: row.is_nullable === "YES",
    defaultValue: row.column_default,
    isIdentity: row.is_identity === "YES",
  }));
};

const getPrimaryKeyColumn = async (tableName) => {
  const { rows } = await appPool.query(
    `
      SELECT kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public'
      AND tc.table_name = $1
      AND tc.constraint_type = 'PRIMARY KEY'
      ORDER BY kcu.ordinal_position
      LIMIT 1;
    `,
    [tableName]
  );

  return rows[0]?.column_name || null;
};

const buildSearchClause = (search, columns, params) => {
  if (!search) return "";

  const searchableColumns = columns
    .filter((column) =>
      [
        "character varying",
        "character",
        "text",
        "uuid",
      ].includes(column.dataType)
    )
    .map((column) => column.name);

  if (!searchableColumns.length) return "";

  params.push(`%${search}%`);
  const paramIndex = params.length;
  const clauses = searchableColumns.map(
    (columnName) => `${quoteIdent(columnName)} ILIKE $${paramIndex}`
  );

  return `WHERE (${clauses.join(" OR ")})`;
};

const listTables = async (req, res) => {
  try {
    await ensureSuperAdmin(req);
    const tables = await getAllTables();
    const tableDetails = await Promise.all(
      tables.map(async (tableName) => {
        const [columns, primaryKey] = await Promise.all([
          getTableColumns(tableName),
          getPrimaryKeyColumn(tableName),
        ]);

        return {
          tableName,
          primaryKey,
          columns: columns.map((column) => column.name),
        };
      })
    );

    res.json({ data: tableDetails });
  } catch (error) {
    console.error("Error listing tables:", error);
    res.status(error.status || 500).json({
      message: error.status ? error.message : "Failed to list tables",
    });
  }
};

const getTableMeta = async (req, res) => {
  try {
    await ensureSuperAdmin(req);
    const tableName = await resolveTableName(req.params.tableName);
    const [columns, primaryKey] = await Promise.all([
      getTableColumns(tableName),
      getPrimaryKeyColumn(tableName),
    ]);

    res.json({
      tableName,
      primaryKey,
      columns,
    });
  } catch (error) {
    console.error("Error fetching table meta:", error);
    res.status(error.status || 500).json({
      message: error.status ? error.message : "Failed to fetch table metadata",
    });
  }
};

const listRows = async (req, res) => {
  try {
    await ensureSuperAdmin(req);
    const tableName = await resolveTableName(req.params.tableName);
    const [columns, primaryKey] = await Promise.all([
      getTableColumns(tableName),
      getPrimaryKeyColumn(tableName),
    ]);

    const limit = Math.min(200, Math.max(1, toInt(req.query.limit, 50)));
    const offset = Math.max(0, toInt(req.query.offset, 0));
    const search = String(req.query.search || "").trim();
    const sortByRaw = String(req.query.sortBy || primaryKey || columns[0]?.name || "").trim();
    const sortOrder = String(req.query.sortOrder || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC";

    const allowedColumns = new Set(columns.map((column) => column.name));
    const sortBy = allowedColumns.has(sortByRaw) ? sortByRaw : primaryKey || columns[0]?.name;
    if (!sortBy) {
      throw createHttpError(400, "No sortable column found for table");
    }

    const params = [];
    const whereClause = buildSearchClause(search, columns, params);

    const tableIdent = quoteIdent(tableName);
    const sortIdent = quoteIdent(sortBy);

    const countQuery = `SELECT COUNT(*)::int AS count FROM ${tableIdent} ${whereClause}`;
    const dataQuery = `
      SELECT *
      FROM ${tableIdent}
      ${whereClause}
      ORDER BY ${sortIdent} ${sortOrder}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2};
    `;

    const [countResult, dataResult] = await Promise.all([
      appPool.query(countQuery, params),
      appPool.query(dataQuery, [...params, limit, offset]),
    ]);

    res.json({
      data: dataResult.rows,
      pagination: {
        total: Number(countResult.rows[0]?.count || 0),
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error("Error fetching table rows:", error);
    res.status(error.status || 500).json({
      message: error.status ? error.message : "Failed to fetch table rows",
    });
  }
};

const getRowById = async (req, res) => {
  try {
    await ensureSuperAdmin(req);
    const tableName = await resolveTableName(req.params.tableName);
    const primaryKey = await getPrimaryKeyColumn(tableName);
    if (!primaryKey) {
      throw createHttpError(400, "Table has no primary key");
    }

    const tableIdent = quoteIdent(tableName);
    const pkIdent = quoteIdent(primaryKey);
    const query = `SELECT * FROM ${tableIdent} WHERE ${pkIdent} = $1 LIMIT 1;`;
    const { rows } = await appPool.query(query, [req.params.id]);

    if (!rows.length) {
      return res.status(404).json({ message: "Record not found" });
    }

    res.json({ data: rows[0] });
  } catch (error) {
    console.error("Error fetching table row by id:", error);
    res.status(error.status || 500).json({
      message: error.status ? error.message : "Failed to fetch table row",
    });
  }
};

const createRow = async (req, res) => {
  try {
    await ensureSuperAdmin(req);
    const tableName = await resolveTableName(req.params.tableName);
    const [columns, primaryKey] = await Promise.all([
      getTableColumns(tableName),
      getPrimaryKeyColumn(tableName),
    ]);

    const payload = req.body && typeof req.body === "object" ? req.body : {};
    const allowed = columns
      .filter((column) => !column.isIdentity && column.name !== primaryKey)
      .map((column) => column.name);
    const validKeys = Object.keys(payload).filter((key) => allowed.includes(key));

    if (!validKeys.length) {
      throw createHttpError(400, "No valid fields supplied for insert");
    }

    const tableIdent = quoteIdent(tableName);
    const columnSql = validKeys.map((key) => quoteIdent(key)).join(", ");
    const placeholders = validKeys.map((_, index) => `$${index + 1}`).join(", ");
    const values = validKeys.map((key) => payload[key]);

    const query = `
      INSERT INTO ${tableIdent} (${columnSql})
      VALUES (${placeholders})
      RETURNING *;
    `;

    const { rows } = await appPool.query(query, values);
    res.status(201).json({ data: rows[0] });
  } catch (error) {
    console.error("Error creating table row:", error);
    res.status(error.status || 500).json({
      message: error.status ? error.message : "Failed to create table row",
    });
  }
};

const updateRow = async (req, res) => {
  try {
    await ensureSuperAdmin(req);
    const tableName = await resolveTableName(req.params.tableName);
    const [columns, primaryKey] = await Promise.all([
      getTableColumns(tableName),
      getPrimaryKeyColumn(tableName),
    ]);

    if (!primaryKey) {
      throw createHttpError(400, "Table has no primary key");
    }

    const payload = req.body && typeof req.body === "object" ? req.body : {};
    const allowed = columns
      .filter((column) => !column.isIdentity && column.name !== primaryKey)
      .map((column) => column.name);
    const validKeys = Object.keys(payload).filter((key) => allowed.includes(key));

    if (!validKeys.length) {
      throw createHttpError(400, "No valid fields supplied for update");
    }

    const tableIdent = quoteIdent(tableName);
    const pkIdent = quoteIdent(primaryKey);
    const setClause = validKeys
      .map((key, index) => `${quoteIdent(key)} = $${index + 1}`)
      .join(", ");
    const values = validKeys.map((key) => payload[key]);
    values.push(req.params.id);

    const query = `
      UPDATE ${tableIdent}
      SET ${setClause}
      WHERE ${pkIdent} = $${values.length}
      RETURNING *;
    `;

    const { rows } = await appPool.query(query, values);
    if (!rows.length) {
      return res.status(404).json({ message: "Record not found" });
    }

    res.json({ data: rows[0] });
  } catch (error) {
    console.error("Error updating table row:", error);
    res.status(error.status || 500).json({
      message: error.status ? error.message : "Failed to update table row",
    });
  }
};

const deleteRow = async (req, res) => {
  try {
    await ensureSuperAdmin(req);
    const tableName = await resolveTableName(req.params.tableName);
    const primaryKey = await getPrimaryKeyColumn(tableName);
    if (!primaryKey) {
      throw createHttpError(400, "Table has no primary key");
    }

    const tableIdent = quoteIdent(tableName);
    const pkIdent = quoteIdent(primaryKey);
    const query = `DELETE FROM ${tableIdent} WHERE ${pkIdent} = $1 RETURNING *;`;
    const { rows } = await appPool.query(query, [req.params.id]);

    if (!rows.length) {
      return res.status(404).json({ message: "Record not found" });
    }

    res.json({ message: "Record deleted successfully", data: rows[0] });
  } catch (error) {
    console.error("Error deleting table row:", error);
    res.status(error.status || 500).json({
      message: error.status ? error.message : "Failed to delete table row",
    });
  }
};

module.exports = {
  listTables,
  getTableMeta,
  listRows,
  getRowById,
  createRow,
  updateRow,
  deleteRow,
};
