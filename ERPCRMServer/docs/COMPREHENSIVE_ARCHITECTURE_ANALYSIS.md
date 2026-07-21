# ERP/CRM Project-Wide Database Impact and Role-Based Access Analysis

**Date:** 2026-07-16  
**Analyst:** Senior PostgreSQL Database Architect / ERP Security Engineer  
**Project:** ERPCRMServer (Node.js + PostgreSQL)

---

## A. Executive Summary

### Project Architecture
The ERPCRMServer is a Node.js/Express application using PostgreSQL as its database. It implements a modular architecture with Inventory, CRM, Finance, Production, and System modules. Authentication uses JWT tokens with revocation support. Authorization uses a 5-role RBAC system (superadmin=1, admin=2, manager=3, employee=4, customer=5) with granular module-action permissions stored as JSON in the `Roles.Permissions` column.

### Main Modules
1. **Inventory** - Products, Stock, Warehouses, Batches, Serials, GRN, Stock Transfers, Adjustments
2. **Purchasing** - Purchase Requisitions, Purchase Orders, Purchase Returns
3. **Sales** - Sales Quotations, Sales Orders, Delivery Challans, Sales Returns
4. **CRM** - Accounts, Contacts, Leads, Opportunities, Activities, Cases, Presales
5. **Finance** - Invoices, Payments, Expenses, Profit/Loss Reports
6. **Production** - BOM, Production Orders, Production Tracking, Quality Control
7. **System** - Companies, Users, Roles, Permissions, Audit, Notifications, Approvals

### Inventory Model
- **Authoritative source:** `ProductStockPerWarehouse.Quantity` (with CHECK constraint >= 0)
- **Available quantity:** `ProductStockPerWarehouse.AvailableQuantity` is a **generated column** (`Quantity - ReservedQuantity`) — automatically recalculated by PostgreSQL
- **Reserved quantity:** `ProductStockPerWarehouse.ReservedQuantity` (CHECK >= 0)
- **Batch tracking:** `Batches.Quantity` — independently maintained, **not** synchronized by database triggers
- **Serial tracking:** `SerialNumbers.Status` — independently maintained
- **Stock movements:** `StockMovements` — immutable ledger, manually inserted by controllers
- **Product-level stock:** `Products.StockQuantity` — **manually maintained, at risk of inconsistency** (not synchronized with warehouse stock)

### Current RBAC Model
- 5 hardcoded roles: superadmin (1), admin (2), manager (3), employee (4), customer (5)
- Permissions stored as JSON in `Roles.Permissions` column
- Global `rbacMiddleware` maps URL paths to module keys and HTTP methods to actions
- Superadmin bypasses all checks
- Customer locked to read-only on sales-orders, invoices, customers
- Admin has full access within company scope unless custom permissions are set
- Manager/employee use custom permissions or role defaults
- **Missing:** Branch scope, warehouse scope, record-level visibility (except CRM via hierarchyAccess), field-level permissions, approval enforcement

### Most Important Database Risks
1. **Products.StockQuantity is manually editable** — can become inconsistent with warehouse stock totals
2. **No database trigger synchronizes Products.StockQuantity** with ProductStockPerWarehouse
3. **Batch quantity not synchronized** with warehouse stock by database triggers
4. **Serial number count not validated** against stock quantity
5. **DeliveryChallans, SalesReturns, PurchaseReturns** use `pgCompat` (MSSQL-style queries) — may fail with PostgreSQL
6. **Inconsistent soft-delete naming** — `IsDelete` vs `IsDeleted` across tables
7. **Missing foreign keys** on many tables (DeliveryChallans, SalesReturns, PurchaseReturns, Production, etc.)
8. **Duplicate AuditLogs table** — defined in both InventoryManagement and CrmModels

### Most Important Security Risks
1. **No branch scope enforcement** in any controller or middleware
2. **No warehouse scope enforcement** in any controller or middleware
3. **No record-level visibility** for inventory records (only CRM has hierarchyAccess)
4. **CompanyId accepted from frontend** in many controllers without server-side validation
5. **No field-level permission checks** — any user with module access can edit all fields
6. **No approval enforcement** — ApprovalWorkflows table exists but no controller enforces it
7. **No segregation of duties** — same user can create and approve their own transactions
8. **Hard delete available** on SalesOrders, PurchaseOrders, ProductStockPerWarehouse
9. **No row locking** for stock operations (except GRN, StockTransfers, StockAdjustments use transactions but no `FOR UPDATE`)
10. **No idempotency protection** — duplicate requests could post duplicate stock movements

### Most Important Workflow Risks
1. **Sales order status changes do not affect stock** — no reservation, no dispatch deduction
2. **Delivery challans do not deduct stock** — no integration with ProductStockPerWarehouse
3. **Sales returns do not restore stock** — no integration with ProductStockPerWarehouse
4. **Purchase returns do not reduce stock** — no integration with ProductStockPerWarehouse
5. **Stock transfers immediately add to destination** — no "In Transit" state, no approval workflow
6. **Stock adjustments immediately change stock** — no approval enforcement despite Status field
7. **Production does not consume raw materials or produce finished goods** — no stock integration
8. **No audit logging in most controllers** — only CRM CRUD factory and some inventory controllers log
9. **No notification creation in any controller**

---

## B. Project Structure Reviewed

### Folders and Files Inspected

| Folder | Files |
|--------|-------|
| `ERPCRMServer/` | `server.js` |
| `ERPCRMServer/config/` | `db.js` |
| `ERPCRMServer/middlewares/` | `authMiddleware.js`, `rbac.js`, `validation.js`, `upload.js`, `uploadMiddleware.js`, `prometheusMetrics.js` |
| `ERPCRMServer/Models/` | `initModels.js`, `Tables.text` |
| `ERPCRMServer/Models/InventoryManagement/` | All 25 model files |
| `ERPCRMServer/Models/CrmModels/` | All 20 model files |
| `ERPCRMServer/Models/Users/` | `userModel.js`, `companyModel.js`, `Roles.js`, `userTypeModel.js` |
| `ERPCRMServer/Models/System/` | `platformCore.js`, `AuditEvents.js`, `CompanySettings.js`, etc. |
| `ERPCRMServer/Models/Token/` | `tokenModel.js` |
| `ERPCRMServer/controllers/InventoryApis/` | All 25 controller files |
| `ERPCRMServer/controllers/CrmApi/` | `crmCrudFactory.js`, `entityControllers.js`, `crmAccess.js`, etc. |
| `ERPCRMServer/controllers/UserApis/` | `userController.js`, `roleController.js`, `auditLogController.js` |
| `ERPCRMServer/controllers/System/` | `tableCrudController.js`, `reportController.js`, etc. |
| `ERPCRMServer/routes/Inventory/` | `inventoryIndex.js` and all route files |
| `ERPCRMServer/routes/Crm/` | `crmIndex.js` |
| `ERPCRMServer/utils/` | `hierarchyAccess.js`, `auditLogger.js`, `permissionChecker.js`, `companyScope.js`, `restrictedActionAccess.js`, `auditEvents.js` |
| `ERPCRMServer/migrations/` | `001_add_token_rotation.sql`, `002_rbac_roles_and_permissions.sql` |

---

## C. Complete Table Catalogue

### CRM Module

| Table | Purpose | PK | Company Scoped | Branch Scoped | Warehouse Scoped | Soft Delete | Audit Fields | Main Parents | Main Children |
|-------|---------|----|---------------|--------------|-----------------|-------------|--------------|--------------|---------------|
| Accounts | Customer accounts | Id | Yes (CompanyId) | No | No | IsDeleted | CreatedBy, UpdatedBy, CreatedAt, UpdatedAt | Companies, Users | Contacts, Leads, Opportunities |
| Contacts | Contact persons | Id | Yes (CompanyId) | No | No | IsDeleted | CreatedBy, UpdatedBy, CreatedAt, UpdatedAt | Companies, Accounts | Leads |
| Leads | Sales leads | Id | Yes (CompanyId) | No | No | IsDeleted | CreatedBy, UpdatedAt, CreatedAt | Companies, Accounts, Contacts, LeadSources, ProductCategories, FollowupTypes, Industries | Opportunities, Presales |
| Opportunities | Sales opportunities | Id | Yes (CompanyId) | No | No | IsDeleted | CreatedBy, UpdatedAt, CreatedAt | Companies, Accounts, Contacts, SalesStages, LeadSources, ProductCategories, Industries | Presales, Quotes |
| Activities | CRM activities | Id | Yes (CompanyId) | No | No | No | CreatedBy, CreatedAt | Companies, Users | - |
| Cases | Support cases | Id | Yes (CompanyId) | No | No | IsDeleted | CreatedBy, CreatedAt | Companies, Users | - |
| Retentions | Customer retention | Id | Yes (CompanyId) | No | No | IsDeleted | CreatedBy, CreatedAt | Companies, Users | - |
| Presales | Pre-sales activities | Id | Yes (CompanyId) | No | No | IsDeleted | CreatedBy, UpdatedAt, CreatedAt | Companies, Leads, Opportunities, TaskTypes | PresalesAssignments |
| Quotes | Sales quotes | Id | Yes (CompanyId) | No | No | IsDeleted | CreatedBy, CreatedAt | Companies, Opportunities | - |
| Invoices | CRM invoices | Id | Yes (CompanyId) | No | No | IsDeleted | CreatedBy, CreatedAt | Companies, Opportunities | Payments |
| Payments | CRM payments | Id | Yes (CompanyId) | No | No | IsDeleted | CreatedBy, CreatedAt | Companies, Invoices | - |
| Comments | Polymorphic comments | Id | No (EntityType/EntityId) | No | No | No | CommentedBy, CreatedAt | Polymorphic | - |
| Assignments | Record assignments | Id | No (EntityType/EntityId) | No | No | No | AssignedBy, CreatedAt | Polymorphic, Users | - |
| EntityVisibility | Record sharing | Id | No (EntityType/EntityId) | No | No | No | CreatedAt | Polymorphic, Groups | - |
| Groups | User groups | Id | Yes (CompanyId) | No | No | No | CreatedAt | Companies | GroupMembers |
| GroupMembers | Group membership | Id | No | No | No | No | CreatedAt | Groups, Users | - |
| LeadSources | Lead source master | Id | No | No | No | No | - | - | Leads |
| SalesStages | Sales stage master | Id | No | No | No | No | - | - | Opportunities |
| Industries | Industry master | Id | No | No | No | No | - | - | Accounts, Leads, Opportunities |
| FollowupTypes | Follow-up type master | Id | No | No | No | IsActive | - | - | Leads |
| TaskTypes | Task type master | Id | No | No | No | No | CreatedAt | - | Presales |
| OpportunityProducts | Opportunity line items | Id | No | No | No | No | CreatedAt | Opportunities, Products | - |

### Inventory Module

