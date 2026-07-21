const { appPool } = require('../../config/db');
const { pgQuery } = require("../../utils/pgCompat");

// Helper to handle both `rows` (pg) and `recordset` (mssql compat)
const rows = (result) => result.rows || result.recordset || [];

const r = (result, idx = 0) => {
  const data = rows(result);
  return data.length > 0 ? data[idx] : {};
};

// ==================== NOTIFICATIONS ====================
const createNotification = async (req, res) => {
  try {
    const { UserId, Title, Message, Type, ReferenceId, ReferenceType, CompanyId } = req.body;
    if (!UserId || !Title) return res.status(400).json({ message: 'UserId and Title are required' });
    const result = await pgQuery(appPool, 
      `INSERT INTO "Notifications" ("UserId", "Title", "Message", "Type", "ReferenceId", "ReferenceType", "CompanyId")
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [UserId, Title, Message || null, Type || 'info', ReferenceId || null, ReferenceType || null, CompanyId || null]
    );
    res.status(201).json({ message: 'Notification created', data: r(result) });
  } catch (error) {
    console.error('Create Notification Error:', error);
    res.status(500).json({ message: 'Failed to create notification', error: error.message });
  }
};

const getNotifications = async (req, res) => {
  try {
    const { userId, limit = 20, offset = 0, isRead } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    let paramIdx = 1;
    if (userId) { where += ` AND n."UserId" = $${paramIdx++}`; params.push(parseInt(userId)); }
    if (isRead !== undefined) { where += ` AND n."IsRead" = $${paramIdx++}`; params.push(isRead === 'true'); }
    const limitVal = parseInt(limit);
    const offsetVal = parseInt(offset);
    const result = await pgQuery(appPool, 
      `SELECT n.* FROM "Notifications" n ${where} ORDER BY n."CreatedAt" DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limitVal, offsetVal]
    );
    const countResult = await pgQuery(appPool, 
      `SELECT COUNT(*) AS total, SUM(CASE WHEN "IsRead"=false THEN 1 ELSE 0 END) AS unread FROM "Notifications" n ${where}`,
      params
    );
    res.json({ data: rows(result), total: r(countResult).total || 0, unread: Number(r(countResult).unread) || 0 });
  } catch (error) {
    console.error('Get Notifications Error:', error);
    res.status(500).json({ message: 'Failed to fetch notifications', error: error.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    await pgQuery(appPool, 'UPDATE "Notifications" SET "IsRead"=true, "ReadAt"=CURRENT_TIMESTAMP WHERE "Id"=$1', [parseInt(id)]);
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update notification', error: error.message });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const { userId } = req.params;
    await pgQuery(appPool, 'UPDATE "Notifications" SET "IsRead"=true, "ReadAt"=CURRENT_TIMESTAMP WHERE "UserId"=$1 AND "IsRead"=false', [parseInt(userId)]);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update notifications', error: error.message });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    await pgQuery(appPool, 'DELETE FROM "Notifications" WHERE "Id"=$1', [parseInt(id)]);
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete notification', error: error.message });
  }
};

// ==================== APPROVAL WORKFLOWS ====================
const createApprovalRequest = async (req, res) => {
  try {
    const { WorkflowName, ModuleType, RecordId, RequestedById, CompanyId, Priority, RequestRemarks } = req.body;
    if (!WorkflowName || !ModuleType || !RecordId) return res.status(400).json({ message: 'WorkflowName, ModuleType, and RecordId are required' });
    const result = await pgQuery(appPool, 
      `INSERT INTO "ApprovalWorkflows" ("WorkflowName", "ModuleType", "RecordId", "RequestedById", "CompanyId", "Priority", "RequestRemarks")
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [WorkflowName, ModuleType, RecordId, RequestedById || null, CompanyId || null, Priority || 'Medium', RequestRemarks || null]
    );
    res.status(201).json({ message: 'Approval request created', data: r(result) });
  } catch (error) {
    console.error('Create Approval Error:', error);
    res.status(500).json({ message: 'Failed to create approval request', error: error.message });
  }
};

const getApprovals = async (req, res) => {
  try {
    const { limit = 20, offset = 0, isActive, companyId, entityType } = req.query;
    let where = 'WHERE aw."IsActive" = true';
    const params = [];
    let idx = 1;
    if (isActive !== undefined) { where += ` AND aw."IsActive" = $${idx++}`; params.push(isActive === 'true'); }
    if (companyId) { where += ` AND aw."CompanyId" = $${idx++}`; params.push(parseInt(companyId)); }
    if (entityType) { where += ` AND aw."EntityType" = $${idx++}`; params.push(entityType); }
    const limitVal = parseInt(limit);
    const offsetVal = parseInt(offset);
    const result = await pgQuery(appPool,
      `SELECT aw.* FROM "ApprovalWorkflows" aw ${where} ORDER BY aw."CreatedAt" DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limitVal, offsetVal]
    );
    const countResult = await pgQuery(appPool, `SELECT COUNT(*) AS total FROM "ApprovalWorkflows" aw ${where}`, params);
    res.json({ data: rows(result), total: r(countResult).total || 0 });
  } catch (error) {
    console.error('Get Approvals Error:', error);
    res.status(500).json({ message: 'Failed to fetch approvals', error: error.message });
  }
};

const processApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { Status, ApprovedById, Remarks } = req.body;
    if (!Status || !['Approved', 'Rejected'].includes(Status)) {
      return res.status(400).json({ message: 'Status must be Approved or Rejected' });
    }
    if (Status === 'Approved') {
      await pgQuery(appPool, 
        'UPDATE "ApprovalWorkflows" SET "Status"=$1, "ApprovedById"=$2, "ApprovedAt"=CURRENT_TIMESTAMP, "ApprovalRemarks"=$3, "UpdatedAt"=CURRENT_TIMESTAMP WHERE "Id"=$4',
        [Status, ApprovedById || null, Remarks || null, parseInt(id)]
      );
    } else {
      await pgQuery(appPool, 
        'UPDATE "ApprovalWorkflows" SET "Status"=$1, "RejectedById"=$2, "RejectedAt"=CURRENT_TIMESTAMP, "RejectionRemarks"=$3, "UpdatedAt"=CURRENT_TIMESTAMP WHERE "Id"=$4',
        [Status, ApprovedById || null, Remarks || null, parseInt(id)]
      );
    }
    res.json({ message: `Approval ${Status.toLowerCase()}` });
  } catch (error) {
    console.error('Process Approval Error:', error);
    res.status(500).json({ message: 'Failed to process approval', error: error.message });
  }
};

// ==================== EXPENSES ====================
const createExpense = async (req, res) => {
  try {
    const { ExpenseNumber, Category, SubCategory, Description, Amount, TaxAmount, ExpenseDate, PaymentMode, ReferenceNumber, VendorId, CompanyId, BranchId, DepartmentId, EmployeeId, Notes } = req.body;
    if (!Amount) return res.status(400).json({ message: 'Amount is required' });
    const expNumber = ExpenseNumber || `EXP-${Date.now()}`;
    const totalAmount = Number(Amount) + Number(TaxAmount || 0);
    const result = await pgQuery(appPool, 
      `INSERT INTO "Expenses" ("ExpenseNumber", "Category", "SubCategory", "Description", "Amount", "TaxAmount", "TotalAmount", "ExpenseDate", "PaymentMode", "ReferenceNumber", "VendorId", "CompanyId", "BranchId", "DepartmentId", "EmployeeId", "Notes")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [expNumber, Category||null, SubCategory||null, Description||null, Amount, TaxAmount||0, totalAmount, ExpenseDate||new Date(), PaymentMode||null, ReferenceNumber||null, VendorId||null, CompanyId||null, BranchId||null, DepartmentId||null, EmployeeId||null, Notes||null]
    );
    res.status(201).json({ message: 'Expense created', data: r(result) });
  } catch (error) {
    console.error('Create Expense Error:', error);
    res.status(500).json({ message: 'Failed to create expense', error: error.message });
  }
};

const getExpenses = async (req, res) => {
  try {
    const { limit = 20, offset = 0, search = '', status, companyId, category, startDate, endDate } = req.query;
    let where = 'WHERE e."IsDeleted" = false';
    const params = [];
    let idx = 1;
    if (search) { where += ` AND (e."ExpenseNumber" ILIKE $${idx} OR e."Category" ILIKE $${idx} OR e."Description" ILIKE $${idx})`; params.push(`%${search}%`); idx++; }
    if (status) { where += ` AND e."Status" = $${idx++}`; params.push(status); }
    if (companyId) { where += ` AND e."CompanyId" = $${idx++}`; params.push(parseInt(companyId)); }
    if (category) { where += ` AND e."Category" = $${idx++}`; params.push(category); }
    if (startDate) { where += ` AND e."ExpenseDate" >= $${idx++}`; params.push(startDate); }
    if (endDate) { where += ` AND e."ExpenseDate" <= $${idx++}`; params.push(endDate); }
    const limitVal = parseInt(limit);
    const offsetVal = parseInt(offset);
    const result = await pgQuery(appPool, 
      `SELECT e.* FROM "Expenses" e ${where} ORDER BY e."CreatedAt" DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limitVal, offsetVal]
    );
    const countResult = await pgQuery(appPool, 
      `SELECT COUNT(*) AS total, COALESCE(SUM("TotalAmount"),0) AS totalAmount FROM "Expenses" e ${where}`, params
    );
    res.json({ data: rows(result), total: r(countResult).total || 0, totalAmount: r(countResult).totalAmount || 0 });
  } catch (error) {
    console.error('Get Expenses Error:', error);
    res.status(500).json({ message: 'Failed to fetch expenses', error: error.message });
  }
};

const getExpenseById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pgQuery(appPool, 'SELECT * FROM "Expenses" WHERE "Id"=$1 AND "IsDeleted"=false', [parseInt(id)]);
    const data = rows(result);
    if (!data.length) return res.status(404).json({ message: 'Expense not found' });
    res.json({ data: data[0] });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch expense', error: error.message });
  }
};

const updateExpenseStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { Status, ApprovedById } = req.body;
    if (!Status) return res.status(400).json({ message: 'Status is required' });
    await pgQuery(appPool, 
      'UPDATE "Expenses" SET "Status"=$1, "ApprovedById"=$2, "ApprovedAt"=CURRENT_TIMESTAMP, "UpdatedAt"=CURRENT_TIMESTAMP WHERE "Id"=$3',
      [Status, ApprovedById || null, parseInt(id)]
    );
    res.json({ message: 'Expense status updated' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update expense', error: error.message });
  }
};

const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    await pgQuery(appPool, 'UPDATE "Expenses" SET "IsDeleted"=true, "UpdatedAt"=CURRENT_TIMESTAMP WHERE "Id"=$1', [parseInt(id)]);
    res.json({ message: 'Expense deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete expense', error: error.message });
  }
};

// ==================== WAREHOUSE RACKS & BINS ====================
const createRack = async (req, res) => {
  try {
    const { WarehouseId, RackNumber, Name, Description, Capacity } = req.body;
    if (!WarehouseId || !RackNumber) return res.status(400).json({ message: 'WarehouseId and RackNumber are required' });
    const result = await pgQuery(appPool, 
      `INSERT INTO "WarehouseRacks" ("WarehouseId", "RackNumber", "Name", "Description", "Capacity") VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [WarehouseId, RackNumber, Name||null, Description||null, Capacity||0]
    );
    res.status(201).json({ message: 'Rack created', data: r(result) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create rack', error: error.message });
  }
};

const getRacks = async (req, res) => {
  try {
    const { warehouseId, limit = 50, offset = 0 } = req.query;
    let where = 'WHERE wr."IsDeleted" = false';
    const params = [];
    let idx = 1;
    if (warehouseId) { where += ` AND wr."WarehouseId" = $${idx++}`; params.push(parseInt(warehouseId)); }
    params.push(parseInt(limit), parseInt(offset));
    const result = await pgQuery(appPool, 
      `SELECT wr.*, w."Name" AS WarehouseName FROM "WarehouseRacks" wr LEFT JOIN "Warehouses" w ON wr."WarehouseId" = w."Id" ${where} ORDER BY wr."RackNumber" LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params]
    );
    res.json({ data: rows(result) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch racks', error: error.message });
  }
};

const deleteRack = async (req, res) => {
  try {
    await pgQuery(appPool, 'UPDATE "WarehouseRacks" SET "IsDeleted"=true WHERE "Id"=$1', [parseInt(req.params.id)]);
    res.json({ message: 'Rack deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete rack', error: error.message });
  }
};

const createBin = async (req, res) => {
  try {
    const { WarehouseId, RackId, BinNumber, ShelfNumber, Name, Description, MaxCapacity, ProductId } = req.body;
    if (!WarehouseId || !BinNumber) return res.status(400).json({ message: 'WarehouseId and BinNumber are required' });
    const result = await pgQuery(appPool, 
      `INSERT INTO "WarehouseBins" ("WarehouseId", "RackId", "BinNumber", "ShelfNumber", "Name", "Description", "MaxCapacity", "ProductId") VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [WarehouseId, RackId||null, BinNumber, ShelfNumber||null, Name||null, Description||null, MaxCapacity||0, ProductId||null]
    );
    res.status(201).json({ message: 'Bin created', data: r(result) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create bin', error: error.message });
  }
};

const getBins = async (req, res) => {
  try {
    const { warehouseId, rackId, limit = 50, offset = 0 } = req.query;
    let where = 'WHERE wb."IsDeleted" = false';
    const params = [];
    let idx = 1;
    if (warehouseId) { where += ` AND wb."WarehouseId" = $${idx++}`; params.push(parseInt(warehouseId)); }
    if (rackId) { where += ` AND wb."RackId" = $${idx++}`; params.push(parseInt(rackId)); }
    params.push(parseInt(limit), parseInt(offset));
    const result = await pgQuery(appPool, 
      `SELECT wb.*, w."Name" AS WarehouseName, wr."RackNumber" FROM "WarehouseBins" wb LEFT JOIN "Warehouses" w ON wb."WarehouseId" = w."Id" LEFT JOIN "WarehouseRacks" wr ON wb."RackId" = wr."Id" ${where} ORDER BY wb."BinNumber" LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params]
    );
    res.json({ data: rows(result) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch bins', error: error.message });
  }
};

const deleteBin = async (req, res) => {
  try {
    await pgQuery(appPool, 'UPDATE "WarehouseBins" SET "IsDeleted"=true WHERE "Id"=$1', [parseInt(req.params.id)]);
    res.json({ message: 'Bin deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete bin', error: error.message });
  }
};

module.exports = {
  createNotification, getNotifications, markAsRead, markAllAsRead, deleteNotification,
  createApprovalRequest, getApprovals, processApproval,
  createExpense, getExpenses, getExpenseById, updateExpenseStatus, deleteExpense,
  createRack, getRacks, deleteRack, createBin, getBins, deleteBin
};