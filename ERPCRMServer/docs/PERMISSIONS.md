# Permission Matrix — 5-Role RBAC Model

Generated: 2026-07-15  
Based on: Current 20-role permissions in `seedRoles.js` mapped to the 5-role RBAC model

---

## Role Definitions

| ID | Role | Level | Description |
|----|------|-------|-------------|
| 1 | **superadmin** | System-wide | Full system access, manages admins, system settings, no restrictions |
| 2 | **admin** | Company-wide | Manages users/managers/employees, billing, reports within their company; cannot touch system-level config or superadmin accounts |
| 3 | **manager** | Team/Dept | Manages their team (employees + viewers) within scope; read-only billing, team-level reports |
| 4 | **employee** | Self | Access to assigned tasks/resources only; no user management, no billing |
| 5 | **viewer/customer** | Self only | Read-only access to own data only |

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ Full | Full CRUD + export access |
| ✅ | Create + Read + Edit (no delete) |
| 👁️ | Read-only |
| 👁️ Own | Read-only, own data only (scoped) |
| 🚫 | No access |
| ⚡ | Scoped (team/department) — see Scope Notes |

---

## Permission Matrix

| Module | superadmin (1) | admin (2) | manager (3) | employee (4) | viewer (5) |
|--------|---------------|-----------|-------------|--------------|------------|
| **Core System** | | | | | |
| dashboard | ✅ Full | ✅ Full | 👁️ | 👁️ | 🚫 |
| users | ✅ Full | ✅ Full | ⚡ view only (own team) | 🚫 | 🚫 |
| roles | ✅ Full | 👁️ | 🚫 | 🚫 | 🚫 |
| companies | ✅ Full | 🚫 | 🚫 | 🚫 | 🚫 |
| settings | ✅ Full | 🚫 | 🚫 | 🚫 | 🚫 |
| reports | ✅ Full | ✅ Full | ⚡ (team scope) | 👁️ Own | 🚫 |
| **Inventory** | | | | | |
| products | ✅ Full | ✅ Full | ✅ | 👁️ | 🚫 |
| categories | ✅ Full | ✅ Full | 👁️ | 👁️ | 🚫 |
| units | ✅ Full | ✅ Full | 👁️ | 👁️ | 🚫 |
| brands | ✅ Full | ✅ Full | 👁️ | 👁️ | 🚫 |
| warehouses | ✅ Full | ✅ Full | 👁️ | 👁️ | 🚫 |
| stock | ✅ Full | ✅ Full | ✅ | 👁️ | 🚫 |
| stockMovements | ✅ Full | ✅ Full | ✅ | 👁️ | 🚫 |
| suppliers | ✅ Full | ✅ Full | 👁️ | 👁️ | 🚫 |
| **Procurement** | | | | | |
| purchaseOrders | ✅ Full | ✅ Full | ✅ | 👁️ | 🚫 |
| purchaseRequisitions | ✅ Full | ✅ Full | ✅ | 👁️ | 🚫 |
| purchaseReturns | ✅ Full | ✅ Full | ✅ | 👁️ | 🚫 |
| **Sales** | | | | | |
| salesOrders | ✅ Full | ✅ Full | ✅ | 👁️ | 👁️ Own |
| salesQuotations | ✅ Full | ✅ Full | ✅ | 👁️ | 🚫 |
| deliveryChallans | ✅ Full | ✅ Full | ✅ | 👁️ | 🚫 |
| salesReturns | ✅ Full | ✅ Full | ✅ | 👁️ | 🚫 |
| customers | ✅ Full | ✅ Full | ✅ | 👁️ | 👁️ Own |
| **CRM** | | | | | |
| accounts | ✅ Full | ✅ Full | ✅ | 🚫 | 🚫 |
| contacts | ✅ Full | ✅ Full | ✅ | 🚫 | 🚫 |
| leads | ✅ Full | ✅ Full | ✅ | 🚫 | 🚫 |
| opportunities | ✅ Full | ✅ Full | ✅ | 🚫 | 🚫 |
| presales | ✅ Full | ✅ Full | ✅ | 🚫 | 🚫 |
| cases | ✅ Full | ✅ Full | ✅ | 🚫 | 🚫 |
| activities | ✅ Full | ✅ Full | ✅ | 🚫 | 🚫 |
| **Manufacturing** | | | | | |
| bom | ✅ Full | ✅ Full | 👁️ | 🚫 | 🚫 |
| productionOrders | ✅ Full | ✅ Full | 👁️ | 🚫 | 🚫 |
| **Finance** | | | | | |
| expenses | ✅ Full | ✅ Full | 🚫 | 🚫 | 🚫 |
| profitLossReports | ✅ Full | ✅ Full | 👁️ | 🚫 | 🚫 |
| billing | ✅ Full | ✅ Full | 👁️ | 🚫 | 🚫 |
| **System** | | | | | |
| approvals | ✅ Full | ✅ Full | ✅ | 🚫 | 🚫 |
| dataImportExport | ✅ Full | ✅ Full | 👁️ | 🚫 | 🚫 |
| auditLogs | ✅ Full | 👁️ | 🚫 | 🚫 | 🚫 |
| monitoring | ✅ Full | 🚫 | 🚫 | 🚫 | 🚫 |
| racks | ✅ Full | ✅ Full | 👁️ | 🚫 | 🚫 |
| bins | ✅ Full | ✅ Full | 👁️ | 🚫 | 🚫 |
| **Collaboration** | | | | | |
| chat | ✅ Full | ✅ Full | ✅ | 👁️ | 🚫 |
| teamsChat | ✅ Full | ✅ Full | ✅ | 👁️ | 🚫 |
| notifications | ✅ Full | ✅ Full | ✅ | 👁️ | 👁️ Own |

