const { appPool } = require('../../config/db');
const { pgQuery } = require("../../utils/pgCompat");

const createQuotation = async (req, res) => {
  try {
    const { QuotationNumber, CustomerId, CompanyId, BranchId, QuotationDate, ValidUntil, Terms, Notes, PreparedById, Items } = req.body;
    const qNumber = QuotationNumber || `SQ-${Date.now()}`;
    const result = await pgQuery(appPool, 
      `INSERT INTO SalesQuotations (QuotationNumber, CustomerId, CompanyId, BranchId, QuotationDate, ValidUntil, Terms, Notes, PreparedById) VALUES (@QuotationNumber, @CustomerId, @CompanyId, @BranchId, @QuotationDate, @ValidUntil, @Terms, @Notes, @PreparedById); SELECT SCOPE_IDENTITY() AS Id;`,
      { QuotationNumber: qNumber, CustomerId: CustomerId||null, CompanyId: CompanyId||null, BranchId: BranchId||null, QuotationDate: QuotationDate||new Date(), ValidUntil: ValidUntil||null, Terms: Terms||null, Notes: Notes||null, PreparedById: PreparedById||null }
    );
    const quotationId = result.recordset[0].Id;
    if (Items && Items.length > 0) {
      for (const item of Items) {
        await pgQuery(appPool, 
          `INSERT INTO SalesQuotationItems (QuotationId, ProductId, Quantity, UnitPrice, DiscountPercent, DiscountAmount, TaxRate, TaxAmount, TotalAmount, Description) VALUES (@QuotationId, @ProductId, @Quantity, @UnitPrice, @DiscountPercent, @DiscountAmount, @TaxRate, @TaxAmount, @TotalAmount, @Description)`,
          { QuotationId: quotationId, ProductId: item.ProductId||null, Quantity: item.Quantity, UnitPrice: item.UnitPrice||0, DiscountPercent: item.DiscountPercent||0, DiscountAmount: item.DiscountAmount||0, TaxRate: item.TaxRate||0, TaxAmount: item.TaxAmount||0, TotalAmount: item.TotalAmount||0, Description: item.Description||null }
        );
      }
    }
    res.status(201).json({ message: 'Quotation created', data: { Id: quotationId, QuotationNumber: qNumber } });
  } catch (error) {
    console.error('Create Quotation Error:', error);
    res.status(500).json({ message: 'Failed to create quotation', error: error.message });
  }
};

