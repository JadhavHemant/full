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

const router = express.Router();

router.post('/create', verifyAccessToken,createProductCategory);
router.get('/list', verifyAccessToken,  getAllProductCategories);
router.get('/active',   getActiveProductCategories);
router.get('/:id',verifyAccessToken,   getProductCategoryById);
router.put('/:id',verifyAccessToken,   updateProductCategory);
router.delete('/delete/:id', verifyAccessToken, softDeleteProductCategory);  
router.delete('/:id',verifyAccessToken,   hardDeleteProductCategory);

module.exports = router;
