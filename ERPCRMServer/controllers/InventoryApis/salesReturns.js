const { appPool } = require('../../config/db');
const { pgQuery } = require("../../utils/pgCompat");

const createSalesReturn = async (req, res) => {
  try {
    const { ReturnNumber, SalesOrderId, CustomerId, CompanyId, BranchId, WarehouseId, ReturnDate, Reason, Items } = req.body;
    const retNumber = ReturnNumber || `SRT-${Date.now()}`;
    const result = await pgQuery(appPool, 
      `INSERT INTO SalesReturns (ReturnNumber, SalesOrderId, CustomerId, CompanyId, BranchId, WarehouseId, ReturnDate, Reason) VALUES (@ReturnNumber, @SalesOrderId, @CustomerId, @CompanyId, @BranchId, @WarehouseId, @ReturnDate, @Reason); SELECT SCOPE_IDENTITY() AS Id;`,
      { ReturnNumber: retNumber, SalesOrderId: SalesOrderId||null, CustomerId: CustomerId||null, CompanyId: CompanyId||null, BranchId: BranchId||null, WarehouseId: WarehouseId||null, ReturnDate: ReturnDate||new Date(), Reason: Reason||null }
    );
    const returnId = result.recordset[0].Id;
    if (Items && Items.length > 0) {
      for (const item of Items) {
        await pgQuery(appPool, 
          `INSERT INTO SalesReturnItems (ReturnId, ProductId, BatchId, Quantity, UnitPrice, TaxRate, TaxAmount, TotalAmount, Reason, Condition) VALUES (@ReturnId, @ProductId, @BatchId, @Quantity, @UnitPrice, @TaxRate, @TaxAmount, @TotalAmount, @Reason, @Condition)`,
          { ReturnId: returnId, ProductId: item.ProductId||null, BatchId: item.BatchId||null, Quantity: item.Quantity, UnitPrice: item.UnitPrice||0, TaxRate: item.TaxRate||0, TaxAmount: item.TaxAmount||0, TotalAmount: item.TotalAmount||0, Reason: item.Reason||null, Condition: item.Condition||'Good' }
        );
      }
    }
    res.status(201).json({ message: 'Sales return created', data: { Id: returnId, ReturnNumber: retNumber } });
  } catch (error) {
    console.error('Create Sales Return Error:', error);
    res.status(500).json({ message: 'Failed to create sales return', error: error.message });
  }
};

const getSalesReturns = async (req, res) => {
  try {
    const { limit = 20, offset = 0, search = '', status, companyId } = req.query;
    let where = 'WHERE sr."IsDeleted" = false';
    const params = {};
    if (search) { where += ' AND (sr."ReturnNumber" LIKE @search)'; params.search = `%${search}%`; }
    if (status) { where += ' AND sr."Status" = @status'; params.status = status; }
    if (companyId) { where += ' AND sr."CompanyId" = @companyId'; params.companyId = parseInt(companyId); }
    params.limit = parseInt(limit);
    params.offset = parseInt(offset);
    const result = await pgQuery(appPool, 
      `SELECT sr.*, c.Name AS CustomerName FROM SalesReturns sr LEFT JOIN Customers c ON sr."CustomerId" = c.Id ${where} ORDER BY sr."CreatedAt" DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, params
    );
    const countResult = await pgQuery(appPool, `SELECT COUNT(*) AS total FROM SalesReturns sr ${where}`, params);
    res.json({ data: result.recordset, total: countResult.recordset[0].total });
  } catch (error) {
    console.error('Get Sales Returns Error:', error);
    res.status(500).json({ message: 'Failed to fetch sales returns', error: error.message });
  }
};

const getSalesReturnById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pgQuery(appPool, 'SELECT * FROM SalesReturns WHERE Id=@id AND IsDeleted=0', { id: parseInt(id) });
    if (!result.recordset.length) return res.status(404).json({ message: 'Sales return not found' });
    const items = await pgQuery(appPool, 'SELECT sri.*, p."ProductName" AS ProductName FROM SalesReturnItems sri LEFT JOIN Products p ON sri."ProductId" = p."Id" WHERE sri."ReturnId"=@id AND sri.IsDeleted=0', { id: parseInt(id) });
    res.json({ data: { ...result.recordset[0], Items: items.recordset } });
  } catch (error) {
    console.error('Get Sales Return Error:', error);
    res.status(500).json({ message: 'Failed to fetch sales return', error: error.message });
  }
};

const updateSalesReturnStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { Status } = req.body;
    await pgQuery(appPool, 'UPDATE SalesReturns SET Status=@Status, UpdatedAt=GETDATE() WHERE Id=@id', { Status, id: parseInt(id) });
    res.json({ message: 'Sales return status updated' });
  } catch (error) {
    console.error('Update Sales Return Status Error:', error);
    res.status(500).json({ message: 'Failed to update status', error: error.message });
  }
};

const deleteSalesReturn = async (req, res) => {
  try {
    const { id } = req.params;
    await pgQuery(appPool, 'UPDATE SalesReturns SET IsDeleted=1, UpdatedAt=GETDATE() WHERE Id=@id', { id: parseInt(id) });
    await pgQuery(appPool, 'UPDATE SalesReturnItems SET IsDeleted=1 WHERE ReturnId=@id', { id: parseInt(id) });
    res.json({ message: 'Sales return deleted' });
  } catch (error) {
    console.error('Delete Sales Return Error:', error);
    res.status(500).json({ message: 'Failed to delete sales return', error: error.message });
  }
};

module.exports = { createSalesReturn, getSalesReturns, getSalesReturnById, updateSalesReturnStatus, deleteSalesReturn };