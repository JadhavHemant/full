const { appPool } = require('../../config/db');
const { pgQuery } = require("../../utils/pgCompat");

const createRequisition = async (req, res) => {
  try {
    const { RequisitionNumber, RequestedById, DepartmentId, CompanyId, BranchId, Priority, RequiredByDate, Remarks, Items } = req.body;
    const reqNumber = RequisitionNumber || `PR-${Date.now()}`;
    const result = await pgQuery(appPool, 
      `INSERT INTO PurchaseRequisitions (RequisitionNumber, RequestedById, DepartmentId, CompanyId, BranchId, Priority, RequiredByDate, Remarks) VALUES (@RequisitionNumber, @RequestedById, @DepartmentId, @CompanyId, @BranchId, @Priority, @RequiredByDate, @Remarks); SELECT SCOPE_IDENTITY() AS Id;`,
      { RequisitionNumber: reqNumber, RequestedById: RequestedById||null, DepartmentId: DepartmentId||null, CompanyId: CompanyId||null, BranchId: BranchId||null, Priority: Priority||'Medium', RequiredByDate: RequiredByDate||null, Remarks: Remarks||null }
    );
    const requisitionId = result.recordset[0].Id;
    if (Items && Items.length > 0) {
      for (const item of Items) {
        await pgQuery(appPool, 
          `INSERT INTO PurchaseRequisitionItems (RequisitionId, ProductId, Quantity, UnitPrice, Specifications, Remarks) VALUES (@RequisitionId, @ProductId, @Quantity, @UnitPrice, @Specifications, @Remarks)`,
          { RequisitionId: requisitionId, ProductId: item.ProductId||null, Quantity: item.Quantity, UnitPrice: item.UnitPrice||null, Specifications: item.Specifications||null, Remarks: item.Remarks||null }
        );
      }
    }
    res.status(201).json({ message: 'Purchase requisition created', data: { Id: requisitionId, RequisitionNumber: reqNumber } });
  } catch (error) {
    console.error('Create Requisition Error:', error);
    res.status(500).json({ message: 'Failed to create requisition', error: error.message });
  }
};

const getRequisitions = async (req, res) => {
  try {
    const { limit = 20, offset = 0, search = '', status, companyId, priority } = req.query;
    let where = 'WHERE pr."IsDeleted" = false';
    const params = {};
    if (search) { where += ' AND (pr."RequisitionNumber" LIKE @search)'; params.search = `%${search}%`; }
    if (status) { where += ' AND pr."Status" = @status'; params.status = status; }
    if (companyId) { where += ' AND pr."CompanyId" = @companyId'; params.companyId = parseInt(companyId); }
    if (priority) { where += ' AND pr."Priority" = @priority'; params.priority = priority; }
    params.limit = parseInt(limit);
    params.offset = parseInt(offset);
    const result = await pgQuery(appPool, 
      `SELECT pr.*, u.Name AS RequestedByName FROM PurchaseRequisitions pr LEFT JOIN Users u ON pr."RequestedById" = u."UserId" ${where} ORDER BY pr."CreatedAt" DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, params
    );
    const countResult = await pgQuery(appPool, `SELECT COUNT(*) AS total FROM PurchaseRequisitions pr ${where}`, params);
    res.json({ data: result.recordset, total: countResult.recordset[0].total });
  } catch (error) {
    console.error('Get Requisitions Error:', error);
    res.status(500).json({ message: 'Failed to fetch requisitions', error: error.message });
  }
};

const getRequisitionById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pgQuery(appPool, 'SELECT * FROM PurchaseRequisitions WHERE Id=@id AND IsDeleted=0', { id: parseInt(id) });
    if (!result.recordset.length) return res.status(404).json({ message: 'Requisition not found' });
    const items = await pgQuery(appPool, 'SELECT pri.*, p."ProductName" AS ProductName FROM PurchaseRequisitionItems pri LEFT JOIN Products p ON pri."ProductId" = p."Id" WHERE pri."RequisitionId"=@id AND pri.IsDeleted=0', { id: parseInt(id) });
    res.json({ data: { ...result.recordset[0], Items: items.recordset } });
  } catch (error) {
    console.error('Get Requisition Error:', error);
    res.status(500).json({ message: 'Failed to fetch requisition', error: error.message });
  }
};

const updateRequisitionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { Status, ApprovedById, ApprovalRemarks } = req.body;
    const updates = { Status, id: parseInt(id) };
    let query = 'UPDATE PurchaseRequisitions SET Status=@Status, UpdatedAt=GETDATE()';
    if (Status === 'Approved') { query += ', ApprovedById=@ApprovedById, ApprovedAt=GETDATE(), ApprovalRemarks=@ApprovalRemarks'; updates.ApprovedById = ApprovedById||null; updates.ApprovalRemarks = ApprovalRemarks||null; }
    query += ' WHERE Id=@id';
    await pgQuery(appPool, query, updates);
    res.json({ message: 'Requisition status updated' });
  } catch (error) {
    console.error('Update Requisition Status Error:', error);
    res.status(500).json({ message: 'Failed to update status', error: error.message });
  }
};

const deleteRequisition = async (req, res) => {
  try {
    const { id } = req.params;
    await pgQuery(appPool, 'UPDATE PurchaseRequisitions SET IsDeleted=1, UpdatedAt=GETDATE() WHERE Id=@id', { id: parseInt(id) });
    await pgQuery(appPool, 'UPDATE PurchaseRequisitionItems SET IsDeleted=1 WHERE RequisitionId=@id', { id: parseInt(id) });
    res.json({ message: 'Requisition deleted' });
  } catch (error) {
    console.error('Delete Requisition Error:', error);
    res.status(500).json({ message: 'Failed to delete requisition', error: error.message });
  }
};

module.exports = { createRequisition, getRequisitions, getRequisitionById, updateRequisitionStatus, deleteRequisition };