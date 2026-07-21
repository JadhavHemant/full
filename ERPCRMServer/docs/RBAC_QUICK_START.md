# RBAC Quick Start Guide

## 5-Minute Setup

### Step 1: Run the Migration (1 minute)

```bash
# Navigate to the server directory
cd ERPCRMServer

# Run the seeder script to create all 20 roles
node scripts/seedRoles.js
```

Expected output:
```
🌱 Starting role seeding...

✓ Super Admin (ID: 1)
✓ Company Admin (ID: 2)
✓ Branch Manager (ID: 3)
...
✓ Employee (ID: 20)

✅ Role seeding completed!
   Inserted: 20 roles
   Total: 20 roles

✨ Done!
```

### Step 2: Verify Database (1 minute)

```bash
# Connect to your database
psql -U your_username -d your_database

# Check roles
SELECT "Id", "RoleName", "IsActive" FROM "Roles" ORDER BY "Id" ASC;

# Check audit logs table exists
\d "AuditLogs"
```

### Step 3: Start the Server (1 minute)

```bash
# In the ERPCRMServer directory
npm start
```

The RBAC middleware is automatically applied to all `/api/*` routes.

### Step 4: Test the System (2 minutes)

#### Test 1: Get All Roles
```bash
curl -X GET http://localhost:5351/api/roles \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Expected: Array of 20 roles

#### Test 2: Get Role Permissions
```bash
curl -X GET http://localhost:5351/api/roles/1/permissions \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Expected: JSON object with all modules and permissions set to `true` for Super Admin

#### Test 3: Update Role Permissions
```bash
curl -X POST http://localhost:5351/api/roles/3/permissions \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dashboard": {"view": true, "export": true},
    "users": {"view": true, "edit": true}
  }'
```

Expected: Success message with updated permissions

#### Test 4: Get Audit Logs
```bash
curl -X GET "http://localhost:5351/api/audit-logs?limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Expected: Array of recent audit log entries

### Step 5: Access Frontend (Optional)

Navigate to the Role Access page in your frontend:
```
http://localhost:5173/admin/roles
```

You should see:
- 20 role buttons at the top
- Permission matrix with 35 modules
- 5 action columns (View, Create, Edit, Delete, Export)
- Select All / Deselect All buttons

## Common Tasks

### Assign a Role to a User

```sql
-- Update user's role
UPDATE "Users" 
SET "RoleId" = 3  -- Branch Manager
WHERE "UserId" = 123;
```

### Check User's Permissions

```bash
# Get user's role
curl -X GET http://localhost:5351/api/users/123 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Get role permissions
curl -X GET http://localhost:5351/api/roles/3/permissions \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### View Audit Trail

```bash
# Get all audit logs for a specific user
curl -X GET "http://localhost:5351/api/audit-logs?userId=5&limit=50" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Get audit logs for role changes
curl -X GET "http://localhost:5351/api/audit-logs?entityType=RolePermissions" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Get audit statistics
curl -X GET http://localhost:5351/api/audit-logs/stats/summary \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Reset All Roles to Default

```bash
# WARNING: This will overwrite all custom role configurations!
node scripts/seedRoles.js
```

### Cleanup Old Audit Logs

```bash
# Delete logs older than 90 days
curl -X DELETE "http://localhost:5351/api/audit-logs/cleanup?days=90" \
  -H "Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN"
```

## Role Assignment Cheat Sheet

| Role | ID | Use Case |
|------|-----|----------|
| Super Admin | 1 | IT administrators, system owners |
| Company Admin | 2 | Company owners, managing directors |
| Branch Manager | 3 | Branch heads, regional managers |
| Inventory Manager | 4 | Warehouse managers, inventory controllers |
| Store Keeper | 5 | Warehouse staff, stock handlers |
| Purchase Manager | 6 | Procurement managers |
| Purchase Executive | 7 | Purchase officers, buyers |
| Sales Manager | 8 | Sales heads, regional sales managers |
| Sales Executive | 9 | Sales representatives |
| Production Manager | 10 | Production heads, manufacturing managers |
| Production Supervisor | 11 | Floor supervisors, shift leads |
| Production Operator | 12 | Machine operators, production staff |
| Quality Manager | 13 | QA/QC managers |
| Quality Inspector | 14 | QA/QC inspectors |
| Finance Manager | 15 | Finance heads, CFOs |
| Accountant | 16 | Accountants, bookkeepers |
| CRM Manager | 17 | CRM managers, customer success managers |
| CRM Executive | 18 | Sales development reps, customer service |
| HR Manager | 19 | HR managers, HR business partners |
| Employee | 20 | General employees, staff |

## Permission Testing

### Test if a User Can Access a Module

```bash
# Replace with actual user token
USER_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Test accessing products (requires 'products' module 'view' permission)
curl -X GET http://localhost:5351/api/products \
  -H "Authorization: Bearer $USER_TOKEN"

