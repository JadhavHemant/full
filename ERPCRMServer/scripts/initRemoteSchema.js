process.env.NODE_ENV = 'production';
require('dotenv').config();

const { ensureDatabaseExists, appPool } = require('../config/db');
const { initModels } = require('../Models/initModels');

async function main() {
  try {
    await ensureDatabaseExists();
    await initModels();
    console.log('Remote schema initialized.');
  } finally {
    await appPool.end();
  }
}

main().catch((error) => {
  console.error('Remote schema initialization failed:', error.message);
  process.exit(1);
});
