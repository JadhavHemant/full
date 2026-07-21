// controllers/InventoryApis/products.js

const { appPool } = require("../../config/db");
const { buildHierarchyAccess, isPrivilegedUser } = require("../../utils/hierarchyAccess");

/**
 * Create Product
 */
const createProduct = async (req, res) => {
  const {
    ProductName,
    ProductCode,
    Description,
    CategoryId,
    UnitId,
    Price,
    Cost,
    StockQuantity,
    MinimumStock,
    MaximumStock,
    ReorderLevel,
    NotifyStockOut,
    NotifyStockReload,
    Barcode,
    SKU,
    HSNCode,
    TaxRate,
    Discount,
    CompanyId,
    IsActive,
  } = req.body;

  // Handle image upload
  let ProductImage = null;
  if (req.file) {
    ProductImage = `/uploads/products/${req.file.filename}`;
  }

  // Validation
  if (!ProductName || !ProductCode || !CompanyId) {
    return res.status(400).json({
      success: false,
      message: "ProductName, ProductCode, and CompanyId are required",
    });
  }

  const query = `
        INSERT INTO "Products" 
        ("ProductName", "ProductCode", "Description", "CategoryId", "UnitId", 
         "Price", "Cost", "StockQuantity", "MinimumStock", "MaximumStock", 
         "ReorderLevel", "NotifyStockOut", "NotifyStockReload", "Barcode", 
         "SKU", "HSNCode", "TaxRate", "Discount", "ProductImage", 
         "CompanyId", "CreatedBy", "IsActive") 
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22) 
        RETURNING *`;

  try {
    const result = await appPool.query(query, [
      ProductName,
      ProductCode,
      Description,
      CategoryId || null,
      UnitId || null,
      Price || 0,
      Cost || 0,
      StockQuantity || 0,
      MinimumStock || 0,
      MaximumStock || 0,
      ReorderLevel || 0,
      NotifyStockOut !== false,
      NotifyStockReload !== false,
      Barcode || null,
      SKU || null,
      HSNCode || null,
      TaxRate || 0,
      Discount || 0,
      ProductImage,
      CompanyId || req.user?.companyId || null,
      req.user?.userId || null,
      IsActive !== false,
    ]);

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("Error creating product:", err);

    if (err.code === "23505") {
      return res.status(400).json({
        success: false,
        message: "Product code already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create product",
      error: err.message,
    });
  }
};

/**
 * Get All Products with Filters and Pagination
 * ✅ FIXED: Proper column quoting for PostgreSQL
 */
const getAllProducts = async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = "",
    categoryId,
    companyId,
    isActive,
    lowStock,
    sortBy = "CreatedAt",
    sortOrder = "DESC",
  } = req.query;

  const offset = (page - 1) * limit;
  const allowedSortColumns = [
    "Id",
    "ProductName",
    "ProductCode",
    "Price",
    "StockQuantity",
    "CreatedAt",
  ];
  const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : "CreatedAt";
  const order = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

  let whereConditions = ['p."IsDelete" = FALSE'];
  let queryParams = [];
  let paramCount = 1;

  // Search filter
  if (search) {
    whereConditions.push(
      `(p."ProductName" ILIKE $${paramCount} OR p."ProductCode" ILIKE $${paramCount} OR p."Description" ILIKE $${paramCount})`
    );
    queryParams.push(`%${search}%`);
    paramCount++;
  }

  // Category filter
  if (categoryId) {
    whereConditions.push(`p."CategoryId" = $${paramCount}`);
    queryParams.push(categoryId);
    paramCount++;
  }

  // Company filter
  if (companyId) {
    whereConditions.push(`p."CompanyId" = $${paramCount}`);
    queryParams.push(companyId);
    paramCount++;
  }

  // Active filter
  if (isActive !== undefined && isActive !== "") {
    whereConditions.push(`p."IsActive" = $${paramCount}`);
    queryParams.push(isActive === "true");
    paramCount++;
  }

  // Low stock filter
  if (lowStock === "true") {
    whereConditions.push(`p."StockQuantity" <= p."ReorderLevel"`);
  }

  const scopedAccess = await buildHierarchyAccess({
    req,
    alias: "p",
    ownerColumns: ["CreatedBy"],
    values: queryParams,
  });
  queryParams = scopedAccess.values;
  paramCount = queryParams.length + 1;
  if (scopedAccess.clause) {
    whereConditions.push(scopedAccess.clause);
  }

  const whereClause = whereConditions.join(" AND ");

  // Count query
  const countQuery = `SELECT COUNT(*) as total FROM "Products" p WHERE ${whereClause}`;

  // ✅ FIXED: Properly quoted column names for PostgreSQL
  const dataQuery = `
        SELECT 
            p.*,
            pc."CategoryName",
            u."Name",
            u."Symbol" as "UnitSymbol",
            c."CompanyName",
           usr."Name" as "CreatedByName"
        FROM "Products" p
        LEFT JOIN "ProductCategories" pc ON p."CategoryId" = pc."Id"
        LEFT JOIN "Units" u ON p."UnitId" = u."Id"
        LEFT JOIN "Companies" c ON p."CompanyId" = c."Id"
        LEFT JOIN "Users" usr ON p."CreatedBy" = usr."UserId"
        WHERE ${whereClause}
        ORDER BY p."${sortColumn}" ${order}
        LIMIT $${paramCount} OFFSET $${paramCount + 1}`;

  try {
    const countResult = await appPool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    const dataResult = await appPool.query(dataQuery, [
      ...queryParams,
      limit,
      offset,
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: dataResult.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
        offset: parseInt(offset),
      },
    });
  } catch (err) {
    console.error("❌ Error fetching products:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch products",
      error: err.message,
    });
  }
};

