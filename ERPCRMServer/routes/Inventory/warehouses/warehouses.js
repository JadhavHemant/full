const express = require('express');
const router = express.Router();
const { verifyAccessToken } = require('../../../middlewares/authMiddleware');
const { checkPermission } = require('../../../middlewares/rbac');
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


router.get('/', checkPermission('warehouses', 'view'), getAllWarehouses);
router.get('/active', checkPermission('warehouses', 'view'), getActiveWarehouses);
router.get('/company/:companyId', checkPermission('warehouses', 'view'), getWarehousesByCompany);
router.get('/:id', checkPermission('warehouses', 'view'), getWarehouseById);

router.post('/', checkPermission('warehouses', 'create'), createWarehouse);                          
router.put('/:id', checkPermission('warehouses', 'edit'), updateWarehouse);                       
router.patch('/:id/toggle', checkPermission('warehouses', 'edit'), toggleWarehouseStatus);        
router.delete('/:id/soft', checkPermission('warehouses', 'delete'), softDeleteWarehouse);           
router.delete('/:id/hard', checkPermission('warehouses', 'delete'), hardDeleteWarehouse);           
router.post('/bulk-import', checkPermission('warehouses', 'import'), bulkImportWarehouses);          

module.exports = router;