# Expected responses:
# - 200 OK: User has permission
# - 403 Forbidden: User lacks permission
```

### Test Different HTTP Methods

```bash
# GET = view permission
curl -X GET http://localhost:5351/api/products \
  -H "Authorization: Bearer $USER_TOKEN"

# POST = create permission
curl -X POST http://localhost:5351/api/products \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Product"}'

# PUT = edit permission
curl -X PUT http://localhost:5351/api/products/123 \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Product"}'

# DELETE = delete permission
curl -X DELETE http://localhost:5351/api/products/123 \
  -H "Authorization: Bearer $USER_TOKEN"
```

## Troubleshooting

### Problem: "Forbidden: No role assigned"

**Solution**: Assign a role to the user
```sql
UPDATE "Users" SET "RoleId" = 3 WHERE "UserId" = 123;
```

### Problem: "Forbidden: No permissions for module 'products'"

**Solution**: Grant permissions to the role
```bash
curl -X POST http://localhost:5351/api/roles/3/permissions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"products": {"view": true, "create": true, "edit": true, "delete": true}}'
```

### Problem: "Forbidden: Role not found"

**Solution**: Check if role exists
```sql
SELECT * FROM "Roles" WHERE "Id" = 3;
```

If not found, re-run the seeder:
```bash
node scripts/seedRoles.js
```

### Problem: Audit logs table doesn't exist

**Solution**: Run the migration
```bash
psql -U your_username -d your_database -f migrations/002_rbac_roles_and_permissions.sql
```

## Next Steps

1. **Customize Roles**: Adjust permissions via the frontend Role Access page
2. **Assign Users**: Assign appropriate roles to your users
3. **Monitor Access**: Regularly review audit logs
4. **Set Cleanup**: Schedule periodic audit log cleanup
5. **Train Users**: Educate users about their role capabilities

## Useful SQL Queries

### List All Users with Their Roles
```sql
SELECT 
  u."UserId",
  u."Name",
  u."Email",
  r."RoleName",
  r."Id" as "RoleId"
FROM "Users" u
LEFT JOIN "Roles" r ON u."RoleId" = r."Id"
WHERE u."IsDeleted" = FALSE
ORDER BY r."Id", u."Name";
```

### Find Users with Specific Role
```sql
SELECT u."UserId", u."Name", u."Email"
FROM "Users" u
JOIN "Roles" r ON u."RoleId" = r."Id"
WHERE r."RoleName" = 'Sales Manager'
  AND u."IsDeleted" = FALSE;
```

### Check Role Permissions
```sql
SELECT 
  "Id",
  "RoleName",
  jsonb_pretty("Permissions") as "Permissions"
FROM "Roles"
WHERE "Id" = 3;
```

### Recent Permission Changes
```sql
SELECT 
  al."CreatedAt",
  u."Name" as "User",
  r."RoleName",
  al."Action",
  al."EntityType",
  al."EntityId"
FROM "AuditLogs" al
LEFT JOIN "Users" u ON al."UserId" = u."UserId"
LEFT JOIN "Roles" r ON al."RoleId" = r."Id"
WHERE al."EntityType" = 'RolePermissions'
ORDER BY al."CreatedAt" DESC
LIMIT 20;
```

## Support

- Full Documentation: See `RBAC_SETUP.md`
- Issues: Check server logs for detailed error messages
- Database Issues: Review migration SQL files

## Success Checklist

- [ ] Migration ran successfully
- [ ] 20 roles visible in database
- [ ] Server starts without errors
- [ ] Can fetch roles via API
- [ ] Can update role permissions
- [ ] Audit logs are being created
- [ ] Frontend Role Access page loads
- [ ] Users can be assigned roles
- [ ] Permissions are enforced (test with different roles)

Congratulations! Your RBAC system is now fully operational.