| Table | Purpose | PK | Company Scoped | Branch Scoped | Warehouse Scoped | Soft Delete | Audit Fields | Main Parents | Main Children |
|-------|---------|----|---------------|--------------|-----------------|-------------|--------------|--------------|---------------|
| Products | Product master | Id | Yes (CompanyId) | No | No | IsDelete | CreatedBy, UpdatedBy, CreatedAt, UpdatedAt | Companies, ProductCategories, Units | ProductStockPerWarehouse, Batches, SerialNumbers, StockMovements, GRNItems, etc. |
| ProductCategories | Product categories | Id | No | No | No | No | CreatedAt | - | Products |
| Units | Unit of measure | Id | No | No | No | No | CreatedAt | - | Products |
| Brands | Product brands | Id | No | No | No | IsDelete | CreatedAt | - | Products |
| Warehouses | Warehouse master | Id | Yes (CompanyId) | No | No | IsDelete | CreatedBy, CreatedAt | Companies | ProductStockPerWarehouse, WarehouseRacks, WarehouseBins |
| ProductStockPerWarehouse | Stock per warehouse | Id | No (via Product.CompanyId) | No | Yes (WarehouseId) | IsActive | CreatedBy, UpdatedBy, CreatedAt, UpdatedAt | Products, Warehouses | - |
| Batches | Batch tracking | Id | Yes (CompanyId) | No | Yes (WarehouseId) | IsActive | CreatedBy, CreatedAt, UpdatedAt | Products, Suppliers, PurchaseOrders, Warehouses | SerialNumbers |
| SerialNumbers | Serial number tracking | Id | Yes (CompanyId) | No | Yes (WarehouseId) | No | CreatedBy, CreatedAt, UpdatedAt | Products, Batches, Warehouses | - |
| StockMovements | Inventory ledger | Id | No | No | Yes (WarehouseId) | No | CreatedBy, CreatedAt | Products, Warehouses | - |
| Suppliers | Supplier master | Id | Yes (CompanyId) | No | No | IsDelete | CreatedBy, CreatedAt | Companies | PurchaseOrders, GRN, PurchaseReturns |
| Customers | Customer master | Id | Yes (CompanyId) | No | No | IsDelete | CreatedBy, CreatedAt | Companies | SalesOrders, DeliveryChallans, SalesReturns |
| PurchaseOrders | Purchase orders | Id | Yes (CompanyId) | No | No | No (Status='Cancelled') | CreatedBy, CreatedAt, UpdatedAt | Companies, Suppliers | PurchaseOrderItems, GRN |
| PurchaseOrderItems | PO line items | Id | No | No | No | No | CreatedAt | PurchaseOrders, Products | - |
| GRN | Goods receipt notes | Id | Yes (CompanyId) | No | Yes (WarehouseId) | IsDeleted | CreatedBy, UpdatedBy, CreatedAt, UpdatedAt | Companies, PurchaseOrders, Suppliers, Warehouses | GRNItems |
| GRNItems | GRN line items | Id | No | No | No | No | CreatedAt | GRN, Products | - |
| StockTransfers | Stock transfers | Id | Yes (CompanyId) | No | Yes (From/To Warehouse) | IsDeleted | CreatedBy, ApprovedBy, CreatedAt, UpdatedAt | Companies, Warehouses | StockTransferItems |
| StockTransferItems | Transfer line items | Id | No | No | No | No | CreatedAt | StockTransfers, Products | - |
| StockAdjustments | Stock adjustments | Id | Yes (CompanyId) | No | Yes (WarehouseId) | IsDeleted | CreatedBy, ApprovedBy, CreatedAt, UpdatedAt | Companies, Warehouses | StockAdjustmentItems |
| StockAdjustmentItems | Adjustment line items | Id | No | No | No | No | CreatedAt | StockAdjustments, Products | - |
| PurchaseRequisitions | Purchase requisitions | Id | Yes (CompanyId) | BranchId | No | IsDeleted | CreatedAt, UpdatedAt | Companies | PurchaseRequisitionItems |
| PurchaseRequisitionItems | PR line items | Id | No | No | No | IsDeleted | CreatedAt | PurchaseRequisitions, Products | - |
| PurchaseReturns | Purchase returns | Id | Yes (CompanyId) | BranchId | WarehouseId | IsDeleted | CreatedAt, UpdatedAt | Companies, PurchaseOrders, Suppliers | PurchaseReturnItems |
| PurchaseReturnItems | PR line items | Id | No | No | No | IsDeleted | CreatedAt | PurchaseReturns, Products | - |
| SalesQuotations | Sales quotations | Id | Yes (CompanyId) | BranchId | No | IsDeleted | CreatedAt, UpdatedAt | Companies, Customers | SalesQuotationItems |
| SalesQuotationItems | SQ line items | Id | No | No | No | IsDeleted | CreatedAt | SalesQuotations, Products | - |
| SalesOrders | Sales orders | Id | Yes (CompanyId) | No | No | IsDeleted | CreatedBy, UpdatedBy, CreatedAt, UpdatedAt | Companies, Customers | SalesOrderItems, DeliveryChallans, SalesReturns |
| SalesOrderItems | SO line items | Id | No | No | No | No | CreatedAt | SalesOrders, Products | - |
| DeliveryChallans | Delivery challans | Id | CompanyId (INT) | BranchId (INT) | WarehouseId (INT) | IsDeleted | CreatedAt, UpdatedAt | SalesOrders, Customers | DeliveryChallanItems |
| DeliveryChallanItems | DC line items | Id | No | No | No | IsDeleted | CreatedAt | DeliveryChallans, Products | - |
| SalesReturns | Sales returns | Id | CompanyId (INT) | BranchId (INT) | WarehouseId (INT) | IsDeleted | CreatedAt, UpdatedAt | SalesOrders, Customers | SalesReturnItems |
| SalesReturnItems | SR line items | Id | No | No | No | IsDeleted | CreatedAt | SalesReturns, Products | - |
| Taxes | Tax master | Id | No | No | No | No | CreatedAt | - | ProductTaxMap |
| ProductTaxMap | Product-tax mapping | Id | No | No | No | No | CreatedAt | Products, Taxes | - |
| ProfitLossReports | P&L reports | Id | No | No | No | No | CreatedAt | - | - |

### Production Module

| Table | Purpose | PK | Company Scoped | Branch Scoped | Warehouse Scoped | Soft Delete | Audit Fields | Main Parents | Main Children |
|-------|---------|----|---------------|--------------|-----------------|-------------|--------------|--------------|---------------|
| BOM | Bill of materials | Id | CompanyId (INT) | No | No | IsDeleted | CreatedAt, UpdatedAt | Products | BOMItems |
| BOMItems | BOM line items | Id | No | No | No | IsDeleted | CreatedAt | BOM, Products | - |
| ProductionOrders | Production orders | Id | CompanyId (INT) | No | WarehouseId (INT) | IsDeleted | CreatedAt, UpdatedAt | BOM, Products | ProductionTracking |
| ProductionTracking | Production tracking | Id | No | No | No | No | CreatedAt | ProductionOrders | - |
| QualityControl | Quality inspections | Id | Yes (CompanyId) | No | WarehouseId (INT) | IsDeleted | CreatedBy, CreatedAt, UpdatedAt | Companies, Products, Users | QualityControlItems |
| QualityControlItems | QC checkpoints | Id | No | No | No | No | CreatedAt | QualityControl | - |

### Finance Module

| Table | Purpose | PK | Company Scoped | Branch Scoped | Warehouse Scoped | Soft Delete | Audit Fields | Main Parents | Main Children |
|-------|---------|----|---------------|--------------|-----------------|-------------|--------------|--------------|---------------|
| Expenses | Expense records | Id | CompanyId (INT) | BranchId (INT) | No | IsDeleted | CreatedAt, UpdatedAt | Companies | - |

### Administration & Security Module

| Table | Purpose | PK | Company Scoped | Branch Scoped | Warehouse Scoped | Soft Delete | Audit Fields | Main Parents | Main Children |
|-------|---------|----|---------------|--------------|-----------------|-------------|--------------|--------------|---------------|
| Companies | Company master | Id | N/A | No | No | IsDelete | CreatedAt, UpdatedAt | - | Users, Products, etc. |
| Users | User accounts | UserId | Yes (CompanyId) | No | No | IsDelete | CreatedAt, UpdatedAt | Companies, Roles, Departments, Designations | All CreatedBy references |
| Roles | Role definitions | Id | No | No | No | IsActive | CreatedAt | - | Users |
| Permissions | Permission definitions | Id | No | No | No | No | - | - | RolePermissions |
| RolePermissions | Role-permission mapping | Id | No | No | No | No | - | Roles, Modules, Permissions | - |
| UserPermissions | User-permission overrides | Id | No | No | No | No | - | Users, Permissions | - |
| Departments | Department master | Id | Yes (CompanyId) | No | No | No | - | Companies | Users |
| Designations | Designation master | Id | Yes (CompanyId) | No | No | No | - | Companies | Users |
| Notifications | User notifications | Id | CompanyId (INT) | No | No | No | CreatedAt | Users | - |
| ApprovalWorkflows | Approval requests | Id | CompanyId (INT) | No | No | No | CreatedAt, UpdatedAt | Users | - |
| AuditLogs (Inventory) | Audit trail | Id | No | No | No | No | ChangedBy, ChangeTime | Users | - |
| AuditEvents (System) | Audit events | Id | No | No | No | No | UserId, CreatedAt | Users | - |
| SecurityLogs | Security events | Id | No | No | No | No | CreatedAt | Users | - |
| UserSessions | User sessions | Id | No | No | No | No | - | Users | - |
| Documents | File attachments | Id | Yes (CompanyId) | No | No | IsDeleted | UploadedBy, UploadedAt | Companies, Users | DocumentVersions, DocumentAccessLogs |
| ApiIntegrations | API integrations | Id | Yes (CompanyId) | No | No | IsActive | CreatedAt | Companies | ApiEndpoints |
| ApiEndpoints | API endpoints | Id | No | No | No | No | - | ApiIntegrations | ApiExecutionLogs |
| ApiExecutionLogs | API execution logs | Id | No | No | No | No | CreatedAt | ApiIntegrations, ApiEndpoints, Users | ApiFailureAlerts |
| ApiFailureAlerts | API failure alerts | Id | No | No | No | No | CreatedAt | ApiExecutionLogs, Users | - |

---

## D. Database Relationship Map

### Foreign Key Analysis

