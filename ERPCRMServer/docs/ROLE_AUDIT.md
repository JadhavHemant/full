# Role Audit Report — ERP/CRM System

Generated: 2026-07-15  
Scope: Full backend + frontend codebase scan  
Auditor: RBAC refactoring analysis

---

## 1. Existing Role Definitions

### 1.1 System-Defined Roles (in `scripts/seedRoles.js` — 20 roles)

| ID | Role Name | Category | New 5-Role Mapping |
|----|-----------|----------|-------------------|
| 1 | Super Admin | System | **superadmin** (no change) |
| 2 | Company Admin | System | **admin** |
| 3 | Branch Manager | Mgmt | **manager** |
| 4 | Inventory Manager | Inventory | **manager** |
| 5 | Store Keeper | Inventory | **employee** |
| 6 | Purchase Manager | Procurement | **manager** |
| 7 | Purchase Executive | Procurement | **employee** |
| 8 | Sales Manager | Sales | **manager** |
| 9 | Sales Executive | Sales | **employee** |
| 10 | Production Manager | Manufacturing | **manager** |
| 11 | Production Supervisor | Manufacturing | **employee** |
| 12 | Production Operator | Manufacturing | **employee** |
| 13 | Quality Manager | Quality | **manager** |
| 14 | Quality Inspector | Quality | **employee** |
| 15 | Finance Manager | Finance | **manager** |
| 16 | Accountant | Finance | **employee** |
| 17 | CRM Manager | CRM | **manager** |
| 18 | CRM Executive | CRM | **employee** |
| 19 | HR Manager | HR | **manager** |
| 20 | Employee | General | **employee** |

**Observation:** The current 20-role model has already been retrofitted into a 5-role RBAC system via `rbac.js`, but with both systems running in parallel. The `Permissions` JSONB on each role defines module-level access. During migration to flat 5 roles, the custom permissions JSON from these 20 roles should be preserved as baseline defaults for each mapped target role.

### 1.2 RBAC Middleware Role IDs (in `middlewares/rbac.js`)

| ID | Name | Behavior |
|----|------|----------|
| 1 | superadmin | Bypass all checks (`resolvedPermissions = null`) |
| 2 | admin | Full access within company scope unless custom permissions exist |
| 3 | manager | Custom permissions from DB, fallback to `ROLE_DEFAULTS` |
| 4 | employee | Custom permissions from DB, fallback to `ROLE_DEFAULTS` |
| 5 | customer | Locked to `CUSTOMER_ALLOWED_MODULES` only |

**Observation:** The RBAC middleware is already 5-role aware. Goal mapping: old role 2→20 maps to new roles 2,3,4.

---

## 2. Scattered Role Checks Found

### 2.1 Backend Hard-Coded Role Checks

| File | Line(s) | Check | Purpose | Should Refactor? |
|------|---------|-------|---------|-------------------|
| `middlewares/rbac.js` | 323 | `numericId === 1` | Super admin bypass | ✅ (central) |
| `middlewares/rbac.js` | 333 | `numericId === 5` | Customer lockdown | ✅ (central) |
| `middlewares/rbac.js` | 360 | `numericId === 2` | Admin full access | ✅ (central) |
| `middlewares/rbac.js` | 380 | `numericId === 3 \|\| numericId === 4` | Manager/employee | ✅ (central) |
| `middlewares/rbac.js` | 450-485 | `canAssignPermissions()` | Assignment governance | ✅ (central) |
| `middlewares/rbac.js` | 598 | `Number(roleId) === 1` | Super admin bypass (checkPermission) | ✅ (central) |
| `middlewares/rbac.js` | 702 | `Number(roleId) === 1` | Super admin bypass (global) | ✅ (central) |
| `middlewares/rbac.js` | 720 | `Number(roleId) === 2` | Admin company scoping | ✅ (central) |
| `controllers/UserApis/auditLogController.js` | ~80 | `Number(req.user.roleId) !== 1` | Only superadmin can cleanup logs | ⚠️ Should use `can()` function |
| `controllers/System/tableCrudController.js` | ~70 | `roleId !== 1` | Super admin only for table CRUD | ⚠️ Should use `can()` function |
| `controllers/System/reportController.js` | ~45 | `roleId === 1` | Super admin report access | ⚠️ Should use `can()` function |
| `utils/restrictedActionAccess.js` | 8-10 | `roleId === 1 \|\| roleName === "super admin"` | Restricted action guard | ⚠️ Duplicates RBAC |
| `utils/hierarchyAccess.js` | 7-11 | `PRIVILEGED_ROLE_IDS.has(roleId) \|\| roleName === "super admin" \|\| roleName === "admin"` | Hierarchy traversal | ⚠️ Duplicates RBAC |
| `utils/companyScope.js` | ? | `Number(user?.roleId) === 1` | Company scoping bypass | ✅ (separate concern) |

