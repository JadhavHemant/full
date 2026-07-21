/**
 * Migration: Add Probability column to SalesStages table
 * Run this migration to add the Probability column for opportunity automation.
 */

const { appPool } = require('../config/db');

const migrate = async () => {
  try {
    console.log('🔄 Running migration: addSalesStageProbability...');

    // Add Probability column if it doesn't exist
    await appPool.query(`
      ALTER TABLE "SalesStages" 
      ADD COLUMN IF NOT EXISTS "Probability" NUMERIC(5,2)
    `);

    console.log('✅ Added Probability column to SalesStages');

    // Seed default probabilities for Won/Lost stages
    await appPool.query(`
      UPDATE "SalesStages" 
      SET "Probability" = 100 
      WHERE "IsWon" = TRUE AND "Probability" IS NULL
    `);

    await appPool.query(`
      UPDATE "SalesStages" 
      SET "Probability" = 0 
      WHERE "IsLost" = TRUE AND "Probability" IS NULL
    `);

    console.log('✅ Seeded default probabilities for Won/Lost stages');
    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

// Run migration if called directly
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('✅ Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrate };