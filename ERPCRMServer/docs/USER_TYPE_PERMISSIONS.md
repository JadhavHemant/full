# User Type Permission System

## Overview
The ERP CRM system now supports user type-based module visibility and permissions. This allows you to control what each user type can see and access in the system.

## User Types

| ID | User Type | Description |
|----|-----------|-------------|
| 1 | Super Admin | Full system access with all permissions |
| 2 | Admin | Full access within assigned company |
| 3 | Company Owner | Full access to company resources |
| 4 | Manager | Team management and reporting access |
| 5 | Team Lead | Limited management access |
| 6 | Sales Executive | Sales and customer management |
| 7 | Support Executive | Customer support and service |
| 8 | Employee | Basic employee access |
| 9 | Viewer | Read-only access to selected modules |

## Configuration

### Environment Variables (.env)

```env
# Enable/disable user type based module visibility
ENABLE_USER_TYPE_PERMISSIONS=true

# Default user type for new registrations (1-9)
DEFAULT_USER_TYPE=8

# Super Admin User Type ID
SUPER_ADMIN_USER_TYPE=1

# Customer User Type ID (for external users)
CUSTOMER_USER_TYPE=9

# Feature Flags
ENABLE_INVENTORY=true
ENABLE_CRM=true
ENABLE_CHAT=true
ENABLE_REPORTS=true
ENABLE_PURCHASE_ORDERS=true
ENABLE_SALES_ORDERS=true
ENABLE_GRN=true
ENABLE_STOCK_TRANSFERS=true
ENABLE_STOCK_ADJUSTMENTS=true
```

### Permission Configuration File

Location: `ERPCRMServer/config/userTypePermissions.js`

This file defines:
- `USER_TYPE_PERMISSIONS`: Permissions for each user type
- `MODULE_VISIBILITY`: Available modules and their metadata
- Helper functions for permission checking

## Module Access by User Type

### Super Admin (ID: 1)
- **Access**: All modules (`*`)
- **Actions**: Create, Read, Update, Delete, Export, Import
- **Restrictions**: None

### Admin (ID: 2)
- **Access**: All modules
- **Actions**: Create, Read, Update, Delete, Export, Import
- **Restrictions**: Company-scoped access only

### Company Owner (ID: 3)
- **Access**: Dashboard, Users, Company, Inventory, Sales Orders, Purchase Orders, Customers, Suppliers, Reports, CRM, Chat
- **Actions**: Create, Read, Update, Delete, Export, Import
- **Restrictions**: Company-scoped access

### Manager (ID: 4)
- **Access**: Dashboard, Users, Inventory, Sales Orders, Purchase Orders, Customers, Suppliers, Reports, CRM, Chat
- **Actions**: Create, Read, Update, Export (no delete)
- **Restrictions**: Team-scoped access

### Team Lead (ID: 5)
- **Access**: Dashboard, Users, Inventory, Sales Orders, Purchase Orders, Customers, Suppliers, Reports, CRM, Chat
- **Actions**: Read, Update, Export
- **Restrictions**: Team-scoped access, read-only for reports/dashboard

### Sales Executive (ID: 6)
- **Access**: Dashboard, Customers, Sales Orders, Quotes, Invoices, Payments, Leads, Opportunities, Activities, Products, Reports
- **Actions**: Create, Read, Update, Export
- **Restrictions**: Own data only, no access to purchase orders/suppliers/GRN

### Support Executive (ID: 7)
- **Access**: Dashboard, Customers, Cases, Activities, Products, Chat
- **Actions**: Read, Update, Export
- **Restrictions**: Own data only, no access to sales/purchase/inventory

### Employee (ID: 8)
- **Access**: Dashboard, Products, Customers, Chat
- **Actions**: Read only
- **Restrictions**: Read-only access

### Viewer (ID: 9)
- **Access**: Dashboard, Products, Customers, Reports
- **Actions**: Read only
- **Restrictions**: Read-only access, no chat/CRM

## API Endpoints

### Get All Modules
```http
GET /api/modules
```

Returns all available modules without filtering.

### Get Modules by User Type
```http
GET /api/modules?userTypeId=1
```

Returns modules filtered by the specified user type's permissions.

**Example Response:**
```json
{
  "message": "ERP CRM System - Modules for Super Admin (User Type 1)",
  "userType": {
    "id": 1,
    "name": "Super Admin",
    "description": "Full system access with all permissions",
    "actions": ["create", "read", "update", "delete", "export", "import"],
    "restrictions": null
  },
  "totalVisibleModules": 25,
  "totalModules": 25,
  "modules": { ... }
}
```

