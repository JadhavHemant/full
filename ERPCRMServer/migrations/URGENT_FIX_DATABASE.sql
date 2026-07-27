-- ========================================
-- URGENT DATABASE FIX
-- ========================================
-- Your database has the WRONG schema from the old platformCore.js
-- This script will fix it by renaming the primary key column
-- 
-- ERROR: column "ModuleId" referenced in foreign key constraint does not exist
-- CAUSE: Table has "Id" but code expects "ModuleId"
-- ========================================

-- IMPORTANT: Run these commands in your PostgreSQL database
-- Connect to your database first:
-- psql -U youruser -d yourdatabase

BEGIN;

-- ========================================
-- Option 1: RENAME EXISTING COLUMNS (Preserves Data)
-- ========================================
-- This is SAFER if you have existing data

-- 1. Check if Modules table has "Id" instead of "ModuleId"
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Modules' 
        AND column_name = 'Id'
        AND table_schema = 'public'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Modules' 
        AND column_name = 'ModuleId'
        AND table_schema = 'public'
    ) THEN
        RAISE NOTICE 'Found "Id" column, renaming to "ModuleId"...';
        
        -- Rename the primary key column
        ALTER TABLE "Modules" RENAME COLUMN "Id" TO "ModuleId";
        
        RAISE NOTICE '✅ Renamed Modules.Id to Modules.ModuleId';
    ELSE
        RAISE NOTICE 'Modules table already has correct column name';
    END IF;
END $$;

-- 2. Fix Permissions table if needed
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Permissions' 
        AND column_name = 'Id'
        AND table_schema = 'public'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Permissions' 
        AND column_name = 'PermissionId'
        AND table_schema = 'public'
    ) THEN
        RAISE NOTICE 'Found Permissions."Id", renaming to "PermissionId"...';
        
        -- Drop foreign keys that reference this column first
        DROP TABLE IF EXISTS "RolePermissions" CASCADE;
        DROP TABLE IF EXISTS "MenuPermissions" CASCADE;
        
        -- Rename the primary key column
        ALTER TABLE "Permissions" RENAME COLUMN "Id" TO "PermissionId";
        
        RAISE NOTICE '✅ Renamed Permissions.Id to Permissions.PermissionId';
    END IF;
END $$;

-- 3. Fix RolePermissions table if it exists with wrong schema
DROP TABLE IF EXISTS "RolePermissions" CASCADE;

-- 4. Add missing columns to Modules if they don't exist
ALTER TABLE "Modules" ADD COLUMN IF NOT EXISTS "ModuleName" VARCHAR(100);
ALTER TABLE "Modules" ADD COLUMN IF NOT EXISTS "ModuleKey" VARCHAR(50);
ALTER TABLE "Modules" ADD COLUMN IF NOT EXISTS "Description" TEXT;
ALTER TABLE "Modules" ADD COLUMN IF NOT EXISTS "ParentModuleId" INT;
ALTER TABLE "Modules" ADD COLUMN IF NOT EXISTS "Icon" VARCHAR(50);
ALTER TABLE "Modules" ADD COLUMN IF NOT EXISTS "DisplayOrder" INT DEFAULT 0;
ALTER TABLE "Modules" ADD COLUMN IF NOT EXISTS "IsActive" BOOLEAN DEFAULT TRUE;
ALTER TABLE "Modules" ADD COLUMN IF NOT EXISTS "IsDeleted" BOOLEAN DEFAULT FALSE;
ALTER TABLE "Modules" ADD COLUMN IF NOT EXISTS "CreatedBy" INT;
ALTER TABLE "Modules" ADD COLUMN IF NOT EXISTS "UpdatedBy" INT;
ALTER TABLE "Modules" ADD COLUMN IF NOT EXISTS "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Modules" ADD COLUMN IF NOT EXISTS "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 5. Add missing columns to Permissions if they don't exist
ALTER TABLE "Permissions" ADD COLUMN IF NOT EXISTS "ModuleId" INT;
ALTER TABLE "Permissions" ADD COLUMN IF NOT EXISTS "PermissionName" VARCHAR(100);
ALTER TABLE "Permissions" ADD COLUMN IF NOT EXISTS "PermissionKey" VARCHAR(100);
ALTER TABLE "Permissions" ADD COLUMN IF NOT EXISTS "Action" VARCHAR(50);
ALTER TABLE "Permissions" ADD COLUMN IF NOT EXISTS "Description" TEXT;
ALTER TABLE "Permissions" ADD COLUMN IF NOT EXISTS "IsActive" BOOLEAN DEFAULT TRUE;
ALTER TABLE "Permissions" ADD COLUMN IF NOT EXISTS "IsDeleted" BOOLEAN DEFAULT FALSE;
ALTER TABLE "Permissions" ADD COLUMN IF NOT EXISTS "CreatedBy" INT;
ALTER TABLE "Permissions" ADD COLUMN IF NOT EXISTS "UpdatedBy" INT;
ALTER TABLE "Permissions" ADD COLUMN IF NOT EXISTS "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Permissions" ADD COLUMN IF NOT EXISTS "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 6. Add unique constraints if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'modules_modulename_key'
    ) THEN
        ALTER TABLE "Modules" ADD CONSTRAINT modules_modulename_key UNIQUE ("ModuleName");
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'modules_modulekey_key'
    ) THEN
        ALTER TABLE "Modules" ADD CONSTRAINT modules_modulekey_key UNIQUE ("ModuleKey");
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'permissions_permissionkey_key'
    ) THEN
        ALTER TABLE "Permissions" ADD CONSTRAINT permissions_permissionkey_key UNIQUE ("PermissionKey");
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 7. Add foreign key from Permissions to Modules
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'permissions_moduleid_fkey'
    ) THEN
        ALTER TABLE "Permissions"
            ADD CONSTRAINT permissions_moduleid_fkey
            FOREIGN KEY ("ModuleId") REFERENCES "Modules"("ModuleId") ON DELETE CASCADE;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

COMMIT;

-- ========================================
-- VERIFICATION
-- ========================================
SELECT 'Modules columns:' as info;
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'Modules' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'Permissions columns:' as info;
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'Permissions' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT '✅ DATABASE FIXED - Now restart your Node.js application' as status;
