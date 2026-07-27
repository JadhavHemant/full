/**
 * DATABASE SCHEMA FIX SCRIPT
 * 
 * This script fixes the column name mismatch in Modules and Permissions tables
 * Run this BEFORE starting your server if you get the error:
 * "column ModuleId referenced in foreign key constraint does not exist"
 */

const { appPool } = require('../config/db');

async function fixDatabaseSchema() {
  console.log('🔍 Checking database schema...');
  
  try {
    // Step 1: Check if Modules table has "Id" instead of "ModuleId"
    const checkModules = await appPool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'Modules'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Current Modules columns:', checkModules.rows.map(r => r.column_name));
    
    const hasId = checkModules.rows.some(r => r.column_name === 'Id');
    const hasModuleId = checkModules.rows.some(r => r.column_name === 'ModuleId');
    
    if (hasId && !hasModuleId) {
      console.log('⚠️  WRONG SCHEMA DETECTED: Modules table has "Id" instead of "ModuleId"');
      console.log('🔧 Fixing Modules table...');
      
      // Drop dependent objects first
      await appPool.query(`DROP TABLE IF EXISTS "MenuPermissions" CASCADE`);
      await appPool.query(`DROP TABLE IF EXISTS "Menus" CASCADE`);
      await appPool.query(`DROP TABLE IF EXISTS "RolePermissions" CASCADE`);
      await appPool.query(`DROP TABLE IF EXISTS "Permissions" CASCADE`);
      
      console.log('   Dropped dependent tables');
      
      // Rename the column
      await appPool.query(`ALTER TABLE "Modules" RENAME COLUMN "Id" TO "ModuleId"`);
      console.log('   ✅ Renamed Modules.Id → Modules.ModuleId');
      
      // Add missing columns
      const alterations = [
        `ALTER TABLE "Modules" ADD COLUMN IF NOT EXISTS "ModuleName" VARCHAR(100)`,
        `ALTER TABLE "Modules" ADD COLUMN IF NOT EXISTS "ModuleKey" VARCHAR(50)`,
        `ALTER TABLE "Modules" ADD COLUMN IF NOT EXISTS "Description" TEXT`,
        `ALTER TABLE "Modules" ADD COLUMN IF NOT EXISTS "ParentModuleId" INT`,
        `ALTER TABLE "Modules" ADD COLUMN IF NOT EXISTS "Icon" VARCHAR(50)`,
        `ALTER TABLE "Modules" ADD COLUMN IF NOT EXISTS "DisplayOrder" INT DEFAULT 0`,
        `ALTER TABLE "Modules" ADD COLUMN IF NOT EXISTS "IsActive" BOOLEAN DEFAULT TRUE`,
        `ALTER TABLE "Modules" ADD COLUMN IF NOT EXISTS "IsDeleted" BOOLEAN DEFAULT FALSE`,
        `ALTER TABLE "Modules" ADD COLUMN IF NOT EXISTS "CreatedBy" INT`,
        `ALTER TABLE "Modules" ADD COLUMN IF NOT EXISTS "UpdatedBy" INT`,
        `ALTER TABLE "Modules" ADD COLUMN IF NOT EXISTS "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
        `ALTER TABLE "Modules" ADD COLUMN IF NOT EXISTS "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
      ];
      
      for (const sql of alterations) {
        try {
          await appPool.query(sql);
        } catch (err) {
          // Column might already exist
        }
      }
      console.log('   ✅ Added missing columns');
      
      // Add unique constraints
      try {
        await appPool.query(`ALTER TABLE "Modules" ADD CONSTRAINT modules_modulename_key UNIQUE ("ModuleName")`);
      } catch (err) { /* might already exist */ }
      
      try {
        await appPool.query(`ALTER TABLE "Modules" ADD CONSTRAINT modules_modulekey_key UNIQUE ("ModuleKey")`);
      } catch (err) { /* might already exist */ }
      
      console.log('   ✅ Added unique constraints');
      
    } else if (hasModuleId) {
      console.log('✅ Modules table has correct schema (ModuleId column exists)');
    } else {
      console.log('⚠️  Modules table does not exist yet - will be created on startup');
    }
    
    // Step 2: Check Permissions table
    const checkPerms = await appPool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'Permissions'
      ORDER BY ordinal_position
    `);
    
    if (checkPerms.rows.length > 0) {
      console.log('📋 Current Permissions columns:', checkPerms.rows.map(r => r.column_name));
      
      const hasPermId = checkPerms.rows.some(r => r.column_name === 'Id');
      const hasPermissionId = checkPerms.rows.some(r => r.column_name === 'PermissionId');
      
      if (hasPermId && !hasPermissionId) {
        console.log('⚠️  WRONG SCHEMA: Permissions table has "Id" instead of "PermissionId"');
        console.log('🔧 Fixing Permissions table...');
        
        // Drop it and let the app recreate it
        await appPool.query(`DROP TABLE IF EXISTS "Permissions" CASCADE`);
        console.log('   ✅ Dropped Permissions table (will be recreated)');
      } else if (hasPermissionId) {
        console.log('✅ Permissions table has correct schema');
      }
    }
    
    console.log('\n✅ DATABASE SCHEMA FIX COMPLETE');
    console.log('📌 Now restart your Node.js application');
    
  } catch (error) {
    console.error('❌ Error fixing database schema:', error.message);
    throw error;
  } finally {
    await appPool.end();
  }
}

// Run the fix
fixDatabaseSchema()
  .then(() => {
    console.log('\n✅ Success! You can now start your server.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Failed to fix database schema:', err);
    process.exit(1);
  });