## Available Modules

| Module Key | Name | Path | Description |
|------------|------|------|-------------|
| dashboard | Dashboard | /api/dashboard | Dashboard statistics and analytics |
| users | User Management | /api/users | Manage users, roles, and permissions |
| company | Company Management | /api/company | Company settings and management |
| roles | Roles & Permissions | /api/roles | Role management and permission assignment |
| inventory | Inventory Management | /api/products | Products, categories, warehouses, stock |
| sales-orders | Sales Orders | /api/sales-orders | Sales order management |
| purchase-orders | Purchase Orders | /api/purchase-orders | Purchase order management |
| customers | Customers | /api/customers | Customer management |
| suppliers | Suppliers | /api/suppliers | Supplier management |
| invoices | Invoices | /api/crm/invoices | Invoice management |
| payments | Payments | /api/crm/payments | Payment tracking |
| crm | CRM | /api/crm | Customer relationship management |
| reports | Reports | /api/reports | Analytics and reporting |
| chat | Chat & Communication | /api/chat | Team chat and messaging |
| grn | Goods Received Note | /api/grn | GRN management |
| stock-transfers | Stock Transfers | /api/stock-transfers | Inter-warehouse stock transfers |
| stock-adjustments | Stock Adjustments | /api/stock-adjustments | Stock adjustment and reconciliation |

## Usage Examples

### Frontend Integration

```javascript
// Get current user's type ID from token
const userTypeId = user.userTypeId; // From JWT token

// Fetch visible modules for user
const response = await fetch(`/api/modules?userTypeId=${userTypeId}`);
const { modules, userType } = await response.json();

// Display only visible modules in navigation
const visibleModules = Object.keys(modules).filter(key => 
  modules[key] !== undefined
);

// Render navigation based on visible modules
visibleModules.forEach(moduleKey => {
  // Show module in navigation
  console.log(`Show ${moduleKey}: ${modules[moduleKey]}`);
});
```

### Backend Permission Check

```javascript
const { hasModuleAccess, canPerformAction } = require('./config/userTypePermissions');

// Check if user can access a module
if (hasModuleAccess(user.userTypeId, 'inventory')) {
  // Allow access to inventory
}

// Check if user can perform specific action
if (canPerformAction(user.userTypeId, 'products', 'create')) {
  // Allow creating products
}
```

## Modifying Permissions

To change permissions for a user type, edit `ERPCRMServer/config/userTypePermissions.js`:

```javascript
const USER_TYPE_PERMISSIONS = {
  1: {
    name: 'Super Admin',
    modules: ['*'], // Change to specific modules if needed
    actions: ['create', 'read', 'update', 'delete', 'export', 'import'],
    restrictions: null,
  },
  // ... other user types
};
```

## Adding New Modules

To add a new module to the permission system:

1. Add module to `MODULE_VISIBILITY` in `userTypePermissions.js`:
```javascript
const MODULE_VISIBILITY = {
  newModule: {
    name: 'New Module',
    path: '/api/new-module',
    description: 'Description of new module',
    icon: 'icon-name',
  },
  // ... existing modules
};
```

2. Add module to each user type's `modules` array that should have access

3. Update the `/api/modules` endpoint in `server.js` if needed

## Best Practices

1. **Default to Least Privilege**: New user types should have minimal access by default
2. **Use Feature Flags**: Control module availability with environment variables
3. **Regular Audits**: Review permissions periodically
4. **Test All User Types**: Ensure each user type can only access their allowed modules
5. **Document Changes**: Update this file when modifying permissions

## Troubleshooting

### User can't access a module
1. Check user's `userTypeId` in the database
2. Verify the module is in the user type's `modules` array
3. Check if the action is in the user type's `actions` array
4. Verify no `restrictions` are blocking access

### Need to add a new user type
1. Add new entry to `USER_TYPE_PERMISSIONS` with next available ID
2. Define modules and actions for the new user type
3. Update `DEFAULT_USER_TYPE` in `.env` if this should be the default
4. Update database seed scripts if needed

## Notes

- Super Admin (roleId=1) bypasses all RBAC checks regardless of user type
- Customer user type (ID=9) is locked to allowed modules and is always read-only
- Changes to `userTypePermissions.js` require server restart
- Database permissions (Roles table) work in conjunction with user type permissions