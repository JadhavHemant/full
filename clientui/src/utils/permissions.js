/**
 * Frontend Permission Helpers
 * 
 * Centralized permission checking for the React UI.
 * Mirrors the backend's permission matrix for consistent UX.
 * 
 * NOTE: Frontend permission checks are UX-only. The real security
 * boundary is the backend. Always validate on the server.
 */

import {
  getSessionUser,
  SUPER_ADMIN_ROLE_ID,
  ADMIN_ROLE_ID,
  MANAGER_ROLE_ID,
} from './sessionUser';

// ── Role Constants ─────────────────────────────────────────────────────

export const ROLES = {
  get SUPER_ADMIN() { return SUPER_ADMIN_ROLE_ID; },
  get ADMIN() { return ADMIN_ROLE_ID; },
  get MANAGER() { return MANAGER_ROLE_ID; },
  EMPLOYEE: 4,
  CUSTOMER: 5,
};

export const ROLE_NAMES = {
  [SUPER_ADMIN_ROLE_ID]: 'Super Admin',
  [ADMIN_ROLE_ID]: 'Admin',
  [MANAGER_ROLE_ID]: 'Manager',
  4: 'Employee',
  5: 'Customer',
};

export const ROLE_HIERARCHY = [5, 4, 3, 2, 1]; // lowest → highest

// ── Permission Matrix ──────────────────────────────────────────────────

/**
 * Default permission matrix matching the backend.
 * null = full access, array = allowed actions list, empty = no access.
 * 
 * Format: { [roleId]: { [resource]: ['action1', 'action2', ...] } }
 */
const DEFAULT_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: null, // full access — bypass all checks

  [ROLES.ADMIN]: null, // full access within company scope

  [ROLES.MANAGER]: {
    dashboard: ['view'],
    users: ['view', 'edit'],
    products: ['view', 'create', 'edit', 'export', 'import'],
    categories: ['view', 'export', 'import'],
    units: ['view', 'export', 'import'],
    brands: ['view', 'export', 'import'],
    warehouses: ['view', 'edit', 'export', 'import'],
    stock: ['view', 'create', 'edit', 'export', 'import'],
    stockMovements: ['view', 'create', 'edit', 'export'],
    suppliers: ['view', 'export', 'import'],
    purchaseOrders: ['view', 'create', 'edit', 'export', 'approve', 'reject', 'assign'],
    purchaseRequisitions: ['view', 'create', 'edit', 'export', 'approve', 'reject', 'assign'],
    purchaseReturns: ['view', 'create', 'edit', 'export', 'approve', 'reject'],
    salesOrders: ['view', 'create', 'edit', 'export', 'approve', 'reject', 'assign'],
    salesQuotations: ['view', 'create', 'edit', 'export', 'approve', 'reject'],
    deliveryChallans: ['view', 'create', 'edit', 'export'],
    salesReturns: ['view', 'create', 'edit', 'export', 'approve', 'reject'],
    customers: ['view', 'create', 'edit', 'export', 'assign'],
    accounts: ['view', 'create', 'edit', 'export', 'assign'],
    contacts: ['view', 'create', 'edit', 'export', 'assign'],
    leads: ['view', 'create', 'edit', 'export', 'approve', 'reject', 'assign'],
    opportunities: ['view', 'create', 'edit', 'export', 'approve', 'reject', 'assign'],
    presales: ['view', 'create', 'edit', 'export', 'assign'],
    cases: ['view', 'create', 'edit', 'export', 'assign'],
    reports: ['view', 'export'],
    approvals: ['view', 'create', 'edit', 'export', 'approve', 'reject', 'assign'],
    chat: ['view', 'create', 'edit'],
    notifications: ['view'],
    settings: [],
    roles: [],
    companies: [],
    billing: ['view'],
  },

  [ROLES.EMPLOYEE]: {
    dashboard: ['view'],
    products: ['view', 'export'],
    categories: ['view', 'export'],
    units: ['view', 'export'],
    brands: ['view', 'export'],
    warehouses: ['view', 'export'],
    stock: ['view', 'export'],
    stockMovements: ['view', 'export'],
    suppliers: ['view', 'export'],
    purchaseOrders: ['view', 'export'],
    salesOrders: ['view', 'export'],
    customers: ['view', 'export'],
    salesQuotations: ['view', 'export'],
    chat: ['view'],
    notifications: ['view'],
  },

  [ROLES.CUSTOMER]: {
    salesOrders: ['view'],
    invoices: ['view'],
    customers: ['view'],
    notifications: ['view'],
  },
};

