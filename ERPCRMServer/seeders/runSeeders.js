const { seedModules } = require('./001_seed_modules');
const { seedPermissions } = require('./002_seed_permissions');
const { seedMenus } = require('./003_seed_menus');
const { seedRolePermissions } = require('./004_seed_role_permissions');

/**
 * Master Seeder Script
 * 
 * Runs all seeders in the correct order to populate RBAC data.
 * Run with: node seeders/runSeeders.js
 */
const runAllSeeders = async () => {
  console.log('🌱 Starting RBAC Data Seeding Process...\n');
  
  const startTime = Date.now();

  try {
    // Step 1: Seed Modules
    console.log('Step 1/4: Seeding Modules');
    await seedModules();
    console.log('');

    // Step 2: Seed Permissions
    console.log('Step 2/4: Seeding Permissions');
    await seedPermissions();
    console.log('');

    // Step 3: Seed Menus
    console.log('Step 3/4: Seeding Menus');
    await seedMenus();
    console.log('');

    // Step 4: Seed Role Permissions
    console.log('Step 4/4: Seeding Role Permissions');
    await seedRolePermissions();
    console.log('');

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('✅ RBAC Data Seeding Completed Successfully!');
    console.log(`⏱️  Total time: ${duration} seconds\n`);
    
    // Print summary
    console.log('📊 Summary:');
    console.log('  ✓ Modules seeded');
    console.log('  ✓ Permissions generated for all modules');
    console.log('  ✓ Navigation menus created');
    console.log('  ✓ Role-permission mappings assigned');
    console.log('');
    console.log('🎉 Your ERP/CRM RBAC system is now ready!');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    console.error('');
    console.error('💡 Troubleshooting:');
    console.error('  1. Ensure database migrations have been run');
    console.error('  2. Check database connection settings');
    console.error('  3. Verify all required tables exist');
    console.error('');
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  runAllSeeders();
}

module.exports = { runAllSeeders };
