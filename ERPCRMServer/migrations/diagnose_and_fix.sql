-- ========================================
-- EMERGENCY FIX: Check and Repair Modules Table
-- ========================================
-- Run this in your PostgreSQL database to diagnose and fix the issue

-- STEP 1: Check what columns actually exist in Modules table
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'Modules'
ORDER BY ordinal_position;

-- STEP 2: Check what the primary key is actually named
SELECT
    kcu.column_name,
    tc.constraint_type
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
    AND tc.table_name = 'Modules'
    AND tc.constraint_type = 'PRIMARY KEY';

-- STEP 3: List all constraints on Modules table
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = '"Modules"'::regclass;