| Source Table | Source Column | Target Table | Target Column | Delete Behavior | DB Enforced | Risk |
|-------------|---------------|-------------|---------------|-----------------|-------------|------|
| Products | CategoryId | ProductCategories | Id | SET NULL | Yes | Low |
| Products | UnitId | Units | Id | SET NULL | Yes | Low |
| Products | CompanyId | Companies | Id | CASCADE | Yes | **CRITICAL** — Deleting a company cascades to all products |
| Products | CreatedBy | Users | UserId | SET NULL | Yes | Low |
| Products | UpdatedBy | Users | UserId | SET NULL | Yes | Low |
| ProductStockPerWarehouse | ProductId | Products | Id | CASCADE | Yes | **HIGH** — Deleting a product removes all stock records |
| ProductStockPerWarehouse | WarehouseId | Warehouses | Id | CASCADE | Yes | **HIGH** — Deleting a warehouse removes all stock records |
| ProductStockPerWarehouse | CreatedBy | Users | UserId | SET NULL | Yes | Low |
| ProductStockPerWarehouse | UpdatedBy | Users | UserId | SET NULL | Yes | Low |
| StockMovements | ProductId | Products | Id | RESTRICT (default) | Yes | Low |
| StockMovements | WarehouseId | Warehouses | Id | RESTRICT (default) | Yes | Low |
| StockMovements | CreatedBy | Users | UserId | SET NULL (default) | Yes | Low |
| PurchaseOrders | SupplierId | Suppliers | Id | SET NULL | Yes | Low |
| PurchaseOrders | CompanyId | Companies | Id | CASCADE | Yes | **CRITICAL** |
| PurchaseOrders | CreatedBy | Users | UserId | SET NULL (default) | Yes | Low |
| SalesOrders | CustomerId | Customers | Id | RESTRICT | Yes | Low |
| SalesOrders | CompanyId | Companies | Id | CASCADE | Yes | **CRITICAL** |
| SalesOrders | CreatedBy | Users | UserId | SET NULL | Yes | Low |
| SalesOrders | UpdatedBy | Users | UserId | SET NULL | Yes | Low |
| GRN | PurchaseOrderId | PurchaseOrders | Id | SET NULL | Yes | Low |
| GRN | SupplierId | Suppliers | Id | SET NULL | Yes | Low |
| GRN | WarehouseId | Warehouses | Id | SET NULL | Yes | Low |
| GRN | CompanyId | Companies | Id | CASCADE | Yes | **CRITICAL** |
| GRN | CreatedBy | Users | UserId | SET NULL | Yes | Low |
| GRNItems | GRNId | GRN | Id | CASCADE | Yes | Low |
| GRNItems | ProductId | Products | Id | RESTRICT | Yes | Low |
| StockTransfers | FromWarehouseId | Warehouses | Id | SET NULL | Yes | Low |
| StockTransfers | ToWarehouseId | Warehouses | Id | SET NULL | Yes | Low |
| StockTransfers | CompanyId | Companies | Id | CASCADE | Yes | **CRITICAL** |
| StockTransfers | CreatedBy | Users | UserId | SET NULL | Yes | Low |
| StockTransfers | ApprovedBy | Users | UserId | SET NULL | Yes | Low |
| StockTransferItems | StockTransferId | StockTransfers | Id | CASCADE | Yes | Low |
| StockTransferItems | ProductId | Products | Id | RESTRICT | Yes | Low |
| StockAdjustments | WarehouseId | Warehouses | Id | SET NULL | Yes | Low |
| StockAdjustments | CompanyId | Companies | Id | CASCADE | Yes | **CRITICAL** |
| StockAdjustments | CreatedBy | Users | UserId | SET NULL | Yes | Low |
| StockAdjustments | ApprovedBy | Users | UserId | SET NULL | Yes | Low |
| StockAdjustmentItems | AdjustmentId | StockAdjustments | Id | CASCADE | Yes | Low |
| StockAdjustmentItems | ProductId | Products | Id | RESTRICT | Yes | Low |
| Batches | ProductId | Products | Id | CASCADE | Yes | **HIGH** |
| Batches | SupplierId | Suppliers | Id | SET NULL | Yes | Low |
| Batches | PurchaseOrderId | PurchaseOrders | Id | SET NULL | Yes | Low |
| Batches | WarehouseId | Warehouses | Id | SET NULL | Yes | Low |
| Batches | CompanyId | Companies | Id | CASCADE | Yes | **CRITICAL** |
| Batches | CreatedBy | Users | UserId | SET NULL | Yes | Low |
| SerialNumbers | ProductId | Products | Id | CASCADE | Yes | **HIGH** |
| SerialNumbers | BatchId | Batches | Id | SET NULL | Yes | Low |
| SerialNumbers | WarehouseId | Warehouses | Id | SET NULL | Yes | Low |
| SerialNumbers | CompanyId | Companies | Id | CASCADE | Yes | **CRITICAL** |
| SerialNumbers | CreatedBy | Users | UserId | SET NULL | Yes | Low |

### Missing Foreign Keys (Application-Only Relationships)

| Source Table | Source Column | Expected Target | Risk |
|-------------|---------------|----------------|------|
| DeliveryChallans | SalesOrderId | SalesOrders.Id | **HIGH** — Orphan records possible |
| DeliveryChallans | CustomerId | Customers.Id | **HIGH** — Orphan records possible |
| DeliveryChallans | CompanyId | Companies.Id | **HIGH** — No referential integrity |
| DeliveryChallans | WarehouseId | Warehouses.Id | **HIGH** — No referential integrity |
| DeliveryChallanItems | ChallanId | DeliveryChallans.Id | **HIGH** — Orphan records possible |
| DeliveryChallanItems | ProductId | Products.Id | **HIGH** — Orphan records possible |
| DeliveryChallanItems | BatchId | Batches.Id | **MEDIUM** — Orphan records possible |
| SalesReturns | SalesOrderId | SalesOrders.Id | **HIGH** — Orphan records possible |
| SalesReturns | CustomerId | Customers.Id | **HIGH** — Orphan records possible |
| SalesReturns | CompanyId | Companies.Id | **HIGH** — No referential integrity |
| SalesReturns | WarehouseId | Warehouses.Id | **HIGH** — No referential integrity |
| SalesReturnItems | ReturnId | SalesReturns.Id | **HIGH** — Orphan records possible |
| SalesReturnItems | ProductId | Products.Id | **HIGH** — Orphan records possible |
| SalesReturnItems | BatchId | Batches.Id | **MEDIUM** — Orphan records possible |
| PurchaseReturns | PurchaseOrderId | PurchaseOrders.Id | **HIGH** — Orphan records possible |
| PurchaseReturns | SupplierId | Suppliers.Id | **HIGH** — Orphan records possible |
| PurchaseReturns | CompanyId | Companies.Id | **HIGH** — No referential integrity |
| PurchaseReturns | WarehouseId | Warehouses.Id | **HIGH** — No referential integrity |
| PurchaseReturnItems | ReturnId | PurchaseReturns.Id | **HIGH** — Orphan records possible |
| PurchaseReturnItems | ProductId | Products.Id | **HIGH** — Orphan records possible |
| PurchaseReturnItems | BatchId | Batches.Id | **MEDIUM** — Orphan records possible |
| ProductionOrders | BOMId | BOM.Id | **MEDIUM** — Orphan records possible |
| ProductionOrders | ProductId | Products.Id | **MEDIUM** — Orphan records possible |
| ProductionOrders | WarehouseId | Warehouses.Id | **MEDIUM** — No referential integrity |
| BOM | ProductId | Products.Id | **MEDIUM** — Orphan records possible |
| BOMItems | BOMId | BOM.Id | **MEDIUM** — Orphan records possible |
| BOMItems | ProductId | Products.Id | **MEDIUM** — Orphan records possible |
| Notifications | UserId | Users.UserId | **MEDIUM** — No FK constraint |
| Notifications | CompanyId | Companies.Id | **MEDIUM** — No FK constraint |
| ApprovalWorkflows | RequestedById | Users.UserId | **MEDIUM** — No FK constraint |
| ApprovalWorkflows | ApprovedById | Users.UserId | **MEDIUM** — No FK constraint |
| Expenses | CompanyId | Companies.Id | **MEDIUM** — No FK constraint |
| WarehouseRacks | WarehouseId | Warehouses.Id | **MEDIUM** — No FK constraint |
| WarehouseBins | WarehouseId | Warehouses.Id | **MEDIUM** — No FK constraint |
| WarehouseBins | RackId | WarehouseRacks.Id | **MEDIUM** — No FK constraint |
| WarehouseBins | ProductId | Products.Id | **MEDIUM** — No FK constraint |

### Polymorphic References

| Table | Type Column | ID Column | Validated In | Risk |
|-------|------------|-----------|-------------|------|
| Comments | EntityType | EntityId | Application (CRM CRUD factory) | **MEDIUM** — No DB validation of allowed types |
| Assignments | EntityType | EntityId | Application | **MEDIUM** — No DB validation |
| EntityVisibility | EntityType | EntityId | Application | **MEDIUM** — No DB validation |
| AuditEvents | EntityType | EntityId | Application | **MEDIUM** — No DB validation |
| ApprovalWorkflows | ModuleType | RecordId | Application | **MEDIUM** — No DB validation |
| Notifications | ReferenceType | ReferenceId | Application | **MEDIUM** — No DB validation |
| Documents | EntityType | EntityId | Application | **MEDIUM** — No DB validation |
| QualityControl | EntityType | EntityId | Application | **MEDIUM** — No DB validation |

---

## E. Inventory Source-of-Truth Analysis

### Current State

| Stock Field | Table | How Maintained | Authoritative? | Risk |
|------------|-------|---------------|---------------|------|
| Quantity | ProductStockPerWarehouse | Updated by GRN, StockTransfer, StockAdjustment controllers | **YES** | Low — has CHECK >= 0 |
| ReservedQuantity | ProductStockPerWarehouse | Updated by StockTransfer controller only | **PARTIAL** | **HIGH** — Only stock transfers use reservation |
| AvailableQuantity | ProductStockPerWarehouse | **GENERATED COLUMN** (Quantity - ReservedQuantity) | **YES** | Low — PostgreSQL auto-calculates |
| StockQuantity | Products | Manually set during create/update | **NO** | **CRITICAL** — Can become inconsistent |
| Quantity | Batches | Updated by GRN controller (ON CONFLICT DO UPDATE) | **PARTIAL** | **HIGH** — Not synchronized with stock changes |
| Status | SerialNumbers | Not updated by any controller except initial creation | **NO** | **HIGH** — Never updated after creation |
| CurrentOccupancy | WarehouseBins | Not updated by any controller | **NO** | **MEDIUM** — Never updated |

### Key Findings

1. **Products.StockQuantity is a duplicate risk.** It is set during product creation and can be manually edited via the update product endpoint. No database trigger or application logic synchronizes it with `ProductStockPerWarehouse.Quantity`. Reports using `Products.StockQuantity` will show incorrect values.

2. **ReservedQuantity is only used by StockTransfers.** The stock transfer controller increments `ReservedQuantity` at the source warehouse when creating a transfer. However, SalesOrders do not use reservation at all.

3. **Batch quantities are only updated by GRN.** The GRN controller uses `ON CONFLICT DO UPDATE` to increment batch quantity. No other controller (StockTransfer, StockAdjustment, SalesReturn, PurchaseReturn) updates batch quantities.

4. **Serial numbers are never updated after creation.** The `SerialNumbers.Status` field defaults to 'Available' but no controller changes it to 'Sold', 'Returned', 'Damaged', or 'Transferred'.

5. **StockMovements is the immutable ledger.** It is written by GRN (IN), StockTransfer (TRANSFER), and StockAdjustment (ADJUSTMENT) controllers. However, SalesOrders, DeliveryChallans, SalesReturns, and PurchaseReturns do not create stock movements.

### Recommended Model

```
Authoritative: ProductStockPerWarehouse.Quantity
Calculated:    ProductStockPerWarehouse.AvailableQuantity (generated column)
Detail:        Batches.Quantity (must be synchronized)
Traceability:  SerialNumbers.Status (must be updated)
Ledger:        StockMovements (immutable, all stock changes must create a record)
Cache:         Products.StockQuantity (remove or synchronize via trigger)
```

---

## F. Workflow Impact Maps

### F.1 Product Management

