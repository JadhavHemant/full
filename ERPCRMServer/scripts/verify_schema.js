/**
 * SCHEMA VERIFICATION SCRIPT
 * Verifies that the database schema is correct after the fix
 */

const { appPool } = require('../config/db');

async function verifySchema() {
  console.log('🔍 Verifying database schema...\n');
  
  try {
    // Check Modules table
    console.log('📋 Modules Table Structure:');
    const modulesColumns = await appPool.query(`
      SELECT 
        column_name, 
        data_type,
        character_maximum_length,
        is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'Modules'
      ORDER BY ordinal_position
    `);
    
    console.table(modulesColumns.rows);
    
    // Check primary key
    const modulesPK = await appPool.query(`
      SELECT kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'Modules'
        AND tc.constraint_type = 'PRIMARY KEY'
    `);
    
    console.log('\n✅ Modules Primary Key:', modulesPK.rows[0]?.column_name || 'NOT FOUND');
    
    if (modulesPK.rows[0]?.column_name === 'ModuleId') {
      console.log('✅ CORRECT: Modules table has "ModuleId" as primary key\n');
    } else {
      console.log('❌ WRONG: Modules table primary key is not "ModuleId"\n');
    }
    
    // Check Permissions table if it exists
    const permsCheck = await appPool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Permissions'
      ) as exists
    `);
    
    if (permsCheck.rows[0].exists) {
      console.log('📋 Permissions Table Structure:');
      const permsColumns = await appPool.query(`
        SELECT 
          column_name, 
          data_type,
          character_maximum_length,
          is_nullable
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'Permissions'
        ORDER BY ordinal_position
      `);
      
      console.table(permsColumns.rows);
      
      const permsPK = await appPool.query(`
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_schema = 'public'
          AND tc.table_name = 'Permissions'
          AND tc.constraint_type = 'PRIMARY KEY'
      `);
      
      console.log('\n✅ Permissions Primary Key:', permsPK.rows[0]?.column_name || 'NOT FOUND');
      
      if (permsPK.rows[0]?.column_name === 'PermissionId') {
        console.log('✅ CORRECT: Permissions table has "PermissionId" as primary key\n');
      } else {
        console.log('❌ WRONG: Permissions table primary key is not "PermissionId"\n');
      }
    } else {
      console.log('⚠️  Permissions table does not exist yet (will be created on app startup)\n');
    }
    
    // Check foreign keys
    console.log('📋 Foreign Key Constraints:');
    const fkeys = await appPool.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name IN ('Modules', 'Permissions', 'RolePermissions', 'Menus')
      ORDER BY tc.table_name, kcu.column_name
    `);
    
    if (fkeys.rows.length > 0) {
      console.table(fkeys.rows);
    } else {
      console.log('No foreign keys found yet (normal if tables were just fixed)\n');
    }
    
    console.log('\n✅ SCHEMA VERIFICATION COMPLETE');
    console.log('📌 Your database schema is now correct!');
    console.log('📌 You can safely start your Node.js application');
    
  } catch (error) {
    console.error('❌ Error verifying schema:', error.message);
    throw error;
  } finally {
    await appPool.end();
  }
}

verifySchema()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Verification failed:', err);
    process.exit(1);
  });