### 2.2 Frontend Role Checks

| File | Check | Purpose |
|------|-------|---------|
| `utils/sessionUser.js` | `roleId === 1 \|\| roleName === "super admin"` | Portal access, admin detection |
| `utils/sessionUser.js` | `roleId === 2 \|\| roleName === "admin"` | Admin detection |
| `utils/portalAccess.js` | `roleId === 1 \|\| roleName === "super admin"` | Portal routing, restricted actions |
| `utils/portalAccess.js` | `roleId === 2 \|\| roleName === "admin"` | Admin detection |
| `Components/AdminSite/Users/UsersPage.jsx` | `Number(loggedInUser.roleId) === 1` | Super admin mode for user editing |
| `Components/AdminSite/Users/RegisterUserPage.jsx` | `sessionRoleId === 1` | Show all roles to superadmin |
| `Components/AdminSite/Settings/SettingsPage.jsx` | `Number(user?.roleId) === 1` | Show billing/settings cards |
| `Components/AdminSite/Profile/Profile.jsx` | `Number(sessionUser?.roleId) === 1` | Profile routing |
| `Components/AdminSite/Profile/EditProfilePage.jsx` | `profile?.roleId === 1` | Admin link routing |
| `Components/PrivateRoute/AdminRoute.jsx` | `canAccessAdminPortal()` | Route gating |
| `Components/PrivateRoute/UserRoute.jsx` | `getUserPortalItems(user?.roleId)` | Portal route gating |
| `Components/UserPortal/userPortalConfig.js` | `item.roles.includes(Number(roleId))` | Portal section visibility |
| `Components/UserPortal/UserDashboard.jsx` | `profile?.roleId` | Role display |
| `features/crm/components/CrmWorkspace.jsx` | `Number(parsedUser?.roleId) === 1` | CRM superadmin bypass |

### 2.3 Utility & Permission Files

| File | Role | Notes |
|------|------|-------|
| `utils/restrictedActionAccess.js` | roleId check | Returns `canManageRestrictedActions` flag |
| `utils/hierarchyAccess.js` | roleId + roleName check | Determines if user has hierarchy traversal |
| `utils/companyScope.js` | roleId check | Determines company scoping |
| `utils/chatHelpers.js` | roleId check | Chat scope |
| `clientui/src/utils/sessionUser.js` | roleId + roleName | Centralized FE user detection |
| `clientui/src/utils/portalAccess.js` | roleId + roleName | Portal & restricted action access |

---

## 3. Schema Analysis — Column Audit for Users Table

| Column | RBAC Essential? | Recommendation |
|--------|----------------|---------------|
| `UserId` | ✅ | Keep |
| `RoleId` | ✅ | Keep — drives 5-role RBAC |
| `UserTypeId` | ❌ | **Remove** — redundant with RoleId. Old multi-role baggage. See note* |
| `CompanyId` | ✅ | Keep — company scoping |
| `ReportingManagerId` | ⚠️ | Keep — manager scoping/org hierarchy |
| `DepartmentId` | ⚠️ | Keep — department-scoped access |
| `DesignationId` | ❌ | **Remove** — HR metadata, not auth. Belongs in EmployeeProfile table |
| `HierarchyLevel` | ❌ | **Remove** — flat 5-role model doesn't need deep org levels |
| `HierarchyPath` | ❌ | **Remove** — materialized path for old deep org tree |
| `CreatedBy` | ⚠️ | Keep — audit trail |
| Standard user fields | ✅ | Keep (Name, Email, Password, etc.) |

> **Note on UserTypeId:** Currently references `UserTypes("Id")`. The `userTypeRoutes.js` and `userTypeModel.js` confirm this is a separate entity. In the seed scripts, it's used alongside RoleId (e.g., `roleId: roleManager, userTypeId: userTypeManager`). This dual system should be collapsed — RoleId alone should drive access.

### 3.1 Related Tables

