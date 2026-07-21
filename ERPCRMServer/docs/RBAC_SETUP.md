# ERP Role-Based Access Control (RBAC) System

## Overview

This document describes the comprehensive RBAC system implemented for the ERP application. The system provides fine-grained access control with 20 predefined roles, each with specific permissions across all modules.

## Architecture

### Database Schema

#### Roles Table
```sql
CREATE TABLE "Roles" (
  "Id" SERIAL PRIMARY KEY,
  "RoleName" VARCHAR(100) UNIQUE NOT NULL,
  "IsActive" BOOLEAN DEFAULT TRUE,
  "IsDeleted" BOOLEAN DEFAULT FALSE,
  "Permissions" JSONB DEFAULT '{}',
  "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### AuditLogs Table
```sql
CREATE TABLE "AuditLogs" (
  "Id" SERIAL PRIMARY KEY,
  "UserId" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
  "RoleId" INT REFERENCES "Roles"("Id") ON DELETE SET NULL,
  "Action" VARCHAR(100) NOT NULL,
  "EntityType" VARCHAR(100) NOT NULL,
  "EntityId" INT,
  "OldValue" JSONB,
  "NewValue" JSONB,
  "IpAddress" VARCHAR(64),
  "UserAgent" TEXT,
  "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 20 Predefined Roles

### 1. Super Admin (ID: 1)
**Full system access - bypasses all permission checks**

- All modules: Full CRUD + Export
- Can create/delete companies
- Can manage all users and roles
- Can access audit logs
- Can backup/restore database

### 2. Company Admin (ID: 2)
**Manage one company with full access**

- Users: Full CRUD
- Products, Inventory, Purchase, Sales: Full CRUD
- Reports: Company-level access
- Settings: View only (cannot modify system settings)
- Cannot create new companies
- Cannot access other company data

### 3. Branch Manager (ID: 3)
**Manage branch operations**

- Users: View + Edit (branch employees)
- Inventory: Full CRUD
- Purchase Orders: Full CRUD
- Sales Orders: Full CRUD
- Approvals: Can approve branch transactions
- Cannot access other branches
- Cannot modify company settings

### 4. Inventory Manager (ID: 4)
**Manage inventory operations**

- Products: Full CRUD
- Warehouses: Full CRUD
- Stock: Full CRUD
- Stock Movements: Full CRUD
- Suppliers: Full CRUD
- Reports: View inventory reports
- Cannot access finance module
- Cannot delete approved transactions

### 5. Store Keeper (ID: 5)
**Warehouse operations**

- Products: View only
- Stock: Create + Edit (receive/issue materials)
- Stock Movements: View + Create
- Warehouses: View only
- No approval rights
- No delete rights

### 6. Purchase Manager (ID: 6)
**Manage purchase operations**

- Products: Full CRUD
- Suppliers: Full CRUD
- Purchase Orders: Full CRUD
- Purchase Requisitions: Full CRUD
- Approvals: Can approve purchase orders
- Reports: View purchase reports
- Cannot access financial settings

### 7. Purchase Executive (ID: 7)
**Create purchase requests and orders**

- Products: Full CRUD
- Suppliers: Full CRUD
- Purchase Orders: Create + Edit (cannot approve)
- Purchase Requisitions: Full CRUD
- Cannot approve purchase orders
- Cannot delete approved orders

### 8. Sales Manager (ID: 8)
**Manage sales operations**

- Sales Orders: Full CRUD
- Sales Quotations: Full CRUD
- Customers: Full CRUD
- Approvals: Can approve sales orders
- Reports: View sales reports
- Cannot modify finance settings

### 9. Sales Executive (ID: 9)
**Create sales orders and quotations**

- Sales Orders: Create + Edit
- Sales Quotations: Full CRUD
- Customers: Full CRUD
- Cannot approve orders
- Cannot delete approved orders

### 10. Production Manager (ID: 10)
**Manage production operations**

- BOM: Full CRUD
- Production Orders: Full CRUD
- Products: Full CRUD
- Approvals: Can approve production
- Reports: View production reports
- Cannot access financial data

### 11. Production Supervisor (ID: 11)
**Supervise production**

- BOM: View + Edit
- Production Orders: View + Edit
- Products: View only
- Cannot approve production orders
- Can update production status

### 12. Production Operator (ID: 12)
**Execute production tasks**

- Production Orders: View + Edit (update progress)
- BOM: View only
- Products: View only
- No create/edit/delete rights for main records

### 13. Quality Manager (ID: 13)
**Manage quality control**

- Products: Full CRUD
- BOM: View only
- Production Orders: View only
- Approvals: Can approve inspection reports
- Can reject materials
- Reports: View quality reports

### 14. Quality Inspector (ID: 14)
**Perform inspections**

- Products: View only
- BOM: View only
- Production Orders: View only
- Can perform inspections
- Can submit inspection reports
- Cannot approve final quality reports

### 15. Finance Manager (ID: 15)
**Manage financial operations**

- Expenses: Full CRUD
- Approvals: Can approve expenses
- Reports: Full access (GST, P&L, Financial)
- Can manage payments and receipts
- View all financial data

### 16. Accountant (ID: 16)
**Handle accounting tasks**

- Expenses: Create + Edit
- Invoices: Create
- Payments: Record
- Reports: View financial reports
- Cannot approve payments above limit

### 17. CRM Manager (ID: 17)
**Manage CRM operations**

- Accounts: Full CRUD
- Contacts: Full CRUD
- Leads: Full CRUD
- Opportunities: Full CRUD
- Presales: Full CRUD
- Cases: Full CRUD
- Reports: View CRM reports
- Can assign leads

### 18. CRM Executive (ID: 18)
**Execute CRM tasks**

- Accounts: Full CRUD
- Contacts: Full CRUD
- Leads: Full CRUD
- Opportunities: Full CRUD
- Presales: Full CRUD
- Cases: Full CRUD
- Cannot delete leads
- Cannot assign leads

### 19. HR Manager (ID: 19)
**Manage human resources**

- Users: View + Create + Edit (HR functions)
- Roles: View only
- Reports: View HR reports (attendance, payroll)
- Leave approvals
- Cannot access other employee data

### 20. Employee (ID: 20)
**Basic employee access**

- Dashboard: View own dashboard
- Chat: View only
- Can view own profile
- Can apply for leave
- Can view own attendance
- Cannot access other employee data

## Permission Structure

### Modules
The system has 35 modules:
- `dashboard` - Dashboard access
- `users` - User management
- `roles` - Role management
- `companies` - Company management
- `products` - Product management
- `categories` - Product categories
- `units` - Units of measurement
- `warehouses` - Warehouse management
- `stock` - Product stock
- `stockMovements` - Stock movements
- `suppliers` - Supplier management
- `purchaseOrders` - Purchase orders
- `purchaseRequisitions` - Purchase requisitions
- `purchaseReturns` - Purchase returns
- `salesOrders` - Sales orders
- `salesQuotations` - Sales quotations
- `deliveryChallans` - Delivery challans
- `salesReturns` - Sales returns
- `customers` - Customer management
- `brands` - Brand management
- `bom` - Bill of materials
- `productionOrders` - Production orders
- `expenses` - Expense management
- `approvals` - Approval workflows
- `dataImportExport` - Data import/export
- `racks` - Warehouse racks
- `bins` - Warehouse bins
- `accounts` - CRM accounts
- `contacts` - CRM contacts
- `leads` - CRM leads
- `opportunities` - CRM opportunities
- `presales` - CRM presales
- `cases` - CRM cases
- `reports` - Reports
- `settings` - System settings
- `chat` - Chat functionality

### Actions
Each module can have 5 actions:
- `view` - View/read records
- `create` - Add new records
- `edit` - Update existing records
- `delete` - Remove records
- `export` - Download/export data

## Setup Instructions

### 1. Run Database Migration

Execute the migration SQL file to create/update the database schema:

```bash
# Using psql
psql -U your_username -d your_database -f ERPCRMServer/migrations/002_rbac_roles_and_permissions.sql

# Or using the seeder script
node ERPCRMServer/scripts/seedRoles.js
```

### 2. Verify Roles

Check that all 20 roles were created:

```bash
# Query to verify
SELECT "Id", "RoleName", "IsActive" FROM "Roles" ORDER BY "Id" ASC;
```

Expected output: 20 rows with IDs 1-20

### 3. Restart Server

The RBAC middleware is automatically applied to all `/api/*` routes on server startup.

```bash
cd ERPCRMServer
npm start
```

## API Endpoints

### Role Management

```
GET    /api/roles                    - Get all roles
GET    /api/roles/:roleId/permissions - Get role permissions
POST   /api/roles/:roleId/permissions - Save role permissions
POST   /api/roles/create             - Create new role
PUT    /api/roles/:id                - Update role
DELETE /api/roles/:id                - Delete role (soft delete)
```

### Audit Logs

```
GET    /api/audit-logs               - Get audit logs (with filters)
GET    /api/audit-logs/:id           - Get specific audit log
GET    /api/audit-logs/stats/summary - Get audit statistics
DELETE /api/audit-logs/cleanup       - Cleanup old logs (Super Admin only)
```

### Audit Log Query Parameters

- `userId` - Filter by user ID
- `roleId` - Filter by role ID
- `entityType` - Filter by entity type (Role, RolePermissions, etc.)
- `action` - Filter by action (CREATE, UPDATE, DELETE)
- `startDate` - Filter from date (YYYY-MM-DD)
- `endDate` - Filter to date (YYYY-MM-DD)
- `limit` - Number of records (default: 100)
- `offset` - Pagination offset (default: 0)

## Frontend Integration

### Role Access Component

The frontend RoleAccess component (`clientui/src/Components/AdminSite/RoleAccess/RoleAccess.jsx`) provides:

1. **Role Selection** - Choose from 20 predefined roles
2. **Permission Matrix** - Visual grid showing all modules and actions
3. **Bulk Actions** - Select All / Deselect All for entire role or per module
4. **Save Permissions** - Updates role permissions in real-time
5. **Audit Trail** - All changes are logged automatically

### Usage

```jsx
import RoleAccess from './Components/AdminSite/RoleAccess/RoleAccess';

// In your router
<Route path="/admin/roles" component={RoleAccess} />
```

## Middleware Behavior

### RBAC Middleware Flow

1. **Excluded Paths** - Skip RBAC for public endpoints:
   - `/api/users/login`
   - `/api/users/register`
   - `/api/users/forgot-password`
   - `/api/users/reset-password`
   - `/api/users/register/send-otp`
   - `/api/health`
   - `/metrics`
   - `/uploads`

2. **Super Admin Bypass** - Role ID = 1 bypasses all checks

3. **Module Detection** - Maps URL path to module key

4. **Action Detection** - Maps HTTP method to action:
   - GET → `view`
   - POST → `create`
   - PUT/PATCH → `edit`
   - DELETE → `delete`
   - Special: `/api/utils/export` → `export`

5. **Permission Check** - Validates user's role has required permission

### URL to Module Mapping

The middleware automatically maps API endpoints to modules:

```javascript
'/api/products' → 'products'
'/api/users' → 'users'
'/api/roles' → 'roles'
'/api/crm/leads' → 'leads'
'/api/erp/purchase-orders' → 'purchaseOrders'
// ... etc
```

## Audit Logging

All RBAC changes are automatically logged:

### Tracked Actions
- `CREATE` - New role created
- `UPDATE` - Role or permissions modified
- `DELETE` - Role deleted

### Logged Information
- User ID and name
- Role ID and name
- Action performed
- Entity type and ID
- Old and new values (JSON)
- IP address
- User agent
- Timestamp

### Example Audit Log Entry

```json
{
  "UserId": 5,
  "UserName": "John Doe",
  "RoleId": 1,
  "RoleName": "Super Admin",
  "Action": "UPDATE",
  "EntityType": "RolePermissions",
  "EntityId": 3,
  "OldValue": {"dashboard": {"view": true}},
  "NewValue": {"dashboard": {"view": true, "export": true}},
  "IpAddress": "192.168.1.100",
  "UserAgent": "Mozilla/5.0...",
  "CreatedAt": "2026-06-17T21:30:00.000Z"
}
```

## Security Considerations

1. **Super Admin Protection** - Only Super Admin can:
   - Create/delete companies
   - Manage all roles
   - Access audit logs
   - Cleanup audit logs

2. **Role-Based Restrictions** - Each role has explicit restrictions:
   - Cannot access other company data
   - Cannot modify system settings
   - Cannot approve above limits
   - Cannot delete approved transactions

3. **Audit Trail** - All permission changes are logged for compliance

4. **Soft Deletes** - Roles are soft-deleted (IsDeleted flag) to maintain referential integrity

## Troubleshooting

### Permission Denied Errors

If users get "Forbidden" errors:

1. Check user's role ID: `SELECT "UserId", "RoleId" FROM "Users" WHERE "UserId" = ?`
2. Check role permissions: `SELECT "Permissions" FROM "Roles" WHERE "Id" = ?`
3. Verify URL mapping in RBAC middleware
4. Check if path is in excluded paths list

### Migration Issues

If migration fails:

```bash
# Check if Roles table exists
\d "Roles"

# Manually add Permissions column if needed
ALTER TABLE "Roles" ADD COLUMN IF NOT EXISTS "Permissions" JSONB DEFAULT '{}';
ALTER TABLE "Roles" ADD COLUMN IF NOT EXISTS "IsDeleted" BOOLEAN DEFAULT FALSE;
ALTER TABLE "Roles" ADD COLUMN IF NOT EXISTS "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
```

### Audit Logs Table Missing

```bash
# Create audit logs table
CREATE TABLE IF NOT EXISTS "AuditLogs" (
  "Id" SERIAL PRIMARY KEY,
  "UserId" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
  "RoleId" INT REFERENCES "Roles"("Id") ON DELETE SET NULL,
  "Action" VARCHAR(100) NOT NULL,
  "EntityType" VARCHAR(100) NOT NULL,
  "EntityId" INT,
  "OldValue" JSONB,
  "NewValue" JSONB,
  "IpAddress" VARCHAR(64),
  "UserAgent" TEXT,
  "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Maintenance

### Cleanup Old Audit Logs

```bash
# Delete logs older than 90 days (default)
curl -X DELETE "http://localhost:5351/api/audit-logs/cleanup?days=90" \
  -H "Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN"

# Delete logs older than 30 days
curl -X DELETE "http://localhost:5351/api/audit-logs/cleanup?days=30" \
  -H "Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN"
```

### Re-seed Roles

```bash
# Re-run the seeder to reset all roles to default permissions
node ERPCRMServer/scripts/seedRoles.js
```

**Warning**: This will overwrite any custom role configurations!

## Performance Considerations

1. **Indexes** - Created on frequently queried columns:
   - `idx_roles_active` on Roles(IsActive, IsDeleted)
   - `idx_audit_logs_user` on AuditLogs(UserId)
   - `idx_audit_logs_role` on AuditLogs(RoleId)
   - `idx_audit_logs_created` on AuditLogs(CreatedAt)

2. **JSONB Permissions** - Stored as JSONB for efficient querying

3. **Caching** - Consider caching role permissions in production (Redis)

4. **Pagination** - Audit logs support pagination (limit/offset)

## Future Enhancements

1. **Permission Caching** - Cache role permissions to reduce DB queries
2. **Dynamic Roles** - Allow custom role creation via UI
3. **Permission Inheritance** - Support role hierarchies
4. **Temporary Permissions** - Time-based access grants
5. **Field-Level Security** - Restrict access to specific fields
6. **API Rate Limits by Role** - Different rate limits per role
7. **Multi-Tenant Isolation** - Enhanced company data separation

## Support

For issues or questions:
1. Check this documentation
2. Review audit logs for permission changes
3. Verify role configuration in database
4. Check server logs for RBAC middleware warnings

## Version

- **Version**: 1.0.0
- **Created**: 2026-06-17
- **Roles**: 20 predefined roles
- **Modules**: 35 modules
- **Actions**: 5 actions per module
- **Total Permissions**: 3,500+ permission combinations