/**
 * Get Product by ID
 * ✅ FIXED: Proper column quoting
 */
const getProductById = async (req, res) => {
  const { id } = req.params;

  const query = `
        SELECT 
            p.*,
            pc."CategoryName",
            u."Name",
            u."Symbol" as "UnitSymbol",
            c."CompanyName",
usr."Name" as "CreatedByName"        FROM "Products" p
        LEFT JOIN "ProductCategories" pc ON p."CategoryId" = pc."Id"
        LEFT JOIN "Units" u ON p."UnitId" = u."Id"
        LEFT JOIN "Companies" c ON p."CompanyId" = c."Id"
        LEFT JOIN "Users" usr ON p."CreatedBy" = usr."UserId"
        WHERE p."Id" = $1 AND p."IsDelete" = FALSE`;

  try {
    let queryText = query;
    let values = [id];
    if (!isPrivilegedUser(req.user)) {
      const scopedAccess = await buildHierarchyAccess({
        req,
        alias: "p",
        ownerColumns: ["CreatedBy"],
        values,
      });
      values = scopedAccess.values;
      queryText += scopedAccess.clause ? ` AND ${scopedAccess.clause}` : "";
    }

    const result = await appPool.query(queryText, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    console.error("Error fetching product:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch product",
      error: err.message,
    });
  }
};

/**
 * Update Product
 */
