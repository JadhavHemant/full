const { appPool } = require('../../config/db');
const { pgQuery } = require("../../utils/pgCompat");

// ==================== BOM ====================
const createBOM = async (req, res) => {
  try {
    const { BOMCode, ProductId, ProductName, Version, Description, Quantity, UnitId, CompanyId, Items } = req.body;
    
    // Validate required fields
    if (!ProductId) {
      return res.status(400).json({ message: 'ProductId is required for BOM' });
    }
    
    const code = BOMCode || `BOM-${Date.now()}`;
    const result = await pgQuery(appPool, 
      `INSERT INTO BOM (BOMCode, ProductId, ProductName, Version, Description, Quantity, UnitId, CompanyId) VALUES (@BOMCode, @ProductId, @ProductName, @Version, @Description, @Quantity, @UnitId, @CompanyId) RETURNING "Id" AS Id;`,
      { BOMCode: code, ProductId, ProductName: ProductName||null, Version: Version||'1.0', Description: Description||null, Quantity: Quantity||1, UnitId: UnitId||null, CompanyId: CompanyId||null }
    );
    const bomId = result.recordset[0].Id;
    
    if (Items && Items.length > 0) {
      for (const item of Items) {
        if (!item.ProductId) {
          console.warn('Skipping BOM item without ProductId');
          continue;
        }
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
      `SELECT b.*, p."ProductName" AS ProductName FROM BOM b LEFT JOIN Products p ON b."ProductId" = p."Id" ${where} ORDER BY b."CreatedAt" DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, 
      params
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
    const result = await pgQuery(appPool, 'SELECT * FROM BOM WHERE "Id"=@id AND "IsDeleted"=0', { id: parseInt(id) });
    if (!result.recordset.length) return res.status(404).json({ message: 'BOM not found' });
    
    const items = await pgQuery(appPool, 
      'SELECT bi.*, p."ProductName" AS ProductName FROM BOMItems bi LEFT JOIN Products p ON bi."ProductId" = p."Id" WHERE bi."BOMId"=@id AND bi."IsDeleted"=0', 
      { id: parseInt(id) }
    );
    
    res.json({ data: { ...result.recordset[0], Items: items.recordset } });
  } catch (error) {
    console.error('Get BOM Error:', error);
    res.status(500).json({ message: 'Failed to fetch BOM', error: error.message });
  }
};

const updateBOM = async (req, res) => {
  try {
    const { id } = req.params;
    const { BOMCode, ProductName, Version, Description, Quantity, UnitId, CompanyId, Items } = req.body;
    
    await pgQuery(appPool,
      `UPDATE BOM SET BOMCode=@BOMCode, ProductName=@ProductName, Version=@Version, Description=@Description, Quantity=@Quantity, UnitId=@UnitId, CompanyId=@CompanyId WHERE "Id"=@id`,
      { BOMCode, ProductName, Version, Description, Quantity, UnitId, CompanyId, id: parseInt(id) }
    );
    
    // Update items if provided
    if (Items && Items.length > 0) {
      // Delete existing items
      await pgQuery(appPool, 'DELETE FROM BOMItems WHERE "BOMId"=@id', { id: parseInt(id) });
      
      // Insert new items
      for (const item of Items) {
        if (!item.ProductId) continue;
        await pgQuery(appPool,
          `INSERT INTO BOMItems (BOMId, ProductId, Quantity, UnitId, UnitCost, WastagePercent, Remarks) VALUES (@BOMId, @ProductId, @Quantity, @UnitId, @UnitCost, @WastagePercent, @Remarks)`,
          { BOMId: parseInt(id), ProductId: item.ProductId, Quantity: item.Quantity, UnitId: item.UnitId||null, UnitCost: item.UnitCost||0, WastagePercent: item.WastagePercent||0, Remarks: item.Remarks||null }
        );
      }
    }
    
    res.json({ message: 'BOM updated successfully' });
  } catch (error) {
    console.error('Update BOM Error:', error);
    res.status(500).json({ message: 'Failed to update BOM', error: error.message });
  }
};

const deleteBOM = async (req, res) => {
  try {
    const { id } = req.params;
    await pgQuery(appPool, 'UPDATE BOM SET "IsDeleted"=1, "UpdatedAt"=NOW() WHERE "Id"=@id', { id: parseInt(id) });
    res.json({ message: 'BOM deleted successfully' });
  } catch (error) {
    console.error('Delete BOM Error:', error);
    res.status(500).json({ message: 'Failed to delete BOM', error: error.message });
  }
};

module.exports = { createBOM, getBOMs, getBOMById, updateBOM, deleteBOM };