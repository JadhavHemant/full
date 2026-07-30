// const express = require('express');
// const {
//   createProductCategory,
//   getAllProductCategories,
//   getProductCategoryById,
//   updateProductCategory,
//   softDeleteProductCategory
// } = require('../../../controllers/InventoryApis/productCategoryController');
// const { verifyAccessToken } = require('../../../middlewares/authMiddleware');

// const router = express.Router();

// router.post('/create',    createProductCategory);
// router.get('/get',    getAllProductCategories);
// router.get('/get/:id',    getProductCategoryById);
// router.put('/update/:id',    updateProductCategory);
// router.delete('/delete/:id',    softDeleteProductCategory);

// module.exports = router;

const express = require('express');
const {
  createProductCategory,
  getAllProductCategories,
  getProductCategoryById,
  updateProductCategory,
  softDeleteProductCategory,
  hardDeleteProductCategory,
  getActiveProductCategories
} = require('../../../controllers/InventoryApis/productCategoryController');
const { verifyAccessToken } = require('../../../middlewares/authMiddleware');
const { checkPermission } = require('../../../middlewares/rbac');

const router = express.Router();

router.post('/create', verifyAccessToken, checkPermission('productCategory', 'create'), createProductCategory);
router.get('/list', verifyAccessToken, checkPermission('productCategory', 'view'), getAllProductCategories);
router.get('/active',   getActiveProductCategories);
router.get('/:id', verifyAccessToken, checkPermission('productCategory', 'view'), getProductCategoryById);
router.put('/:id', verifyAccessToken, checkPermission('productCategory', 'edit'), updateProductCategory);
router.delete('/delete/:id', verifyAccessToken, checkPermission('productCategory', 'delete'), softDeleteProductCategory);  
router.delete('/:id', verifyAccessToken, checkPermission('productCategory', 'delete'), hardDeleteProductCategory);

module.exports = router;
