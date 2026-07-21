const { appPool } = require('../config/db');

/**
 * Reusable Implementation Checker Utility
 * 
 * Checks if features/permissions are implemented in the system
 * WITHOUT creating new tables - uses existing Roles table
 * 
 * Features:
 * - Check if permission exists for any role
 * - Check if feature is implemented (has any permissions)
 * - Check implementation status across all roles
 * - Get unimplemented features
 * - Get implementation coverage percentage
 */

class ImplementationChecker {
  
  /**
   * Check if a specific permission exists in any role
   * @param {string} module - Module name (e.g., 'products', 'sales Orders')
   * @param {string} action - Action name (e.g., 'view', 'create', 'edit', 'delete', 'export')
   * @returns {Promise<{implemented: boolean, roles: Array, details: Object}>}
   */
  async checkPermission(module, action) {
    try {
      const query = `
        SELECT 
          "Id",
          "RoleName",
          "Permissions"
        FROM "Roles"
        WHERE "IsActive" = true 
          AND "IsDeleted" = false
          AND "Permissions" ? $1
          AND ("Permissions" -> $1 ->> $2)::boolean = true
      `;
      
      const result = await appPool.query(query, [module, action]);
      
      return {
        implemented: result.rows.length > 0,
        rolesWithAccess: result.rows.map(r => ({
          roleId: r.Id,
          roleName: r.RoleName
        })),
        totalRoles: result.rows.length,
        permissionKey: `${module}.${action}`,
        details: {
          module,
          action,
          checked: true
        }
      };
    } catch (error) {
      console.error('Error checking permission:', error);
      throw error;
    }
  }

  /**
   * Check if a feature/module is implemented (has any permissions)
   * @param {string} module - Module name (e.g., 'products')
   * @returns {Promise<{implemented: boolean, actions: Array, coverage: Object}>}
   */
  async checkFeature(module) {
    try {
      const query = `
        SELECT 
          "Id",
          "RoleName",
          "Permissions"
        FROM "Roles"
        WHERE "IsActive" = true 
          AND "IsDeleted" = false
          AND "Permissions" ? $1
      `;
      
      const result = await appPool.query(query, [module]);
      
      if (result.rows.length === 0) {
        return {
          implemented: false,
          module,
          totalRoles: 0,
          actions: [],
          coverage: {
            percentage: 0,
            rolesWithAccess: 0,
            totalActiveRoles: await this.getTotalActiveRoles()
          }
        };
      }

      // Extract all actions for this module
      const actionsSet = new Set();
      result.rows.forEach(row => {
        const modulePerms = row.Permissions[module];
        if (modulePerms) {
          Object.keys(modulePerms).forEach(action => {
            if (modulePerms[action] === true) {
              actionsSet.add(action);
            }
          });
        }
      });

      const totalActiveRoles = await this.getTotalActiveRoles();

      return {
        implemented: true,
        module,
        actions: Array.from(actionsSet),
        rolesWithAccess: result.rows.map(r => ({
          roleId: r.Id,
          roleName: r.RoleName,
          permissions: r.Permissions[module]
        })),
        coverage: {
          percentage: Math.round((result.rows.length / totalActiveRoles) * 100),
          rolesWithAccess: result.rows.length,
          totalActiveRoles
        }
      };
    } catch (error) {
      console.error('Error checking feature:', error);
      throw error;
    }
  }

  /**
   * Get all modules and their implementation status
   * @returns {Promise<Array>}
   */
  async getAllFeaturesStatus() {
    try {
      const query = `
        SELECT DISTINCT jsonb_object_keys("Permissions") as module
        FROM "Roles"
        WHERE "IsActive" = true AND "IsDeleted" = false
      `;
      
      const result = await appPool.query(query);
      const modules = result.rows.map(r => r.module);

      const statusPromises = modules.map(module => this.checkFeature(module));
      const statuses = await Promise.all(statusPromises);

      return statuses.sort((a, b) => b.coverage.percentage - a.coverage.percentage);
    } catch (error) {
      console.error('Error getting all features status:', error);
      throw error;
    }
  }

  /**
   * Get unimplemented or partially implemented features
   * @param {number} threshold - Coverage threshold percentage (default: 50)
   * @returns {Promise<Array>}
   */
  async getUnimplementedFeatures(threshold = 50) {
    try {
      const allStatuses = await this.getAllFeaturesStatus();
      return allStatuses.filter(status => 
        !status.implemented || status.coverage.percentage < threshold
      );
    } catch (error) {
      console.error('Error getting unimplemented features:', error);
      throw error;
    }
  }

  /**
   * Check if user has specific permission
   * @param {number} userId - User ID
   * @param {string} module - Module name
   * @param {string} action - Action name
   * @returns {Promise<{hasPermission: boolean, role: Object}>}
   */
  async checkUserPermission(userId, module, action) {
    try {
      const query = `
        SELECT 
          r."Id",
          r."RoleName",
          r."Permissions"
        FROM "Users" u
        INNER JOIN "Roles" r ON u."RoleId" = r."Id"
        WHERE u."UserId" = $1
          AND r."IsActive" = true
          AND r."IsDeleted" = false
          AND r."Permissions" ? $2
          AND (r."Permissions" -> $2 ->> $3)::boolean = true
      `;
      
      const result = await appPool.query(query, [userId, module, action]);
      
      return {
        hasPermission: result.rows.length > 0,
        userId,
        permissionKey: `${module}.${action}`,
        role: result.rows.length > 0 ? {
          roleId: result.rows[0].Id,
          roleName: result.rows[0].RoleName
        } : null
      };
    } catch (error) {
      console.error('Error checking user permission:', error);
      throw error;
    }
  }

