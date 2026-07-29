'use strict';
const express = require('express');
const router  = express.Router();
const { verifyAccessToken, requireAdmin } = require('../../middlewares/authMiddleware');
const {
  getMyModules,
  getUserModules,
  assignModulesToUser,
  resetUserModules,
  getAvailableModules,
} = require('../../controllers/UserApis/moduleAssignmentController');

router.use(verifyAccessToken);

// GET /api/user-modules/my  — returns navigation tree for the current user
router.get('/my', getMyModules);

// GET /api/user-modules/available  — returns all available module keys + metadata
router.get('/available', getAvailableModules);

// GET  /api/user-modules/:userId  — admin: see what modules a user has
router.get('/:userId', requireAdmin, getUserModules);

// POST /api/user-modules/:userId  — admin: assign modules to a user
router.post('/:userId', requireAdmin, assignModulesToUser);

// DELETE /api/user-modules/:userId  — admin: reset to user-type defaults
router.delete('/:userId', requireAdmin, resetUserModules);

module.exports = router;
