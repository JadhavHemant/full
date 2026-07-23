const { appPool } = require('../config/db');

async function auditAllPrimaryKeys() {
  try {
    console.log('🔍 Auditing all table primary keys...\n');
    
    const query = `
      SELECT 
        tc.table_name,
        kcu.column_name as primary_key_column,
        c.data_type
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.columns c
        ON kcu.table_name = c.table_name
        AND kcu.column_name = c.column_name
        AND kcu.table_schema = c.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name
    `;
    
    const res = await appPool.query(query);
    
    // Group by naming pattern
    const patterns = {
      'Id': [],
      'TableNameId': [],
      'Other': []
    };
    
    res.rows.forEach(row => {
      if (row.primary_key_column === 'Id') {
        patterns['Id'].push(row);
      } else if (row.primary_key_column.endsWith('Id') && row.primary_key_column !== 'Id') {
        patterns['TableNameId'].push(row);
      } else {
        patterns['Other'].push(row);
      }
    });
    
    console.log('📊 PRIMARY KEY NAMING PATTERNS:\n');
    
    console.log(`✅ Tables using "Id" as primary key (${patterns['Id'].length} tables):`);
    patterns['Id'].forEach(r => console.log(`   - ${r.table_name.padEnd(35)} → "${r.primary_key_column}"`));
    
    console.log(`\n✅ Tables using "TableNameId" pattern (${patterns['TableNameId'].length} tables):`);
    patterns['TableNameId'].forEach(r => console.log(`   - ${r.table_name.padEnd(35)} → "${r.primary_key_column}"`));
    
    if (patterns['Other'].length > 0) {
      console.log(`\n⚠️  Tables using other patterns (${patterns['Other'].length} tables):`);
      patterns['Other'].forEach(r => console.log(`   - ${r.table_name.padEnd(35)} → "${r.primary_key_column}"`));
    }
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total tables: ${res.rows.length}`);
    console.log(`   Using "Id": ${patterns['Id'].length}`);
    console.log(`   Using "TableNameId": ${patterns['TableNameId'].length}`);
    console.log(`   Other: ${patterns['Other'].length}`);
    
    // Check for potential conflicts
    console.log('\n🔍 Checking for inconsistencies...\n');
    
    const specialTables = ['Modules', 'Permissions', 'RolePermissions', 'Menus', 'MenuPermissions', 'UserRoles'];
    const issues = [];
    
    specialTables.forEach(tableName => {
      const table = res.rows.find(r => r.table_name === tableName);
      if (table) {
        const expectedPK = tableName.slice(0, -1) + 'Id'; // e.g., Modules → ModuleId
        if (table.primary_key_column === 'Id' && tableName !== 'Users') {
          issues.push(`⚠️  ${tableName}: Has "Id" but RBAC code might expect "${expectedPK}"`);
        }
      }
    });
    
    if (issues.length > 0) {
      console.log('⚠️  POTENTIAL ISSUES FOUND:');
      issues.forEach(issue => console.log(`   ${issue}`));
    } else {
      console.log('✅ No obvious inconsistencies detected');
    }
    
    await appPool.end();
  } catch(e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

auditAllPrimaryKeys();