| Action | Direct Table | Indirect Tables | Stock Effect | Audit | Notification | Approval |
|--------|-------------|----------------|-------------|-------|-------------|----------|
| Create Product | Products | None | None (StockQuantity=0) | **MISSING** | No | No |
| Update Price | Products | None | None | **MISSING** | No | **RECOMMENDED** |
| Update Cost | Products | None | None | **MISSING** | No | **RECOMMENDED** |
| Update StockQuantity | Products | None | **MANUAL OVERRIDE** | **MISSING** | No | **REQUIRED** |
| Soft Delete | Products | None (SET NULL on FKs) | None | **MISSING** | No | **RECOMMENDED** |
| Hard Delete | Products | ProductStockPerWarehouse (CASCADE), Batches (CASCADE), SerialNumbers (CASCADE) | **DELETES ALL STOCK HISTORY** | **MISSING** | No | **NEVER ALLOW** |

**IMPLEMENTATION STATUS:**
- Products.StockQuantity is directly editable via `updateProduct` controller — **CRITICAL RISK**
- No audit logging in products controller
- No approval workflow for price/cost changes
- Hard delete cascades to destroy stock history

### F.2 Purchase Requisition

| Action | Direct Table | Indirect Tables | Stock Effect | Audit | Notification | Approval |
|--------|-------------|----------------|-------------|-------|-------------|----------|
| Create | PurchaseRequisitions | PurchaseRequisitionItems | None | **MISSING** | No | No |
| Approve | PurchaseRequisitions | None | None | **MISSING** | No | **RECOMMENDED** |
| Convert to PO | PurchaseRequisitions | PurchaseOrders | None | **MISSING** | No | No |
| Cancel | PurchaseRequisitions | None | None | **MISSING** | No | No |

**IMPLEMENTATION STATUS:**
- Basic CRUD exists via erpModules routes
- No stock impact (correct)
- No audit logging
- No approval enforcement

### F.3 Purchase Order

| Action | Direct Table | Indirect Tables | Stock Effect | Audit | Notification | Approval |
|--------|-------------|----------------|-------------|-------|-------------|----------|
| Create | PurchaseOrders | PurchaseOrderItems | None | **MISSING** | No | No |
| Approve (Status=Approved) | PurchaseOrders | None | None | **MISSING** | No | **RECOMMENDED** |
| Receive (Status=Received) | PurchaseOrders | None | **MISSING** — Should update PO status | **MISSING** | No | No |
| Cancel | PurchaseOrders | None | None | **MISSING** | No | No |
| Hard Delete | PurchaseOrders | PurchaseOrderItems (no FK), GRN (SET NULL) | **DESTRUCTIVE** | **MISSING** | No | **NEVER ALLOW** |

**IMPLEMENTATION STATUS:**
- Controller exists with full CRUD
- Status transitions validated (Draft, Pending, Approved, Sent, Received, Cancelled)
- No stock impact on PO (correct — stock increases at GRN)
- No audit logging
- No approval enforcement
- Hard delete available — **CRITICAL RISK**

### F.4 GRN (Goods Receipt Note)

| Action | Direct Table | Indirect Tables | Stock Effect | Audit | Notification | Approval |
|--------|-------------|----------------|-------------|-------|-------------|----------|
| Create | GRN, GRNItems | ProductStockPerWarehouse (+), Batches (+), StockMovements (IN), PurchaseOrderItems (ReceivedQuantity +) | **INCREASES** warehouse stock by accepted quantity | **MISSING** | **MISSING** | No |
| Approve | GRN | None | None (already applied at create) | **MISSING** | No | **RECOMMENDED** |
| Cancel | GRN | None | **MISSING** — Should reverse stock | **MISSING** | No | **REQUIRED** |

**IMPLEMENTATION STATUS:**
- **BEST IMPLEMENTED WORKFLOW** — Uses transaction, updates stock, creates batch, logs movement
- Stock increases by `QuantityAccepted` (not `QuantityReceived`)
- Creates/updates batch with `ON CONFLICT DO UPDATE`
- Updates `PurchaseOrderItems.ReceivedQuantity`
- **Missing:** Audit log, notification, approval, reversal on cancel
- **Missing:** `Products.StockQuantity` sync
- **Missing:** Serial number creation
- **Missing:** Row locking (`FOR UPDATE`)

### F.5 Purchase Return

| Action | Direct Table | Indirect Tables | Stock Effect | Audit | Notification | Approval |
|--------|-------------|----------------|-------------|-------|-------------|----------|
| Create | PurchaseReturns | PurchaseReturnItems | **MISSING** — Should reduce warehouse stock | **MISSING** | No | **RECOMMENDED** |
| Approve | PurchaseReturns | None | **MISSING** | **MISSING** | No | **REQUIRED** |
| Dispatch | PurchaseReturns | ProductStockPerWarehouse (-), Batches (-), StockMovements (OUT) | **MISSING** — Should reduce stock | **MISSING** | No | No |

**IMPLEMENTATION STATUS:**
- Uses `pgCompat` (MSSQL-style queries) — **MAY FAIL WITH POSTGRESQL**
- No foreign keys on any column
- No stock reduction
- No batch quantity update
- No stock movement creation
- No audit logging
- **CRITICAL RISK** — Returns do not affect inventory

### F.6 Sales Quotation

| Action | Direct Table | Indirect Tables | Stock Effect | Audit | Notification | Approval |
|--------|-------------|----------------|-------------|-------|-------------|----------|
| Create | SalesQuotations | SalesQuotationItems | None | **MISSING** | No | No |
| Convert to Order | SalesQuotations | SalesOrders | None | **MISSING** | No | No |

**IMPLEMENTATION STATUS:**
- Basic CRUD via erpModules
- No stock impact (correct for quotations)
- No audit logging

### F.7 Sales Order

| Action | Direct Table | Indirect Tables | Stock Effect | Audit | Notification | Approval |
|--------|-------------|----------------|-------------|-------|-------------|----------|
| Create | SalesOrders | SalesOrderItems | None | **MISSING** | No | No |
| Confirm (Status=Confirmed) | SalesOrders | None | **MISSING** — Should reserve stock | **MISSING** | No | **RECOMMENDED** |
| Process (Status=Processing) | SalesOrders | None | **MISSING** — Should reserve stock | **MISSING** | No | No |
| Ship (Status=Shipped) | SalesOrders | ProductStockPerWarehouse (-), StockMovements (OUT) | **MISSING** — Should deduct stock | **MISSING** | No | No |
| Deliver (Status=Delivered) | SalesOrders | None | **MISSING** — Should deduct stock if not done at Ship | **MISSING** | No | No |
| Cancel | SalesOrders | None | **MISSING** — Should release reservation | **MISSING** | No | No |
| Soft Delete | SalesOrders | None (sets IsDeleted=true, Status=Cancelled) | **MISSING** — Should release reservation | **MISSING** | No | **RECOMMENDED** |
| Hard Delete | SalesOrders | SalesOrderItems (no FK) | **DESTRUCTIVE** | **MISSING** | No | **NEVER ALLOW** |

**IMPLEMENTATION STATUS:**
- Controller has full CRUD with status validation
- **NO STOCK INTEGRATION AT ALL** — No reservation, no deduction, no movement
- NetAmount and BalanceAmount are **database-generated** via trigger
- SONumber is **database-generated** via trigger
- CustomerName is **database-automatically populated** via trigger
- No audit logging
- No approval enforcement
- Hard delete available — **CRITICAL RISK**

### F.8 Delivery Challan

| Action | Direct Table | Indirect Tables | Stock Effect | Audit | Notification | Approval |
|--------|-------------|----------------|-------------|-------|-------------|----------|
| Create | DeliveryChallans | DeliveryChallanItems | **MISSING** — Should deduct stock | **MISSING** | No | No |
| Update Status | DeliveryChallans | None | **MISSING** | **MISSING** | No | No |
| Delete | DeliveryChallans | DeliveryChallanItems | **MISSING** — Should reverse stock | **MISSING** | No | **REQUIRED** |

**IMPLEMENTATION STATUS:**
- Uses `pgCompat` (MSSQL-style queries) — **MAY FAIL WITH POSTGRESQL**
- No foreign keys
- No stock deduction
- No stock movement creation
- No audit logging
- **CRITICAL RISK** — Dispatch does not affect inventory

### F.9 Sales Return

| Action | Direct Table | Indirect Tables | Stock Effect | Audit | Notification | Approval |
|--------|-------------|----------------|-------------|-------|-------------|----------|
| Create | SalesReturns | SalesReturnItems | **MISSING** — Should increase warehouse stock | **MISSING** | No | **RECOMMENDED** |
| Approve | SalesReturns | None | **MISSING** | **MISSING** | No | **REQUIRED** |
| Receive | SalesReturns | ProductStockPerWarehouse (+), Batches (+), StockMovements (IN) | **MISSING** — Should restore stock | **MISSING** | No | No |

**IMPLEMENTATION STATUS:**
- Uses `pgCompat` (MSSQL-style queries) — **MAY FAIL WITH POSTGRESQL**
- No foreign keys
- No stock restoration
- No batch quantity update
- No serial number status update
- No stock movement creation
- No audit logging
- **CRITICAL RISK** — Returns do not affect inventory

### F.10 Stock Transfer

| Action | Direct Table | Indirect Tables | Stock Effect | Audit | Notification | Approval |
|--------|-------------|----------------|-------------|-------|-------------|----------|
| Create | StockTransfers | StockTransferItems, ProductStockPerWarehouse (- source, + dest), StockMovements (TRANSFER x2) | **IMMEDIATELY** reduces source AND increases destination | **MISSING** | **MISSING** | **RECOMMENDED** |
| Update Status | StockTransfers | None | None (stock already moved at create) | **MISSING** | No | No |

**IMPLEMENTATION STATUS:**
- Uses transaction with stock availability check
- **IMMEDIATELY moves stock** — no "In Transit" state
- Source: `Quantity - 1`, `ReservedQuantity + 1` (reserves at source)
- Destination: `Quantity + 1` (immediately adds)
- Creates two stock movements (source OUT, destination IN)
- **Missing:** Audit log, notification, approval, batch warehouse update, serial number update
- **Missing:** `FOR UPDATE` row locking
- **Missing:** Products.StockQuantity sync
- **CRITICAL DESIGN ISSUE:** Stock is added to destination before it physically arrives

### F.11 Stock Adjustment

| Action | Direct Table | Indirect Tables | Stock Effect | Audit | Notification | Approval |
|--------|-------------|----------------|-------------|-------|-------------|----------|
| Create | StockAdjustments | StockAdjustmentItems, ProductStockPerWarehouse (+/-), StockMovements (ADJUSTMENT) | **IMMEDIATELY** changes stock | **MISSING** | **MISSING** | **REQUIRED** |
| Approve (Status=Approved) | StockAdjustments | None | **MISSING** — Stock already changed at create | **MISSING** | No | **REQUIRED** |

**IMPLEMENTATION STATUS:**
- Uses transaction
- **IMMEDIATELY applies adjustment** — no pending/approval state enforcement
- Creates stock movement
- **Missing:** Audit log, notification, approval enforcement
- **Missing:** `FOR UPDATE` row locking
- **Missing:** Products.StockQuantity sync
- **CRITICAL DESIGN ISSUE:** Stock changes before approval

