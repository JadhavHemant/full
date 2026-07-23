-- ========================================
-- DATABASE SCHEMA CONFLICT FIX
-- ========================================
-- This script fixes foreign key reference errors caused by
-- conflicting table definitions in platformCore.js
-- 
-- Error: column "ModuleId" referenced in foreign key constraint does not exist
-- PostgreSQL Error Code: 42703
--
-- Root Cause: platformCore.js was creating duplicate table definitions
-- with different primary key names (Id vs ModuleId/PermissionId)
-- ========================================

-- Step 1: Check current table structure
-- Run these to verify your current schema before making changes:

SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name IN ('Modules', 'Permissions', 'RolePermissions')
  AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Step 2: Check existing constraints
SELECT
    conname as constraint_name,
    conrelid::regclass as table_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid IN (
    '"Modules"'::regclass,
    '"Permissions"'::regclass,
    '"RolePermissions"'::regclass
)
ORDER BY table_name, constraint_name;

-- ========================================
-- VERIFICATION ONLY - NO CHANGES NEEDED
-- ========================================
-- The Node.js model files have been corrected.
-- If you have an existing database that was created with the
-- conflicting platformCore.js definitions, you may need to
-- recreate the affected tables.
--
-- The correct schema is:
--
-- Modules Table:
--   Primary Key: "ModuleId" (SERIAL)
--   Self-referencing FK: "ParentModuleId" REFERENCES "Modules"("ModuleId")
--
-- Permissions Table:
--   Primary Key: "PermissionId" (SERIAL)
--   Foreign Key: "ModuleId" REFERENCES "Modules"("ModuleId")
--
-- RolePermissions Table:
--   Primary Key: "RolePermissionId" (SERIAL)
--   Foreign Key: "RoleId" REFERENCES "Roles"("Id")
--   Foreign Key: "PermissionId" REFERENCES "Permissions"("PermissionId")
--
-- ========================================
-- RECOVERY STEPS (If you have bad data):
-- ========================================
-- 1. Backup your data:
--    pg_dump -h localhost -U youruser -d yourdb -t '"Modules"' > modules_backup.sql
--    pg_dump -h localhost -U youruser -d yourdb -t '"Permissions"' > permissions_backup.sql
--    pg_dump -h localhost -U youruser -d yourdb -t '"RolePermissions"' > rolepermissions_backup.sql
--
-- 2. Drop affected tables (in correct order due to dependencies):
--    DROP TABLE IF EXISTS "MenuPermissions" CASCADE;
--    DROP TABLE IF EXISTS "Menus" CASCADE;
--    DROP TABLE IF EXISTS "RolePermissions" CASCADE;
--    DROP TABLE IF EXISTS "Permissions" CASCADE;
--    DROP TABLE IF EXISTS "Modules" CASCADE;
--
-- 3. Restart your Node.js application
--    The corrected model files will recreate tables with proper schema
--
-- 4. Restore your data (adjust column names if needed)
-- ========================================