---

## Scope Notes

| Scope Type | Applies To | How It Works |
|------------|-----------|--------------|
| **Company-scoped** | admin (role 2) | Admin can only access data belonging to their `CompanyId`. Cannot cross companies. |
| **Team-scoped** | manager (role 3) | Manager sees only users who report to them (via `ReportingManagerId` recursive CTE). Queries get filtered via `getAccessibleUserIds()`. |
| **Department-scoped** | manager (role 3) | If `DepartmentId` is set, manager can filter to department members. |
| **Self-scoped** | employee (role 4) | Employee sees only their own profile, own orders, own tasks. |
| **Self-scoped** | viewer (role 5) | Viewer sees only own orders, invoices, profile. Locked by `CUSTOMER_ALLOWED_MODULES` in `rbac.js`. |

---

## Permission Actions (per module)

| Action | HTTP Method | Description |
|--------|-------------|-------------|
| view | GET | Read/list/view resources |
| create | POST | Create new resources |
| edit | PUT/PATCH | Update existing resources |
| delete | DELETE | Remove/soft-delete resources |
| export | GET (export endpoints) | Export data (CSV, Excel, PDF) |

---

## Action-by-Action Breakdown for Manager (role 3)

| Module | view | create | edit | delete | export | Scope |
|--------|------|--------|------|--------|--------|-------|
| users | ✅ | 🚫 | ✅ | 🚫 | 🚫 | Team only |
| products | ✅ | ✅ | ✅ | 🚫 | ✅ | All |
| categories | ✅ | 🚫 | 🚫 | 🚫 | ✅ | All |
| units | ✅ | 🚫 | 🚫 | 🚫 | ✅ | All |
| warehouses | ✅ | 🚫 | ✅ | 🚫 | ✅ | All |
| stock | ✅ | ✅ | ✅ | 🚫 | ✅ | All |
| stockMovements | ✅ | ✅ | ✅ | 🚫 | ✅ | All |
| suppliers | ✅ | 🚫 | 🚫 | 🚫 | ✅ | All |
| purchaseOrders | ✅ | ✅ | ✅ | 🚫 | ✅ | All |
| purchaseRequisitions | ✅ | ✅ | ✅ | 🚫 | ✅ | All |
| purchaseReturns | ✅ | ✅ | ✅ | 🚫 | ✅ | All |
| salesOrders | ✅ | ✅ | ✅ | 🚫 | ✅ | All |
| salesQuotations | ✅ | ✅ | ✅ | 🚫 | ✅ | All |
| deliveryChallans | ✅ | ✅ | ✅ | 🚫 | ✅ | All |
| salesReturns | ✅ | ✅ | ✅ | 🚫 | ✅ | All |
| customers | ✅ | ✅ | ✅ | 🚫 | ✅ | All |
| accounts | ✅ | ✅ | ✅ | 🚫 | ✅ | All |
| contacts | ✅ | ✅ | ✅ | 🚫 | ✅ | All |
| leads | ✅ | ✅ | ✅ | 🚫 | ✅ | All |
| opportunities | ✅ | ✅ | ✅ | 🚫 | ✅ | All |
| presales | ✅ | ✅ | ✅ | 🚫 | ✅ | All |
| cases | ✅ | ✅ | ✅ | 🚫 | ✅ | All |
| reports | ✅ | 🚫 | 🚫 | 🚫 | ✅ | Team scope |
| chat | ✅ | ✅ | ✅ | 🚫 | 🚫 | All |
| dashboard | ✅ | 🚫 | 🚫 | 🚫 | ✅ | All |

