import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import PrivateRoute from "../PrivateRoute/PrivateRoute";
import AdminRoute from "../PrivateRoute/AdminRoute";
import UserRoute from "../PrivateRoute/UserRoute";

// ── Layout / Auth ─────────────────────────────────────────────────────────────
const Navigation       = lazy(() => import("../AdminSite/NavigationBar/NavigationBar"));
const LoginCommon      = lazy(() => import("../LoginPage/LoginCommon"));
const LoginPage        = lazy(() => import("../LoginPage/LoginPage"));
const ForgotPassword   = lazy(() => import("../AdminSite/Profile/ForgotPassword/ForgotPassword"));
const ResetPassword    = lazy(() => import("../AdminSite/Profile/ResetPassword/ResetPassword"));
const UserPortalLayout = lazy(() => import("../UserPortal/UserPortalLayout"));

// ── CRM pages ────────────────────────────────────────────────────────────────
const HomePage      = lazy(() => import("../../features/crm/pages/AdminDashboardPage"));
const UserDashboard = lazy(() => import("../../features/crm/pages/UserDashboardPage"));
const Leads         = lazy(() => import("../../features/crm/pages/LeadsPage"));
const Opportunities = lazy(() => import("../../features/crm/pages/OpportunitiesPage"));
const PreSales      = lazy(() => import("../../features/crm/pages/PreSalesPage"));
const Cases         = lazy(() => import("../../features/crm/pages/CasesPage"));
const Contact       = lazy(() => import("../../features/crm/pages/ContactsPage"));
const Accounts      = lazy(() => import("../../features/crm/pages/AccountsPage"));
const Activities    = lazy(() => import("../../features/crm/pages/ActivitiesPage"));
const Quotes        = lazy(() => import("../../features/crm/pages/QuotesPage"));
const Invoices      = lazy(() => import("../../features/crm/pages/InvoicesPage"));
const Payments      = lazy(() => import("../../features/crm/pages/PaymentsPage"));
const Retentions    = lazy(() => import("../../features/crm/pages/RetentionPage"));
const MasterDetails = lazy(() => import("../../features/crm/pages/MasterDetailsPage"));
const FollowupTypesPage = lazy(() =>
  import("../../features/crm/pages/MasterDetailsPage").then((m) => ({ default: m.FollowupTypesPage }))
);
const IndustriesPage = lazy(() =>
  import("../../features/crm/pages/MasterDetailsPage").then((m) => ({ default: m.IndustriesPage }))
);
const SalesStagesPage = lazy(() =>
  import("../../features/crm/pages/MasterDetailsPage").then((m) => ({ default: m.SalesStagesPage }))
);
const TaskTypesPage = lazy(() =>
  import("../../features/crm/pages/MasterDetailsPage").then((m) => ({ default: m.TaskTypesPage }))
);
const LeadSourcesPage = lazy(() =>
  import("../../features/crm/pages/MasterDetailsPage").then((m) => ({ default: m.LeadSourcesPage }))
);

// ── ERP — Inventory ───────────────────────────────────────────────────────────
const Products          = lazy(() => import("../AdminSite/Products/Products"));
const ProductCategory   = lazy(() => import("../AdminSite/ProductCategory/ProductCategory"));
const Units             = lazy(() => import("../AdminSite/Units/Units"));
const Warehouse         = lazy(() => import("../AdminSite/Warehouse/Warehouse"));
const ProductStock      = lazy(() => import("../AdminSite/ProductStock/ProductStock"));
const StockMovements    = lazy(() => import("../AdminSite/StockMovements/StockMovements"));
const StockTransfers    = lazy(() => import("../AdminSite/StockTransfers/StockTransfersPage"));
const StockAdjustments  = lazy(() => import("../AdminSite/StockAdjustments/StockAdjustmentsPage"));
const Batches           = lazy(() => import("../AdminSite/Batches/BatchesPage"));
const SerialNumbers     = lazy(() => import("../AdminSite/SerialNumbers/SerialNumbersPage"));
const Brands            = lazy(() => import("../AdminSite/Brands/BrandsPage"));
const ERPModule         = lazy(() => import("../AdminSite/ERPModule/ERPModulePage"));
const StockValuation    = lazy(() => import("../../features/inventory/pages/StockValuationPage"));
const ReorderLevels     = lazy(() => import("../../features/inventory/pages/ReorderLevelsPage"));