// ── Permission Checking ────────────────────────────────────────────────

/**
 * Get the effective permissions for a user.
 * Falls back to DEFAULT_PERMISSIONS if no custom permissions are available.
 * 
 * @param {Object} [user] - User object (defaults to session user)
 * @returns {Object|null} Permissions object, or null for full access
 */
export const getPermissions = (user = getSessionUser()) => {
  if (!user) return {};

  const roleId = Number(user?.roleId ?? user?.RoleId ?? 0);
  return DEFAULT_PERMISSIONS[roleId] || {};
};

/**
 * Check if a user has permission for a specific resource+action.
 * 
 * @param {string} resource - Resource key (e.g., 'users', 'products')
 * @param {string} action - Action key (e.g., 'view', 'create', 'edit', 'delete', 'export')
 * @param {Object} [user] - User object (defaults to session user)
 * @returns {boolean}
 */
export const hasPermission = (resource, action, user = getSessionUser()) => {
  if (!user) return false;

  const roleId = Number(user?.roleId ?? user?.RoleId ?? 0);

  // Superadmin has full access
  if (roleId === ROLES.SUPER_ADMIN) return true;

  // Admin has full access within company scope
  if (roleId === ROLES.ADMIN) return true;

  const permissions = DEFAULT_PERMISSIONS[roleId];
  if (!permissions) return false;
  if (permissions === null) return true; // full access

  const resourcePerms = permissions[resource];
  if (!resourcePerms) return false;

  return resourcePerms.includes(action);
};

/**
 * Check if user can access a module (any action).
 * 
 * @param {string} resource - Resource key
 * @param {Object} [user] - User object
 * @returns {boolean}
 */
export const canAccessModule = (resource, user = getSessionUser()) => {
  return hasPermission(resource, 'view', user);
};

/**
 * Check if user is superadmin.
 */
export const isSuperAdmin = (user = getSessionUser()) => {
  const roleId = Number(user?.roleId ?? user?.RoleId ?? 0);
  return roleId === ROLES.SUPER_ADMIN;
};

/**
 * Check if user is admin or above.
 */
export const isAdminOrAbove = (user = getSessionUser()) => {
  const roleId = Number(user?.roleId ?? user?.RoleId ?? 0);
  return roleId <= ROLES.ADMIN;
};

/**
 * Check if user is manager or above.
 */
export const isManagerOrAbove = (user = getSessionUser()) => {
  const roleId = Number(user?.roleId ?? user?.RoleId ?? 0);
  return roleId <= ROLES.MANAGER;
};

/**
 * Get user's role level (1 = highest privilege, 5 = lowest).
 */
export const getRoleLevel = (user = getSessionUser()) => {
  return Number(user?.roleId ?? user?.RoleId ?? ROLES.CUSTOMER);
};

/**
 * Compare two role IDs — returns true if roleA has equal or higher privilege than roleB.
 */
export const isRoleAtLeast = (roleA, roleB) => {
  return Number(roleA) <= Number(roleB);
};

// ── React Hook ─────────────────────────────────────────────────────────

/**
 * React hook for permission checking in components.
 * 
 * Usage:
 *   const { can, isAdmin, isManager } = usePermission();
 *   if (can('products', 'create')) { ... }
 *   if (isAdmin) { ... }
 */