---

## Action-by-Action Breakdown for Employee (role 4)

| Module | view | create | edit | delete | export | Scope |
|--------|------|--------|------|--------|--------|-------|
| dashboard | ✅ | 🚫 | 🚫 | 🚫 | 🚫 | Self |
| products | 👁️ | 🚫 | 🚫 | 🚫 | ✅ | All (read) |
| categories | 👁️ | 🚫 | 🚫 | 🚫 | ✅ | All (read) |
| units | 👁️ | 🚫 | 🚫 | 🚫 | ✅ | All (read) |
| brands | 👁️ | 🚫 | 🚫 | 🚫 | ✅ | All (read) |
| warehouses | 👁️ | 🚫 | 🚫 | 🚫 | ✅ | All (read) |
| stock | 👁️ | 🚫 | 🚫 | 🚫 | ✅ | All (read) |
| stockMovements | 👁️ | 🚫 | 🚫 | 🚫 | ✅ | All (read) |
| suppliers | 👁️ | 🚫 | 🚫 | 🚫 | ✅ | All (read) |
| purchaseOrders | 👁️ | 🚫 | 🚫 | 🚫 | ✅ | All (read) |
| salesOrders | 👁️ | 🚫 | 🚫 | 🚫 | ✅ | All (read) |
| customers | 👁️ | 🚫 | 🚫 | 🚫 | ✅ | All (read) |
| salesQuotations | 👁️ | 🚫 | 🚫 | 🚫 | ✅ | All (read) |
| chat | 👁️ | 🚫 | 🚫 | 🚫 | 🚫 | Assigned only |

---

## Action-by-Action Breakdown for Viewer/Customer (role 5)

| Module | view | create | edit | delete | export | Scope |
|--------|------|--------|------|--------|--------|-------|
| salesOrders | ✅ | 🚫 | 🚫 | 🚫 | 🚫 | Own orders only |
| invoices | ✅ | 🚫 | 🚫 | 🚫 | 🚫 | Own invoices only |
| customers | ✅ | 🚫 | 🚫 | 🚫 | 🚫 | Own profile only |
| notifications | ✅ | 🚫 | 🚫 | 🚫 | 🚫 | Own notifications |

---

## Resource:Action Pairs (Complete List)

