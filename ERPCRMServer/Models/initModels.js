const { appPool } = require("../config/db");
const { Roles } = require('./Users/Roles');
const { createCompaniesTable } = require('./Users/companyModel');
const { createUserTypesTable } = require('./Users/userTypeModel');
const { createUsersTable } = require('./Users/userModel');
const { createTokenTable } = require('./Token/tokenModel');
const { PasswordResets } = require('./Users/PasswordResets');
const { EmailOtpVerifications } = require('./Users/EmailOtpVerifications');

// RBAC Models
const { Modules } = require('./RBAC/Modules');
const { Permissions } = require('./RBAC/Permissions');
const { UserRoles } = require('./RBAC/UserRoles');
const { RolePermissions } = require('./RBAC/RolePermissions');
const { Menus } = require('./RBAC/Menus');
const { MenuPermissions } = require('./RBAC/MenuPermissions');
const { FieldPermissions } = require('./RBAC/FieldPermissions');
const { RecordPermissions } = require('./RBAC/RecordPermissions');

// Security Models
const { RefreshTokens } = require('./Security/RefreshTokens');
const { EmailVerificationTokens } = require('./Security/EmailVerificationTokens');
const { LoginHistory } = require('./Security/LoginHistory');
const { User2FA } = require('./Users/User2FA');

const { Units } = require('./InventoryManagement/Units');
const { ProductCategoriesTable } = require('./InventoryManagement/ProductCategories');
const { ProductTable } = require('./InventoryManagement/Products');
const { Warehouses } = require('./InventoryManagement/Warehouses');
const { ProductStockPerWarehouse } = require('./InventoryManagement/ProductStockPerWarehouse');
const { StockMovements } = require('./InventoryManagement/StockMovements');
const { Suppliers } = require('./InventoryManagement/Suppliers');
const { PurchaseOrders } = require('./InventoryManagement/PurchaseOrders');
const { PurchaseOrderItems } = require('./InventoryManagement/PurchaseOrderItems');
const { Customers } = require('./InventoryManagement/Customers');
const { SalesOrders } = require('./InventoryManagement/SalesOrders');
const { SalesOrderItems } = require('./InventoryManagement/SalesOrderItems');
const { Taxes } = require('./InventoryManagement/Taxes');
const { ProductTaxMap } = require('./InventoryManagement/ProductTaxMap');
const { AuditLogs } = require('./InventoryManagement/AuditLogs');
const { ProfitLossReports } = require('./InventoryManagement/ProfitLossReports');
const { BrandsTable } = require('./InventoryManagement/Brands');
const { BatchSerialTable } = require('./InventoryManagement/BatchSerial');
const { WarehouseLocationsTable } = require('./InventoryManagement/WarehouseLocations');
const { GRNTable } = require('./InventoryManagement/GRN');
const { StockTransfersTable } = require('./InventoryManagement/StockTransfers');
const { Employees, Departments, Designations } = require('./InventoryManagement/Employees');
const { PurchaseRequisitions, PurchaseRequisitionItems } = require('./InventoryManagement/PurchaseRequisitions');
const { PurchaseReturns, PurchaseReturnItems } = require('./InventoryManagement/PurchaseReturns');
const { SalesQuotations, SalesQuotationItems } = require('./InventoryManagement/SalesQuotations');
const { DeliveryChallans, DeliveryChallanItems } = require('./InventoryManagement/DeliveryChallans');
const { SalesReturns, SalesReturnItems } = require('./InventoryManagement/SalesReturns');
const { BOM, BOMItems, ProductionOrders, ProductionTracking } = require('./InventoryManagement/Production');
const { Notifications, ApprovalWorkflows, Expenses, WarehouseRacks, WarehouseBins } = require('./InventoryManagement/Notifications');

