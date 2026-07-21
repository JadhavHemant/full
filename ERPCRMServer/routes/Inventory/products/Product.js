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

// ✅ IMPORTANT: Specific routes MUST come BEFORE dynamic routes like /:id
// Otherwise /:id will match everything and cause 404 errors

// ✅ Canonical REST routes
// GET /api/products — list all products
router.get('/', verifyAccessToken, getAllProducts);

// POST /api/products — create product
router.post('/', verifyAccessToken, uploadProductImage.single('productImage'), createProduct);

// ✅ Backward-compatible aliases
// Create product with image upload
router.post('/create', verifyAccessToken, uploadProductImage.single('productImage'), createProduct);

// Get all products with filters and pagination
router.get('/list', verifyAccessToken, getAllProducts);

// Get active products (matches client expectation: GET /products/active)
// Reuses `getAllProducts` with `isActive=true`.
router.get('/active', verifyAccessToken, (req, res, next) => {
    req.query.isActive = 'true';
    return getAllProducts(req, res, next);
});

// Get low stock products (BEFORE /:id)
router.get('/alerts/low-stock', verifyAccessToken, getLowStockProducts);

// Get product statistics (BEFORE /:id)
router.get('/reports/stats', verifyAccessToken, getProductStats);

// Bulk delete products (BEFORE /delete/:id)
router.delete('/bulk-delete', verifyAccessToken, bulkDeleteProducts);

// Get product by ID (comes AFTER specific routes)
router.get('/:id', verifyAccessToken, getProductById);

// Update product with image upload
router.put('/:id', verifyAccessToken, uploadProductImage.single('productImage'), updateProduct);

// Toggle active status
router.patch('/:id/toggle-active', verifyAccessToken, toggleActiveStatus);

// Soft delete product
router.delete('/delete/:id', verifyAccessToken, softDeleteProduct);

module.exports = router;