| Table | RBAC Essential? | Notes |
|-------|----------------|-------|
| `Roles` | ✅ | Core RBAC table. Already has JSONB `Permissions` column |
| `Permissions` | ❌ | Not a separate table — permissions are stored as JSONB on Roles |
| `role_permissions` | ❌ | Not implemented — permissions are JSONB not relational |
| `UserTypes` | ❌ | Remove — merged into Roles |
| `Companies` | ✅ | Multi-tenant scoping |
| `AuditLogs` | ✅ | Keep — already implemented |
| `Departments` | ⚠️ | Keep — scoping |
| `Designations` | ❌ | Move to EmployeeProfile if needed |

---

## 4. Current Permission Modules (from `seedRoles.js` + `rbac.js`)

These are the 35+ modules recognized by the system:

```
dashboard, users, roles, companies, products, categories, units,
warehouses, stock, stockMovements, suppliers, purchaseOrders,
purchaseRequisitions, purchaseReturns, salesOrders, salesQuotations,
deliveryChallans, salesReturns, customers, brands, bom, productionOrders,
expenses, approvals, dataImportExport, racks, bins, accounts, contacts,
leads, opportunities, presales, cases, reports, settings, chat
```

**Actions per module:** view, create, edit, delete, export

---

## 5. Existing Scoping Mechanisms

1. **Company scope** — Enforced via `CompanyId` on Users. Admin sees same-company data.
2. **Reporting manager hierarchy** — Recursive CTE in `hierarchyAccess.js` (`getAccessibleUserIds`) enables manager to see direct/indirect reports.
3. **Department scoping** — `DepartmentId` on Users enables department-filtered access.
4. **Customer lockdown** — `CUSTOMER_ALLOWED_MODULES` in `rbac.js` restricts customers to read-only on own orders/invoices/profile.
5. **Admin cross-company restriction** — `canAssignPermissions` prevents admin from modifying other companies.

---

## 6. Key Files That Need Changes

| File | Change Required |
|------|----------------|
| `Models/Users/userModel.js` | Remove `UserTypeId`, `DesignationId`, `HierarchyLevel`, `HierarchyPath` from CREATE TABLE |
| `Models/Users/userTypeModel.js` | Remove entire file/table — no longer needed |
| `routes/User/userTypeRoutes.js` | Remove — no longer needed |
| `controllers/UserApis/userController.js` | Remove UserTypeId references, update query SELECTs |
| `utils/tokenUtils.js` | Remove `userTypeId` from JWT payload |
| `middlewares/authMiddleware.js` | No change (token already has roleId) |
| `controllers/UserApis/roleController.js` | Ensure 20→5 role migration logic |
| `scripts/seedRoles.js` | Replace 20 hardcoded roles with 5 canonical roles |
| `utils/restrictedActionAccess.js` | Remove or redirect to RBAC middleware's `can()` |
| `utils/hierarchyAccess.js` | Refactor to use RBAC permission checks |
| `clientui/src/utils/portalAccess.js` | Refactor role checks to use permission-based approach |
| `clientui/src/utils/sessionUser.js` | Add `hasPermission()` helper |
| `clientui/src/Components/AdminSite/RoleAccess/RoleAccess.jsx` | Update to work with 5-role model |
| `clientui/src/Components/UserPortal/userPortalConfig.js` | Update role-based filtering to permission-based |
| `server.js` | Remove `userTypeRoutes` import/hookup |

---

## 7. Audit Log Coverage

Currently logs:
- Role permission changes (`saveRolePermissions`)
- Role CRUD operations (`createRole`, `updateRole`, `deleteRole`)

Missing (needs adding):
- User role assignment changes (`UPDATE Users SET RoleId = ...`)
- Superadmin actions (user deletion, system config changes)
- Failed authorization attempts (optional, for security monitoring)
- Permission matrix changes at scale

---

## 8. Summary of Action Items

1. **Collapse 20 roles → 5 canonical roles** with permissions extracted from current JSONB
2. **Remove UserTypeId** from schema, tokens, controllers, frontend
3. **Remove DesignationId, HierarchyLevel, HierarchyPath** from Users table
4. **Remove UserTypes table** and all associated routes/controllers/models
5. **Refactor scattered `roleId === N` checks** to use `can(module, action)` function
6. **Add audit logging for role assignment changes** (user role updates)
7. **Update frontend role checks** to use permission-based helpers
8. **Write migration script** to preserve existing users' roles during transition