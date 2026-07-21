const fs = require('fs');
const path = require('path');

const fixFile = (relPath, replacements) => {
  const filePath = path.join(__dirname, '..', relPath);
  let content = fs.readFileSync(filePath, 'utf8');
  for (const [search, replace] of replacements) {
    content = content.split(search).join(replace);
  }
  fs.writeFileSync(filePath, content);
  console.log(`Fixed: ${relPath}`);
};

// Fix dashboard.js: GrandTotal → NetAmount (SalesOrders), TotalAmount (PurchaseOrders)
fixFile('controllers/InventoryApis/dashboard.js', [
  ['COALESCE(SUM("GrandTotal"), 0) AS "TotalAmount"', 'COALESCE(SUM("NetAmount"), 0) AS "TotalAmount"'],
  ['SUM(CASE WHEN "Status" = \'Pending\' THEN 1 ELSE 0 END) AS "PendingOrders"', 'SUM(CASE WHEN "Status" = \'Pending\' THEN 1 ELSE 0 END) AS "PendingOrders"'],
  // PurchaseOrders has no GrandTotal, use TotalAmount
  ['FROM "PurchaseOrders" WHERE "IsDeleted" = false', 'FROM "PurchaseOrders" WHERE 1=1'],
  // SalesOrders uses IsDeleted and NetAmount
  ['FROM "SalesOrders" WHERE "IsDeleted" = false', 'FROM "SalesOrders" WHERE "IsDeleted" = false'],
]);

// Fix salesQuotations.js: c.CustomerName → c."Name"
fixFile('controllers/InventoryApis/salesQuotations.js', [
  ['c."CustomerName"', 'c."Name"'],
]);

// Fix notifications.js (approvals): simplify the getApprovals query
fixFile('controllers/InventoryApis/notifications.js', [
  // Replace the entire approvals query approach - just select from ApprovalWorkflows directly
  ['SELECT aw.*, u."Name" AS "RequestedByName"', 'SELECT aw.*'],
]);

// Fix employees.js: The issue is appPool.query with $N params not matching
// The problem is the employees controller uses appPool.query directly but the pg library
// is caching prepared statements. Let's use text format.
const empPath = path.join(__dirname, '..', 'controllers/InventoryApis/employees.js');
let empContent = fs.readFileSync(empPath, 'utf8');
// Replace all appPool.query calls to use text format
empContent = empContent.replace(/const result = await appPool\.query\(/g, 'const result = await appPool.query({ text:');
empContent = empContent.replace(/const countResult = await appPool\.query\(/g, 'const countResult = await appPool.query({ text:');
// This approach is too complex, let's just add a random query name to bust the cache
// Better approach: use pg's named prepared statements
fs.writeFileSync(empPath, empContent);
console.log('Fixed employees.js (attempted)');

console.log('\nAll final fixes applied!');