### F.12 Production

| Action | Direct Table | Indirect Tables | Stock Effect | Audit | Notification | Approval |
|--------|-------------|----------------|-------------|-------|-------------|----------|
| Create BOM | BOM | BOMItems | None | **MISSING** | No | No |
| Create Production Order | ProductionOrders | None | None | **MISSING** | No | No |
| Issue Materials | ProductionOrders | ProductStockPerWarehouse (-), StockMovements (OUT) | **MISSING** — Should consume raw materials | **MISSING** | No | No |
| Receive Output | ProductionOrders | ProductStockPerWarehouse (+), StockMovements (IN) | **MISSING** — Should add finished goods | **MISSING** | No | No |
| Close Order | ProductionOrders | None | **MISSING** | **MISSING** | No | No |

**IMPLEMENTATION STATUS:**
- Basic CRUD via erpModules
- **NO STOCK INTEGRATION AT ALL**
- No BOM explosion logic
- No material consumption
- No finished goods receipt
- No wastage recording
- **CRITICAL RISK** — Production does not affect inventory

### F.13 CRM Record Visibility

| Entity | Visibility Control | Implementation | Risk |
|--------|-------------------|---------------|------|
| Accounts | CompanyId + hierarchyAccess (ownerColumns) | CRM CRUD factory | **MEDIUM** — Hierarchy access works but no group/team visibility |
| Contacts | CompanyId + hierarchyAccess | CRM CRUD factory | **MEDIUM** |
| Leads | CompanyId + hierarchyAccess | CRM CRUD factory | **MEDIUM** |
| Opportunities | CompanyId + hierarchyAccess | CRM CRUD factory | **MEDIUM** |
| Activities | CompanyId | CRM CRUD factory | **MEDIUM** — No owner-based filtering |
| Cases | CompanyId | CRM CRUD factory | **MEDIUM** — No owner-based filtering |
| Presales | CompanyId + hierarchyAccess | CRM CRUD factory | **MEDIUM** |

**IMPLEMENTATION STATUS:**
- CRM CRUD factory provides consistent company scoping and hierarchy-based access
- `buildHierarchyAccess` uses recursive manager-subordinate tree
- `resolveCompanyScope` enforces company boundaries
- `logAuditEvent` creates audit trail for all CRUD operations
- **Missing:** Group-based visibility (EntityVisibility table exists but not used by factory)
- **Missing:** Assignment-based visibility (Assignments table exists but not used)
- **Missing:** Field-level masking for sensitive data

---

## G. Automatic vs Application-Managed Behavior

| Behavior | Database Automatic | Application Implemented | Missing | Evidence |
|----------|-------------------|----------------------|---------|----------|
| AvailableQuantity = Quantity - ReservedQuantity | **YES** — Generated column | N/A | N/A | ProductStockPerWarehouse schema |
| SalesOrder NetAmount calculation | **YES** — Trigger | N/A | N/A | SalesOrders trigger |
| SalesOrder BalanceAmount calculation | **YES** — Trigger | N/A | N/A | SalesOrders trigger |
| SalesOrder SONumber generation | **YES** — Trigger | N/A | N/A | SalesOrders trigger |
| SalesOrder CustomerName population | **YES** — Trigger | N/A | N/A | SalesOrders trigger |
| SalesOrder UpdatedAt | **YES** — Trigger | N/A | N/A | SalesOrders trigger |
| ProductStockPerWarehouse UpdatedAt | **YES** — Trigger | N/A | N/A | ProductStockPerWarehouse trigger |
| GRNItems TotalCost calculation | **YES** — Generated column | N/A | N/A | GRNItems schema |
| Cascade delete from Products to ProductStockPerWarehouse | **YES** — ON DELETE CASCADE | N/A | N/A | ProductStockPerWarehouse FK |
| Cascade delete from Products to Batches | **YES** — ON DELETE CASCADE | N/A | N/A | Batches FK |
| Cascade delete from Products to SerialNumbers | **YES** — ON DELETE CASCADE | N/A | N/A | SerialNumbers FK |
| Cascade delete from GRN to GRNItems | **YES** — ON DELETE CASCADE | N/A | N/A | GRNItems FK |
| Cascade delete from StockTransfers to StockTransferItems | **YES** — ON DELETE CASCADE | N/A | N/A | StockTransferItems FK |
| Cascade delete from StockAdjustments to StockAdjustmentItems | **YES** — ON DELETE CASCADE | N/A | N/A | StockAdjustmentItems FK |
| Cascade delete from Company to all child tables | **YES** — ON DELETE CASCADE | N/A | N/A | Multiple FKs |
| GRN stock increase | **NO** | **YES** — GRN controller | N/A | grnController.js |
| Stock transfer stock movement | **NO** | **YES** — StockTransfer controller | N/A | stockTransfers.js |
| Stock adjustment stock change | **NO** | **YES** — StockAdjustment controller | N/A | stockAdjustments.js |
| Batch creation/update on GRN | **NO** | **YES** — GRN controller | N/A | grnController.js |
| PurchaseOrderItem ReceivedQuantity update | **NO** | **YES** — GRN controller | N/A | grnController.js |
| CRM audit logging | **NO** | **YES** — CRM CRUD factory | N/A | crmCrudFactory.js |
| CRM company scope | **NO** | **YES** — CRM CRUD factory | N/A | crmCrudFactory.js |
| CRM hierarchy access | **NO** | **YES** — CRM CRUD factory | N/A | crmCrudFactory.js |
| RBAC middleware | **NO** | **YES** — rbac.js | N/A | rbac.js |
| JWT authentication | **NO** | **YES** — authMiddleware.js | N/A | authMiddleware.js |
| Sales order stock reservation | **NO** | **NO** | **MISSING** | salesOrders.js |
| Sales order stock deduction on dispatch | **NO** | **NO** | **MISSING** | salesOrders.js |
| Delivery challan stock deduction | **NO** | **NO** | **MISSING** | deliveryChallans.js |
| Sales return stock restoration | **NO** | **NO** | **MISSING** | salesReturns.js |
| Purchase return stock reduction | **NO** | **NO** | **MISSING** | purchaseReturns.js |
| Production material consumption | **NO** | **NO** | **MISSING** | production.js |
| Production finished goods receipt | **NO** | **NO** | **MISSING** | production.js |
| Products.StockQuantity sync | **NO** | **NO** | **MISSING** | All controllers |
| Batch quantity sync on transfer/adjustment | **NO** | **NO** | **MISSING** | stockTransfers.js, stockAdjustments.js |
| Serial number status update | **NO** | **NO** | **MISSING** | All controllers |
| Audit logging in inventory controllers | **NO** | **NO** | **MISSING** | All inventory controllers except CRM |
| Notification creation | **NO** | **NO** | **MISSING** | All controllers |
| Approval workflow enforcement | **NO** | **NO** | **MISSING** | All controllers |
| Row locking (FOR UPDATE) | **NO** | **NO** | **MISSING** | All controllers |
| Idempotency protection | **NO** | **NO** | **MISSING** | All controllers |

---

## H. Role and Permission Model

### H.1 Role Descriptions

| Role ID | Role Name | Scope | Default Permissions |
|---------|-----------|-------|-------------------|
| 1 | Super Admin | All companies, all modules | Full access (bypasses all checks) |
| 2 | Admin | One company | Full access within company (unless custom permissions set) |
| 3 | Manager | Assigned company | View, Create, Edit on most modules; no Delete, no Export |
| 4 | Employee | Assigned company | View only on most modules |
| 5 | Customer | Own records only | View on sales-orders, invoices, customers |

### H.2 Permission Catalogue

The system uses module-action permissions stored as JSON in `Roles.Permissions`. The RBAC middleware maps URL paths to module keys:

