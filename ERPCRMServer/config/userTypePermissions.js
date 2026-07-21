/**
 * User Type Permission Configuration
 * Defines what modules/features each user type can access
 * 
 * User Types:
 * 1 = Super Admin
 * 2 = Admin
 * 3 = Company Owner
 * 4 = Manager
 * 5 = Team Lead
 * 6 = Sales Executive
 * 7 = Support Executive
 * 8 = Employee
 * 9 = Viewer
 */

const USER_TYPE_PERMISSIONS = {
  // Super Admin - Full access to everything
  1: {
    name: 'Super Admin',
    description: 'Full system access with all permissions',
    modules: ['*'], // Wildcard - access to all modules
    actions: ['create', 'read', 'update', 'delete', 'export', 'import'],
    restrictions: null,
  },

  // Admin - Full access within company scope
  2: {
    name: 'Admin',
    description: 'Full access within assigned company',
    modules: ['*'],
    actions: ['create', 'read', 'update', 'delete', 'export', 'import'],
    restrictions: {
      companyScope: true, // Can only access their company's data
      cannotAssign: [1, 2, 5], // Cannot assign Super Admin, Admin, or Customer roles
    },
  },

  // Company Owner - Full access to their company
  3: {
    name: 'Company Owner',
    description: 'Full access to company resources',
    modules: [
      'dashboard',
      'users',
      'company',
      'inventory',
      'sales-orders',
      'purchase-orders',
      'customers',
      'suppliers',
      'reports',
      'crm',
      'chat',
    ],
    actions: ['create', 'read', 'update', 'delete', 'export', 'import'],
    restrictions: {
      companyScope: true,
      cannotAssign: [1, 2], // Cannot assign Super Admin or Admin roles
    },
  },

  // Manager - Team management and reporting
  4: {
    name: 'Manager',
    description: 'Team management and reporting access',
    modules: [
      'dashboard',
      'users',
      'inventory',
      'sales-orders',
      'purchase-orders',
      'customers',
      'suppliers',
      'reports',
      'crm',
      'chat',
    ],
    actions: ['create', 'read', 'update', 'export'],
    restrictions: {
      teamScope: true, // Can only access their team's data
      cannotDelete: ['users', 'company', 'roles'], // Cannot delete critical data
    },
  },

  // Team Lead - Limited management access
  5: {
    name: 'Team Lead',
    description: 'Team lead with limited management access',
    modules: [
      'dashboard',
      'users',
      'inventory',
      'sales-orders',
      'purchase-orders',
      'customers',
      'suppliers',
      'reports',
      'crm',
      'chat',
    ],
    actions: ['read', 'update', 'export'],
    restrictions: {
      teamScope: true,
      readOnly: ['reports', 'dashboard'], // Read-only for reports and dashboard
    },
  },

  // Sales Executive - Sales and customer focused
  6: {
    name: 'Sales Executive',
    description: 'Sales and customer management access',
    modules: [
      'dashboard',
      'customers',
      'sales-orders',
      'quotes',
      'invoices',
      'payments',
      'leads',
      'opportunities',
      'activities',
      'products',
      'reports',
    ],
    actions: ['create', 'read', 'update', 'export'],
    restrictions: {
      ownDataOnly: true, // Can only access their own records
      cannotAccess: ['purchase-orders', 'suppliers', 'grn', 'stock-transfers'],
    },
  },

  // Support Executive - Support and service focused
  7: {
    name: 'Support Executive',
    description: 'Customer support and service access',
    modules: [
      'dashboard',
      'customers',
      'cases',
      'activities',
      'products',
      'chat',
    ],
    actions: ['read', 'update', 'export'],
    restrictions: {
      ownDataOnly: true,
      cannotAccess: [
        'sales-orders',
        'purchase-orders',
        'suppliers',
        'invoices',
        'payments',
        'grn',
        'stock-transfers',
        'stock-adjustments',
      ],
    },
  },

  // Employee - Basic access
  8: {
    name: 'Employee',
    description: 'Basic employee access',
    modules: [
      'dashboard',
      'products',
      'customers',
      'chat',
    ],
    actions: ['read'],
    restrictions: {
      readOnly: true, // All modules are read-only
      cannotAccess: [
        'users',
        'company',
        'roles',
        'settings',
        'sales-orders',
        'purchase-orders',
        'suppliers',
        'invoices',
        'payments',
        'grn',
        'stock-transfers',
        'stock-adjustments',
      ],
    },
  },

  // Viewer - Read-only access
  9: {
    name: 'Viewer',
    description: 'Read-only access to selected modules',
    modules: [
      'dashboard',
      'products',
      'customers',
      'reports',
    ],
    actions: ['read'],
    restrictions: {
      readOnly: true,
      cannotAccess: [
        'users',
        'company',
        'roles',
        'settings',
        'sales-orders',
        'purchase-orders',
        'suppliers',
        'invoices',
        'payments',
        'grn',
        'stock-transfers',
        'stock-adjustments',
        'chat',
        'crm',
      ],
    },
  },
};

