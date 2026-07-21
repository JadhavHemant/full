const { appPool } = require('../config/db');
const fs = require('fs').promises;
const path = require('path');

/**
 * Permission Matrix Generation Utility
 * 
 * Generates comprehensive RBAC permission matrices showing which roles
 * have which permissions for every module.
 */

/**
 * Generate complete permission matrix
 */
const generatePermissionMatrix = async () => {
  try {
    // Get all roles
    const rolesResult = await appPool.query(
      `SELECT "Id", "RoleName" 
       FROM "Roles" 
       WHERE "IsActive" = TRUE AND "IsDeleted" = FALSE 
       ORDER BY "Id"`
    );
    const roles = rolesResult.rows;

    // Get all modules
    const modulesResult = await appPool.query(
      `SELECT "ModuleId", "ModuleKey", "ModuleName", "ParentModuleId"
       FROM "Modules"
       WHERE "IsActive" = TRUE AND "IsDeleted" = FALSE
       ORDER BY "DisplayOrder"`
    );
    const modules = modulesResult.rows;

    // Get all permissions with their role assignments
    const permissionsResult = await appPool.query(
      `SELECT 
         m."ModuleKey",
         m."ModuleName",
         p."PermissionKey",
         p."Action",
         p."PermissionName",
         rp."RoleId",
         rp."IsGranted"
       FROM "Permissions" p
       JOIN "Modules" m ON p."ModuleId" = m."ModuleId"
       LEFT JOIN "RolePermissions" rp ON p."PermissionId" = rp."PermissionId" 
         AND rp."IsActive" = TRUE
       WHERE p."IsActive" = TRUE AND m."IsActive" = TRUE
       ORDER BY m."DisplayOrder", p."Action"`
    );

    // Build permission matrix
    const matrix = {};

    for (const perm of permissionsResult.rows) {
      const moduleKey = perm.ModuleKey;
      
      if (!matrix[moduleKey]) {
        matrix[moduleKey] = {
          moduleName: perm.ModuleName,
          permissions: {}
        };
      }

      const action = perm.Action;
      if (!matrix[moduleKey].permissions[action]) {
        matrix[moduleKey].permissions[action] = {
          permissionKey: perm.PermissionKey,
          roles: {}
        };
      }

      // Initialize all roles as false
      roles.forEach(role => {
        if (!matrix[moduleKey].permissions[action].roles[role.Id]) {
          matrix[moduleKey].permissions[action].roles[role.Id] = false;
        }
      });

      // Set granted permissions
      if (perm.RoleId && perm.IsGranted) {
        matrix[moduleKey].permissions[action].roles[perm.RoleId] = true;
      }
    }

    return {
      roles,
      modules,
      matrix,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error generating permission matrix:', error);
    throw error;
  }
};

/**
 * Format permission matrix as HTML table
 */
const formatMatrixAsHTML = (matrixData) => {
  const { roles, matrix } = matrixData;

  let html = `
<!DOCTYPE html>
<html>
<head>
  <title>RBAC Permission Matrix</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
      background: #f5f5f5;
    }
    h1 {
      color: #333;
      text-align: center;
    }
    .metadata {
      background: #fff;
      padding: 15px;
      margin-bottom: 20px;
      border-radius: 5px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    th {
      background: #4CAF50;
      color: white;
      padding: 12px;
      text-align: left;
      position: sticky;
      top: 0;
      z-index: 10;
    }
    td {
      padding: 10px;
      border-bottom: 1px solid #ddd;
    }
    tr:hover {
      background: #f5f5f5;
    }
    .module-header {
      background: #2196F3 !important;
      color: white !important;
      font-weight: bold;
      font-size: 1.1em;
    }
    .granted {
      color: #4CAF50;
      font-weight: bold;
      text-align: center;
    }
    .denied {
      color: #f44336;
      text-align: center;
    }
    .action-cell {
      font-weight: 500;
      color: #555;
    }
    .legend {
      margin-top: 20px;
      padding: 15px;
      background: white;
      border-radius: 5px;
    }
  </style>
</head>
<body>
  <h1>🔐 RBAC Permission Matrix</h1>
  <div class="metadata">
    <strong>Generated:</strong> ${new Date().toLocaleString()}<br>
    <strong>Total Roles:</strong> ${roles.length}<br>
    <strong>Total Modules:</strong> ${Object.keys(matrix).length}
  </div>
  
  <table>
    <thead>
      <tr>
        <th>Module</th>
        <th>Permission</th>
        ${roles.map(role => `<th>${role.RoleName}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
`;

  for (const [moduleKey, moduleData] of Object.entries(matrix)) {
    // Module header row
    html += `
      <tr>
        <td colspan="${roles.length + 2}" class="module-header">${moduleData.moduleName}</td>
      </tr>
`;

    // Permission rows
    for (const [action, permData] of Object.entries(moduleData.permissions)) {
      html += `
      <tr>
        <td></td>
        <td class="action-cell">${action}</td>
`;

      roles.forEach(role => {
        const hasPermission = permData.roles[role.Id];
        html += `
        <td class="${hasPermission ? 'granted' : 'denied'}">
          ${hasPermission ? '✓' : '✗'}
        </td>
`;
      });

      html += `
      </tr>
`;
    }
  }

  html += `
    </tbody>
  </table>
  
  <div class="legend">
    <strong>Legend:</strong><br>
    <span class="granted">✓</span> = Permission Granted<br>
    <span class="denied">✗</span> = Permission Denied
  </div>
</body>
</html>
`;

  return html;
};

/**
 * Format permission matrix as CSV
 */
const formatMatrixAsCSV = (matrixData) => {
  const { roles, matrix } = matrixData;

  let csv = 'Module,Permission,' + roles.map(r => r.RoleName).join(',') + '\n';

  for (const [moduleKey, moduleData] of Object.entries(matrix)) {
    for (const [action, permData] of Object.entries(moduleData.permissions)) {
      csv += `${moduleData.moduleName},${action},`;
      csv += roles.map(role => permData.roles[role.Id] ? 'YES' : 'NO').join(',');
      csv += '\n';
    }
  }

  return csv;
};

/**
 * Format permission matrix as JSON
 */
const formatMatrixAsJSON = (matrixData) => {
  return JSON.stringify(matrixData, null, 2);
};

/**
 * Save permission matrix to file
 */
const savePermissionMatrix = async (format = 'html') => {
  try {
    const matrixData = await generatePermissionMatrix();
    const outputDir = path.join(__dirname, '../docs');

    // Ensure docs directory exists
    try {
      await fs.mkdir(outputDir, { recursive: true });
    } catch (err) {
      // Directory already exists
    }

    let filename, content;

    switch (format.toLowerCase()) {
      case 'html':
        filename = 'permission-matrix.html';
        content = formatMatrixAsHTML(matrixData);
        break;
      case 'csv':
        filename = 'permission-matrix.csv';
        content = formatMatrixAsCSV(matrixData);
        break;
      case 'json':
        filename = 'permission-matrix.json';
        content = formatMatrixAsJSON(matrixData);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    const filepath = path.join(outputDir, filename);
    await fs.writeFile(filepath, content, 'utf8');

    console.log(`✅ Permission matrix saved to: ${filepath}`);

    return {
      success: true,
      filepath,
      format
    };
  } catch (error) {
    console.error('Error saving permission matrix:', error);
    throw error;
  }
};

/**
 * Generate and save all formats
 */
const generateAllFormats = async () => {
  try {
    const results = [];

    for (const format of ['html', 'csv', 'json']) {
      const result = await savePermissionMatrix(format);
      results.push(result);
    }

    console.log(`\n✅ Generated permission matrices in ${results.length} formats`);
    return results;
  } catch (error) {
    console.error('Error generating permission matrices:', error);
    throw error;
  }
};

// CLI execution
if (require.main === module) {
  const format = process.argv[2] || 'all';

  if (format === 'all') {
    generateAllFormats()
      .then(() => process.exit(0))
      .catch(err => {
        console.error(err);
        process.exit(1);
      });
  } else {
    savePermissionMatrix(format)
      .then(() => process.exit(0))
      .catch(err => {
        console.error(err);
        process.exit(1);
      });
  }
}

module.exports = {
  generatePermissionMatrix,
  formatMatrixAsHTML,
  formatMatrixAsCSV,
  formatMatrixAsJSON,
  savePermissionMatrix,
  generateAllFormats,
};