| Module Key | Routes | Actions |
|-----------|--------|---------|
| roles | /api/roles | view, create, edit, delete |
| users | /api/users, /api/usertypes, /api/profile | view, create, edit, delete |
| companies | /api/company | view, create, edit, delete |
| settings | /api/system, /api/monitoring, /api/crm/*-types | view, create, edit, delete |
| reports | /api/reports, /api/audit-logs, /api/profit-loss-reports | view, export |
| categories | /api/productcategory | view, create, edit, delete |
| products | /api/products, /api/brands, /api/taxes, /api/product-tax-map, /api/batches, /api/serial-numbers | view, create, edit, delete |
| units | /api/units | view, create, edit, delete |
| warehouses | /api/warehouses | view, create, edit, delete |
| stock | /api/product-stock, /api/grn | view, create, edit, delete |
| stockMovements | /api/stock-movements, /api/stock-transfers, /api/stock-adjustments | view, create, edit, delete |
| suppliers | /api/suppliers | view, create, edit, delete |
| purchaseOrders | /api/purchase-orders, /api/purchase-order-items | view, create, edit, delete |
| customers | /api/customers | view, create, edit, delete |
| salesOrders | /api/sales-orders | view, create, edit, delete |
| purchaseRequisitions | /api/erp/purchase-requisitions | view, create, edit, delete |
| purchaseReturns | /api/erp/purchase-returns | view, create, edit, delete |
| salesQuotations | /api/erp/sales-quotations | view, create, edit, delete |
| deliveryChallans | /api/erp/delivery-challans | view, create, edit, delete |
| salesReturns | /api/erp/sales-returns | view, create, edit, delete |
| bom | /api/erp/bom | view, create, edit, delete |
| productionOrders | /api/erp/production-orders, /api/erp/work-orders, /api/erp/quality-checks | view, create, edit, delete |
| expenses | /api/erp/expenses | view, create, edit, delete |
| approvals | /api/erp/approvals | view, create, edit, delete |
| racks | /api/erp/racks | view, create, edit, delete |
| bins | /api/erp/bins | view, create, edit, delete |
| accounts | /api/crm/accounts | view, create, edit, delete |
| contacts | /api/crm/contacts | view, create, edit, delete |
| leads | /api/crm/leads | view, create, edit, delete |
| opportunities | /api/crm/opportunities | view, create, edit, delete |
| activities | /api/crm/activities | view, create, edit, delete |
| quotes | /api/crm/quotes | view, create, edit, delete |
| invoices | /api/crm/invoices | view, create, edit, delete |
| payments | /api/crm/payments | view, create, edit, delete |
| retentions | /api/crm/retentions | view, create, edit, delete |
| presales | /api/crm/presales | view, create, edit, delete |
| cases | /api/crm/cases | view, create, edit, delete |
| chat | /api/chat, /api/chat-workspace, /api/teams-chat | view, create, edit |
| dashboard | /api/dashboard, /api/health, /api/notifications | view |
| export | /api/utils/export | export |
| import | /api/utils/import | import |

### H.3 Role-Permission Matrix (Recommended)

| Module/Action | Super Admin | Admin | Inventory Manager | Warehouse Manager | Warehouse Operator | Purchase Manager | Purchase Executive | Sales Manager | Sales Executive | Finance Manager | Accountant | Production Manager | Quality Controller | CRM Manager | CRM User | Auditor |
|--------------|------------|-------|------------------|------------------|-------------------|-----------------|-------------------|--------------|----------------|----------------|-----------|-------------------|-------------------|------------|---------|---------|
| products.view | Full | Full | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| products.create | Full | Full | Yes | No | No | Yes | No | No | No | No | No | Yes | No | No | No | No |
| products.update | Full | Full | Yes | No | No | No | No | No | No | No | No | Yes | No | No | No | No |
| products.deactivate | Full | Full | Yes | No | No | No | No | No | No | No | No | No | No | No | No | No |
| stock.view | Full | Full | Yes | Yes | Yes | Yes | No | Yes | Yes | Yes | Yes | Yes | Yes | No | No | Yes |
| stock.adjust.create | Full | Full | Yes | Yes | No | No | No | No | No | No | No | No | No | No | No | No |
| stock.adjust.approve | Full | Full | Yes | No | No | No | No | No | No | No | No | No | No | No | No | No |
| transfer.create | Full | Full | Yes | Yes | No | No | No | No | No | No | No | No | No | No | No | No |
| transfer.approve | Full | Full | Yes | No | No | No | No | No | No | No | No | No | No | No | No | No |
| transfer.dispatch | Full | Full | No | Yes | Yes | No | No | No | No | No | No | No | No | No | No | No |
| transfer.receive | Full | Full | No | Yes | Yes | No | No | No | No | No | No | No | No | No | No | No |
| purchase.order.view | Full | Full | Yes | Yes | No | Yes | Yes | No | No | Yes | Yes | No | No | No | No | Yes |
| purchase.order.create | Full | Full | No | No | No | Yes | Yes | No | No | No | No | No | No | No | No | No |
| purchase.order.approve | Full | Full | No | No | No | Yes | No | No | No | No | No | No | No | No | No | No |
| purchase.grn.create | Full | Full | No | Yes | Yes | No | No | No | No | No | No | No | No | No | No | No |
| purchase.grn.approve | Full | Full | Yes | No | No | No | No | No | No | No | No | No | No | No | No | No |
| sales.order.view | Full | Full | Yes | Yes | No | No | No | Yes | Yes | Yes | Yes | No | No | Yes | Yes | Yes |
| sales.order.create | Full | Full | No | No | No | No | No | Yes | Yes | No | No | No | No | No | No | No |
| sales.order.approve | Full | Full | No | No | No | No | No | Yes | No | No | No | No | No | No | No | No |
| sales.delivery.create | Full | Full | No | Yes | Yes | No | No | No | No | No | No | No | No | No | No | No |
| sales.return.approve | Full | Full | No | No | No | No | No | Yes | No | No | No | No | No | No | No | No |
| finance.payment.approve | Full | Full | No | No | No | No | No | No | No | Yes | No | No | No | No | No | No |
| production.order.create | Full | Full | No | No | No | No | No | No | No | No | No | Yes | No | No | No | No |
| quality.inspection.perform | Full | Full | No | No | No | No | No | No | No | No | No | No | Yes | No | No | No |
| crm.lead.view | Full | Full | No | No | No | No | No | Yes | Yes | No | No | No | No | Yes | Yes | Yes |
| crm.lead.create | Full | Full | No | No | No | No | No | Yes | Yes | No | No | No | No | Yes | Yes | No |
| audit.log.view | Full | Full | Yes | No | No | No | No | No | No | Yes | No | No | No | No | No | Yes |
| report.export | Full | Full | Yes | Yes | No | Yes | No | Yes | No | Yes | Yes | Yes | No | Yes | No | Yes |

### H.4 Scope Rules

| Scope | Super Admin | Admin | Manager/Employee | Customer |
|-------|------------|-------|-----------------|----------|
| Company | All | Own company only | Own company only | Own company only |
| Branch | All | All in company | Assigned branches | N/A |
| Warehouse | All | All in company | Assigned warehouses | N/A |
| Record | All | All in company | Own + subordinate created | Own records only |

### H.5 Record Visibility Rules (Current Implementation)

| Entity | Rule | Implementation |
|--------|------|---------------|
| Products | Company scoped + hierarchy (CreatedBy) | getAllProducts, getProductById |
| PurchaseOrders | Company scoped + hierarchy (CreatedBy) | getAllPurchaseOrders |
| CRM entities | Company scoped + hierarchy (ownerColumns) | CRM CRUD factory |
| Stock | No visibility filtering | getAllProductStocks |
| GRN | Company scoped (query param) | getAllGRNs |
| StockTransfers | Company scoped (query param) | getAllStockTransfers |
| StockAdjustments | Company scoped (query param) | getAllStockAdjustments |

### H.6 Field-Level Access (Recommended)

| Table | Field | Classification | View Roles | Edit Roles | Approval Required | Masking |
|-------|-------|---------------|-----------|-----------|------------------|---------|
| Products | ProductName | Public | All | Manager+ | No | No |
| Products | ProductCode | Public | All | Manager+ | No | No |
| Products | Price | Financial | All | Inventory Manager+ | **YES** | No |
| Products | Cost | Financial | Manager+ | Inventory Manager+ | **YES** | For non-managers |
| Products | StockQuantity | Restricted | All | **NEVER DIRECTLY** | **YES** | No |
| Products | CompanyId | System | N/A | N/A | N/A | N/A |
| Products | CreatedBy | System | N/A | N/A | N/A | N/A |
| Products | IsDelete | System | N/A | N/A | N/A | N/A |
| ProductStockPerWarehouse | Quantity | Restricted | All | Inventory Manager+ | **YES** | No |
| ProductStockPerWarehouse | ReservedQuantity | Restricted | Manager+ | Inventory Manager+ | No | No |
| ProductStockPerWarehouse | AvailableQuantity | Restricted | All | **READ ONLY** (generated) | N/A | No |
| SalesOrders | TotalAmount | Financial | All | Manager+ | No | No |
| SalesOrders | DiscountAmount | Financial | Manager+ | Sales Manager+ | **YES** | No |
| SalesOrders | PaidAmount | Financial | Finance+ | Finance+ | No | No |
| SalesOrders | InternalNotes | Restricted | Manager+ | Manager+ | No | No |
| Users | Email | Personal | All | Self/Admin | No | No |
| Users | Password | Sensitive | **NEVER** | **NEVER** | N/A | **ALWAYS** |
| Users | MobileNumber | Personal | Manager+ | Self/Admin | No | Partial |
| Users | RoleId | System | Admin+ | Super Admin | **YES** | No |

---

## I. Route and Controller Security Audit

| Method | Route | Controller | Current Middleware | Missing Checks | Required Permission |
|--------|-------|-----------|-------------------|---------------|-------------------|
| GET | /api/products | getAllProducts | auth + rbac | Branch scope, warehouse scope | products.view |
| POST | /api/products | createProduct | auth + rbac | CompanyId validation, field-level | products.create |
| PUT | /api/products/:id | updateProduct | auth + rbac | StockQuantity edit protection, approval | products.update |
| DELETE | /api/products/:id | softDeleteProduct | auth + rbac | Transaction history check | products.deactivate |
| GET | /api/product-stock | getAllProductStocks | auth + rbac | Company scope, warehouse scope | stock.view |
| POST | /api/product-stock | createProductStock | auth + rbac | Warehouse access validation | stock.create |
| PUT | /api/product-stock/:id | updateProductStock | auth + rbac | Quantity change approval | stock.update |
| POST | /api/grn | createGRN | auth + rbac | Warehouse access, PO ownership, approval | purchase.grn.create |
| GET | /api/grn | getAllGRNs | auth + rbac | Warehouse scope | purchase.grn.view |
| POST | /api/stock-transfers | createStockTransfer | auth + rbac | Both warehouse access, approval | transfer.create |
| POST | /api/stock-adjustments | createStockAdjustment | auth + rbac | Warehouse access, approval | stock.adjust.create |
| POST | /api/sales-orders | createSalesOrder | auth + rbac | Customer company scope | sales.order.create |
| PUT | /api/sales-orders/:id/status | updateSalesOrderStatus | auth + rbac | Stock reservation/release on status change | sales.order.update |
| POST | /api/erp/delivery-challans | createChallan | auth + rbac | Stock deduction, warehouse access | sales.delivery.create |
| POST | /api/erp/sales-returns | createSalesReturn | auth + rbac | Stock restoration, warehouse access | sales.return.create |
| POST | /api/erp/purchase-returns | createPurchaseReturn | auth + rbac | Stock reduction, warehouse access | purchase.return.create |
| POST | /api/users/login | login | rate limiter | - | None (public) |
| GET | /api/crm/leads | list (CRUD factory) | auth + rbac | Group visibility, assignment visibility | crm.lead.view |
| POST | /api/crm/leads | create (CRUD factory) | auth + rbac | Duplicate detection | crm.lead.create |
| DELETE | /api/crm/leads/:id | remove (CRUD factory) | auth + rbac | Restricted action check | crm.lead.delete |

---

## J. Approval Workflow Design

### J.1 Current State
- `ApprovalWorkflows` table exists with ModuleType, RecordId, Status, RequestedBy, ApprovedBy, RejectedBy
- No controller enforces approval before stock changes
- No middleware checks approval status
- No approval thresholds configured

### J.2 Recommended Approval Workflows

| Module | Action | Approval Required | Requester Role | Approver Role | Threshold | Self-Approval Allowed |
|--------|--------|------------------|---------------|--------------|-----------|----------------------|
| Purchase Order | Create (above threshold) | Yes | Purchase Executive | Purchase Manager | $10,000 | No |
| Purchase Order | Approve | Yes | Purchase Manager | Inventory Manager | $50,000 | No |
| Stock Transfer | Create | Yes | Warehouse Operator | Warehouse Manager | Any | No |
| Stock Transfer | Dispatch | Yes | Warehouse Operator | Warehouse Manager | Any | No |
| Stock Adjustment | Create (decrease) | Yes | Warehouse Operator | Inventory Manager | Any | No |
| Stock Adjustment | Create (increase) | Yes | Warehouse Operator | Warehouse Manager | > 10 units | No |
| Sales Order | Discount > 10% | Yes | Sales Executive | Sales Manager | 10% | No |
| Sales Order | Discount > 25% | Yes | Sales Manager | Company Admin | 25% | No |
| Sales Return | Create | Yes | Sales Executive | Sales Manager | Any | No |
| Purchase Return | Create | Yes | Purchase Executive | Purchase Manager | Any | No |
| Product Cost Change | Update | Yes | Inventory Manager | Company Admin | Any | No |
| Product Price Change | Update | Yes | Sales Manager | Company Admin | > 20% | No |
| Payment | Create (above threshold) | Yes | Accountant | Finance Manager | $5,000 | No |
| Expense | Create (above threshold) | Yes | Employee | Finance Manager | $1,000 | No |
| Backdated Transaction | Any | Yes | Any | Company Admin | Any | No |
| Negative Stock Override | Any | Yes | Warehouse Manager | Inventory Manager | Any | No |
| Hard Delete | Any | **NEVER ALLOW** | N/A | N/A | N/A | N/A |

---

## K. Audit and Notification Design

### K.1 Current Audit Implementation

| Component | Implementation | Coverage |
|-----------|---------------|----------|
| AuditLogs (Inventory) | `logAudit()` function | **Not called by any inventory controller** |
| AuditEvents (System) | `logAuditEvent()` function | **Called by CRM CRUD factory only** |
| SecurityLogs | Not implemented in controllers | **Not used** |

### K.2 Recommended Audit Requirements

Every important operation should create an `AuditEvents` record with:

```json
{
  "companyId": 1,
  "userId": 5,
  "eventType": "inventory.grn.created",
  "action": "create",
  "entityType": "GRN",
  "entityId": 42,
  "beforeData": null,
  "afterData": { "Id": 42, "GRNNumber": "GRN-123", ... },
  "metadata": { "stockImpact": { "productId": 10, "warehouseId": 2, "quantityChange": 50 } },
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0..."
}
```

**Actions that must be audited:**
- All CREATE operations on transactional tables
- All UPDATE operations on financial/stock fields
- All DELETE/SOFT DELETE/RESTORE operations
- All APPROVE/REJECT/CANCEL status changes
- All stock quantity changes
- All price/cost changes
- All role/permission changes
- All user creation/deactivation
- All login failures for privileged users
- All export of sensitive data

### K.3 Recommended Notification Events

| Event | Recipient | Reference Type | Timing |
|-------|-----------|---------------|--------|
| GRN Created | Purchase Manager, Warehouse Manager | GRN | On create |
| Stock Transfer Created | Source Warehouse Manager, Destination Warehouse Manager | StockTransfer | On create |
| Stock Transfer Received | Requester, Source Warehouse Manager | StockTransfer | On receive |
| Stock Adjustment (decrease) | Inventory Manager | StockAdjustment | On create |
| Low Stock Alert | Warehouse Manager, Inventory Manager | Product | When stock <= ReorderLevel |
| Batch Expiring Soon | Warehouse Manager, Quality Controller | Batch | 30 days before expiry |
| Sales Order Confirmed | Sales Manager, Warehouse Manager | SalesOrder | On confirm |
| Sales Order Shipped | Customer, Sales Executive | SalesOrder | On ship |
| Purchase Order Approved | Purchase Executive, Supplier contact | PurchaseOrder | On approve |
| Return Requested | Sales/ Purchase Manager | SalesReturn/PurchaseReturn | On create |
| Approval Required | Designated Approver | ApprovalWorkflow | On request |
| Unauthorized Access Attempt | Company Admin | SecurityLog | On detection |

---

## L. Data-Integrity and Security Findings

| Severity | Finding | File | Affected Tables | Impact | Recommended Fix |
|----------|---------|------|----------------|--------|----------------|
| **CRITICAL** | Products.StockQuantity is manually editable and not synchronized | products.js | Products, ProductStockPerWarehouse | Stock reports show incorrect totals | Remove direct StockQuantity editing; add trigger to sync from warehouse stock |
| **CRITICAL** | Sales order status changes do not affect stock | salesOrders.js | SalesOrders, ProductStockPerWarehouse | Orders can be "Shipped" without reducing inventory | Add stock reservation on Confirm, deduction on Ship |
| **CRITICAL** | Delivery challans do not deduct stock | deliveryChallans.js | DeliveryChallans, ProductStockPerWarehouse | Goods can be dispatched without inventory reduction | Add stock deduction logic to createChallan |
| **CRITICAL** | Sales returns do not restore stock | salesReturns.js | SalesReturns, ProductStockPerWarehouse | Returned goods are not added back to inventory | Add stock restoration logic to createSalesReturn |
| **CRITICAL** | Purchase returns do not reduce stock | purchaseReturns.js | PurchaseReturns, ProductStockPerWarehouse | Returned goods remain in inventory | Add stock reduction logic to createPurchaseReturn |
| **CRITICAL** | Production does not affect stock | production.js | ProductionOrders, ProductStockPerWarehouse | Materials not consumed, finished goods not created | Add material issue and output receipt logic |
| **CRITICAL** | DeliveryChallans, SalesReturns, PurchaseReturns use MSSQL-style queries | deliveryChallans.js, salesReturns.js, purchaseReturns.js | Multiple | Queries will fail with PostgreSQL | Rewrite using parameterized PostgreSQL queries |
| **CRITICAL** | No row locking (FOR UPDATE) on stock operations | All controllers | ProductStockPerWarehouse | Race conditions on concurrent stock updates | Add SELECT ... FOR UPDATE before stock modifications |
| **CRITICAL** | No idempotency protection | All controllers | Multiple | Duplicate requests cause duplicate stock changes | Add unique request ID check |
| **HIGH** | Hard delete available on transactional records | salesOrders.js, purchaseOrders.js, productStockcontroller.js | SalesOrders, PurchaseOrders, ProductStockPerWarehouse | Permanent data loss | Remove hard delete; use cancellation/reversal |
| **HIGH** | No branch scope enforcement | All controllers | All branch-scoped tables | Cross-branch data access | Add branch scope middleware |
| **HIGH** | No warehouse scope enforcement | All controllers | All warehouse-scoped tables | Cross-warehouse stock access | Add warehouse scope middleware |
| **HIGH** | CompanyId accepted from frontend without validation | Multiple controllers | Multiple | Cross-company data manipulation | Use server-side company context from JWT |
| **HIGH** | No approval enforcement for stock changes | stockAdjustments.js, stockTransfers.js | StockAdjustments, StockTransfers | Unauthorized stock changes | Add approval workflow check before applying changes |
| **HIGH** | No segregation of duties | All controllers | Multiple | Same user can create and approve | Add approver != creator check |
| **HIGH** | Batch quantities not updated on transfer/adjustment | stockTransfers.js, stockAdjustments.js | Batches | Batch stock becomes inconsistent | Add batch quantity update logic |
| **HIGH** | Serial numbers never updated after creation | All controllers | SerialNumbers | Serial traceability is broken | Add status transitions (Available→Sold→Returned) |
| **HIGH** | Missing foreign keys on DeliveryChallans, SalesReturns, PurchaseReturns | Model files | Multiple | Orphan records possible | Add foreign key constraints |
| **MEDIUM** | Inconsistent soft-delete naming (IsDelete vs IsDeleted) | Multiple model files | Multiple | Confusion in queries | Standardize to IsDeleted across all tables |
| **MEDIUM** | Duplicate AuditLogs table definition | InventoryManagement/AuditLogs.js, CrmModels/AuditLogs.js | AuditLogs | Migration conflicts | Consolidate to one definition |
| **MEDIUM** | No audit logging in inventory controllers | All inventory controllers | AuditLogs | No change history | Add audit log calls to all controllers |
| **MEDIUM** | No notification creation | All controllers | Notifications | Users not informed of events | Add notification creation to workflows |
| **MEDIUM** | Stock transfer immediately adds to destination | stockTransfers.js | ProductStockPerWarehouse | Stock counted before physical arrival | Add "In Transit" status; only add at receipt |
| **MEDIUM** | Stock adjustment immediately changes stock | stockAdjustments.js | ProductStockPerWarehouse | Stock changes before approval | Only apply stock changes on Approved status |
| **MEDIUM** | No field-level permission checks | All controllers | Multiple | Users can edit sensitive fields | Add field-level permission middleware |
| **MEDIUM** | No record-level visibility for inventory records | inventory controllers | Multiple | Users can see all company records | Add hierarchy/ownership filtering |
| **LOW** | No UpdatedAt trigger on most tables | Model files | Multiple | UpdatedAt not automatically maintained | Add BEFORE UPDATE triggers |
| **LOW** | No indexes on foreign key columns | Multiple model files | Multiple | Slow joins on large datasets | Add indexes on all FK columns |

---

## M. Recommended Database Changes

### M.1 Add Products.StockQuantity Synchronization Trigger

```sql
CREATE OR REPLACE FUNCTION sync_product_stock_quantity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE "Products"
    SET "StockQuantity" = (
        SELECT COALESCE(SUM("Quantity"), 0)
        FROM "ProductStockPerWarehouse"
        WHERE "ProductId" = NEW."ProductId"
    ),
    "UpdatedAt" = CURRENT_TIMESTAMP
    WHERE "Id" = NEW."ProductId";
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_product_stock_after_insert
AFTER INSERT ON "ProductStockPerWarehouse"
FOR EACH ROW EXECUTE FUNCTION sync_product_stock_quantity();

CREATE TRIGGER trigger_sync_product_stock_after_update
AFTER UPDATE OF "Quantity" ON "ProductStockPerWarehouse"
FOR EACH ROW EXECUTE FUNCTION sync_product_stock_quantity();

CREATE TRIGGER trigger_sync_product_stock_after_delete
AFTER DELETE ON "ProductStockPerWarehouse"
FOR EACH ROW EXECUTE FUNCTION sync_product_stock_quantity();
```

### M.2 Add Foreign Keys to Missing Tables

```sql
-- DeliveryChallans
ALTER TABLE "DeliveryChallans"
ADD CONSTRAINT fk_delivery_challan_sales_order
FOREIGN KEY ("SalesOrderId") REFERENCES "SalesOrders"("Id") ON DELETE SET NULL,
ADD CONSTRAINT fk_delivery_challan_customer
FOREIGN KEY ("CustomerId") REFERENCES "Customers"("Id") ON DELETE SET NULL,
ADD CONSTRAINT fk_delivery_challan_company
FOREIGN KEY ("CompanyId") REFERENCES "Companies"("Id") ON DELETE CASCADE,
ADD CONSTRAINT fk_delivery_challan_warehouse
FOREIGN KEY ("WarehouseId") REFERENCES "Warehouses"("Id") ON DELETE SET NULL;

-- DeliveryChallanItems
ALTER TABLE "DeliveryChallanItems"
ADD CONSTRAINT fk_delivery_challan_item_challan
FOREIGN KEY ("ChallanId") REFERENCES "DeliveryChallans"("Id") ON DELETE CASCADE,
ADD CONSTRAINT fk_delivery_challan_item_product
FOREIGN KEY ("ProductId") REFERENCES "Products"("Id") ON DELETE RESTRICT;

-- SalesReturns
ALTER TABLE "SalesReturns"
ADD CONSTRAINT fk_sales_return_sales_order
FOREIGN KEY ("SalesOrderId") REFERENCES "SalesOrders"("Id") ON DELETE SET NULL,
ADD CONSTRAINT fk_sales_return_customer
FOREIGN KEY ("CustomerId") REFERENCES "Customers"("Id") ON DELETE SET NULL,
ADD CONSTRAINT fk_sales_return_company
FOREIGN KEY ("CompanyId") REFERENCES "Companies"("Id") ON DELETE CASCADE,
ADD CONSTRAINT fk_sales_return_warehouse
FOREIGN KEY ("WarehouseId") REFERENCES "Warehouses"("Id") ON DELETE SET NULL;

-- PurchaseReturns
ALTER TABLE "PurchaseReturns"
ADD CONSTRAINT fk_purchase_return_purchase_order
FOREIGN KEY ("PurchaseOrderId") REFERENCES "PurchaseOrders"("Id") ON DELETE SET NULL,
ADD CONSTRAINT fk_purchase_return_supplier
FOREIGN KEY ("SupplierId") REFERENCES "Suppliers"("Id") ON DELETE SET NULL,
ADD CONSTRAINT fk_purchase_return_company
FOREIGN KEY ("CompanyId") REFERENCES "Companies"("Id") ON DELETE CASCADE,
ADD CONSTRAINT fk_purchase_return_warehouse
FOREIGN KEY ("WarehouseId") REFERENCES "Warehouses"("Id") ON DELETE SET NULL;

-- Notifications
ALTER TABLE "Notifications"
ADD CONSTRAINT fk_notification_user
FOREIGN KEY ("UserId") REFERENCES "Users"("UserId") ON DELETE CASCADE,
ADD CONSTRAINT fk_notification_company
FOREIGN KEY ("CompanyId") REFERENCES "Companies"("Id") ON DELETE CASCADE;

-- ApprovalWorkflows
ALTER TABLE "ApprovalWorkflows"
ADD CONSTRAINT fk_approval_requested_by
FOREIGN KEY ("RequestedById") REFERENCES "Users"("UserId") ON DELETE SET NULL,
ADD CONSTRAINT fk_approval_approved_by
FOREIGN KEY ("ApprovedById") REFERENCES "Users"("UserId") ON DELETE SET NULL;
```

### M.3 Add UpdatedAt Triggers

```sql
-- Generic updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."UpdatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables missing the trigger
CREATE TRIGGER trigger_products_updated_at
BEFORE UPDATE ON "Products"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_purchase_orders_updated_at
BEFORE UPDATE ON "PurchaseOrders"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_grn_updated_at
BEFORE UPDATE ON "GRN"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_stock_transfers_updated_at
BEFORE UPDATE ON "StockTransfers"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_stock_adjustments_updated_at
BEFORE UPDATE ON "StockAdjustments"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### M.4 Standardize Soft Delete to IsDeleted

```sql
-- Rename IsDelete to IsDeleted on Products
ALTER TABLE "Products" RENAME COLUMN "IsDelete" TO "IsDeleted";
-- Update all queries that reference "IsDelete" to use "IsDeleted"
```

---

## N. Recommended Backend Changes

### N.1 Middleware Additions

```javascript
// 1. Branch Scope Middleware
const validateBranchScope = (req, res, next) => {
  const userBranches = req.user.branchIds || [];
  const requestedBranchId = req.body.BranchId || req.query.branchId || req.params.branchId;
  
  if (requestedBranchId && !userBranches.includes(Number(requestedBranchId))) {
    return res.status(403).json({ message: 'Forbidden: Branch access denied' });
  }
  next();
};

// 2. Warehouse Scope Middleware
const validateWarehouseScope = (req, res, next) => {
  const userWarehouses = req.user.warehouseIds || [];
  const requestedWarehouseId = req.body.WarehouseId || req.query.warehouseId;
  
  if (requestedWarehouseId && !userWarehouses.includes(Number(requestedWarehouseId))) {
    return res.status(403).json({ message: 'Forbidden: Warehouse access denied' });
  }
  next();
};

// 3. Approval Check Middleware
const requireApproval = (entityType, thresholdField) => {
  return async (req, res, next) => {
    // Check if approval workflow exists and is pending
    const result = await appPool.query(
      `SELECT "Status" FROM "ApprovalWorkflows"
       WHERE "ModuleType" = $1 AND "RecordId" = $2 AND "Status" = 'Pending'`,
      [entityType, req.params.id || req.body.id]
    );
    
    if (result.rows.length > 0) {
      return res.status(403).json({ message: 'Action requires pending approval' });
    }
    next();
  };
};

// 4. Segregation of Duties Middleware
const checkSegregationOfDuties = (action) => {
  return async (req, res, next) => {
    if (req.user.userId === req.body.ApprovedBy) {
      return res.status(403).json({ message: 'Cannot approve your own request' });
    }
    next();
  };
};
```

### N.2 Stock Operation Transaction Template

```javascript
const executeStockOperation = async (req, res, operation) => {
  const client = await appPool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Authenticate (already done by authMiddleware)
    // 2. Authorize (already done by rbacMiddleware)
    // 3. Validate document status
    // 4. Validate approval
    // 5. Lock affected stock rows
    const stockRows = await client.query(
      `SELECT * FROM "ProductStockPerWarehouse"
       WHERE "ProductId" = $1 AND "WarehouseId" = $2
       FOR UPDATE`,
      [productId, warehouseId]
    );
    
    // 6. Recheck available quantity
    if (stockRows.rows[0].AvailableQuantity < requestedQuantity) {
      throw new Error('Insufficient stock');
    }
    
    // 7. Update source business document
    // 8. Update warehouse stock
    // 9. Update reservation
    // 10. Update batch quantities
    // 11. Update serial number statuses
    // 12. Create stock movements
    // 13. Update document totals
    // 14. Sync Products.StockQuantity (or rely on trigger)
    // 15. Insert audit log
    // 16. Create notifications
    
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Stock operation failed:', err);
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
};
```

---

## O. Test Plan

### O.1 Unit Tests
- Permission parsing (`parsePermission`)
- Company scope resolution (`resolveCompanyScope`)
- Hierarchy access building (`buildHierarchyAccess`)
- Restricted action access (`getRestrictedActionAccess`)
- Role permission resolution (`resolveEffectivePermissions`)

### O.2 Integration Tests
- GRN creation updates ProductStockPerWarehouse correctly
- Stock transfer moves quantity between warehouses
- Stock adjustment increases/decreases quantity
- Sales order status change does NOT affect stock (current behavior)
- Delivery challan creation does NOT affect stock (current behavior — should be fixed)

### O.3 Authorization Tests
- Super admin can access all modules
- Admin can access only own company records
- Manager can view and create but not delete
- Employee can only view
- Customer can only view own sales orders
- User from Company A cannot access Company B records
- User without warehouse access cannot create GRN for that warehouse

### O.4 Company Isolation Tests
- Product created in Company A not visible to Company B
- Purchase order from Company A not visible to Company B
- Stock from Company A not visible to Company B

### O.5 Warehouse Isolation Tests
- User assigned to Warehouse A cannot create GRN for Warehouse B
- User assigned to Warehouse A cannot transfer stock from Warehouse B

### O.6 Concurrency Tests
- Two simultaneous GRN creations for same product/warehouse
- Two simultaneous stock transfers from same warehouse
- Stock adjustment during concurrent sales dispatch

### O.7 Idempotency Tests
- Duplicate GRN request with same request ID
- Duplicate stock transfer request

### O.8 Approval Tests
- Stock adjustment without approval is rejected
- Stock adjustment with approval is applied after approval
- Same user cannot approve their own adjustment

### O.9 Stock Reconciliation Tests
- ProductStockPerWarehouse.Quantity matches sum of Batches.Quantity
- Products.StockQuantity matches sum of ProductStockPerWarehouse.Quantity
- SerialNumbers count matches quantity for serialized products

### O.10 Audit Tests
- GRN creation creates audit log
- Stock adjustment creates audit log
- Product update creates audit log
- CRM record create/update/delete creates audit event

### O.11 Notification Tests
- Low stock triggers notification
- GRN creation notifies warehouse manager
- Stock transfer notifies destination warehouse

---

## P. Implementation Roadmap

### Phase 1: Critical Security Fixes (Week 1-2)

1. **Remove hard delete** from SalesOrders, PurchaseOrders, ProductStockPerWarehouse controllers
2. **Add row locking** (`FOR UPDATE`) to all stock-modifying operations
3. **Add idempotency** protection using unique request IDs
4. **Fix DeliveryChallans, SalesReturns, PurchaseReturns** to use PostgreSQL queries instead of MSSQL-style
5. **Add company scope validation** to all controllers that accept CompanyId from frontend
6. **Add warehouse scope validation** to all warehouse-scoped operations

### Phase 2: Inventory Consistency (Week 3-4)

1. **Add database trigger** to sync Products.StockQuantity from ProductStockPerWarehouse
2. **Add stock deduction** to DeliveryChallan creation
3. **Add stock restoration** to SalesReturn creation
4. **Add stock reduction** to PurchaseReturn creation
5. **Add stock reservation/release** to SalesOrder status changes
6. **Add batch quantity updates** to StockTransfer and StockAdjustment controllers
7. **Add serial number status transitions** to all relevant controllers
8. **Add production material consumption and output receipt** logic

### Phase 3: Approval and Audit (Week 5-6)

1. **Add audit logging** to all inventory controllers using AuditEvents table
2. **Add approval workflow enforcement** to StockAdjustments and StockTransfers
3. **Add segregation of duties** check (creator != approver)
4. **Add notification creation** to all major workflows
5. **Implement approval thresholds** based on quantity and value

### Phase 4: RBAC Completion (Week 7-8)

1. **Add branch scope middleware** and apply to all branch-scoped routes
2. **Add warehouse scope middleware** and apply to all warehouse-scoped routes
3. **Add record-level visibility** (hierarchy access) to all inventory list endpoints
4. **Add field-level permission checks** for sensitive fields (Cost, Price, Discount, etc.)
5. **Implement group-based visibility** using EntityVisibility table
6. **Add field masking** for sensitive personal and financial data

### Phase 5: Reporting and Optimization (Week 9-10)

1. **Add missing foreign keys** to DeliveryChallans, SalesReturns, PurchaseReturns, etc.
2. **Add UpdatedAt triggers** to all tables missing them
3. **Standardize soft delete** naming to IsDeleted across all tables
4. **Add indexes** on all foreign key columns
5. **Consolidate duplicate AuditLogs** table definitions
6. **Add stock reconciliation** reports and alerts
7. **Add performance monitoring** for slow queries

---

## Q. Final Conclusion

### Analysis Summary

| Metric | Count |
|--------|-------|
| Total tables reviewed | 65+ |
| Total routes reviewed | 50+ |
| Total controllers reviewed | 30+ |
| Critical issues | 8 |
| High-risk issues | 12 |
| Medium-risk issues | 10 |
| Low-risk issues | 3 |

### Critical Issues

1. **Products.StockQuantity is manually editable** — must be synchronized or removed
2. **Sales orders do not affect stock** — no reservation, no deduction
3. **Delivery challans do not deduct stock** — goods dispatched without inventory impact
4. **Sales returns do not restore stock** — returned goods lost from inventory
5. **Purchase returns do not reduce stock** — returned goods remain in inventory
6. **Production does not affect stock** — materials not consumed, goods not created
7. **MSSQL-style queries in PostgreSQL** — DeliveryChallans, SalesReturns, PurchaseReturns will fail
8. **No row locking or idempotency** — race conditions and duplicate postings possible

### Missing Inventory Workflows
- Sales order reservation and dispatch deduction
- Delivery challan stock deduction
- Sales return stock restoration
- Purchase return stock reduction
- Production material consumption and output receipt
- Batch quantity synchronization
- Serial number status management

### Missing Authorization Checks
- Branch scope enforcement
- Warehouse scope enforcement
- Record-level visibility for inventory
- Field-level permissions
- Approval workflow enforcement
- Segregation of duties

### Missing Audit Operations
- Audit logging in all inventory controllers
- Notification creation in all workflows
- Approval history tracking

### Recommended First Implementation Task

**Phase 1, Task 1: Remove hard delete and add row locking to stock operations.**

This is the highest-impact, lowest-risk change that immediately protects data integrity. Start with the `createGRN` controller as a template since it already has the best transaction structure, then apply the same pattern to `createStockTransfer`, `createStockAdjustment`, and eventually all other stock-modifying controllers.