const { appPool } = require("../../config/db");
const { buildHierarchyAccess } = require("../../utils/hierarchyAccess");
const { resolveCompanyScope } = require("../../utils/companyScope");
const { logAuditEvent } = require("../../utils/auditEvents");
const { getRestrictedActionAccess } = require("../../utils/restrictedActionAccess");

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const RESERVED_QUERY_KEYS = new Set([
  "limit",
  "offset",
  "page",
  "search",
  "sortBy",
  "sortOrder",
  "columnFilters",
]);

const toPascalCase = (value) => {
  if (!value || typeof value !== "string") {
    return "";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
};

const resolveFieldName = (rawKey, allowedFields = []) => {
  const key = String(rawKey || "").trim();
  if (!key) {
    return null;
  }

  const lowerKey = key.toLowerCase();
  const directMatch = allowedFields.find((field) => field.toLowerCase() === lowerKey);
  if (directMatch) {
    return directMatch;
  }

  const pascalKey = toPascalCase(key).toLowerCase();
  return allowedFields.find((field) => field.toLowerCase() === pascalKey) || null;
};

const coerceFilterValue = (value) => {
  const rawValue = Array.isArray(value) ? value[value.length - 1] : value;
  if (rawValue === null || rawValue === undefined) {
    return null;
  }

  const text = String(rawValue).trim();
  if (!text.length) {
    return "";
  }

  if (text.toLowerCase() === "true") {
    return true;
  }

  if (text.toLowerCase() === "false") {
    return false;
  }

  if (/^-?\d+(\.\d+)?$/.test(text)) {
    const numeric = Number(text);
    if (!Number.isNaN(numeric)) {
      return numeric;
    }
  }

  return text;
};

const parseColumnFilters = (value) => {
  if (!value) {
    return {};
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    return value;
  }

  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const resolveOrderBy = ({ alias, requestedSortBy, requestedSortOrder, sortableFields, fallback }) => {
  const resolvedSortField = resolveFieldName(requestedSortBy, sortableFields);
  if (!resolvedSortField) {
    return fallback;
  }

  const direction = String(requestedSortOrder || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC";
  return `${alias}."${resolvedSortField}" ${direction}`;
};

const getDatabaseErrorMessage = (error, tableName) => {
  if (error.code === "23502") {
    const column = error.column || "required field";
    return `${column} is required to create ${tableName}`;
  }

  if (error.code === "23503") {
    return `A related record was not found while saving ${tableName}`;
  }

  if (error.code === "23505") {
    return `${tableName} already contains a record with the same value`;
  }

  return `Failed to create ${tableName} record`;
};

const buildSelectColumns = (config) => {
  if (config.selectColumns?.length) {
    return config.selectColumns.join(", ");
  }

  return `${config.alias || "t"}.*`;
};

const pickFieldValues = (fields, payload) => fields.map((field) => payload[field] ?? null);

const applySystemFieldDefaults = ({ payload, fields, isCreate }) => {
  const nextPayload = { ...payload };

  if (!isCreate) {
    return nextPayload;
  }

  if (fields.includes("IsActive") && (nextPayload.IsActive === undefined || nextPayload.IsActive === null)) {
    nextPayload.IsActive = true;
  }

  if (fields.includes("IsDeleted") && (nextPayload.IsDeleted === undefined || nextPayload.IsDeleted === null)) {
    nextPayload.IsDeleted = false;
  }

  if (fields.includes("Flag") && (nextPayload.Flag === undefined || nextPayload.Flag === null)) {
    nextPayload.Flag = false;
  }

  return nextPayload;
};

const fetchRecordById = async ({ client, tableName, alias, joins, selectColumns, idColumn, id }) => {
  const query = `
    SELECT ${selectColumns}
    FROM "${tableName}" ${alias}
    ${joins}
    WHERE ${alias}."${idColumn}" = $1
    LIMIT 1;
  `;

  const { rows } = await client.query(query, [id]);
  return rows[0] || null;
};

const applyAuditFields = ({ payload, req, fields, isCreate }) => {
  const nextPayload = { ...payload };
  const userId = req.user?.userId ?? null;

  if (fields.includes("CreatedBy")) {
    if (isCreate) {
      nextPayload.CreatedBy = userId;
    } else if ("CreatedBy" in nextPayload) {
      delete nextPayload.CreatedBy;
    }
  }

  if (fields.includes("UpdatedBy")) {
    nextPayload.UpdatedBy = userId;
  }

  return nextPayload;
};

const createCrudController = (config) => {
  const tableName = config.tableName;
  const idColumn = config.idColumn || "Id";
  const alias = config.alias || "t";
  const orderBy = config.orderBy || `"${idColumn}" DESC`;
  const fields = config.fields || [];
  const searchColumns = config.searchColumns || [];
  const defaultFilters = config.defaultFilters || [];
  const filterableFields = config.filterableFields || [idColumn, ...fields];
  const sortableFields = config.sortableFields || [idColumn, ...fields];
  const customFilterMap = config.filterMap || {};
  const joins = config.joins || "";
  const selectColumns = buildSelectColumns(config);
  const beforeCreate = config.beforeCreate;
  const beforeUpdate = config.beforeUpdate;
  const augmentListQuery = config.augmentListQuery;
  const touchUpdatedAt = config.touchUpdatedAt || false;
  const accessControl = config.accessControl || null;
  const entityType = config.entityType || tableName.replace(/s$/, "");
  const companyField =
    config.companyField ||
    (filterableFields.includes("CompanyId") || fields.includes("CompanyId")
      ? "CompanyId"
      : null);

  const getAccessibleRecord = async ({ req, id, client = appPool }) => {
    let values = [id];
    const conditions = [`${alias}."${idColumn}" = $1`];

    if (companyField) {
      const companyScope = resolveCompanyScope({
        req,
        requestedCompanyId: req.query.companyId,
        allowAllForSuperAdmin: true,
      });

      if (!companyScope.ok) {
        const error = new Error(companyScope.message);
        error.status = companyScope.status;
        throw error;
      }

      if (companyScope.companyId != null) {
        const companyIndex = values.push(companyScope.companyId);
        conditions.push(`${alias}."${companyField}" = $${companyIndex}`);
      }
    }

    if (defaultFilters.length) {
      conditions.push(...defaultFilters);
    }

    if (accessControl?.ownerColumns?.length) {
      const scopedAccess = await buildHierarchyAccess({
        req,
        alias,
        ownerColumns: accessControl.ownerColumns,
        values,
      });
      values = scopedAccess.values;
      if (scopedAccess.clause) {
        conditions.push(scopedAccess.clause);
      }
    }

    const query = `
      SELECT ${selectColumns}
      FROM "${tableName}" ${alias}
      ${joins}
      WHERE ${conditions.join(" AND ")}
      LIMIT 1;
    `;

    const { rows } = await client.query(query, values);
    return rows[0] || null;
  };

  const list = async (req, res) => {
    const limit = Math.max(1, toInt(req.query.limit, 25));
    const page = Math.max(1, toInt(req.query.page, 1));
    const offset = toInt(req.query.offset, (page - 1) * limit);
    const search = req.query.search?.trim();
    const orderClause = resolveOrderBy({
      alias,
      requestedSortBy: req.query.sortBy,
      requestedSortOrder: req.query.sortOrder,
      sortableFields,
      fallback: orderBy,
    });
    const conditions = [...defaultFilters];
    let values = [];

    if (companyField) {
      const companyScope = resolveCompanyScope({
        req,
        requestedCompanyId: req.query.companyId,
        allowAllForSuperAdmin: true,
      });

      if (!companyScope.ok) {
        return res.status(companyScope.status).json({ message: companyScope.message });
      }

      if (companyScope.companyId != null) {
        const companyIndex = values.push(companyScope.companyId);
        conditions.push(`${alias}."${companyField}" = $${companyIndex}`);
      }
    }

    if (search && searchColumns.length) {
      const searchIndex = values.push(`%${search}%`);
      conditions.push(
        `(${searchColumns.map((column) => `${column} ILIKE $${searchIndex}`).join(" OR ")})`
      );
    }

    Object.entries(req.query).forEach(([queryKey, rawValue]) => {
      if (RESERVED_QUERY_KEYS.has(queryKey)) {
        return;
      }

      if (companyField && queryKey.toLowerCase() === companyField.toLowerCase()) {
        return;
      }

      const parsedValue = coerceFilterValue(rawValue);
      if (parsedValue === "") {
        return;
      }

      const customColumn = customFilterMap[queryKey];
      if (customColumn) {
        const valueIndex = values.push(parsedValue);
        conditions.push(`${customColumn} = $${valueIndex}`);
        return;
      }

      const fieldName = resolveFieldName(queryKey, filterableFields);
      if (!fieldName) {
        return;
      }

      const valueIndex = values.push(parsedValue);
      conditions.push(`${alias}."${fieldName}" = $${valueIndex}`);
    });

    Object.entries(parseColumnFilters(req.query.columnFilters)).forEach(([queryKey, rawValue]) => {
      if (companyField && queryKey.toLowerCase() === companyField.toLowerCase()) {
        return;
      }

      const parsedValue = coerceFilterValue(rawValue);
      if (parsedValue === "") {
        return;
      }

      const customColumn = customFilterMap[queryKey];
      if (customColumn) {
        const valueIndex = values.push(
          typeof parsedValue === "string" ? `%${parsedValue}%` : parsedValue
        );
        conditions.push(
          typeof parsedValue === "string"
            ? `CAST(${customColumn} AS TEXT) ILIKE $${valueIndex}`
            : `${customColumn} = $${valueIndex}`
        );
        return;
      }

      const fieldName = resolveFieldName(queryKey, filterableFields);
      if (!fieldName) {
        return;
      }

      const valueIndex = values.push(
        typeof parsedValue === "string" ? `%${parsedValue}%` : parsedValue
      );
      conditions.push(
        typeof parsedValue === "string"
          ? `CAST(${alias}."${fieldName}" AS TEXT) ILIKE $${valueIndex}`
          : `${alias}."${fieldName}" = $${valueIndex}`
      );
    });

    if (typeof augmentListQuery === "function") {
      const augmented = await augmentListQuery({
        req,
        alias,
        values,
        conditions,
      });

      if (augmented?.values) {
        values = augmented.values;
      }
      if (augmented?.conditions) {
        conditions.splice(0, conditions.length, ...augmented.conditions);
      }
    }

    if (accessControl?.ownerColumns?.length) {
      const scopedAccess = await buildHierarchyAccess({
        req,
        alias,
        ownerColumns: accessControl.ownerColumns,
        values,
      });
      values = scopedAccess.values;
      if (scopedAccess.clause) {
        conditions.push(scopedAccess.clause);
      }
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const listQuery = `
      SELECT ${selectColumns}
      FROM "${tableName}" ${alias}
      ${joins}
      ${whereClause}
      ORDER BY ${orderClause}
      LIMIT $${values.length + 1} OFFSET $${values.length + 2};
    `;

    const countQuery = `
      SELECT COUNT(*)::int AS "total"
      FROM "${tableName}" ${alias}
      ${joins}
      ${whereClause};
    `;

    try {
      const [listResult, countResult] = await Promise.all([
        appPool.query(listQuery, [...values, limit, offset]),
        appPool.query(countQuery, values),
      ]);

      res.json({
        data: listResult.rows,
        pagination: {
          total: countResult.rows[0]?.total || 0,
          limit,
          offset,
        },
      });
    } catch (error) {
      console.error(`Error fetching ${tableName}:`, error);
      res.status(500).json({ message: `Failed to fetch ${tableName}` });
    }
  };

  const getById = async (req, res) => {
    try {
      const record = await getAccessibleRecord({ req, id: req.params.id });

      if (!record) {
        return res.status(404).json({ message: `${tableName} record not found` });
      }

      res.json(record);
    } catch (error) {
      console.error(`Error fetching ${tableName} by id:`, error);
      res.status(500).json({ message: `Failed to fetch ${tableName} record` });
    }
  };

  const create = async (req, res) => {
    const client = await appPool.connect();

    try {
      await client.query("BEGIN");

      const auditedPayload = applyAuditFields({
        payload: req.body,
        req,
        fields,
        isCreate: true,
      });
      const basePayload = applySystemFieldDefaults({
        payload: auditedPayload,
        fields,
        isCreate: true,
      });
      const scopedPayload = { ...basePayload };

      if (companyField) {
        const companyScope = resolveCompanyScope({
          req,
          requestedCompanyId: scopedPayload[companyField] ?? req.query.companyId,
          allowAllForSuperAdmin: false,
        });

        if (!companyScope.ok) {
          await client.query("ROLLBACK");
          return res.status(companyScope.status).json({ message: companyScope.message });
        }

        scopedPayload[companyField] = companyScope.companyId;
      }

      const payload = beforeCreate
        ? await beforeCreate({ payload: scopedPayload, req, client })
        : scopedPayload;

      const placeholders = fields.map((_, index) => `$${index + 1}`).join(", ");
      const columns = fields.map((field) => `"${field}"`).join(", ");
      const values = pickFieldValues(fields, payload);

      const query = `
        INSERT INTO "${tableName}" (${columns})
        VALUES (${placeholders})
        RETURNING "${idColumn}";
      `;

      const insertResult = await client.query(query, values);
      const createdId = insertResult.rows[0]?.[idColumn];
      const createdRecord = await fetchRecordById({
        client,
        tableName,
        alias,
        joins,
        selectColumns,
        idColumn,
        id: createdId,
      });

      await logAuditEvent({
        client,
        companyId: createdRecord?.[companyField] ?? payload?.[companyField] ?? null,
        userId: req.user?.userId ?? null,
        eventType: `${entityType}.created`,
        action: "create",
        entityType,
        entityId: createdId,
        afterData: createdRecord,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      await client.query("COMMIT");
      res.status(201).json(createdRecord);
    } catch (error) {
      await client.query("ROLLBACK");
      console.error(`Error creating ${tableName}:`, error);
      res.status(400).json({ message: getDatabaseErrorMessage(error, tableName) });
    } finally {
      client.release();
    }
  };

  const update = async (req, res) => {
    const client = await appPool.connect();
    const auditedPayload = applyAuditFields({
      payload: req.body,
      req,
      fields,
      isCreate: false,
    });
    const basePayload = applySystemFieldDefaults({
      payload: auditedPayload,
      fields,
      isCreate: false,
    });
    let payload = { ...basePayload };

    let companyScope = null;
    if (companyField) {
      companyScope = resolveCompanyScope({
        req,
        requestedCompanyId: payload[companyField] ?? req.query.companyId,
        allowAllForSuperAdmin: true,
      });

      if (!companyScope.ok) {
        return res.status(companyScope.status).json({ message: companyScope.message });
      }

      if (!companyScope.isSuperAdmin && companyScope.companyId != null) {
        payload[companyField] = companyScope.companyId;
      }
    }

    try {
      await client.query("BEGIN");

      const existingRecord = await getAccessibleRecord({
        req,
        id: req.params.id,
        client,
      });

      if (!existingRecord) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: `${tableName} record not found` });
      }

      if (typeof beforeUpdate === "function") {
        payload = await beforeUpdate({
          payload,
          req,
          client,
          existingRecord,
        });
      }

      const updateFields = fields.filter((field) =>
        Object.prototype.hasOwnProperty.call(payload, field)
      );

      if (!updateFields.length) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: `No fields provided to update ${tableName}` });
      }

      const assignments = updateFields.map((field, index) => `"${field}" = $${index + 1}`);
      if (touchUpdatedAt) {
        assignments.push(`"UpdatedAt" = NOW()`);
      }

      const setClause = assignments.join(", ");
      let values = updateFields.map((field) => payload[field] ?? null);
      values.push(req.params.id);
      const conditions = [`"${idColumn}" = $${values.length}`];

      if (companyField && companyScope?.companyId != null) {
        values.push(companyScope.companyId);
        conditions.push(`"${companyField}" = $${values.length}`);
      }

      if (accessControl?.ownerColumns?.length) {
        const scopedAccess = await buildHierarchyAccess({
          req,
          alias: tableName,
          ownerColumns: accessControl.ownerColumns,
          values,
        });
        values = scopedAccess.values;
        if (scopedAccess.clause) {
          conditions.push(scopedAccess.clause.replaceAll(`${tableName}.`, ""));
        }
      }

      const query = `
        UPDATE "${tableName}"
        SET ${setClause}
        WHERE ${conditions.join(" AND ")}
        RETURNING *;
      `;

      const { rows } = await client.query(query, values);

      if (!rows.length) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: `${tableName} record not found` });
      }

      const updatedRecord = await fetchRecordById({
        client,
        tableName,
        alias,
        joins,
        selectColumns,
        idColumn,
        id: req.params.id,
      });

      await logAuditEvent({
        client,
        companyId: updatedRecord?.[companyField] ?? existingRecord?.[companyField] ?? null,
        userId: req.user?.userId ?? null,
        eventType: `${entityType}.updated`,
        action: "update",
        entityType,
        entityId: Number(req.params.id),
        beforeData: existingRecord,
        afterData: updatedRecord,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      await client.query("COMMIT");
      res.json(updatedRecord || rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      console.error(`Error updating ${tableName}:`, error);
      res.status(400).json({ message: error.code === "23503"
        ? `A related record was not found while updating ${tableName}`
        : `Failed to update ${tableName} record` });
    } finally {
      client.release();
    }
  };

  // DELETE FUNCTIONALITY REMOVED - CRM-only application does not allow record deletion
  const remove = async (req, res) => {
    return res.status(403).json({ 
      message: "Delete functionality is disabled in CRM-only mode" 
    });
  };

  const listComments = async (req, res) => {
    try {
      const record = await getAccessibleRecord({ req, id: req.params.id });

      if (!record) {
        return res.status(404).json({ message: `${tableName} record not found` });
      }

      const { rows } = await appPool.query(
        `
          SELECT
            c.*,
            u."Name" AS "CommentedByName",
            u."Email" AS "CommentedByEmail"
          FROM "Comments" c
          LEFT JOIN "Users" u ON u."UserId" = c."CommentedBy"
          WHERE c."EntityType" = $1 AND c."EntityId" = $2
          ORDER BY c."CreatedAt" DESC, c."Id" DESC;
        `,
        [entityType, req.params.id]
      );

      res.json({ data: rows });
    } catch (error) {
      console.error(`Error fetching ${tableName} comments:`, error);
      res.status(500).json({ message: `Failed to fetch ${tableName} comments` });
    }
  };

  const addComment = async (req, res) => {
    const client = await appPool.connect();

    try {
      await client.query("BEGIN");

      const record = await getAccessibleRecord({
        req,
        id: req.params.id,
        client,
      });

      if (!record) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: `${tableName} record not found` });
      }

      const commentText = String(req.body?.commentText || "").trim();
      if (!commentText) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Comment text is required" });
      }

      const { rows } = await client.query(
        `
          INSERT INTO "Comments" ("EntityType", "EntityId", "CommentText", "CommentedBy")
          VALUES ($1, $2, $3, $4)
          RETURNING *;
        `,
        [entityType, req.params.id, commentText, req.user?.userId ?? null]
      );

      const createdComment = rows[0];
      const enrichedCommentResult = await client.query(
        `
          SELECT
            c.*,
            u."Name" AS "CommentedByName",
            u."Email" AS "CommentedByEmail"
          FROM "Comments" c
          LEFT JOIN "Users" u ON u."UserId" = c."CommentedBy"
          WHERE c."Id" = $1
          LIMIT 1;
        `,
        [createdComment.Id]
      );

      await logAuditEvent({
        client,
        companyId: record?.[companyField] ?? null,
        userId: req.user?.userId ?? null,
        eventType: `${entityType}.commented`,
        action: "comment",
        entityType,
        entityId: Number(req.params.id),
        metadata: { commentId: createdComment.Id, commentText },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      await client.query("COMMIT");
      res.status(201).json(enrichedCommentResult.rows[0] || createdComment);
    } catch (error) {
      await client.query("ROLLBACK");
      console.error(`Error creating ${tableName} comment:`, error);
      res.status(500).json({ message: `Failed to create ${tableName} comment` });
    } finally {
      client.release();
    }
  };

  const listHistory = async (req, res) => {
    try {
      const record = await getAccessibleRecord({ req, id: req.params.id });

      if (!record) {
        return res.status(404).json({ message: `${tableName} record not found` });
      }

      const { rows } = await appPool.query(
        `
          SELECT
            ae.*,
            u."Name" AS "UserName",
            u."Email" AS "UserEmail"
          FROM "AuditEvents" ae
          LEFT JOIN "Users" u ON u."UserId" = ae."UserId"
          WHERE ae."EntityType" = $1 AND ae."EntityId" = $2
          ORDER BY ae."CreatedAt" DESC, ae."Id" DESC;
        `,
        [entityType, req.params.id]
      );

      res.json({ data: rows });
    } catch (error) {
      console.error(`Error fetching ${tableName} history:`, error);
      res.status(500).json({ message: `Failed to fetch ${tableName} history` });
    }
  };

  return { list, getById, create, update, remove, listComments, addComment, listHistory };
};

module.exports = { createCrudController };
