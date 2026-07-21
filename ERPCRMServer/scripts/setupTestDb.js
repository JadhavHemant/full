const { Pool } = require('pg');

const setup = async () => {
  const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    password: '@vedika',
    database: 'postgres',
  });

  try {
    const result = await pool.query('SELECT 1 FROM pg_database WHERE datname = $1', ['erptestingdatabase_test']);
    if (result.rowCount === 0) {
      await pool.query('CREATE DATABASE "erptestingdatabase_test"');
      console.log('✅ Test database created: erptestingdatabase_test');
    } else {
      console.log('✅ Test database already exists: erptestingdatabase_test');
    }
  } catch (err) {
    console.error('❌ Error creating test database:', err.message);
  } finally {
    await pool.end();
  }
};

setup();