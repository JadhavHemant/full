const express = require('express');
const router = express.Router();
const { verifyAccessToken } = require('../../../middlewares/authMiddleware');
const {
    createWarehouse,
    updateWarehouse,
    softDeleteWarehouse,
    hardDeleteWarehouse,
    toggleWarehouseStatus,
    getWarehouseById,
    getAllWarehouses,
    getActiveWarehouses,
    getWarehousesByCompany,
    bulkImportWarehouses
} = require('../../../controllers/InventoryApis/warehouses');

router.use(verifyAccessToken);


router.get('/', getAllWarehouses);
router.get('/active', getActiveWarehouses);
router.get('/company/:companyId', getWarehousesByCompany);
router.get('/:id', getWarehouseById);

router.post('/', createWarehouse);                          
router.put('/:id', updateWarehouse);                       
router.patch('/:id/toggle', toggleWarehouseStatus);        
router.delete('/:id/soft', softDeleteWarehouse);           
router.delete('/:id/hard', hardDeleteWarehouse);           
router.post('/bulk-import', bulkImportWarehouses);          

module.exports = router;
