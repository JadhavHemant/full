/**
 * Schema Ensurer - Called once at server startup to ensure RBAC columns exist
 * 
 * This is a lightweight, non-destructive check that runs inline (not async deferred)
 * to ensure the database pool is never closed.
 * 
 * Usage: Called from server.js during startup
 */

const { appPool } = require('../config/db');

const ensureRbacSchema = async () => {
  let client;
  try {
    client = await appPool.connect();
    
    // Add Permissions column if missing (safe - uses IF NOT EXISTS)
    await client.query(`
      ALTER TABLE "Roles" 
      ADD COLUMN IF NOT EXISTS "Permissions" JSONB DEFAULT '{}'
    `);
    
    // Add IsDeleted column if missing
    await client.query(`
      ALTER TABLE "Roles" 
      ADD COLUMN IF NOT EXISTS "IsDeleted" BOOLEAN DEFAULT FALSE
    `);
    
    // Add UpdatedAt column if missing
    await client.query(`
      ALTER TABLE "Roles" 
      ADD COLUMN IF NOT EXISTS "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);
    
    console.log('✅ RBAC columns verified');
    return true;
  } catch (error) {
    console.error('⚠️  RBAC column check failed:', error.message);
    return false;
  } finally {
    if (client) {
      client.release(); // Only release client, NEVER close pool
    }
  }
};

module.exports = { ensureRbacSchema };