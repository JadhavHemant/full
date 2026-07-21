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

const router = express.Router();


router.post('/create', verifyAccessToken, createUnit);

router.post('/bulk-create', verifyAccessToken, bulkCreateUnits);

router.get('/list', verifyAccessToken, getAllUnits);

router.get('/active', getActiveUnits);

router.get('/search', verifyAccessToken, searchUnits);

router.get('/:id', verifyAccessToken, getUnitById);

router.put('/:id', verifyAccessToken, updateUnit);

router.delete('/delete/:id', verifyAccessToken, softDeleteUnit);

router.delete('/:id', verifyAccessToken, hardDeleteUnit);

module.exports = router;
