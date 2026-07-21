/**
 * User Cleanup Script
 * 
 * Deletes (soft delete) all users except UserId = 1 and UserId = 100
 * Keeps only the first two users, deletes users with IDs 2-99
 * 
 * Usage: node scripts/cleanupUsers.js
 */

const { appPool } = require('../config/db');

const cleanupUsers = async () => {
  const client = await appPool.connect();
  
  try {
    console.log('🧹 Starting user cleanup...\n');
    
    // Preview: Count users to be deleted
    const previewResult = await client.query(
      `SELECT COUNT(*) as count FROM "Users" WHERE "UserId" NOT IN (1, 100) AND "IsDeleted" = FALSE`
    );
    const usersToDelete = parseInt(previewResult.rows[0].count);
    
    // Preview: Count users to be kept
    const keepResult = await client.query(
      `SELECT COUNT(*) as count FROM "Users" WHERE "UserId" IN (1, 100) AND "IsDeleted" = FALSE`
    );
    const usersToKeep = parseInt(keepResult.rows[0].count);
    
    console.log('📊 Cleanup Preview:');
    console.log(`   Users to be deleted: ${usersToDelete}`);
    console.log(`   Users to be kept: ${usersToKeep}\n`);
    
    // Show users that will be kept
    const keepUsersResult = await client.query(
      `SELECT "UserId", "Name", "Email", "RoleId" FROM "Users" WHERE "UserId" IN (1, 100) ORDER BY "UserId"`
    );
    
    console.log('👥 Users that will be KEPT:');
    keepUsersResult.rows.forEach(user => {
      console.log(`   ID: ${user.UserId} | Name: ${user.Name} | Email: ${user.Email} | Role: ${user.RoleId}`);
    });
    
    // Show first 10 users that will be deleted
    const deleteUsersResult = await client.query(
      `SELECT "UserId", "Name", "Email", "RoleId" FROM "Users" WHERE "UserId" BETWEEN 2 AND 99 AND "IsDeleted" = FALSE ORDER BY "UserId" LIMIT 10`
    );
    
    console.log('\n🗑️  First 10 users that will be DELETED:');
    deleteUsersResult.rows.forEach(user => {
      console.log(`   ID: ${user.UserId} | Name: ${user.Name} | Email: ${user.Email} | Role: ${user.RoleId}`);
    });
    
    if (usersToDelete > 10) {
      console.log(`   ... and ${usersToDelete - 10} more users`);
    }
    
    // Ask for confirmation
    console.log('\n⚠️  WARNING: This will soft-delete all users except ID 1 and ID 100');
    console.log('   Soft delete means users will be marked as deleted but data will be preserved.\n');
    
    // Execute the cleanup
    console.log('🔄 Executing cleanup...');
    const deleteResult = await client.query(
      `UPDATE "Users" 
       SET "IsDeleted" = TRUE, 
           "IsActive" = FALSE, 
           "UpdatedAt" = NOW()
       WHERE "UserId" BETWEEN 2 AND 99 
       AND "IsDeleted" = FALSE
       RETURNING "UserId", "Name"`
    );
    
    const deletedCount = deleteResult.rows.length;
    
    console.log(`\n✅ Cleanup completed!`);
    console.log(`   Deleted: ${deletedCount} users`);
    console.log(`   Kept: ${usersToKeep} users (ID: 1 and ID: 100)\n`);
    
    // Verify final state
    const finalCountResult = await client.query(
      `SELECT COUNT(*) as count FROM "Users" WHERE "IsDeleted" = FALSE`
    );
    const remainingUsers = parseInt(finalCountResult.rows[0].count);
    
    console.log(`📈 Final Statistics:`);
    console.log(`   Active users remaining: ${remainingUsers}`);
    console.log(`   Deleted users: ${deletedCount}\n`);
    
    // Show remaining active users
    const remainingResult = await client.query(
      `SELECT "UserId", "Name", "Email", "RoleId" FROM "Users" WHERE "IsDeleted" = FALSE ORDER BY "UserId"`
    );
    
    console.log('👥 Remaining active users:');
    remainingResult.rows.forEach(user => {
      console.log(`   ID: ${user.UserId} | Name: ${user.Name} | Email: ${user.Email} | Role: ${user.RoleId}`);
    });
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    client.release();
    await appPool.end();
  }
};

// Run if called directly
if (require.main === module) {
  cleanupUsers()
    .then(() => {
      console.log('\n✨ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { cleanupUsers };