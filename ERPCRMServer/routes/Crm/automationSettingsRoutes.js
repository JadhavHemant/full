const express = require('express');
const { verifyAccessToken } = require('../../middlewares/authMiddleware');
const { requireModuleAccess: checkPermission } = require('../../middlewares/permissionMiddleware');
const { getAutomationConfig, updateAutomationConfig } = require('../../services/crm/automations/config');

const router = express.Router();

/**
 * GET /api/crm/settings/automation
 * Get CRM automation configuration for the current user's company.
 * Requires admin or superadmin role.
 */
router.get('/automation', verifyAccessToken, checkPermission('settings', 'view'), async (req, res) => {
  try {
    const companyId = req.user.companyId;
    if (!companyId) {
      return res.status(400).json({ message: 'Company context required' });
    }

    const config = await getAutomationConfig(companyId);
    res.json({ config });
  } catch (error) {
    console.error('Error fetching automation config:', error);
    res.status(500).json({ message: 'Failed to fetch automation configuration' });
  }
});

/**
 * PATCH /api/crm/settings/automation
 * Update CRM automation configuration for the current user's company.
 * Requires admin or superadmin role.
 */
router.patch('/automation', verifyAccessToken, checkPermission('settings', 'edit'), async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const userId = req.user.userId;
    
    if (!companyId) {
      return res.status(400).json({ message: 'Company context required' });
    }

    const partialConfig = req.body;
    
    // Validate the config structure
    if (!partialConfig || typeof partialConfig !== 'object') {
      return res.status(400).json({ message: 'Invalid configuration object' });
    }

    const updatedConfig = await updateAutomationConfig(companyId, partialConfig, userId);
    res.json({ 
      message: 'Automation configuration updated successfully',
      config: updatedConfig 
    });
  } catch (error) {
    console.error('Error updating automation config:', error);
    res.status(500).json({ message: 'Failed to update automation configuration' });
  }
});

module.exports = router;