const { Pool } = require("pg");
require("dotenv").config();

const {
  NODE_ENV,
  LOCAL_DB_NAME,
  LOCAL_DB_USER,
  LOCAL_DB_PASSWORD,
  LOCAL_DB_HOST,
  REMOTE_DB_NAME,
  REMOTE_DB_USER,
  REMOTE_DB_PASSWORD,
  REMOTE_DB_HOST,
  DATABASE_URL,
} = process.env;

const cleanEnvValue = (value) => {
  if (typeof value !== "string") return value;
  return value.split("#")[0].trim();
};

const ensureString = (value, defaultValue = "") => {
  if (value === null || value === undefined) return defaultValue;
  return String(value);
};

const safeLocalDbName = cleanEnvValue(LOCAL_DB_NAME);
const safeLocalDbUser = cleanEnvValue(LOCAL_DB_USER);
const safeLocalDbPassword = cleanEnvValue(LOCAL_DB_PASSWORD);
const safeLocalDbHost = cleanEnvValue(LOCAL_DB_HOST);
const safeRemoteDbName = cleanEnvValue(REMOTE_DB_NAME);
const safeRemoteDbUser = cleanEnvValue(REMOTE_DB_USER);
const safeRemoteDbPassword = cleanEnvValue(REMOTE_DB_PASSWORD);
const safeRemoteDbHost = cleanEnvValue(REMOTE_DB_HOST);
const safeDatabaseUrl = cleanEnvValue(DATABASE_URL);

const isProd = NODE_ENV === "production";
const useRemoteConnection = isProd || Boolean(safeDatabaseUrl);

// Validate database configuration
if (!safeDatabaseUrl && useRemoteConnection) {
  if (!safeRemoteDbHost || !safeRemoteDbName || !safeRemoteDbUser) {
    throw new Error("Remote database configuration is incomplete. Required: HOST, NAME, USER");
  }
  if (!safeRemoteDbPassword) {
    throw new Error("Remote database password is missing or invalid");
  }
}

if (!safeDatabaseUrl && !useRemoteConnection) {
  if (!safeLocalDbHost || !safeLocalDbName || !safeLocalDbUser) {
    console.warn("⚠️ Local database configuration incomplete. Using defaults.");
  }
  if (!safeLocalDbPassword) {
    console.warn("⚠️ Local database password missing. Using empty string.");
  }
}

const connectionConfig = safeDatabaseUrl
  ? {
      connectionString: safeDatabaseUrl,
      ssl: isProd ? { rejectUnauthorized: true } : { rejectUnauthorized: false },
    }
  : {
      user: useRemoteConnection ? safeRemoteDbUser : safeLocalDbUser,
      host: useRemoteConnection ? safeRemoteDbHost : safeLocalDbHost,
      password: ensureString(useRemoteConnection ? safeRemoteDbPassword : safeLocalDbPassword),
      database: useRemoteConnection ? safeRemoteDbName : safeLocalDbName,
      ssl: useRemoteConnection ? (isProd ? { rejectUnauthorized: true } : { rejectUnauthorized: false }) : false,
    };

const appPool = new Pool(connectionConfig);

let pool = null;
const getPool = () => {
  if (!pool) {
    pool = new Pool(
      safeDatabaseUrl
        ? {
            connectionString: safeDatabaseUrl,
            ssl: { rejectUnauthorized: false },
          }
        : connectionConfig
    );
  }
  return pool;
};

const ensureDatabaseExists = async () => {
  if (useRemoteConnection) return;

  const defaultPool = new Pool({
    user: safeLocalDbUser,
    host: safeLocalDbHost,
    password: ensureString(safeLocalDbPassword),
    database: "postgres",
  });

  try {
    const result = await defaultPool.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [
      safeLocalDbName,
    ]);
    if (result.rowCount === 0) {
      await defaultPool.query(`CREATE DATABASE "${safeLocalDbName}"`);
      console.log(`Database '${safeLocalDbName}' created.`);
    } else {
      console.log(`Database '${safeLocalDbName}' already exists.`);
    }
  } catch (err) {
    console.error("Error checking/creating database:", err);
  } finally {
    await defaultPool.end();
  }
};

module.exports = {
  appPool,
  ensureDatabaseExists,
  getPool,
};
