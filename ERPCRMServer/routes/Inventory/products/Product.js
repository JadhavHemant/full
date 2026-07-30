// routes/productRoutes.js

const express = require('express');
const router = express.Router();
const {
    createProduct,
    getAllProducts,
    getProductById,
    updateProduct,
    softDeleteProduct,
    toggleActiveStatus,
    getLowStockProducts,
    getProductStats,
    bulkDeleteProducts
} = require('../../../controllers/InventoryApis/products');
const { uploadProductImage } = require('../utils/fileUpload');
const { verifyAccessToken } = require('../../../middlewares/authMiddleware');
const { checkPermission } = require('../../../middlewares/rbac');

// ✅ IMPORTANT: Specific routes MUST come BEFORE dynamic routes like /:id
// Otherwise /:id will match everything and cause 404 errors

// ✅ Canonical REST routes
// GET /api/products — list all products
router.get('/', verifyAccessToken, checkPermission('products', 'view'), getAllProducts);

// POST /api/products — create product
router.post('/', verifyAccessToken, checkPermission('products', 'create'), uploadProductImage.single('productImage'), createProduct);

// ✅ Backward-compatible aliases
// Create product with image upload
router.post('/create', verifyAccessToken, checkPermission('products', 'create'), uploadProductImage.single('productImage'), createProduct);

// Get all products with filters and pagination
router.get('/list', verifyAccessToken, checkPermission('products', 'view'), getAllProducts);

// Get active products (matches client expectation: GET /products/active)
// Reuses `getAllProducts` with `isActive=true`.
router.get('/active', verifyAccessToken, checkPermission('products', 'view'), (req, res, next) => {
    req.query.isActive = 'true';
    return getAllProducts(req, res, next);
});

// Get low stock products (BEFORE /:id)
router.get('/alerts/low-stock', verifyAccessToken, checkPermission('products', 'view'), getLowStockProducts);

// Get product statistics (BEFORE /:id)
router.get('/reports/stats', verifyAccessToken, checkPermission('products', 'view'), getProductStats);

// Bulk delete products (BEFORE /delete/:id)
router.delete('/bulk-delete', verifyAccessToken, checkPermission('products', 'delete'), bulkDeleteProducts);

// Get product by ID (comes AFTER specific routes)
router.get('/:id', verifyAccessToken, checkPermission('products', 'view'), getProductById);

// Update product with image upload
router.put('/:id', verifyAccessToken, checkPermission('products', 'edit'), uploadProductImage.single('productImage'), updateProduct);

// Toggle active status
router.patch('/:id/toggle-active', verifyAccessToken, checkPermission('products', 'edit'), toggleActiveStatus);

// Soft delete product
router.delete('/delete/:id', verifyAccessToken, checkPermission('products', 'delete'), softDeleteProduct);

module.exports = router;