// Module visibility configuration
const MODULE_VISIBILITY = {
  dashboard: {
    name: 'Dashboard',
    path: '/api/dashboard',
    description: 'Dashboard statistics and analytics',
    icon: 'dashboard',
  },
  users: {
    name: 'User Management',
    path: '/api/users',
    description: 'Manage users, roles, and permissions',
    icon: 'users',
  },
  company: {
    name: 'Company Management',
    path: '/api/company',
    description: 'Company settings and management',
    icon: 'building',
  },
  roles: {
    name: 'Roles & Permissions',
    path: '/api/roles',
    description: 'Role management and permission assignment',
    icon: 'shield',
  },
  inventory: {
    name: 'Inventory Management',
    path: '/api/products',
    description: 'Products, categories, warehouses, stock',
    icon: 'package',
    subModules: [
      'products',
      'productcategory',
      'warehouses',
      'product-stock',
      'stock-movements',
      'brands',
      'units',
      'batches',
      'serial-numbers',
    ],
  },
  'sales-orders': {
    name: 'Sales Orders',
    path: '/api/sales-orders',
    description: 'Sales order management',
    icon: 'shopping-cart',
  },
  'purchase-orders': {
    name: 'Purchase Orders',
    path: '/api/purchase-orders',
    description: 'Purchase order management',
    icon: 'truck',
  },
  customers: {
    name: 'Customers',
    path: '/api/customers',
    description: 'Customer management',
    icon: 'users',
  },
  suppliers: {
    name: 'Suppliers',
    path: '/api/suppliers',
    description: 'Supplier management',
    icon: 'truck',
  },
  invoices: {
    name: 'Invoices',
    path: '/api/crm/invoices',
    description: 'Invoice management',
    icon: 'file-text',
  },
  payments: {
    name: 'Payments',
    path: '/api/crm/payments',
    description: 'Payment tracking',
    icon: 'credit-card',
  },
  crm: {
    name: 'CRM',
    path: '/api/crm',
    description: 'Customer relationship management',
    icon: 'heart',
    subModules: [
      'leads',
      'opportunities',
      'accounts',
      'contacts',
      'activities',
      'quotes',
      'cases',
      'presales',
    ],
  },
  reports: {
    name: 'Reports',
    path: '/api/reports',
    description: 'Analytics and reporting',
    icon: 'bar-chart',
  },
  chat: {
    name: 'Chat & Communication',
    path: '/api/chat',
    description: 'Team chat and messaging',
    icon: 'message-circle',
  },
  grn: {
    name: 'Goods Received Note',
    path: '/api/grn',
    description: 'GRN management',
    icon: 'package-check',
  },
  'stock-transfers': {
    name: 'Stock Transfers',
    path: '/api/stock-transfers',
    description: 'Inter-warehouse stock transfers',
    icon: 'arrow-left-right',
  },
  'stock-adjustments': {
    name: 'Stock Adjustments',
    path: '/api/stock-adjustments',
    description: 'Stock adjustment and reconciliation',
    icon: 'sliders',
  },
};

// Helper function to get user type permissions
const getUserTypePermissions = (userTypeId) => {
  return USER_TYPE_PERMISSIONS[userTypeId] || USER_TYPE_PERMISSIONS[9]; // Default to Viewer
};

// Helper function to check if user has access to a module
const hasModuleAccess = (userTypeId, moduleName) => {
  const permissions = getUserTypePermissions(userTypeId);
  
  // Super admin has access to everything
  if (permissions.modules.includes('*')) {
    return true;
  }
  
  // Check if module is in allowed list
  return permissions.modules.includes(moduleName);
};

// Helper function to check if user can perform an action
const canPerformAction = (userTypeId, moduleName, action) => {
  const permissions = getUserTypePermissions(userTypeId);
  
  // Super admin can do everything
  if (permissions.modules.includes('*')) {
    return true;
  }
  
  // Check if module is accessible
  if (!permissions.modules.includes(moduleName)) {
    return false;
  }
  
  // Check if action is allowed
  if (permissions.actions.includes('*')) {
    return true;
  }
  
  // Check read-only restrictions
  if (permissions.restrictions?.readOnly && action !== 'read') {
    return false;
  }
  
  // Check module-specific restrictions
  if (permissions.restrictions?.cannotDelete?.includes(moduleName) && action === 'delete') {
    return false;
  }
  
  if (permissions.restrictions?.cannotAccess?.includes(moduleName)) {
    return false;
  }
  
  return permissions.actions.includes(action);
};

// Helper function to get visible modules for a user type
const getVisibleModules = (userTypeId) => {
  const permissions = getUserTypePermissions(userTypeId);
  
  if (permissions.modules.includes('*')) {
    // Return all modules for super admin
    return Object.keys(MODULE_VISIBILITY);
  }
  
  return permissions.modules.filter(module => MODULE_VISIBILITY[module]);
};

module.exports = {
  USER_TYPE_PERMISSIONS,
  MODULE_VISIBILITY,
  getUserTypePermissions,
  hasModuleAccess,
  canPerformAction,
  getVisibleModules,
};