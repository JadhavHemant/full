/**
 * Script to delete all CRM data from the database
 * Run with: node scripts/cleanupCrmData.js
 */

const { appPool } = require('../config/db');

const cleanupCRM = async () => {
  const client = await appPool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🗑️  Starting CRM data cleanup...\n');
    
    // Delete in order respecting foreign key constraints
    const deleteQueries = [
      { table: 'Comments', sql: 'DELETE FROM "Comments" WHERE "EntityType" IN (\'lead\', \'opportunity\', \'case\', \'account\', \'contact\', \'presale\', \'quote\', \'invoice\', \'payment\', \'retention\')' },
      { table: 'PresalesAssignments', sql: 'DELETE FROM "PresalesAssignments"' },
      { table: 'OpportunityProducts', sql: 'DELETE FROM "OpportunityProducts"' },
      { table: 'Cases', sql: 'DELETE FROM "Cases"' },
      { table: 'Activities', sql: 'DELETE FROM "Activities"' },
      { table: 'Presales', sql: 'DELETE FROM "Presales"' },
      { table: 'Payments', sql: 'DELETE FROM "Payments"' },
      { table: 'Invoices', sql: 'DELETE FROM "Invoices"' },
      { table: 'Quotes', sql: 'DELETE FROM "Quotes"' },
      { table: 'Opportunities', sql: 'DELETE FROM "Opportunities"' },
      { table: 'Leads', sql: 'DELETE FROM "Leads"' },
      { table: 'Contacts', sql: 'DELETE FROM "Contacts"' },
      { table: 'Accounts', sql: 'DELETE FROM "Accounts"' },
    ];
    
    for (const { table, sql } of deleteQueries) {
      const result = await client.query(sql);
      const count = result.rowCount;
      console.log(`✅ Deleted ${count} records from ${table}`);
    }
    
    await client.query('COMMIT');
    console.log('\n✨ CRM data cleanup completed successfully!');
    console.log('📊 All CRM records have been deleted.');
    console.log('🔒 Delete functionality is now disabled in the application.');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error during CRM cleanup:', error);
    process.exit(1);
  } finally {
    client.release();
    await appPool.end();
  }
};

cleanupCRM();