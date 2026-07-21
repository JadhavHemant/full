const express = require('express');
const {
    createCompany,
    getCompanies,
    getActiveCompanies,
    getCompanyById,
    updateCompany,
    softDeleteCompany,
    restoreCompany,
    toggleActiveCompany,
    toggleFlagCompany,
    getCompanyStats,
    bulkDeleteCompanies,
    getDeletedCompanies,
    exportCompanies
} = require('../../controllers/CompanyApis/companyController');
const { verifyAccessToken } = require('../../middlewares/authMiddleware');
const { uploadCompanyImage, handleUploadError } = require('../../middlewares/upload');

const router = express.Router();

// ============================================
// COMPANIES ROUTES
// ============================================

/**
 * @route   POST /api/companies/create
 * @desc    Create a new company
 * @access  Private
 */
router.post(
    '/create',
    verifyAccessToken,
    uploadCompanyImage.single('logo'),
    handleUploadError,
    createCompany
);

/**
 * @route   GET /api/companies/list
 * @desc    Get all companies with pagination, search and filters
 * @query   search, page, limit, isActive, state, city, country, sortBy, sortOrder
 * @access  Private
 */
router.get('/list', verifyAccessToken, getCompanies);

/**
 * @route   GET /api/companies/active
 * @desc    Get all active companies
 * @access  Private
 */
router.get('/active', getActiveCompanies);

/**
 * @route   GET /api/companies/stats
 * @desc    Get company statistics
 * @access  Private
 */
router.get('/stats', verifyAccessToken, getCompanyStats);

/**
 * @route   GET /api/companies/deleted
 * @desc    Get deleted companies with pagination
 * @query   page, limit
 * @access  Private
 */
router.get('/deleted', verifyAccessToken, getDeletedCompanies);

/**
 * @route   GET /api/companies/export
 * @desc    Export companies to CSV
 * @access  Private
 */
router.get('/export', verifyAccessToken, exportCompanies);

/**
 * @route   DELETE /api/companies/bulk-delete
 * @desc    Bulk delete companies
 * @body    { ids: [1, 2, 3] }
 * @access  Private
 */
router.delete('/bulk-delete', verifyAccessToken, bulkDeleteCompanies);

/**
 * @route   GET /api/companies/:id
 * @desc    Get a single company by ID
 * @access  Private
 */
router.get('/:id', verifyAccessToken, getCompanyById);

/**
 * @route   PUT /api/companies/:id
 * @desc    Update a company by ID
 * @access  Private
 */
router.put(
    '/:id',
    verifyAccessToken,
    uploadCompanyImage.single('logo'),
    handleUploadError,
    updateCompany
);

/**
 * @route   DELETE /api/companies/delete/:id
 * @desc    Soft delete a company
 * @access  Private
 */
router.delete('/delete/:id', verifyAccessToken, softDeleteCompany);

/**
 * @route   PATCH /api/companies/:id/restore
 * @desc    Restore a deleted company
 * @access  Private
 */
router.patch('/:id/restore', verifyAccessToken, restoreCompany);

/**
 * @route   PATCH /api/companies/:id/toggle-active
 * @desc    Toggle company active status
 * @access  Private
 */
router.patch('/:id/toggle-active', verifyAccessToken, toggleActiveCompany);

/**
 * @route   PATCH /api/companies/:id/toggle-flag
 * @desc    Toggle company flag status
 * @access  Private
 */
router.patch('/:id/toggle-flag', verifyAccessToken, toggleFlagCompany);

module.exports = router;
