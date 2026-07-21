const express = require('express');
const { refreshAccessToken, logout } = require('../../controllers/tokenController');
const { verifyAccessToken } = require('../../middlewares/authMiddleware');

const router = express.Router();

// Refresh access token (rotate refresh token on each refresh)
router.post('/refresh-token', refreshAccessToken);

// Logout (revoke all user's refresh tokens)
router.post('/logout', verifyAccessToken, logout);

module.exports = router;