// ── ERP — Procurement ────────────────────────────────────────────────────────
const PurchaseOrders     = lazy(() => import("../AdminSite/PurchaseOrders/PurchaseOrderManagement"));
const PurchaseOrderItems = lazy(() => import("../AdminSite/PurchaseOrderItems/PurchaseOrderItems"));
const GRN                = lazy(() => import("../AdminSite/GRN/GRNPage"));
const Suppliers          = lazy(() => import("../AdminSite/Suppliers/SupplierManagement"));

// ── ERP — Sales ──────────────────────────────────────────────────────────────
const SalesOrders = lazy(() => import("../AdminSite/SalesOrders/SalesOrders"));
const Customers   = lazy(() => import("../AdminSite/Customers/Customers"));
const Sell        = lazy(() => import("../AdminSite/Sell/Sell"));

// ── ERP — HR / Users ─────────────────────────────────────────────────────────
const Users            = lazy(() => import("../AdminSite/Users/UsersPage"));
const RegisterUserPage = lazy(() => import("../AdminSite/Users/RegisterUserPage"));
const OrgChart         = lazy(() => import("../AdminSite/Users/ClassicCorporateOrgChart"));
const Company          = lazy(() => import("../AdminSite/Company/Company"));
const RoleAccess       = lazy(() => import("../AdminSite/RoleAccess/RoleAccess"));
const UserTypesPage    = lazy(() => import("../AdminSite/UserTypes/UserTypesPage"));

// ── ERP — Finance ────────────────────────────────────────────────────────────
const Expenses           = lazy(() => import("../../features/inventory/pages/finance/ExpensesPage"));
const PurchaseReturns    = lazy(() => import("../../features/inventory/pages/finance/PurchaseReturnsPage"));
const JournalEntries     = lazy(() => import("../../features/inventory/pages/finance/JournalEntriesPage"));

// ── ERP — Finance Advanced ───────────────────────────────────────────────────
const ChartOfAccounts    = lazy(() => import("../../features/inventory/pages/ChartOfAccountsPage"));
const Currencies         = lazy(() => import("../../features/inventory/pages/CurrenciesPage"));
const FinancialYear      = lazy(() => import("../../features/inventory/pages/FinancialYearsPage"));
const HSNCodes           = lazy(() => import("../../features/inventory/pages/HSNCodesPage"));
const PriceLists         = lazy(() => import("../../features/inventory/pages/PriceListsPage"));
const InvoiceMatching    = lazy(() => import("../../features/inventory/pages/InvoiceMatchingPage"));
const RFQs               = lazy(() => import("../../features/inventory/pages/RFQsPage"));

// ── WMS ───────────────────────────────────────────────────────────────────────
const CycleCount         = lazy(() => import("../../features/inventory/pages/wms/CycleCountPage"));
const PickingLists       = lazy(() => import("../../features/inventory/pages/wms/PickingListsPage"));
const Putaway            = lazy(() => import("../../features/inventory/pages/wms/PutawayPage"));

// ── System / Analytics ───────────────────────────────────────────────────────
const AuditLogs          = lazy(() => import("../../features/inventory/pages/AuditLogsPage"));
const Documents          = lazy(() => import("../../features/inventory/pages/DocumentsPage"));
const EmailLogs          = lazy(() => import("../../features/inventory/pages/EmailLogsPage"));
const RecordPermissions  = lazy(() => import("../../features/inventory/pages/RecordPermissionsPage"));
const TwoFASetup         = lazy(() => import("../../features/inventory/pages/TwoFASetupPage"));
const ABCAnalysis        = lazy(() => import("../../features/inventory/pages/ABCAnalysisPage"));
const StockAgingReport   = lazy(() => import("../../features/inventory/pages/StockAgingReportPage"));
const VendorPerformance  = lazy(() => import("../../features/inventory/pages/VendorPerformancePage"));

// ── ERP — Production ─────────────────────────────────────────────────────────
const Bom              = lazy(() => import("../../features/inventory/pages/production/BomPage"));
const ProductionOrders = lazy(() => import("../../features/inventory/pages/production/ProductionOrdersPage"));

