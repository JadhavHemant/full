const { appPool } = require("../../config/db");
const { buildHierarchyAccess, isPrivilegedUser } = require("../../utils/hierarchyAccess");

const generatePONumber = async () => {
  const result = await appPool.query(
    `SELECT "PONumber" FROM "PurchaseOrders" ORDER BY "Id" DESC LIMIT 1`
  );

  if (result.rows.length === 0) {
    return "PO-2025-0001";
  }

  const lastPO = result.rows[0].PONumber;
  const num = parseInt(lastPO.split("-")[2]) + 1;
  return `PO-2025-${String(num).padStart(4, "0")}`;
};

const cleanDateValue = (dateValue) => {
  // Return null for any falsy value or empty string
  if (!dateValue || dateValue.trim() === "") {
    return null;
  }
  return dateValue;
};

const cleanNumberValue = (numberValue) => {
  if (numberValue === "" || numberValue === null || numberValue === undefined) {
    return 0; // Default to 0 for numbers
  }
  const num = parseFloat(numberValue);
  return isNaN(num) ? 0 : num;
};

const validatePurchaseOrder = (data, isUpdate = false) => {
  const errors = [];

  if (!isUpdate && !data.SupplierId) {
    errors.push("SupplierId is required");
  }

  if (
    data.Status &&
    !["Draft", "Pending", "Approved", "Sent", "Received", "Cancelled"].includes(
      data.Status
    )
  ) {
    errors.push("Invalid status value");
  }

  if (data.TotalAmount && data.TotalAmount !== "") {
    const amount = parseFloat(data.TotalAmount);
    if (isNaN(amount) || amount < 0) {
      errors.push("TotalAmount must be a positive number");
    }
  }

  return { valid: errors.length === 0, errors };
};

const createPurchaseOrder = async (req, res) => {
  let {
    SupplierId,
    OrderDate,
    ExpectedDeliveryDate,
    ReceivedDate,
    Status,
    TotalAmount,
    Notes,
    CompanyId,
  } = req.body;


  const validation = validatePurchaseOrder(req.body, false);
  if (!validation.valid) {
    return res
      .status(400)
      .json({ message: "Validation failed", errors: validation.errors });
  }

  try {
    const PONumber = await generatePONumber();

    const cleanedOrderDate =
      OrderDate && OrderDate.trim() !== ""
        ? OrderDate
        : new Date().toISOString();
    const cleanedExpectedDeliveryDate =
      ExpectedDeliveryDate && ExpectedDeliveryDate.trim() !== ""
        ? ExpectedDeliveryDate
        : null;
    const cleanedReceivedDate =
      ReceivedDate && ReceivedDate.trim() !== "" ? ReceivedDate : null;
    const cleanedTotalAmount =
      TotalAmount && TotalAmount !== "" ? parseFloat(TotalAmount) : 0;
    const cleanedCompanyId = CompanyId && CompanyId !== "" ? CompanyId : req.user?.companyId || null;
    const cleanedCreatedBy = req.user?.userId || null;
    const cleanedNotes = Notes && Notes.trim() !== "" ? Notes : null;

    console.log("🧹 Cleaned data:", {
      PONumber,
      SupplierId,
      cleanedOrderDate,
      cleanedExpectedDeliveryDate,
      cleanedReceivedDate,
      Status: Status || "Draft",
      cleanedTotalAmount,
      cleanedNotes,
      cleanedCompanyId,
      cleanedCreatedBy,
    });

    const query = `
            INSERT INTO "PurchaseOrders"
            ("PONumber", "SupplierId", "OrderDate", "ExpectedDeliveryDate", "ReceivedDate", 
             "Status", "TotalAmount", "Notes", "CompanyId", "CreatedBy")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *;
        `;

    const { rows } = await appPool.query(query, [
      PONumber,
      SupplierId,
      cleanedOrderDate,
      cleanedExpectedDeliveryDate,
      cleanedReceivedDate,
      Status || "Draft",
      cleanedTotalAmount,
      cleanedNotes,
      cleanedCompanyId,
      cleanedCreatedBy,
    ]);

    console.log("✅ PO Created:", rows[0]);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error("❌ Error creating PurchaseOrder:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
      details: error.detail,
    });
  }
};

