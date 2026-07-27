const { appPool } = require('../../config/db');
const { pgQuery } = require("../../utils/pgCompat");

// ==================== BOM ====================
const createBOM = async (req, res) => {
  try {
    const { BOMCode, ProductId, ProductName, Version, Description, Quantity, UnitId, CompanyId, Items } = req.body;
    
    // Validate required fields
    if (!ProductId) {
      return res.status(400).json({ 
        message: 'ProductId is required',
        error: 'ProductId must be provided and cannot be null'
      });
    }
    
    const code = BOMCode || `BOM-${Date.now()}`;
    const result = await pgQuery(appPool, 
      `INSERT INTO BOM (BOMCode, ProductId, ProductName, Version, Description, Quantity, UnitId, CompanyId) VALUES (@BOMCode, @ProductId, @ProductName, @Version, @Description, @Quantity, @UnitId, @CompanyId); SELECT SCOPE_IDENTITY() AS Id;`,
      { BOMCode: code, ProductId, ProductName: ProductName||null, Version: Version||'1.0', Description: Description||null, Quantity: Quantity||1, UnitId: UnitId||null, CompanyId: CompanyId||null }
    );
    const bomId = result.recordset[0].Id;
    if (Items && Items.length > 0) {
      for (const item of Items) {
        await pgQuery(appPool, 
          `INSERT INTO BOMItems (BOMId, ProductId, Quantity, UnitId, UnitCost, WastagePercent, Remarks) VALUES (@BOMId, @ProductId, @Quantity, @UnitId, @UnitCost, @WastagePercent, @Remarks)`,
          { BOMId: bomId, ProductId: item.ProductId, Quantity: item.Quantity, UnitId: item.UnitId||null, UnitCost: item.UnitCost||0, WastagePercent: item.WastagePercent||0, Remarks: item.Remarks||null }
        );
      }
    }
    res.status(201).json({ message: 'BOM created', data: { Id: bomId, BOMCode: code } });
  } catch (error) {
    console.error('Create BOM Error:', error);
    res.status(500).json({ message: 'Failed to create BOM', error: error.message });
  }
};

const getBOMs = async (req, res) => {
  try {
    const { limit = 20, offset = 0, search = '', companyId } = req.query;
    let where = 'WHERE b."IsDeleted" = false';
    const params = {};
    if (search) { where += ' AND (b."BOMCode" LIKE @search OR b."ProductName" LIKE @search)'; params.search = `%${search}%`; }
    if (companyId) { where += ' AND b."CompanyId" = @companyId'; params.companyId = parseInt(companyId); }
    params.limit = parseInt(limit);
    params.offset = parseInt(offset);
    const result = await pgQuery(appPool, 
      `SELECT b.*, p."ProductName" AS ProductName FROM BOM b LEFT JOIN Products p ON b."ProductId" = p."Id" ${where} ORDER BY b."CreatedAt" DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, params
    );
    const countResult = await pgQuery(appPool, `SELECT COUNT(*) AS total FROM BOM b ${where}`, params);
    res.json({ data: result.recordset, total: countResult.recordset[0].total });
  } catch (error) {
    console.error('Get BOMs Error:', error);
    res.status(500).json({ message: 'Failed to fetch BOMs', error: error.message });
  }
};

const getBOMById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pgQuery(appPool, 'SELECT * FROM BOM WHERE Id=@id AND IsDeleted=0', { id: parseInt(id) });
    if (!result.recordset.length) return res.status(404).json({ message: 'BOM not found' });
    const items = await pgQuery(appPool, 'SELECT bi.*, p."ProductName" AS ProductName FROM BOMItems bi LEFT JOIN Products p ON bi."ProductId" = p."Id" WHERE bi."BOMId"=@id AND bi.IsDeleted=0', { id: parseInt(id) });
    res.json({ data: { ...result.recordset[0], Items: items.recordset } });
  } catch (error) {
    console.error('Get BOM Error:', error);
    res.status(500).json({ message: 'Failed to fetch BOM', error: error.message });
  }
};

const deleteBOM = async (req, res) => {
  try {
    const { id } = req.params;
    await pgQuery(appPool, 'UPDATE BOM SET IsDeleted=1, UpdatedAt=GETDATE() WHERE Id=@id', { id: parseInt(id) });
    await pgQuery(appPool, 'UPDATE BOMItems SET IsDeleted=1 WHERE BOMId=@id', { id: parseInt(id) });
    res.json({ message: 'BOM deleted' });
  } catch (error) {
    console.error('Delete BOM Error:', error);
    res.status(500).json({ message: 'Failed to delete BOM', error: error.message });
  }
};

// ==================== PRODUCTION ORDERS ====================
const createProductionOrder = async (req, res) => {
  try {
    const { OrderNumber, BOMId, ProductId, PlannedQuantity, UnitId, CompanyId, WarehouseId, Priority, PlannedStartDate, PlannedEndDate, AssignedTo, Remarks } = req.body;
    const orderNumber = OrderNumber || `PO-${Date.now()}`;
    const result = await pgQuery(appPool, 
      `INSERT INTO ProductionOrders (OrderNumber, BOMId, ProductId, PlannedQuantity, UnitId, CompanyId, WarehouseId, Priority, PlannedStartDate, PlannedEndDate, AssignedTo, Remarks) VALUES (@OrderNumber, @BOMId, @ProductId, @PlannedQuantity, @UnitId, @CompanyId, @WarehouseId, @Priority, @PlannedStartDate, @PlannedEndDate, @AssignedTo, @Remarks); SELECT SCOPE_IDENTITY() AS Id;`,
      { OrderNumber: orderNumber, BOMId: BOMId||null, ProductId, PlannedQuantity, UnitId: UnitId||null, CompanyId: CompanyId||null, WarehouseId: WarehouseId||null, Priority: Priority||'Medium', PlannedStartDate: PlannedStartDate||null, PlannedEndDate: PlannedEndDate||null, AssignedTo: AssignedTo||null, Remarks: Remarks||null }
    );
    res.status(201).json({ message: 'Production order created', data: { Id: result.recordset[0].Id, OrderNumber: orderNumber } });
  } catch (error) {
    console.error('Create Production Order Error:', error);
    res.status(500).json({ message: 'Failed to create production order', error: error.message });
  }
};

const getProductionOrders = async (req, res) => {
  try {
    const { limit = 20, offset = 0, search = '', status, companyId } = req.query;
    let where = 'WHERE po."IsDeleted" = false';
    const params = {};
    if (search) { where += ' AND (po."OrderNumber" LIKE @search)'; params.search = `%${search}%`; }
    if (status) { where += ' AND po."Status" = @status'; params.status = status; }
    if (companyId) { where += ' AND po."CompanyId" = @companyId'; params.companyId = parseInt(companyId); }
    params.limit = parseInt(limit);
    params.offset = parseInt(offset);
    const result = await pgQuery(appPool, 
      `SELECT po.*, p."ProductName" AS ProductName FROM ProductionOrders po LEFT JOIN Products p ON po."ProductId" = p."Id" ${where} ORDER BY po."CreatedAt" DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, params
    );
    const countResult = await pgQuery(appPool, `SELECT COUNT(*) AS total FROM ProductionOrders po ${where}`, params);
    res.json({ data: result.recordset, total: countResult.recordset[0].total });
  } catch (error) {
    console.error('Get Production Orders Error:', error);
    res.status(500).json({ message: 'Failed to fetch production orders', error: error.message });
  }
};

const getProductionOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pgQuery(appPool, 'SELECT * FROM ProductionOrders WHERE Id=@id AND IsDeleted=0', { id: parseInt(id) });
    if (!result.recordset.length) return res.status(404).json({ message: 'Production order not found' });
    const tracking = await pgQuery(appPool, 'SELECT * FROM ProductionTracking WHERE ProductionOrderId=@id', { id: parseInt(id) });
    res.json({ data: { ...result.recordset[0], Tracking: tracking.recordset } });
  } catch (error) {
    console.error('Get Production Order Error:', error);
    res.status(500).json({ message: 'Failed to fetch production order', error: error.message });
  }
};

const updateProductionOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { Status, ProducedQuantity, RejectedQuantity } = req.body;
    const updates = { Status, id: parseInt(id) };
    let query = 'UPDATE ProductionOrders SET Status=@Status, UpdatedAt=GETDATE()';
    if (ProducedQuantity !== undefined) { query += ', ProducedQuantity=@ProducedQuantity'; updates.ProducedQuantity = ProducedQuantity; }
    if (RejectedQuantity !== undefined) { query += ', RejectedQuantity=@RejectedQuantity'; updates.RejectedQuantity = RejectedQuantity; }
    query += ' WHERE Id=@id';
    await pgQuery(appPool, query, updates);
    res.json({ message: 'Production order status updated' });
  } catch (error) {
    console.error('Update Production Order Status Error:', error);
    res.status(500).json({ message: 'Failed to update status', error: error.message });
  }
};

const deleteProductionOrder = async (req, res) => {
  try {
    const { id } = req.params;
    await pgQuery(appPool, 'UPDATE ProductionOrders SET IsDeleted=1, UpdatedAt=GETDATE() WHERE Id=@id', { id: parseInt(id) });
    res.json({ message: 'Production order deleted' });
  } catch (error) {
    console.error('Delete Production Order Error:', error);
    res.status(500).json({ message: 'Failed to delete production order', error: error.message });
  }
};

module.exports = { createBOM, getBOMs, getBOMById, deleteBOM, createProductionOrder, getProductionOrders, getProductionOrderById, updateProductionOrderStatus, deleteProductionOrder };