```
dashboard:view, dashboard:create, dashboard:edit, dashboard:delete, dashboard:export
users:view, users:create, users:edit, users:delete, users:export
roles:view, roles:create, roles:edit, roles:delete, roles:export
companies:view, companies:create, companies:edit, companies:delete, companies:export
settings:view, settings:create, settings:edit, settings:delete, settings:export
products:view, products:create, products:edit, products:delete, products:export
categories:view, categories:create, categories:edit, categories:delete, categories:export
units:view, units:create, units:edit, units:delete, units:export
brands:view, brands:create, brands:edit, brands:delete, brands:export
warehouses:view, warehouses:create, warehouses:edit, warehouses:delete, warehouses:export
stock:view, stock:create, stock:edit, stock:delete, stock:export
stockMovements:view, stockMovements:create, stockMovements:edit, stockMovements:delete, stockMovements:export
suppliers:view, suppliers:create, suppliers:edit, suppliers:delete, suppliers:export
purchaseOrders:view, purchaseOrders:create, purchaseOrders:edit, purchaseOrders:delete, purchaseOrders:export
purchaseRequisitions:view, purchaseRequisitions:create, purchaseRequisitions:edit, purchaseRequisitions:delete, purchaseRequisitions:export
purchaseReturns:view, purchaseReturns:create, purchaseReturns:edit, purchaseReturns:delete, purchaseReturns:export
salesOrders:view, salesOrders:create, salesOrders:edit, salesOrders:delete, salesOrders:export
salesQuotations:view, salesQuotations:create, salesQuotations:edit, salesQuotations:delete, salesQuotations:export
deliveryChallans:view, deliveryChallans:create, deliveryChallans:edit, deliveryChallans:delete, deliveryChallans:export
salesReturns:view, salesReturns:create, salesReturns:edit, salesReturns:delete, salesReturns:export
customers:view, customers:create, customers:edit, customers:delete, customers:export
accounts:view, accounts:create, accounts:edit, accounts:delete, accounts:export
contacts:view, contacts:create, contacts:edit, contacts:delete, contacts:export
leads:view, leads:create, leads:edit, leads:delete, leads:export
opportunities:view, opportunities:create, opportunities:edit, opportunities:delete, opportunities:export
presales:view, presales:create, presales:edit, presales:delete, presales:export
cases:view, cases:create, cases:edit, cases:delete, cases:export
activities:view, activities:create, activities:edit, activities:delete, activities:export
bom:view, bom:create, bom:edit, bom:delete, bom:export
productionOrders:view, productionOrders:create, productionOrders:edit, productionOrders:delete, productionOrders:export
expenses:view, expenses:create, expenses:edit, expenses:delete, expenses:export
profitLossReports:view, profitLossReports:create, profitLossReports:edit, profitLossReports:delete, profitLossReports:export
billing:view, billing:create, billing:edit, billing:delete, billing:export
approvals:view, approvals:create, approvals:edit, approvals:delete, approvals:export
dataImportExport:view, dataImportExport:create, dataImportExport:edit, dataImportExport:delete, dataImportExport:export
auditLogs:view, auditLogs:create, auditLogs:edit, auditLogs:delete, auditLogs:export
monitoring:view, monitoring:create, monitoring:edit, monitoring:delete, monitoring:export
racks:view, racks:create, racks:edit, racks:delete, racks:export
bins:view, bins:create, bins:edit, bins:delete, bins:export
chat:view, chat:create, chat:edit, chat:delete, chat:export
teamsChat:view, teamsChat:create, teamsChat:edit, teamsChat:delete, teamsChat:export
notifications:view, notifications:create, notifications:edit, notifications:delete, notifications:export
reports:view, reports:create, reports:edit, reports:delete, reports:export
```

**Total: 44 modules × 5 actions = 220 resource:action pairs**

---

## Migration Mapping: Old 20 Roles → New 5 Roles

| Old Role ID | Old Name | Maps To | Notes |
|-------------|----------|---------|-------|
| 1 | Super Admin | **superadmin (1)** | Direct 1:1 mapping |
| 2 | Company Admin | **admin (2)** | Direct 1:1 mapping |
| 3 | Branch Manager | **manager (3)** | Keep as baseline for manager permissions |
| 4 | Inventory Manager | **manager (3)** | May need custom permissions override |
| 5 | Store Keeper | **employee (4)** | May need custom permissions for stock mgmt |
| 6 | Purchase Manager | **manager (3)** | May need custom permissions for procurement |
| 7 | Purchase Executive | **employee (4)** | May need custom permissions for procurement |
| 8 | Sales Manager | **manager (3)** | May need custom permissions for sales |
| 9 | Sales Executive | **employee (4)** | May need custom permissions for sales |
| 10 | Production Manager | **manager (3)** | May need custom permissions for mfg |
| 11 | Production Supervisor | **employee (4)** | May need custom permissions for mfg |
| 12 | Production Operator | **employee (4)** | Basic employee access |
| 13 | Quality Manager | **manager (3)** | May need custom permissions for QA |
| 14 | Quality Inspector | **employee (4)** | May need custom permissions for QA |
| 15 | Finance Manager | **manager (3)** | May need custom permissions for finance |
| 16 | Accountant | **employee (4)** | May need custom permissions for finance |
| 17 | CRM Manager | **manager (3)** | May need custom permissions for CRM |
| 18 | CRM Executive | **employee (4)** | May need custom permissions for CRM |
| 19 | HR Manager | **manager (3)** | May need custom permissions for HR |
| 20 | Employee | **employee (4)** | Direct 1:1 mapping |

> **Strategy:** The 5 canonical roles get conservative default permissions. Specialized users from old roles 3-19 get custom JSONB permission overrides stored in `Roles.Permissions` to match their old role's capabilities exactly.