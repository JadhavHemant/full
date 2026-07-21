const { appPool } = require('../config/db');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Complete RBAC Setup Script
 * 
 * Runs all migrations and seeders to set up the complete
 * Authentication, Authorization, and RBAC system.
 */

const MIGRATION_FILE = path.join(__dirname, '../migrations/003_extend_users_authentication.sql');

async function runMigration() {
  console.log('📋 Step 1: Running database migration...\n');
  
  try {
    // Read migration file
    if (!fs.existsSync(MIGRATION_FILE)) {
      throw new Error(`Migration file not found: ${MIGRATION_FILE}`);
    }

    const migrationSQL = fs.readFileSync(MIGRATION_FILE, 'utf8');
    
    // Execute migration
    await appPool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully\n');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

async function runSeeders() {
  console.log('🌱 Step 2: Running seeders...\n');
  
  try {
    const { runAllSeeders } = require('../seeders/runSeeders');
    await runAllSeeders();
    
    console.log('✅ Seeders completed successfully\n');
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    throw error;
  }
}

async function generatePermissionMatrix() {
  console.log('📊 Step 3: Generating permission matrices...\n');
  
  try {
    const { generateAllFormats } = require('../utils/permissionMatrix');
    await generateAllFormats();
    
    console.log('✅ Permission matrices generated\n');
  } catch (error) {
    console.error('❌ Permission matrix generation failed:', error.message);
    throw error;
  }
}

async function verifySetup() {
  console.log('🔍 Step 4: Verifying setup...\n');
  
  try {
    // Check if tables exist
    const tables = [
      'Users',
      'Modules',
      'Permissions',
      'UserRoles',
      'RolePermissions',
      'Menus',
      'MenuPermissions',
      'RefreshTokens',
      'EmailVerificationTokens',
      'LoginHistory'
    ];

    for (const table of tables) {
      const result = await appPool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )`,
        [table]
      );
      
      if (!result.rows[0].exists) {
        throw new Error(`Table "${table}" not found`);
      }
    }

    // Check data counts
    const moduleCount = await appPool.query('SELECT COUNT(*) FROM "Modules"');
    const permissionCount = await appPool.query('SELECT COUNT(*) FROM "Permissions"');
    const roleCount = await appPool.query('SELECT COUNT(*) FROM "Roles"');
    const menuCount = await appPool.query('SELECT COUNT(*) FROM "Menus"');
    const rolePermCount = await appPool.query('SELECT COUNT(*) FROM "RolePermissions"');

    console.log('📊 Setup Summary:');
    console.log(`   ✓ Modules: ${moduleCount.rows[0].count}`);
    console.log(`   ✓ Permissions: ${permissionCount.rows[0].count}`);
    console.log(`   ✓ Roles: ${roleCount.rows[0].count}`);
    console.log(`   ✓ Menus: ${menuCount.rows[0].count}`);
    console.log(`   ✓ Role-Permission Mappings: ${rolePermCount.rows[0].count}`);
    console.log('');

    // Check for Users table authentication fields
    const userFields = await appPool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Users' 
        AND column_name IN ('PasswordChangedAt', 'FailedLoginAttempts', 'RefreshTokenVersion', 'Status')
    `);

    if (userFields.rows.length < 4) {
      throw new Error('Users table missing authentication fields');
    }

    console.log('✅ All verification checks passed!\n');
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    throw error;
  }
}

async function printNextSteps() {
  console.log('═'.repeat(70));
  console.log('🎉 RBAC SETUP COMPLETED SUCCESSFULLY!');
  console.log('═'.repeat(70));
  console.log('');
  console.log('📚 Next Steps:');
  console.log('');
  console.log('1. Review the implementation guide:');
  console.log('   📄 docs/RBAC_IMPLEMENTATION_GUIDE.md');
  console.log('');
  console.log('2. View the permission matrix:');
  console.log('   🌐 docs/permission-matrix.html');
  console.log('   📊 docs/permission-matrix.csv');
  console.log('   📋 docs/permission-matrix.json');
  console.log('');
  console.log('3. Configure environment variables:');
  console.log('   ⚙️  Add JWT secrets and security settings to .env file');
  console.log('   📝 See .env.example or implementation guide for details');
  console.log('');
  console.log('4. Test the authentication endpoints:');
  console.log('   🔐 POST /api/users/login');
  console.log('   🔄 POST /api/token/refresh-token');
  console.log('   👤 GET /api/menus/user');
  console.log('');
  console.log('5. Start the server:');
  console.log('   🚀 npm start');
  console.log('');
  console.log('═'.repeat(70));
  console.log('');
}

async function main() {
  const startTime = Date.now();

  console.log('');
  console.log('═'.repeat(70));
  console.log('🔐 RBAC SYSTEM SETUP');
  console.log('═'.repeat(70));
  console.log('');
  console.log('This script will set up the complete Authentication, Authorization,');
  console.log('and RBAC system for your ERP/CRM application.');
  console.log('');
  console.log('⚠️  WARNING: This will modify your database schema.');
  console.log('   Make sure you have a backup before proceeding!');
  console.log('');
  console.log('═'.repeat(70));
  console.log('');

  try {
    // Step 1: Run migration
    await runMigration();

    // Step 2: Run seeders
    await runSeeders();

    // Step 3: Generate permission matrix
    await generatePermissionMatrix();

    // Step 4: Verify setup
    await verifySetup();

    // Print next steps
    await printNextSteps();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`⏱️  Total setup time: ${duration} seconds`);
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('═'.repeat(70));
    console.error('❌ SETUP FAILED');
    console.error('═'.repeat(70));
    console.error('');
    console.error('Error:', error.message);
    console.error('');
    console.error('💡 Troubleshooting:');
    console.error('   1. Check database connection settings');
    console.error('   2. Ensure PostgreSQL is running');
    console.error('   3. Verify database user has necessary permissions');
    console.error('   4. Check for any conflicting table definitions');
    console.error('');
    console.error('For more help, see docs/RBAC_IMPLEMENTATION_GUIDE.md');
    console.error('');
    process.exit(1);
  }
}

// Run setup if called directly
if (require.main === module) {
  main();
}

module.exports = { main };
