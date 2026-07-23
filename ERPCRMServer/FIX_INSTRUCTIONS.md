# 🚨 URGENT FIX INSTRUCTIONS

## Error You're Getting
```
Error during startup: error: column "ModuleId" referenced in foreign key constraint does not exist
PostgreSQL Error Code: 42703
```

## Problem
Your database has the **wrong column names** from old code. The table has `"Id"` but the code expects `"ModuleId"`.

## Quick Fix (Recommended)

### Option 1: Run the Automated Fix Script

1. **Stop your Node.js server** (if running)

2. **Run the fix script:**
   ```bash
   node scripts/fix_database_schema.js
   ```

3. **Start your server again:**
   ```bash
   npm start
   ```

**Done!** Your database will be fixed automatically.

---

### Option 2: Manual Database Fix (If Option 1 Fails)

1. **Connect to your PostgreSQL database:**
   ```bash
   psql -U youruser -d yourdatabase
   ```

2. **Run this SQL:**
   ```sql
   -- Drop dependent tables
   DROP TABLE IF EXISTS "MenuPermissions" CASCADE;
   DROP TABLE IF EXISTS "Menus" CASCADE;
   DROP TABLE IF EXISTS "RolePermissions" CASCADE;
   DROP TABLE IF EXISTS "Permissions" CASCADE;
   
   -- Rename the column
   ALTER TABLE "Modules" RENAME COLUMN "Id" TO "ModuleId";
   
   -- Exit psql
   \q
   ```

3. **Start your Node.js application:**
   ```bash
   npm start
   ```

The app will recreate the dropped tables with the correct schema.

---

### Option 3: Fresh Database (Nuclear Option)

If you don't have important data:

1. **Drop all tables:**
   ```sql
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   GRANT ALL ON SCHEMA public TO postgres;
   GRANT ALL ON SCHEMA public TO public;
   ```

2. **Start your Node.js application:**
   ```bash
   npm start
   ```

All tables will be created fresh with correct schema.

---

## Why This Happened

The old `platformCore.js` file created tables with `"Id"` as primary key:
```sql
CREATE TABLE "Modules" (
  "Id" SERIAL PRIMARY KEY,  -- ❌ WRONG
  ...
)
```

But the RBAC code expects `"ModuleId"`:
```sql
CREATE TABLE "Modules" (
  "ModuleId" SERIAL PRIMARY KEY,  -- ✅ CORRECT
  ...
)
```

## What Was Fixed

1. ✅ Removed duplicate table definitions from `platformCore.js`
2. ✅ RBAC models are now the single source of truth
3. ✅ Created automated fix script
4. ✅ Documented the issue

## Need Help?

Check the detailed report: `docs/SCHEMA_FIX_REPORT.md`
