const { appPool } = require('./config/db');

(async () => {
  try {
    console.log('Adding missing Jti column to refresh_tokens...');
    
    // Add Jti column
    await appPool.query('ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS "Jti" VARCHAR(255)');
    console.log('✅ Jti column added (or already exists)');
    
    // Create unique constraint on Jti (allowing NULLs for backward compatibility)
    try {
      await appPool.query('CREATE UNIQUE INDEX idx_refresh_tokens_jti_unique ON refresh_tokens("Jti") WHERE "Jti" IS NOT NULL');
      console.log('✅ Unique index on Jti created');
    } catch (e) {
      if (e.code === '42P07') {
        console.log('⚠️  Unique index already exists');
      }
    }
    
    // Create regular index on Jti for searches
    await appPool.query('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_jti ON refresh_tokens("Jti")');
    console.log('✅ Index on Jti created (or already exists)');
    
    // Verify all columns
    const result = await appPool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'refresh_tokens'
      ORDER BY ordinal_position
    `);
    
    console.log('\n✅ Current refresh_tokens columns:');
    result.rows.forEach(row => {
      console.log(`   - ${row.column_name}`);
    });
    
    const hasJti = result.rows.some(r => r.column_name === 'Jti');
    const hasTokenHash = result.rows.some(r => r.column_name === 'TokenHash');
    const hasRevoked = result.rows.some(r => r.column_name === 'Revoked');
    
    console.log('\n🔍 Required columns status:');
    console.log(`   Jti: ${hasJti ? '✅' : '❌'}`);
    console.log(`   TokenHash: ${hasTokenHash ? '✅' : '❌'}`);
    console.log(`   Revoked: ${hasRevoked ? '✅' : '❌'}`);
    
    if (hasJti && hasTokenHash && hasRevoked) {
      console.log('\n✅ All required columns present for token rotation!');
      process.exit(0);
    } else {
      console.log('\n❌ Missing required columns!');
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    await appPool.end();
  }
})();