// ── ERP — Sales Sub-modules ──────────────────────────────────────────────────
const SalesQuotations   = lazy(() => import("../../features/inventory/pages/sales/SalesQuotationsPage"));
const DeliveryChallans  = lazy(() => import("../../features/inventory/pages/sales/DeliveryChallansPage"));
const SalesReturns      = lazy(() => import("../../features/inventory/pages/sales/SalesReturnsPage"));

// ── ERP — Approvals ──────────────────────────────────────────────────────────
const Approvals = lazy(() => import("../../features/inventory/pages/approvals/ApprovalsPage"));

// ── Shared / System ──────────────────────────────────────────────────────────
const Profile       = lazy(() => import("../AdminSite/Profile/Profile"));
const EditProfilePage = lazy(() => import("../AdminSite/Profile/EditProfilePage"));
const SettingsPage  = lazy(() => import("../AdminSite/Settings/SettingsPage"));
const ModulesPage   = lazy(() => import("../AdminSite/Modules/ModulesPage"));
const Reports       = lazy(() => import("../AdminSite/Reports/Reports"));
const DataImportExport = lazy(() => import("../../features/inventory/pages/DataImportExportPage"));
const PurchaseRequisitions = lazy(() => import("../../features/inventory/pages/PurchaseRequisitionsPage"));
const TeamsChatPage  = lazy(() => import("../AdminSite/Chat/TeamsChatPage"));
const ChatPage       = lazy(() => import("../../pages/ChatPage"));

const RouteLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-medium text-slate-600">
    Loading...
  </div>
);

