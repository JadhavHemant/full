// const express = require('express');
// const router = express.Router();
// const uploadUserImage = require('../../middlewares/uploadMiddleware');
// const { registerUser, loginUser, getProfile,getAllUsers, getCompanies, updateUser, adminGetCompanies, toggleSoftDelete, toggleActivation, toggleFlag, forgotPassword, resetPassword } = require('../../controllers/UserApis/userController');
// const { verifyAccessToken } = require('../../middlewares/authMiddleware');

// //Open Apis (any one can access)
// router.post('/login', loginUser);
// router.post('/forgot-password', forgotPassword);
// router.post('/reset-password', resetPassword);
// router.get('/getall/profiles', getAllUsers);
// //Apis With Token
// router.get('/profile', verifyAccessToken, getProfile);
// router.post("/register", uploadUserImage.single("userImage"), registerUser);
// //router.post('/register', upload.single('userImage'), verifyAccessToken, registerUser);
// router.put('/update', uploadUserImage.single('image'),verifyAccessToken, updateUser);
// router.get('/superadmin/company', verifyAccessToken, getCompanies);
// router.get('/admin/company', verifyAccessToken, adminGetCompanies);
// router.put('/toggle-delete/:id', verifyAccessToken, toggleSoftDelete);
// router.put('/toggle-activate/:id', verifyAccessToken, toggleActivation);
// router.put('/toggle-flag/:id', verifyAccessToken, toggleFlag);
// module.exports = router;


const express = require('express');
const router = express.Router();

const uploadUserImage = require('../../middlewares/uploadMiddleware');
const {
  sendRegistrationOtp,
  registerUser,
  loginUser,
  getProfile,
  getAllUsers,
  getCompanies,
  updateUser,
  adminGetCompanies,
  toggleSoftDelete,
  toggleActivation,
  toggleFlag,
  forgotPassword,
  resetPassword,
  getOrgHierarchy,
  getMyTeamHierarchy,
  getDirectReports,
  getCompanyOrgChart,
  getUserRecordSummary,
  getUserModuleRecords,
} = require('../../controllers/UserApis/userController');
const { verifyAccessToken } = require('../../middlewares/authMiddleware');

// Open APIs (anyone can access)
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/getall/profiles', verifyAccessToken, getAllUsers);

// Org hierarchy (could be open or protected; here: protected)
router.get('/org/hierarchy', verifyAccessToken, getOrgHierarchy);
router.get('/my-team', verifyAccessToken, getMyTeamHierarchy);
router.get('/direct-reports/:userId', verifyAccessToken, getDirectReports);
router.get('/company/:companyId/org-chart', verifyAccessToken, getCompanyOrgChart);
router.get('/:userId/record-summary', verifyAccessToken, getUserRecordSummary);
router.get('/:userId/records', verifyAccessToken, getUserModuleRecords);

// APIs With Token
router.get('/profile', verifyAccessToken, getProfile);
router.post('/register/send-otp', sendRegistrationOtp);
router.post(
  '/register',
  uploadUserImage.single('profileImage'),
  registerUser
);
router.put(
  '/update',
  uploadUserImage.single('image'),
  verifyAccessToken,
  updateUser
);
router.get('/superadmin/company', verifyAccessToken, getCompanies);
router.get('/admin/company', verifyAccessToken, adminGetCompanies);
router.put('/toggle-delete/:id', verifyAccessToken, toggleSoftDelete);
router.put('/toggle-activate/:id', verifyAccessToken, toggleActivation);
router.put('/toggle-flag/:id', verifyAccessToken, toggleFlag);

module.exports = router;