const { LeadSources } = require('./CrmModels/LeadSources');
const { ProductCategories } = require('./CrmModels/ProductCategories');
const { FollowupTypes } = require('./CrmModels/FollowupTypes');
const { Industries } = require('./CrmModels/Industries');
const { SalesStages } = require('./CrmModels/SalesStages');
const { TaskTypes } = require('./CrmModels/TaskTypes');
const { Accounts } = require('./CrmModels/Accounts');
const { Contacts } = require('./CrmModels/Contacts');
const { Leads } = require('./CrmModels/Leads');
const { Opportunities } = require('./CrmModels/Opportunities');
const { Activities } = require('./CrmModels/Activities');
const { Quotes } = require('./CrmModels/Quotes');
const { Invoices } = require('./CrmModels/Invoices');
const { Payments } = require('./CrmModels/Payments');
const { Retentions } = require('./CrmModels/Retentions');
const { Presales } = require('./CrmModels/Presales');
const { Cases } = require('./CrmModels/Cases');
const { OpportunityProducts } = require('./CrmModels/OpportunityProducts');
const { Comments } = require('./CrmModels/Comments');
const { PresalesAssignments } = require('./CrmModels/PresalesAssignments');
const { Groups } = require('./CrmModels/Groups');
const { GroupMembers } = require('./CrmModels/GroupMembers');
const { Assignments } = require('./CrmModels/Assignments');
const { EntityVisibility } = require('./CrmModels/EntityVisibility');
const { createPlatformCoreTables } = require('./System/platformCore');
const { createCompanySettingsTable } = require('./System/CompanySettings');
const { createNotificationPreferencesTable } = require('./System/NotificationPreferences');
const { createAuditEventsTable } = require('./System/AuditEvents');
const { createTeamsChatTables } = require('./System/TeamsChat');
const { createInboundEmailRoutingTables } = require('./System/InboundEmailRouting');
const { QualityControl, QualityControlItems } = require('./InventoryManagement/QualityControl');
const { StockValuation } = require('./InventoryManagement/StockValuation');
const { CostingMethod } = require('./InventoryManagement/CostingMethod');
const { LandedCost } = require('./InventoryManagement/LandedCost');
const { CostAdjustment } = require('./InventoryManagement/CostAdjustment');
const { ReorderLevels } = require('./InventoryManagement/ReorderLevels');
const { ReorderHistory } = require('./InventoryManagement/ReorderHistory');
<<<<<<< HEAD
const { FinancialYear } = require('./InventoryManagement/FinancialYear');
const { Documents } = require('./InventoryManagement/Documents');
const { EmailLogs } = require('./InventoryManagement/EmailLogs');
=======
const { FinancialYear, AccountingPeriod } = require('./InventoryManagement/FinancialYear');
const { Documents, DocumentVersions, DocumentAccess } = require('./InventoryManagement/Documents');
const { RFQ, RFQItems, RFQVendors } = require('./InventoryManagement/RFQ');
const { PriceList, PriceListItem, PriceListCustomer } = require('./InventoryManagement/PriceList');
const { HSNCode } = require('./InventoryManagement/HSNCode');
const { InvoiceMatch, InvoiceMatchLine } = require('./InventoryManagement/InvoiceMatch');
const { PutawayTask, PickingList, PickingItem, CycleCount, CycleCountItem } = require('./InventoryManagement/WarehouseOperations');
const { Currencies, ExchangeRates } = require('./InventoryManagement/Currencies');
const { ChartOfAccounts, JournalEntry, JournalEntryLine } = require('./InventoryManagement/Accounting');
>>>>>>> 874ff444e83b8c6282f05ae369cd8d0dbff37337