const MainRouting = () => {
  return (
    <Router>
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          {/* ── Public ─────────────────────────────────────────────────── */}
          <Route path="/login" element={<LoginCommon />}>
            <Route index element={<LoginPage />} />
          </Route>
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password"  element={<ResetPassword />} />
          <Route path="/"                element={<PrivateRoute />} />

          {/* ── Admin / Manager / Employee (full sidebar) ───────────────── */}
          <Route element={<AdminRoute />}>
            <Route path="/Admin" element={<Navigation />}>
              {/* Dashboard */}
              <Route index element={<HomePage />} />

              {/* CRM */}
              <Route path="Accounts"       element={<Accounts />} />
              <Route path="Contact"        element={<Contact />} />
              <Route path="Leads"          element={<Leads />} />
              <Route path="Opportunities"  element={<Opportunities />} />
              <Route path="Activities"     element={<Activities />} />
              <Route path="Quotes"         element={<Quotes />} />
              <Route path="Invoices"       element={<Invoices />} />
              <Route path="Payments"       element={<Payments />} />
              <Route path="PreSales"       element={<PreSales />} />
              <Route path="Cases"          element={<Cases />} />
              <Route path="Retentions"     element={<Retentions />} />
              {/* CRM master data */}
              <Route path="Master"                    element={<MasterDetails />} />
              <Route path="CRM/TaskTypes"             element={<TaskTypesPage />} />
              <Route path="CRM/SalesStages"           element={<SalesStagesPage />} />
              <Route path="CRM/Industries"            element={<IndustriesPage />} />
              <Route path="CRM/FollowupTypes"         element={<FollowupTypesPage />} />
              <Route path="CRM/LeadSources"           element={<LeadSourcesPage />} />

              {/* ERP — Inventory */}
              <Route path="ERP"                       element={<ERPModule />} />
              <Route path="ERP/Products"              element={<Products />} />
              <Route path="ERP/ProductCategory"       element={<ProductCategory />} />
              <Route path="ERP/Units"                 element={<Units />} />
              <Route path="ERP/Warehouse"             element={<Warehouse />} />
              <Route path="ERP/ProductStock"          element={<ProductStock />} />
              <Route path="ERP/StockMovements"        element={<StockMovements />} />
              <Route path="ERP/StockTransfers"        element={<StockTransfers />} />
              <Route path="ERP/StockAdjustments"      element={<StockAdjustments />} />
              <Route path="ERP/Batches"               element={<Batches />} />
              <Route path="ERP/SerialNumbers"         element={<SerialNumbers />} />
              <Route path="ERP/Brands"                element={<Brands />} />
              <Route path="ERP/StockValuation"        element={<StockValuation />} />
              <Route path="ERP/ReorderLevels"         element={<ReorderLevels />} />

              {/* ERP — Procurement */}
              <Route path="ERP/PurchaseOrders"        element={<PurchaseOrders />} />
              <Route path="ERP/PurchaseOrderItems"    element={<PurchaseOrderItems />} />
              <Route path="ERP/PurchaseRequisitions"  element={<PurchaseRequisitions />} />
              <Route path="ERP/GRN"                   element={<GRN />} />
              <Route path="ERP/Suppliers"             element={<Suppliers />} />

              {/* ERP — Sales */}
              <Route path="ERP/SalesOrders"           element={<SalesOrders />} />
              <Route path="ERP/Sell"                  element={<Sell />} />
              <Route path="ERP/Customers"             element={<Customers />} />
              <Route path="ERP/SalesQuotations"       element={<SalesQuotations />} />
              <Route path="ERP/DeliveryChallans"      element={<DeliveryChallans />} />
              <Route path="ERP/SalesReturns"          element={<SalesReturns />} />

              {/* ERP — Finance */}
              <Route path="ERP/Expenses"              element={<Expenses />} />
              <Route path="ERP/PurchaseReturns"       element={<PurchaseReturns />} />
              <Route path="ERP/JournalEntries"        element={<JournalEntries />} />
              <Route path="ERP/ChartOfAccounts"       element={<ChartOfAccounts />} />
              <Route path="ERP/Currencies"            element={<Currencies />} />
              <Route path="ERP/FinancialYear"         element={<FinancialYear />} />
              <Route path="ERP/HSNCodes"              element={<HSNCodes />} />
              <Route path="ERP/PriceLists"            element={<PriceLists />} />
              <Route path="ERP/InvoiceMatching"       element={<InvoiceMatching />} />
              <Route path="ERP/RFQs"                  element={<RFQs />} />

              {/* ERP — WMS */}
              <Route path="ERP/WMS/CycleCount"        element={<CycleCount />} />
              <Route path="ERP/WMS/PickingLists"      element={<PickingLists />} />
              <Route path="ERP/WMS/Putaway"           element={<Putaway />} />

              {/* ERP — Production */}
              <Route path="ERP/BOM"                   element={<Bom />} />
              <Route path="ERP/ProductionOrders"      element={<ProductionOrders />} />

              {/* ERP — Approvals */}
              <Route path="ERP/Approvals"             element={<Approvals />} />

              {/* ERP — Import / Export */}
              <Route path="ERP/ImportExport"          element={<DataImportExport />} />

              {/* Chat / Teams */}
              <Route path="Chat"                      element={<TeamsChatPage />} />

              {/* HR / Admin */}
              <Route path="HR/Users"                  element={<Users />} />
              <Route path="HR/Users/Register"         element={<RegisterUserPage />} />
              <Route path="HR/OrgChart"               element={<OrgChart />} />
              <Route path="HR/Companies"              element={<Company />} />
              <Route path="HR/Roles"                  element={<RoleAccess />} />
              <Route path="HR/UserTypes"              element={<UserTypesPage />} />

              {/* Reports */}
              <Route path="Reports"                   element={<Reports />} />

              {/* System / Settings */}
              <Route path="modules"                   element={<ModulesPage />} />
              <Route path="profile"                   element={<Profile />} />
              <Route path="settings"                  element={<SettingsPage />} />
              <Route path="settings/profile"          element={<EditProfilePage />} />
            </Route>
          </Route>

          {/* ── User portal (read-only / employee self-service) ─────────── */}
          <Route element={<UserRoute />}>
            <Route path="/user" element={<UserPortalLayout />}>
              <Route index         element={<UserDashboard />} />
              <Route path="profile"      element={<Profile />} />
              <Route path="settings"     element={<SettingsPage />} />
              <Route path="settings/profile" element={<EditProfilePage />} />
              <Route path="accounts"     element={<Accounts />} />
              <Route path="contacts"     element={<Contact />} />
              <Route path="leads"        element={<Leads />} />
              <Route path="opportunities" element={<Opportunities />} />
              <Route path="presales"     element={<PreSales />} />
              <Route path="cases"        element={<Cases />} />
              <Route path="activities"   element={<Activities />} />
              <Route path="quotes"       element={<Quotes />} />
              <Route path="invoices"     element={<Invoices />} />
              <Route path="payments"     element={<Payments />} />
              <Route path="retentions"   element={<Retentions />} />
            </Route>
          </Route>

          <Route path="*" element={<LoginPage />} />
        </Routes>
      </Suspense>
    </Router>
  );
};

export default MainRouting;