const updateProduct = async (req, res) => {
  const { id } = req.params;
  const {
    ProductName,
    ProductCode,
    Description,
    CategoryId,
    UnitId,
    Price,
    Cost,
    StockQuantity,
    MinimumStock,
    MaximumStock,
    ReorderLevel,
    NotifyStockOut,
    NotifyStockReload,
    Barcode,
    SKU,
    HSNCode,
    TaxRate,
    Discount,
    IsActive,
  } = req.body;

  // Handle image upload
  let ProductImage = null;
  if (req.file) {
    ProductImage = `/uploads/products/${req.file.filename}`;
  }

  const updateFields = [];
  const queryParams = [];
  let paramCount = 1;

  if (ProductName !== undefined) {
    updateFields.push(`"ProductName" = $${paramCount}`);
    queryParams.push(ProductName);
    paramCount++;
  }
  if (ProductCode !== undefined) {
    updateFields.push(`"ProductCode" = $${paramCount}`);
    queryParams.push(ProductCode);
    paramCount++;
  }
  if (Description !== undefined) {
    updateFields.push(`"Description" = $${paramCount}`);
    queryParams.push(Description);
    paramCount++;
  }
  if (CategoryId !== undefined) {
    updateFields.push(`"CategoryId" = $${paramCount}`);
    queryParams.push(CategoryId || null);
    paramCount++;
  }
  if (UnitId !== undefined) {
    updateFields.push(`"UnitId" = $${paramCount}`);
    queryParams.push(UnitId || null);
    paramCount++;
  }
  if (Price !== undefined) {
    updateFields.push(`"Price" = $${paramCount}`);
    queryParams.push(Price);
    paramCount++;
  }
  if (Cost !== undefined) {
    updateFields.push(`"Cost" = $${paramCount}`);
    queryParams.push(Cost);
    paramCount++;
  }
  // Block direct stock editing — stock must be changed through authorized inventory transactions
  if (StockQuantity !== undefined) {
    return res.status(403).json({
      success: false,
      message: "Stock cannot be modified through the product update endpoint. Use an authorized inventory transaction.",
    });
  }
  if (MinimumStock !== undefined) {
    updateFields.push(`"MinimumStock" = $${paramCount}`);
    queryParams.push(MinimumStock);
    paramCount++;
  }
  if (MaximumStock !== undefined) {
    updateFields.push(`"MaximumStock" = $${paramCount}`);
    queryParams.push(MaximumStock);
    paramCount++;
  }
  if (ReorderLevel !== undefined) {
    updateFields.push(`"ReorderLevel" = $${paramCount}`);
    queryParams.push(ReorderLevel);
    paramCount++;
  }
  if (NotifyStockOut !== undefined) {
    updateFields.push(`"NotifyStockOut" = $${paramCount}`);
    queryParams.push(NotifyStockOut);
    paramCount++;
  }
  if (NotifyStockReload !== undefined) {
    updateFields.push(`"NotifyStockReload" = $${paramCount}`);
    queryParams.push(NotifyStockReload);
    paramCount++;
  }
  if (Barcode !== undefined) {
    updateFields.push(`"Barcode" = $${paramCount}`);
    queryParams.push(Barcode);
    paramCount++;
  }
  if (SKU !== undefined) {
    updateFields.push(`"SKU" = $${paramCount}`);
    queryParams.push(SKU);
    paramCount++;
  }
  if (HSNCode !== undefined) {
    updateFields.push(`"HSNCode" = $${paramCount}`);
    queryParams.push(HSNCode);
    paramCount++;
  }
  if (TaxRate !== undefined) {
    updateFields.push(`"TaxRate" = $${paramCount}`);
    queryParams.push(TaxRate);
    paramCount++;
  }
  if (Discount !== undefined) {
    updateFields.push(`"Discount" = $${paramCount}`);
    queryParams.push(Discount);
    paramCount++;
  }
  if (ProductImage) {
    updateFields.push(`"ProductImage" = $${paramCount}`);
    queryParams.push(ProductImage);
    paramCount++;
  }
  if (IsActive !== undefined) {
    updateFields.push(`"IsActive" = $${paramCount}`);
    queryParams.push(IsActive);
    paramCount++;
  }
  if (req.user?.userId) {
    updateFields.push(`"UpdatedBy" = $${paramCount}`);
    queryParams.push(req.user.userId);
    paramCount++;
  }

  updateFields.push(`"UpdatedAt" = CURRENT_TIMESTAMP`);

  if (updateFields.length === 1) {
    return res.status(400).json({
      success: false,
      message: "No fields to update",
    });
  }

  queryParams.push(id);
  let query = `
        UPDATE "Products"
        SET ${updateFields.join(", ")}
        WHERE "Id" = $${paramCount} AND "IsDelete" = FALSE
        RETURNING *`;

  try {
    if (!isPrivilegedUser(req.user)) {
      const scopedAccess = await buildHierarchyAccess({
        req,
        alias: "Products",
        ownerColumns: ["CreatedBy"],
        values: queryParams,
      });
      queryParams.splice(0, queryParams.length, ...scopedAccess.values);
      if (scopedAccess.clause) {
        query = query.replace('RETURNING *', `AND ${scopedAccess.clause.replaceAll('Products.', '')} RETURNING *`);
      }
    }

    const result = await appPool.query(query, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.json({
      success: true,
      message: "Product updated successfully",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("Error updating product:", err);

    if (err.code === "23505") {
      return res.status(400).json({
        success: false,
        message: "Product code already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to update product",
      error: err.message,
    });
  }
};

/**
 * Soft Delete Product
 */
const softDeleteProduct = async (req, res) => {
  const { id } = req.params;

  let query = `
        UPDATE "Products" 
        SET "IsDelete" = TRUE, "DeletedAt" = CURRENT_TIMESTAMP, "UpdatedAt" = CURRENT_TIMESTAMP 
        WHERE "Id" = $1 AND "IsDelete" = FALSE
        RETURNING *`;

  try {
    let values = [id];
    if (!isPrivilegedUser(req.user)) {
      const scopedAccess = await buildHierarchyAccess({
        req,
        alias: "Products",
        ownerColumns: ["CreatedBy"],
        values,
      });
      values = scopedAccess.values;
      if (scopedAccess.clause) {
        query = query.replace('RETURNING *', `AND ${scopedAccess.clause.replaceAll('Products.', '')} RETURNING *`);
      }
    }

    const result = await appPool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.json({
      success: true,
      message: "Product deleted successfully",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("Error deleting product:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete product",
      error: err.message,
    });
  }
};

/**
 * Toggle Active Status
 */
const toggleActiveStatus = async (req, res) => {
  const { id } = req.params;

  const query = `
        UPDATE "Products"
        SET "IsActive" = NOT "IsActive", "UpdatedAt" = CURRENT_TIMESTAMP
        WHERE "Id" = $1 AND "IsDelete" = FALSE
        RETURNING *`;

  try {
    const result = await appPool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.json({
      success: true,
      message: `Product ${
        result.rows[0].IsActive ? "activated" : "deactivated"
      } successfully`,
      data: result.rows[0],
    });
  } catch (err) {
    console.error("Error toggling product status:", err);
    res.status(500).json({
      success: false,
      message: "Failed to toggle product status",
      error: err.message,
    });
  }
};

/**
 * Get Low Stock Products
 * ✅ FIXED: Proper column quoting
 */
const getLowStockProducts = async (req, res) => {
  const { companyId, limit = 10 } = req.query;

  let whereClause =
    'p."IsDelete" = FALSE AND p."StockQuantity" <= p."ReorderLevel"';
  const queryParams = [];
  let paramCount = 1;

  if (companyId) {
    whereClause += ` AND p."CompanyId" = $${paramCount}`;
    queryParams.push(companyId);
    paramCount++;
  }

  const query = `
        SELECT 
            p.*,
            pc."CategoryName",
            u."Name"
        FROM "Products" p
        LEFT JOIN "ProductCategories" pc ON p."CategoryId" = pc."Id"
        LEFT JOIN "Units" u ON p."UnitId" = u."Id"
        WHERE ${whereClause}
        ORDER BY p."StockQuantity" ASC
        LIMIT $${paramCount}`;

  try {
    const result = await appPool.query(query, [...queryParams, limit]);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
    });
  } catch (err) {
    console.error("Error fetching low stock products:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch low stock products",
      error: err.message,
    });
  }
};

/**
 * Get Product Statistics
 */
const getProductStats = async (req, res) => {
  const { companyId } = req.query;

  let whereClause = '"IsDelete" = FALSE';
  const queryParams = [];

  if (companyId) {
    whereClause += ' AND "CompanyId" = $1';
    queryParams.push(companyId);
  }

  const query = `
        SELECT 
            COUNT(*) as "totalProducts",
            COUNT(*) FILTER (WHERE "IsActive" = TRUE) as "activeProducts",
            COUNT(*) FILTER (WHERE "IsActive" = FALSE) as "inactiveProducts",
            COUNT(*) FILTER (WHERE "StockQuantity" <= "ReorderLevel") as "lowStockProducts",
            COUNT(*) FILTER (WHERE "StockQuantity" = 0) as "outOfStockProducts",
            SUM("StockQuantity") as "totalStockQuantity",
            SUM("StockQuantity" * "Price") as "totalStockValue"
        FROM "Products"
        WHERE ${whereClause}`;

  try {
    const result = await appPool.query(query, queryParams);

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    console.error("Error fetching product stats:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch product statistics",
      error: err.message,
    });
  }
};

/**
 * Bulk Delete Products
 */
const bulkDeleteProducts = async (req, res) => {
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Product IDs array is required",
    });
  }

  const query = `
        UPDATE "Products"
        SET "IsDelete" = TRUE, "DeletedAt" = CURRENT_TIMESTAMP, "UpdatedAt" = CURRENT_TIMESTAMP
        WHERE "Id" = ANY($1::int[]) AND "IsDelete" = FALSE
        RETURNING "Id"`;

  try {
    const result = await appPool.query(query, [ids]);

    res.json({
      success: true,
      message: `${result.rows.length} products deleted successfully`,
      deletedIds: result.rows.map((row) => row.Id),
    });
  } catch (err) {
    console.error("Error bulk deleting products:", err);
    res.status(500).json({
      success: false,
      message: "Failed to bulk delete products",
      error: err.message,
    });
  }
};

module.exports = {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  softDeleteProduct,
  toggleActiveStatus,
  getLowStockProducts,
  getProductStats,
  bulkDeleteProducts,
};
