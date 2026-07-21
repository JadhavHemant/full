-- Cleanup Users Script
-- Deletes all users except UserId = 1 and UserId = 100
-- Keeps only the first two users (Super Admin and one other)

-- First, let's see what will be deleted (preview)
SELECT 
  'Users to be deleted:' as info,
  COUNT(*) as count
FROM "Users"
WHERE "UserId" NOT IN (1, 100);

-- Show users that will be kept
SELECT 
  'Users to be kept:' as info,
  "UserId",
  "Name",
  "Email",
  "RoleId"
FROM "Users"
WHERE "UserId" IN (1, 100)
ORDER BY "UserId";

-- Show users that will be deleted
SELECT 
  'Users to be deleted:' as info,
  "UserId",
  "Name",
  "Email",
  "RoleId"
FROM "Users"
WHERE "UserId" NOT IN (1, 100)
ORDER BY "UserId";

-- IMPORTANT: Backup before running the DELETE statement
-- Run this only after verifying the preview above

-- Delete users with IDs 2-99 (keep only 1 and 100)
-- Using soft delete (IsDeleted = TRUE) to maintain referential integrity
UPDATE "Users" 
SET 
  "IsDeleted" = TRUE,
  "IsActive" = FALSE,
  "UpdatedAt" = NOW()
WHERE "UserId" BETWEEN 2 AND 99;

-- Verify the deletion
SELECT 
  'Remaining active users:' as info,
  COUNT(*) as count
FROM "Users"
WHERE "IsDeleted" = FALSE;

-- Show final user list
SELECT 
  "UserId",
  "Name",
  "Email",
  "RoleId",
  "IsActive",
  "IsDeleted"
FROM "Users"
ORDER BY "UserId"
LIMIT 10;