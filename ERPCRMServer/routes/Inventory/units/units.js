const express = require('express');
const {
    createUnit,
    updateUnit,
    softDeleteUnit,
    hardDeleteUnit,
    getUnitById,
    getAllUnits,
    getActiveUnits,
    bulkCreateUnits,
    searchUnits
} = require('../../../controllers/InventoryApis/units');
const { verifyAccessToken } = require('../../../middlewares/authMiddleware');
const { checkPermission } = require('../../../middlewares/rbac');

const router = express.Router();


router.post('/create', verifyAccessToken, checkPermission('units', 'create'), createUnit);

router.post('/bulk-create', verifyAccessToken, checkPermission('units', 'create'), bulkCreateUnits);

router.get('/list', verifyAccessToken, checkPermission('units', 'view'), getAllUnits);

router.get('/active', getActiveUnits);

router.get('/search', verifyAccessToken, checkPermission('units', 'view'), searchUnits);

router.get('/:id', verifyAccessToken, checkPermission('units', 'view'), getUnitById);

router.put('/:id', verifyAccessToken, checkPermission('units', 'edit'), updateUnit);

router.delete('/delete/:id', verifyAccessToken, checkPermission('units', 'delete'), softDeleteUnit);

router.delete('/:id', verifyAccessToken, checkPermission('units', 'delete'), hardDeleteUnit);

module.exports = router;