const initModels = async () => {
  // Core user and auth tables (maintain dependency order)
  await Roles();
  await createCompaniesTable();
  await createUserTypesTable();
  await createUsersTable();
  await createTokenTable();
  await PasswordResets();
  await EmailOtpVerifications();

  // RBAC tables (Modules first, then Permissions, then junction tables)
  await Modules();
  await Permissions();
  await UserRoles();
  await RolePermissions();
  await Menus();
  await MenuPermissions();
  await FieldPermissions();
  await RecordPermissions();

  // Security tables
  await RefreshTokens();
  await EmailVerificationTokens();
  await LoginHistory();
  await User2FA();
  await Units();
  await ProductCategoriesTable();
  await ProductTable();
  await Warehouses();
  await ProductStockPerWarehouse();
  await StockMovements();
  await Suppliers();
  await PurchaseOrders();
  await PurchaseOrderItems();
  await Customers();
  await SalesOrders();
  await SalesOrderItems();
  await Taxes();
  await ProductTaxMap();
  await AuditLogs();
  await ProfitLossReports();
  await BrandsTable();
  await BatchSerialTable();
  await WarehouseLocationsTable();
  await GRNTable();
  await StockTransfersTable();
  await Employees();
  await Departments();
  await Designations();
  await PurchaseRequisitions();
  await PurchaseRequisitionItems();
  await PurchaseReturns();
  await PurchaseReturnItems();
  await SalesQuotations();
  await SalesQuotationItems();
  await DeliveryChallans();
  await DeliveryChallanItems();
  await SalesReturns();
  await SalesReturnItems();
  await BOM();
  await BOMItems();
  await ProductionOrders();
  await ProductionTracking();
  await Notifications();
  await ApprovalWorkflows();
  await Expenses();
  await WarehouseRacks();
  await WarehouseBins();
  await TaskTypes();
  await LeadSources();
  await ProductCategories();
  await FollowupTypes();
  await Industries();
  await SalesStages();
  await Accounts();
  await Contacts();
  await Leads();
  await Opportunities();
  await Activities();
  await Quotes();
  await Invoices();
  await Payments();
  await Retentions();
  await Presales();
  await Cases();
  await OpportunityProducts();
  await Comments();
  await PresalesAssignments();
  await Groups();
  await GroupMembers();
  await Assignments();
  await EntityVisibility();
  await createPlatformCoreTables();
  await createCompanySettingsTable();
  await createNotificationPreferencesTable();
  await createAuditEventsTable();
  await createTeamsChatTables();
  await createInboundEmailRoutingTables();
  await QualityControl();
  await QualityControlItems();
  await StockValuation();
  await CostingMethod();
  await LandedCost();
  await CostAdjustment();
  await ReorderLevels();
  await ReorderHistory();
  await FinancialYear();
<<<<<<< HEAD
  await Documents();
  await EmailLogs();

  // Create AuditLogDetails table for field-level change tracking
  await appPool.query(`
    CREATE TABLE IF NOT EXISTS "AuditLogDetails" (
      "Id" SERIAL PRIMARY KEY,
      "AuditLogId" INT REFERENCES "AuditLogs"("Id") ON DELETE CASCADE,
      "BeforeValues" JSONB DEFAULT '{}',
      "AfterValues" JSONB DEFAULT '{}',
      "ChangedFields" TEXT[] DEFAULT '{}',
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("AuditLogId")
    )
  `);
  await appPool.query('CREATE INDEX IF NOT EXISTS idx_audit_log_details_log ON "AuditLogDetails"("AuditLogId")');
  console.log("✅ AuditLogDetails table ready");
=======
  await AccountingPeriod();
  await Documents();
  await DocumentVersions();
  await DocumentAccess();
  await RFQ();
  await RFQItems();
  await RFQVendors();
  await PriceList();
  await PriceListItem();
  await PriceListCustomer();
  await HSNCode();
  await InvoiceMatch();
  await InvoiceMatchLine();
  await PutawayTask();
  await PickingList();
  await PickingItem();
  await CycleCount();
  await CycleCountItem();
  await Currencies();
  await ExchangeRates();
  await ChartOfAccounts();
  await JournalEntry();
  await JournalEntryLine();
>>>>>>> 874ff444e83b8c6282f05ae369cd8d0dbff37337
};

module.exports = { initModels };
