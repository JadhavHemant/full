const fs = require('fs');
const path = require('path');

const files = [
  'controllers/InventoryApis/purchaseRequisitions.js',
  'controllers/InventoryApis/purchaseReturns.js',
  'controllers/InventoryApis/salesQuotations.js',
  'controllers/InventoryApis/deliveryChallans.js',
  'controllers/InventoryApis/salesReturns.js',
  'controllers/InventoryApis/production.js',
  'controllers/InventoryApis/notifications.js'
];

files.forEach(f => {
  const filePath = path.join(__dirname, '..', f);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add pgQuery import after the first require line
  if (!content.includes('pgQuery')) {
    content = content.replace(
      /const \{ appPool \} = require\(['"][^'"]+['"]\);/,
      function(m) { return m + '\nconst { pgQuery } = require("../../utils/pgCompat");'; }
    );
  }
  
  // Replace appPool.query( with pgQuery(appPool, 
  content = content.replace(/await appPool\.query\(/g, 'await pgQuery(appPool, ');
  
  fs.writeFileSync(filePath, content);
  console.log('Updated: ' + f);
});
console.log('Done!');