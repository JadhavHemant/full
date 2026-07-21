/**
 * Database Migration Script for RBAC
 * 
 * This script adds the necessary columns and tables for the RBAC system.
 * Run this BEFORE running setupRBAC.js if you get "column does not exist" errors.
 * 
 * Usage: node scripts/runMigration.js
 */

const { appPool } = require('../config/db');

/**
 * @param {boolean} closePool - Whether to close the pool after migration.
 * Set to false when calling from server startup to avoid "pool ended" error.
 */
const runMigration = async (closePool = true) => {
  let client;
  try {
    client = await appPool.connect();
    console.log('\n' + '='.repeat(70));
    console.log('🗄️  RBAC DATABASE MIGRATION');
    console.log('='.repeat(70) + '\n');
    
    // Step 1: Add Permissions column to Roles table
    console.log('📋 Step 1: Adding Permissions column to Roles table...');
    try {
      await client.query(`
        ALTER TABLE "Roles" 
        ADD COLUMN IF NOT EXISTS "Permissions" JSONB DEFAULT '{}'
      `);
      console.log('   ✅ Permissions column added\n');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('   ✅ Permissions column already exists\n');
      } else {
        throw error;
      }
    }
    
    // Step 2: Add IsDeleted column to Roles table
    console.log('📋 Step 2: Adding IsDeleted column to Roles table...');
    try {
      await client.query(`
        ALTER TABLE "Roles" 
        ADD COLUMN IF NOT EXISTS "IsDeleted" BOOLEAN DEFAULT FALSE
      `);
      console.log('   ✅ IsDeleted column added\n');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('   ✅ IsDeleted column already exists\n');
      } else {
        throw error;
      }
    }
    
    // Step 3: Add UpdatedAt column to Roles table
    console.log('📋 Step 3: Adding UpdatedAt column to Roles table...');
    try {
      await client.query(`
        ALTER TABLE "Roles" 
        ADD COLUMN IF NOT EXISTS "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
      console.log('   ✅ UpdatedAt column added\n');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('   ✅ UpdatedAt column already exists\n');
      } else {
        throw error;
      }
    }
    
    // Step 4: Create indexes on Roles table
    console.log('📋 Step 4: Creating indexes on Roles table...');
    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_roles_active 
        ON "Roles"("IsActive", "IsDeleted")
      `);
      console.log('   ✅ Index idx_roles_active created\n');
    } catch (error) {
      console.log('   ⚠️  Index creation warning:', error.message, '\n');
    }
    
    // Step 5: Create AuditLogs table
    console.log('📋 Step 5: Creating AuditLogs table...');
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "AuditLogs" (
          "Id" SERIAL PRIMARY KEY,
          "UserId" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
          "RoleId" INT REFERENCES "Roles"("Id") ON DELETE SET NULL,
          "Action" VARCHAR(100) NOT NULL,
          "EntityType" VARCHAR(100) NOT NULL,
          "EntityId" INT,
          "OldValue" JSONB,
          "NewValue" JSONB,
          "IpAddress" VARCHAR(64),
          "UserAgent" TEXT,
          "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('   ✅ AuditLogs table created\n');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('   ✅ AuditLogs table already exists\n');
      } else {
        throw error;
      }
    }
    
    // Step 6: Create indexes on AuditLogs table
    console.log('📋 Step 6: Creating indexes on AuditLogs table...');
    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_user 
        ON "AuditLogs"("UserId")
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_role 
        ON "AuditLogs"("RoleId")
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_created 
        ON "AuditLogs"("CreatedAt")
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_entity 
        ON "AuditLogs"("EntityType", "EntityId")
      `);
      console.log('   ✅ All AuditLogs indexes created\n');
    } catch (error) {
      console.log('   ⚠️  Index creation warning:', error.message, '\n');
    }
    
    // Step 7: Verify migration
    console.log('📋 Step 7: Verifying migration...');
    const verifyResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Roles' 
      AND column_name IN ('Permissions', 'IsDeleted', 'UpdatedAt')
      ORDER BY column_name
    `);
    
    const columns = verifyResult.rows.map(r => r.column_name);
    const requiredColumns = ['Permissions', 'IsDeleted', 'UpdatedAt'];
    const missingColumns = requiredColumns.filter(col => !columns.includes(col));
    
    if (missingColumns.length === 0) {
      console.log('   ✅ All required columns verified');
      console.log('   Columns found:', columns.join(', '), '\n');
    } else {
      console.log('   ❌ Missing columns:', missingColumns.join(', '), '\n');
      throw new Error('Migration verification failed');
    }
    
    // Verify AuditLogs table
    const auditTableResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'AuditLogs'
      )
    `);
    
    if (auditTableResult.rows[0].exists) {
      console.log('   ✅ AuditLogs table verified\n');
    } else {
      throw new Error('AuditLogs table not found');
    }
    
    console.log('='.repeat(70));
    console.log('✅ MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(70) + '\n');
    
    console.log('📝 Next Steps:');
    console.log('   1. Run: node scripts/seedRoles.js');
    console.log('   2. Run: node scripts/testRBAC.js');
    console.log('   3. Start server: npm start\n');
    
  } catch (error) {
    console.error('\n❌ MIGRATION FAILED:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Check database connection in .env');
    console.error('   2. Verify database exists');
    console.error('   3. Check PostgreSQL is running');
    console.error('   4. Review error details above\n');
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    // Only close the pool if we're running standalone (not from server startup)
    if (closePool) {
      await appPool.end();
    }
  }
};

// Run if called directly (standalone mode - closes pool)
if (require.main === module) {
  runMigration(true)
    .then(() => {
      console.log('🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runMigration };