const { appPool } = require('../../config/db');
const { pgQuery } = require("../../utils/pgCompat");

const createPurchaseReturn = async (req, res) => {
  try {
    const { ReturnNumber, PurchaseOrderId, SupplierId, CompanyId, BranchId, WarehouseId, ReturnDate, Reason, Items } = req.body;
    const retNumber = ReturnNumber || `PR-${Date.now()}`;
    const result = await pgQuery(appPool, 
      `INSERT INTO PurchaseReturns (ReturnNumber, PurchaseOrderId, SupplierId, CompanyId, BranchId, WarehouseId, ReturnDate, Reason) VALUES (@ReturnNumber, @PurchaseOrderId, @SupplierId, @CompanyId, @BranchId, @WarehouseId, @ReturnDate, @Reason); SELECT SCOPE_IDENTITY() AS Id;`,
      { ReturnNumber: retNumber, PurchaseOrderId: PurchaseOrderId||null, SupplierId: SupplierId||null, CompanyId: CompanyId||null, BranchId: BranchId||null, WarehouseId: WarehouseId||null, ReturnDate: ReturnDate||new Date(), Reason: Reason||null }
    );
    const returnId = result.recordset[0].Id;
    if (Items && Items.length > 0) {
      for (const item of Items) {
        await pgQuery(appPool, 
          `INSERT INTO PurchaseReturnItems (ReturnId, ProductId, BatchId, Quantity, UnitPrice, TaxRate, TaxAmount, TotalAmount, Reason) VALUES (@ReturnId, @ProductId, @BatchId, @Quantity, @UnitPrice, @TaxRate, @TaxAmount, @TotalAmount, @Reason)`,
          { ReturnId: returnId, ProductId: item.ProductId||null, BatchId: item.BatchId||null, Quantity: item.Quantity, UnitPrice: item.UnitPrice||0, TaxRate: item.TaxRate||0, TaxAmount: item.TaxAmount||0, TotalAmount: item.TotalAmount||0, Reason: item.Reason||null }
        );
      }
    }
    res.status(201).json({ message: 'Purchase return created', data: { Id: returnId, ReturnNumber: retNumber } });
  } catch (error) {
    console.error('Create Purchase Return Error:', error);
    res.status(500).json({ message: 'Failed to create purchase return', error: error.message });
  }
};

const getPurchaseReturns = async (req, res) => {
  try {
    const { limit = 20, offset = 0, search = '', status, companyId } = req.query;
    let where = 'WHERE pr."IsDeleted" = false';
    const params = {};
    if (search) { where += ' AND (pr."ReturnNumber" LIKE @search)'; params.search = `%${search}%`; }
    if (status) { where += ' AND pr."Status" = @status'; params.status = status; }
    if (companyId) { where += ' AND pr."CompanyId" = @companyId'; params.companyId = parseInt(companyId); }
    params.limit = parseInt(limit);
    params.offset = parseInt(offset);
    const result = await pgQuery(appPool, 
      `SELECT pr.*, s.Name AS SupplierName FROM PurchaseReturns pr LEFT JOIN Suppliers s ON pr."SupplierId" = s.Id ${where} ORDER BY pr."CreatedAt" DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, params
    );
    const countResult = await pgQuery(appPool, `SELECT COUNT(*) AS total FROM PurchaseReturns pr ${where}`, params);
    res.json({ data: result.recordset, total: countResult.recordset[0].total });
  } catch (error) {
    console.error('Get Purchase Returns Error:', error);
    res.status(500).json({ message: 'Failed to fetch purchase returns', error: error.message });
  }
};

const getPurchaseReturnById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pgQuery(appPool, 'SELECT * FROM PurchaseReturns WHERE Id=@id AND IsDeleted=0', { id: parseInt(id) });
    if (!result.recordset.length) return res.status(404).json({ message: 'Purchase return not found' });
    const items = await pgQuery(appPool, 'SELECT pri.*, p."ProductName" AS ProductName FROM PurchaseReturnItems pri LEFT JOIN Products p ON pri."ProductId" = p."Id" WHERE pri."ReturnId"=@id AND pri.IsDeleted=0', { id: parseInt(id) });
    res.json({ data: { ...result.recordset[0], Items: items.recordset } });
  } catch (error) {
    console.error('Get Purchase Return Error:', error);
    res.status(500).json({ message: 'Failed to fetch purchase return', error: error.message });
  }
};

const updatePurchaseReturnStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { Status } = req.body;
    await pgQuery(appPool, 'UPDATE PurchaseReturns SET Status=@Status, UpdatedAt=GETDATE() WHERE Id=@id', { Status, id: parseInt(id) });
    res.json({ message: 'Purchase return status updated' });
  } catch (error) {
    console.error('Update Purchase Return Status Error:', error);
    res.status(500).json({ message: 'Failed to update status', error: error.message });
  }
};

const deletePurchaseReturn = async (req, res) => {
  try {
    const { id } = req.params;
    await pgQuery(appPool, 'UPDATE PurchaseReturns SET IsDeleted=1, UpdatedAt=GETDATE() WHERE Id=@id', { id: parseInt(id) });
    await pgQuery(appPool, 'UPDATE PurchaseReturnItems SET IsDeleted=1 WHERE ReturnId=@id', { id: parseInt(id) });
    res.json({ message: 'Purchase return deleted' });
  } catch (error) {
    console.error('Delete Purchase Return Error:', error);
    res.status(500).json({ message: 'Failed to delete purchase return', error: error.message });
  }
};

module.exports = { createPurchaseReturn, getPurchaseReturns, getPurchaseReturnById, updatePurchaseReturnStatus, deletePurchaseReturn };