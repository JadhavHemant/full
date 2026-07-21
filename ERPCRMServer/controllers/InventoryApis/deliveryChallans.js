const { appPool } = require('../../config/db');
const { pgQuery } = require("../../utils/pgCompat");

const createChallan = async (req, res) => {
  try {
    const { ChallanNumber, SalesOrderId, CustomerId, CompanyId, BranchId, WarehouseId, DeliveryDate, ExpectedDeliveryDate, VehicleNumber, DriverName, DriverPhone, ShippingAddress, Notes, Items } = req.body;
    const cNumber = ChallanNumber || `DC-${Date.now()}`;
    const result = await pgQuery(appPool, 
      `INSERT INTO DeliveryChallans (ChallanNumber, SalesOrderId, CustomerId, CompanyId, BranchId, WarehouseId, DeliveryDate, ExpectedDeliveryDate, VehicleNumber, DriverName, DriverPhone, ShippingAddress, Notes) VALUES (@ChallanNumber, @SalesOrderId, @CustomerId, @CompanyId, @BranchId, @WarehouseId, @DeliveryDate, @ExpectedDeliveryDate, @VehicleNumber, @DriverName, @DriverPhone, @ShippingAddress, @Notes); SELECT SCOPE_IDENTITY() AS Id;`,
      { ChallanNumber: cNumber, SalesOrderId: SalesOrderId||null, CustomerId: CustomerId||null, CompanyId: CompanyId||null, BranchId: BranchId||null, WarehouseId: WarehouseId||null, DeliveryDate: DeliveryDate||new Date(), ExpectedDeliveryDate: ExpectedDeliveryDate||null, VehicleNumber: VehicleNumber||null, DriverName: DriverName||null, DriverPhone: DriverPhone||null, ShippingAddress: ShippingAddress||null, Notes: Notes||null }
    );
    const challanId = result.recordset[0].Id;
    if (Items && Items.length > 0) {
      for (const item of Items) {
        await pgQuery(appPool, 
          `INSERT INTO DeliveryChallanItems (ChallanId, ProductId, BatchId, Quantity, UnitPrice, Description) VALUES (@ChallanId, @ProductId, @BatchId, @Quantity, @UnitPrice, @Description)`,
          { ChallanId: challanId, ProductId: item.ProductId||null, BatchId: item.BatchId||null, Quantity: item.Quantity, UnitPrice: item.UnitPrice||null, Description: item.Description||null }
        );
      }
      await pgQuery(appPool, 'UPDATE DeliveryChallans SET TotalItems=@count, TotalQuantity=@totalQty WHERE Id=@id', { count: Items.length, totalQty: Items.reduce((s, i) => s + (i.Quantity || 0), 0), id: challanId });
    }
    res.status(201).json({ message: 'Delivery challan created', data: { Id: challanId, ChallanNumber: cNumber } });
  } catch (error) {
    console.error('Create Challan Error:', error);
    res.status(500).json({ message: 'Failed to create delivery challan', error: error.message });
  }
};

const getChallans = async (req, res) => {
  try {
    const { limit = 20, offset = 0, search = '', status, companyId } = req.query;
    let where = 'WHERE dc."IsDeleted" = false';
    const params = {};
    if (search) { where += ' AND (dc."ChallanNumber" LIKE @search)'; params.search = `%${search}%`; }
    if (status) { where += ' AND dc."Status" = @status'; params.status = status; }
    if (companyId) { where += ' AND dc."CompanyId" = @companyId'; params.companyId = parseInt(companyId); }
    params.limit = parseInt(limit);
    params.offset = parseInt(offset);
    const result = await pgQuery(appPool, 
      `SELECT dc.*, c.Name AS CustomerName FROM DeliveryChallans dc LEFT JOIN Customers c ON dc."CustomerId" = c.Id ${where} ORDER BY dc."CreatedAt" DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, params
    );
    const countResult = await pgQuery(appPool, `SELECT COUNT(*) AS total FROM DeliveryChallans dc ${where}`, params);
    res.json({ data: result.recordset, total: countResult.recordset[0].total });
  } catch (error) {
    console.error('Get Challans Error:', error);
    res.status(500).json({ message: 'Failed to fetch challans', error: error.message });
  }
};

const getChallanById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pgQuery(appPool, 'SELECT * FROM DeliveryChallans WHERE Id=@id AND IsDeleted=0', { id: parseInt(id) });
    if (!result.recordset.length) return res.status(404).json({ message: 'Challan not found' });
    const items = await pgQuery(appPool, 'SELECT dci.*, p."ProductName" AS ProductName FROM DeliveryChallanItems dci LEFT JOIN Products p ON dci."ProductId" = p."Id" WHERE dci."ChallanId"=@id AND dci.IsDeleted=0', { id: parseInt(id) });
    res.json({ data: { ...result.recordset[0], Items: items.recordset } });
  } catch (error) {
    console.error('Get Challan Error:', error);
    res.status(500).json({ message: 'Failed to fetch challan', error: error.message });
  }
};

const updateChallanStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { Status } = req.body;
    await pgQuery(appPool, 'UPDATE DeliveryChallans SET Status=@Status, UpdatedAt=GETDATE() WHERE Id=@id', { Status, id: parseInt(id) });
    res.json({ message: 'Challan status updated' });
  } catch (error) {
    console.error('Update Challan Status Error:', error);
    res.status(500).json({ message: 'Failed to update status', error: error.message });
  }
};

const deleteChallan = async (req, res) => {
  try {
    const { id } = req.params;
    await pgQuery(appPool, 'UPDATE DeliveryChallans SET IsDeleted=1, UpdatedAt=GETDATE() WHERE Id=@id', { id: parseInt(id) });
    await pgQuery(appPool, 'UPDATE DeliveryChallanItems SET IsDeleted=1 WHERE ChallanId=@id', { id: parseInt(id) });
    res.json({ message: 'Challan deleted' });
  } catch (error) {
    console.error('Delete Challan Error:', error);
    res.status(500).json({ message: 'Failed to delete challan', error: error.message });
  }
};

module.exports = { createChallan, getChallans, getChallanById, updateChallanStatus, deleteChallan };