const updatePurchaseOrder = async (req, res) => {
  const { id } = req.params;
  let {
    SupplierId,
    OrderDate,
    ExpectedDeliveryDate,
    ReceivedDate,
    Status,
    TotalAmount,
    Notes,
    CompanyId,
  } = req.body;

  const validation = validatePurchaseOrder(req.body, true);
  if (!validation.valid) {
    return res
      .status(400)
      .json({ message: "Validation failed", errors: validation.errors });
  }

  try {
    // Clean all values
    const cleanedOrderDate =
      OrderDate && OrderDate.trim() !== "" ? OrderDate : null;
    const cleanedExpectedDeliveryDate =
      ExpectedDeliveryDate && ExpectedDeliveryDate.trim() !== ""
        ? ExpectedDeliveryDate
        : null;
    const cleanedReceivedDate =
      ReceivedDate && ReceivedDate.trim() !== "" ? ReceivedDate : null;
    const cleanedTotalAmount =
      TotalAmount && TotalAmount !== "" ? parseFloat(TotalAmount) : null;
    const cleanedCompanyId = CompanyId && CompanyId !== "" ? CompanyId : null;
    const cleanedNotes = Notes && Notes.trim() !== "" ? Notes : null;

    const query = `
            UPDATE "PurchaseOrders"
            SET 
                "SupplierId" = COALESCE($1, "SupplierId"),
                "OrderDate" = COALESCE($2, "OrderDate"),
                "ExpectedDeliveryDate" = $3,
                "ReceivedDate" = $4,
                "Status" = COALESCE($5, "Status"),
                "TotalAmount" = COALESCE($6, "TotalAmount"),
                "Notes" = $7,
                "CompanyId" = $8,
                "UpdatedAt" = CURRENT_TIMESTAMP
            WHERE "Id" = $9
            RETURNING *;
        `;

    const { rows } = await appPool.query(query, [
      SupplierId || null,
      cleanedOrderDate,
      cleanedExpectedDeliveryDate,
      cleanedReceivedDate,
      Status || null,
      cleanedTotalAmount,
      cleanedNotes,
      cleanedCompanyId,
      id,
    ]);

    if (!rows.length) {
      return res.status(404).json({ message: "PurchaseOrder not found" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Error updating PurchaseOrder:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

const updatePurchaseOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { Status } = req.body;

  const validStatuses = [
    "Draft",
    "Pending",
    "Approved",
    "Sent",
    "Received",
    "Cancelled",
  ];
  if (!validStatuses.includes(Status)) {
    return res.status(400).json({
      message: "Invalid status",
      validStatuses,
    });
  }

  try {
    const query = `
            UPDATE "PurchaseOrders"
            SET "Status" = $1, "UpdatedAt" = CURRENT_TIMESTAMP
            WHERE "Id" = $2
            RETURNING *;
        `;

    const { rows } = await appPool.query(query, [Status, id]);

    if (!rows.length) {
      return res.status(404).json({ message: "PurchaseOrder not found" });
    }

    res.json({ message: "Status updated successfully", record: rows[0] });
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const softDeletePurchaseOrder = async (req, res) => {
  const { id } = req.params;

  try {
    const query = `
            UPDATE "PurchaseOrders"
            SET "Status" = 'Cancelled', "UpdatedAt" = CURRENT_TIMESTAMP
            WHERE "Id" = $1
            RETURNING *;
        `;

    let queryText = query;
    let values = [id];

    if (!isPrivilegedUser(req.user)) {
      const scopedAccess = await buildHierarchyAccess({
        req,
        alias: "po",
        ownerColumns: ["CreatedBy"],
        values,
      });
      values = scopedAccess.values;
      if (scopedAccess.clause) {
        queryText += ` AND ${scopedAccess.clause}`;
      }
    }

    const { rows } = await appPool.query(queryText, values);

    if (!rows.length) {
      return res.status(404).json({ message: "PurchaseOrder not found" });
    }

    res.json({
      message: "Purchase order cancelled successfully",
      record: rows[0],
    });
  } catch (error) {
    console.error("Error cancelling PurchaseOrder:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const hardDeletePurchaseOrder = async (req, res) => {
  const { id } = req.params;

  try {
    const query = `DELETE FROM "PurchaseOrders" WHERE "Id" = $1 RETURNING *;`;
    const { rows } = await appPool.query(query, [id]);

    if (!rows.length) {
      return res.status(404).json({ message: "PurchaseOrder not found" });
    }

    res.json({ message: "Hard deleted successfully", record: rows[0] });
  } catch (error) {
    console.error("Error hard deleting PurchaseOrder:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getPurchaseOrderById = async (req, res) => {
  const { id } = req.params;

  try {
    const query = `
            SELECT 
                po.*,
                s."Name" as "SupplierName",
                s."ContactPerson" as "SupplierContact",
                s."Email" as "SupplierEmail",
                s."Phone" as "SupplierPhone",
                c."CompanyName"
            FROM "PurchaseOrders" po
            LEFT JOIN "Suppliers" s ON po."SupplierId" = s."Id"
            LEFT JOIN "Companies" c ON po."CompanyId" = c."Id"
            WHERE po."Id" = $1
            LIMIT 1;
        `;

    const { rows } = await appPool.query(query, [id]);

    if (!rows.length) {
      return res.status(404).json({ message: "PurchaseOrder not found" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Error fetching PurchaseOrder by Id:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getAllPurchaseOrders = async (req, res) => {
  let {
    limit = 10,
    offset = 0,
    status,
    supplierId,
    companyId,
    search,
    sortBy = "OrderDate",
    sortOrder = "DESC",
    startDate,
    endDate,
  } = req.query;

  limit = Number(limit);
  offset = Number(offset);
  if (isNaN(limit) || limit <= 0 || limit > 100) limit = 10;
  if (isNaN(offset) || offset < 0) offset = 0;

  const sortableColumns = new Set([
    "OrderDate",
    "PONumber",
    "Status",
    "TotalAmount",
    "CreatedAt",
  ]);
  if (!sortableColumns.has(sortBy)) sortBy = "OrderDate";
  sortOrder = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

  const filters = [];
  let values = [];
  let idx = 1;

  if (status) {
    filters.push(`po."Status" = $${idx++}`);
    values.push(status);
  }

  if (supplierId) {
    filters.push(`po."SupplierId" = $${idx++}`);
    values.push(supplierId);
  }

  if (companyId) {
    filters.push(`po."CompanyId" = $${idx++}`);
    values.push(companyId);
  }

  if (search && search.trim()) {
    filters.push(`(
            LOWER(po."PONumber") LIKE $${idx} OR
            LOWER(s."Name") LIKE $${idx} OR
            LOWER(po."Notes") LIKE $${idx}
        )`);
    values.push(`%${search.toLowerCase()}%`);
    idx++;
  }

  if (startDate && startDate.trim() !== "") {
    filters.push(`po."OrderDate" >= $${idx++}`);
    values.push(startDate);
  }

  if (endDate && endDate.trim() !== "") {
    filters.push(`po."OrderDate" <= $${idx++}`);
    values.push(endDate);
  }

  const scopedAccess = await buildHierarchyAccess({
    req,
    alias: "po",
    ownerColumns: ["CreatedBy"],
    values,
  });
  values = scopedAccess.values;
  idx = values.length + 1;
  if (scopedAccess.clause) {
    filters.push(scopedAccess.clause);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  try {
    // ✅ FIXED: Removed Users table JOIN and Username column
    const dataQuery = `
            SELECT 
                po.*,
                s."Name" as "SupplierName",
                c."CompanyName"
            FROM "PurchaseOrders" po
            LEFT JOIN "Suppliers" s ON po."SupplierId" = s."Id"
            LEFT JOIN "Companies" c ON po."CompanyId" = c."Id"
            ${whereClause}
            ORDER BY po."${sortBy}" ${sortOrder}
            LIMIT $${idx} OFFSET $${idx + 1};
        `;
    values.push(limit, offset);

    const countQuery = `
            SELECT COUNT(*)::int AS total
            FROM "PurchaseOrders" po
            LEFT JOIN "Suppliers" s ON po."SupplierId" = s."Id"
            ${whereClause};
        `;

    const [dataResult, countResult] = await Promise.all([
      appPool.query(dataQuery, values),
      appPool.query(countQuery, values.slice(0, idx - 1)),
    ]);

    res.json({
      data: dataResult.rows,
      pagination: {
        total: countResult.rows[0].total,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error("Error fetching all PurchaseOrders:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get Purchase Orders by Supplier
const getPurchaseOrdersBySupplier = async (req, res) => {
  const { supplierId } = req.params;
  const { limit = 10, offset = 0 } = req.query;

  try {
    const query = `
            SELECT po.*, s."Name" as "SupplierName"
            FROM "PurchaseOrders" po
            LEFT JOIN "Suppliers" s ON po."SupplierId" = s."Id"
            WHERE po."SupplierId" = $1
            ORDER BY po."OrderDate" DESC
            LIMIT $2 OFFSET $3;
        `;

    const { rows } = await appPool.query(query, [supplierId, limit, offset]);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching POs by supplier:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get Purchase Order Statistics
const getPurchaseOrderStats = async (req, res) => {
  const { companyId } = req.query;

  try {
    const whereClause = companyId ? `WHERE "CompanyId" = $1` : "";
    const params = companyId ? [companyId] : [];

    const query = `
            SELECT 
                COUNT(*)::int as total_orders,
                COUNT(CASE WHEN "Status" = 'Draft' THEN 1 END)::int as draft,
                COUNT(CASE WHEN "Status" = 'Pending' THEN 1 END)::int as pending,
                COUNT(CASE WHEN "Status" = 'Approved' THEN 1 END)::int as approved,
                COUNT(CASE WHEN "Status" = 'Sent' THEN 1 END)::int as sent,
                COUNT(CASE WHEN "Status" = 'Received' THEN 1 END)::int as received,
                COUNT(CASE WHEN "Status" = 'Cancelled' THEN 1 END)::int as cancelled,
                COALESCE(SUM("TotalAmount"), 0)::decimal as total_amount,
                COALESCE(AVG("TotalAmount"), 0)::decimal as average_amount
            FROM "PurchaseOrders"
            ${whereClause};
        `;

    const { rows } = await appPool.query(query, params);
    res.json(rows[0]);
  } catch (error) {
    console.error("Error fetching PO stats:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  createPurchaseOrder,
  updatePurchaseOrder,
  updatePurchaseOrderStatus,
  softDeletePurchaseOrder,
  hardDeletePurchaseOrder,
  getPurchaseOrderById,
  getAllPurchaseOrders,
  getPurchaseOrdersBySupplier,
  getPurchaseOrderStats,
};
