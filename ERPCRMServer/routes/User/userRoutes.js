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
const { checkPermission } = require('../../middlewares/rbac');

// Open APIs (anyone can access)
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/getall/profiles', verifyAccessToken, checkPermission('users', 'view'), getAllUsers);

// Org hierarchy (could be open or protected; here: protected)
router.get('/org/hierarchy', verifyAccessToken, checkPermission('users', 'view'), getOrgHierarchy);
router.get('/my-team', verifyAccessToken, checkPermission('users', 'view'), getMyTeamHierarchy);
router.get('/direct-reports/:userId', verifyAccessToken, checkPermission('users', 'view'), getDirectReports);
router.get('/company/:companyId/org-chart', verifyAccessToken, checkPermission('users', 'view'), getCompanyOrgChart);
router.get('/:userId/record-summary', verifyAccessToken, checkPermission('users', 'view'), getUserRecordSummary);
router.get('/:userId/records', verifyAccessToken, checkPermission('users', 'view'), getUserModuleRecords);

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
  checkPermission('users', 'edit'),
  updateUser
);
router.get('/superadmin/company', verifyAccessToken, checkPermission('company', 'view'), getCompanies);
router.get('/admin/company', verifyAccessToken, checkPermission('company', 'view'), adminGetCompanies);
router.put('/toggle-delete/:id', verifyAccessToken, checkPermission('users', 'delete'), toggleSoftDelete);
router.put('/toggle-activate/:id', verifyAccessToken, checkPermission('users', 'edit'), toggleActivation);
router.put('/toggle-flag/:id', verifyAccessToken, checkPermission('users', 'edit'), toggleFlag);

module.exports = router;