const getQuotations = async (req, res) => {
  try {
    const { limit = 20, offset = 0, search = '', status, companyId, customerId } = req.query;
    let where = 'WHERE sq."IsDeleted" = false';
    const params = {};
    if (search) { where += ' AND (sq."QuotationNumber" LIKE @search)'; params.search = `%${search}%`; }
    if (status) { where += ' AND sq."Status" = @status'; params.status = status; }
    if (companyId) { where += ' AND sq."CompanyId" = @companyId'; params.companyId = parseInt(companyId); }
    if (customerId) { where += ' AND sq."CustomerId" = @customerId'; params.customerId = parseInt(customerId); }
    params.limit = parseInt(limit);
    params.offset = parseInt(offset);
    const result = await pgQuery(appPool, 
      `SELECT sq.*, c."Name" AS CustomerName FROM SalesQuotations sq LEFT JOIN Customers c ON sq."CustomerId" = c."Id" ${where} ORDER BY sq."CreatedAt" DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, params
    );
    const countResult = await pgQuery(appPool, `SELECT COUNT(*) AS total FROM SalesQuotations sq ${where}`, params);
    res.json({ data: result.recordset, total: countResult.recordset[0].total });
  } catch (error) {
    console.error('Get Quotations Error:', error);
    res.status(500).json({ message: 'Failed to fetch quotations', error: error.message });
  }
};

const getQuotationById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pgQuery(appPool, 'SELECT * FROM SalesQuotations WHERE Id=@id AND IsDeleted=0', { id: parseInt(id) });
    if (!result.recordset.length) return res.status(404).json({ message: 'Quotation not found' });
    const items = await pgQuery(appPool, 'SELECT sqi.*, p."ProductName" AS ProductName FROM SalesQuotationItems sqi LEFT JOIN Products p ON sqi."ProductId" = p."Id" WHERE sqi."QuotationId"=@id AND sqi.IsDeleted=0', { id: parseInt(id) });
    res.json({ data: { ...result.recordset[0], Items: items.recordset } });
  } catch (error) {
    console.error('Get Quotation Error:', error);
    res.status(500).json({ message: 'Failed to fetch quotation', error: error.message });
  }
};

const updateQuotationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { Status } = req.body;
    await pgQuery(appPool, 'UPDATE SalesQuotations SET Status=@Status, UpdatedAt=GETDATE() WHERE Id=@id', { Status, id: parseInt(id) });
    res.json({ message: 'Quotation status updated' });
  } catch (error) {
    console.error('Update Quotation Status Error:', error);
    res.status(500).json({ message: 'Failed to update status', error: error.message });
  }
};

const convertToSalesOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const quotation = await pgQuery(appPool, 'SELECT * FROM SalesQuotations WHERE Id=@id AND IsDeleted=0', { id: parseInt(id) });
    if (!quotation.recordset.length) return res.status(404).json({ message: 'Quotation not found' });
    const q = quotation.recordset[0];
    const soNumber = `SO-${Date.now()}`;
    const soResult = await pgQuery(appPool, 
      `INSERT INTO SalesOrders (OrderNumber, CustomerId, CompanyId, BranchId, OrderDate, Status, SubTotal, TaxAmount, GrandTotal, Notes) VALUES (@OrderNumber, @CustomerId, @CompanyId, @BranchId, GETDATE(), 'Pending', @SubTotal, @TaxAmount, @GrandTotal, @Notes); SELECT SCOPE_IDENTITY() AS Id;`,
      { OrderNumber: soNumber, CustomerId: q.CustomerId, CompanyId: q.CompanyId, BranchId: q.BranchId, SubTotal: q.SubTotal, TaxAmount: q.TaxAmount, GrandTotal: q.GrandTotal, Notes: `Converted from quotation ${q.QuotationNumber}` }
    );
    const soId = soResult.recordset[0].Id;
    const items = await pgQuery(appPool, 'SELECT * FROM SalesQuotationItems WHERE QuotationId=@id AND IsDeleted=0', { id: parseInt(id) });
    for (const item of items.recordset) {
      await pgQuery(appPool, 
        `INSERT INTO SalesOrderItems (SalesOrderId, ProductId, Quantity, UnitPrice, TaxRate, TaxAmount, TotalAmount) VALUES (@SalesOrderId, @ProductId, @Quantity, @UnitPrice, @TaxRate, @TaxAmount, @TotalAmount)`,
        { SalesOrderId: soId, ProductId: item.ProductId, Quantity: item.Quantity, UnitPrice: item.UnitPrice, TaxRate: item.TaxRate, TaxAmount: item.TaxAmount, TotalAmount: item.TotalAmount }
      );
    }
    await pgQuery(appPool, 'UPDATE SalesQuotations SET ConvertedToOrder=1, SalesOrderId=@soId, UpdatedAt=GETDATE() WHERE Id=@id', { soId, id: parseInt(id) });
    res.json({ message: 'Quotation converted to Sales Order', data: { SalesOrderId: soId, OrderNumber: soNumber } });
  } catch (error) {
    console.error('Convert Quotation Error:', error);
    res.status(500).json({ message: 'Failed to convert quotation', error: error.message });
  }
};

const deleteQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    await pgQuery(appPool, 'UPDATE SalesQuotations SET IsDeleted=1, UpdatedAt=GETDATE() WHERE Id=@id', { id: parseInt(id) });
    await pgQuery(appPool, 'UPDATE SalesQuotationItems SET IsDeleted=1 WHERE QuotationId=@id', { id: parseInt(id) });
    res.json({ message: 'Quotation deleted' });
  } catch (error) {
    console.error('Delete Quotation Error:', error);
    res.status(500).json({ message: 'Failed to delete quotation', error: error.message });
  }
};

module.exports = { createQuotation, getQuotations, getQuotationById, updateQuotationStatus, convertToSalesOrder, deleteQuotation };