  /**
   * Get implementation coverage summary
   * @returns {Promise<Object>}
   */
  async getImplementationSummary() {
    try {
      const allStatuses = await this.getAllFeaturesStatus();
      
      const totalModules = allStatuses.length;
      const fullyImplemented = allStatuses.filter(s => s.coverage.percentage === 100).length;
      const partiallyImplemented = allStatuses.filter(
        s => s.coverage.percentage > 0 && s.coverage.percentage < 100
      ).length;
      const notImplemented = allStatuses.filter(s => !s.implemented).length;

      const averageCoverage = allStatuses.reduce(
        (sum, s) => sum + s.coverage.percentage, 0
      ) / totalModules;

      return {
        totalModules,
        fullyImplemented,
        partiallyImplemented,
        notImplemented,
        averageCoverage: Math.round(averageCoverage),
        implementationRate: Math.round((fullyImplemented / totalModules) * 100),
        modules: allStatuses
      };
    } catch (error) {
      console.error('Error getting implementation summary:', error);
      throw error;
    }
  }

  /**
   * Check if route/controller is implemented (utility method)
   * @param {string} moduleName - Module name
   * @param {string} controllerPath - Path to controller file
   * @param {string} routePath - Path to route file
   * @returns {Promise<Object>}
   */
  async checkImplementationStatus(moduleName, controllerPath = null, routePath = null) {
    const fs = require('fs');
    const path = require('path');

    const permissionStatus = await this.checkFeature(moduleName);
    
    let controllerExists = false;
    let routeExists = false;

    // Check if controller file exists
    if (controllerPath) {
      const fullControllerPath = path.join(process.cwd(), controllerPath);
      controllerExists = fs.existsSync(fullControllerPath);
    }

    // Check if route file exists
    if (routePath) {
      const fullRoutePath = path.join(process.cwd(), routePath);
      routeExists = fs.existsSync(fullRoutePath);
    }

    return {
      module: moduleName,
      permissions: {
        implemented: permissionStatus.implemented,
        coverage: permissionStatus.coverage.percentage + '%',
        actions: permissionStatus.actions
      },
      controller: {
        path: controllerPath,
        exists: controllerExists,
        implemented: controllerExists
      },
      route: {
        path: routePath,
        exists: routeExists,
        implemented: routeExists
      },
      fullyImplemented: permissionStatus.implemented && 
                        (!controllerPath || controllerExists) && 
                        (!routePath || routeExists),
      status: this.getStatusLabel(
        permissionStatus.implemented,
        controllerExists,
        routeExists,
        controllerPath,
        routePath
      )
    };
  }

  /**
   * Helper: Get status label
   */
  getStatusLabel(permExists, controllerExists, routeExists, controllerPath, routePath) {
    if (permExists && 
        (!controllerPath || controllerExists) && 
        (!routePath || routeExists)) {
      return '✅ Fully Implemented';
    }
    
    if (!permExists) {
      return '❌ Permissions Not Configured';
    }
    
    if (controllerPath && !controllerExists) {
      return '⚠️  Controller Missing';
    }
    
    if (routePath && !routeExists) {
      return '⚠️  Route Missing';
    }
    
    return '⚠️  Partially Implemented';
  }

  /**
   * Helper: Get total active roles
   */
  async getTotalActiveRoles() {
    const result = await appPool.query(
      'SELECT COUNT(*) FROM "Roles" WHERE "IsActive" = true AND "IsDeleted" = false'
    );
    return parseInt(result.rows[0].count);
  }

  /**
   * Batch check multiple features
   * @param {Array<string>} modules - Array of module names
   * @returns {Promise<Array>}
   */
  async checkMultipleFeatures(modules) {
    const promises = modules.map(module => this.checkFeature(module));
    return await Promise.all(promises);
  }

  /**
   * Compare implementation between environments (dev/prod)
   * Useful for deployment verification
   */
  async compareImplementation(otherDbPool) {
    // Implementation for comparing two database instances
    // Useful for ensuring prod has same features as dev
    console.log('Compare implementation feature - to be implemented if needed');
  }
}

// Export singleton instance
const implementationChecker = new ImplementationChecker();

module.exports = {
  ImplementationChecker,
  implementationChecker,
  
  // Convenience exports
  checkPermission: (module, action) => implementationChecker.checkPermission(module, action),
  checkFeature: (module) => implementationChecker.checkFeature(module),
  checkUserPermission: (userId, module, action) => implementationChecker.checkUserPermission(userId, module, action),
  getAllFeaturesStatus: () => implementationChecker.getAllFeaturesStatus(),
  getUnimplementedFeatures: (threshold) => implementationChecker.getUnimplementedFeatures(threshold),
  getImplementationSummary: () => implementationChecker.getImplementationSummary(),
  checkImplementationStatus: (moduleName, controllerPath, routePath) => 
    implementationChecker.checkImplementationStatus(moduleName, controllerPath, routePath)
};