export const usePermission = () => {
  const user = getSessionUser();
  const roleId = Number(user?.roleId ?? user?.RoleId ?? 0);

  return {
    /** Check permission for resource + action */
    can: (resource, action) => hasPermission(resource, action, user),
    
    /** Check if user can access a module */
    canAccess: (resource) => canAccessModule(resource, user),
    
    /** Current role ID */
    roleId,
    
    /** Current role name */
    roleName: ROLE_NAMES[roleId] || user?.roleName || 'Unknown',
    
    /** Role hierarchy checks */
    isSuperAdmin: roleId === ROLES.SUPER_ADMIN,
    isAdmin: roleId === ROLES.ADMIN,
    isManager: roleId === ROLES.MANAGER,
    isEmployee: roleId === ROLES.EMPLOYEE,
    isCustomer: roleId === ROLES.CUSTOMER,
    
    /** Combined checks */
    isAdminOrAbove: roleId <= ROLES.ADMIN,
    isManagerOrAbove: roleId <= ROLES.MANAGER,
    
    /** User object */
    user,
  };
};

// ── Navigation Filtering ───────────────────────────────────────────────

/**
 * Filter navigation items based on user permissions.
 * 
 * @param {Array} items - Navigation items with optional `permission` field (resource:action)
 * @param {Object} [user] - User object
 * @returns {Array} Filtered navigation items
 */
export const filterNavByPermission = (items, user = getSessionUser()) => {
  return items.filter((item) => {
    if (!item.permission) return true; // no permission required
    const [resource, action] = item.permission.split(':');
    return hasPermission(resource, action || 'view', user);
  });
};

// ── Portal Config ──────────────────────────────────────────────────────

/**
 * Get allowed admin portal sections based on user role.
 */
export const getAllowedAdminSections = (user = getSessionUser()) => {
  const sections = {
    dashboard: { label: 'Dashboard', icon: 'LayoutDashboard', permission: 'dashboard:view' },
    inventory: { label: 'Inventory', icon: 'Package', permission: 'products:view' },
    products: { label: 'Products', icon: 'Package2', permission: 'products:view' },
    categories: { label: 'Categories', icon: 'Tag', permission: 'categories:view' },
    suppliers: { label: 'Suppliers', icon: 'Truck', permission: 'suppliers:view' },
    purchaseOrders: { label: 'Purchase Orders', icon: 'ShoppingCart', permission: 'purchaseOrders:view' },
    salesOrders: { label: 'Sales Orders', icon: 'Receipt', permission: 'salesOrders:view' },
    customers: { label: 'Customers', icon: 'Users', permission: 'customers:view' },
    warehouse: { label: 'Warehouse', icon: 'Warehouse', permission: 'warehouses:view' },
    stockTransfer: { label: 'Stock Transfer', icon: 'ArrowLeftRight', permission: 'stock:view' },
    reports: { label: 'Reports', icon: 'FileText', permission: 'reports:view' },
    analytics: { label: 'Analytics', icon: 'BarChart3', permission: 'reports:view' },
    crm: { label: 'CRM', icon: 'Folder', permission: 'accounts:view' },
    users: { label: 'Users & Roles', icon: 'UserCog', permission: 'users:view' },
    settings: { label: 'Settings', icon: 'Settings', permission: 'settings:view' },
    notifications: { label: 'Notifications', icon: 'Bell', permission: 'notifications:view' },
    chat: { label: 'Chat', icon: 'MessageSquare', permission: 'chat:view' },
  };

  return Object.entries(sections).reduce((acc, [key, section]) => {
    const [resource, action] = section.permission.split(':');
    if (hasPermission(resource, action || 'view', user)) {
      acc[key] = section;
    }
    return acc;
  }, {});
};

export default { hasPermission, usePermission, getPermissions, ROLES, ROLE_NAMES };