const express = require('express');
const { createUserType,getUserTypes,getUserTypeById,updateUserType,deleteUserType} = require('../../controllers/UserApis/userTypeController');
const { verifyAccessToken } = require('../../middlewares/authMiddleware');

const router = express.Router();


router.post('/create/usertypes',createUserType);
router.get('/get/usertypes', verifyAccessToken,getUserTypes);
router.get('/get/usertypes/:id' , verifyAccessToken,getUserTypeById);
router.put('/update/usertypes/:id', verifyAccessToken,updateUserType);
router.delete('/delete/usertype/:id', verifyAccessToken,deleteUserType);
module.exports = router;
