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

// ── Shared / System ──────────────────────────────────────────────────────────
const Profile       = lazy(() => import("../AdminSite/Profile/Profile"));
const EditProfilePage = lazy(() => import("../AdminSite/Profile/EditProfilePage"));
const SettingsPage  = lazy(() => import("../AdminSite/Settings/SettingsPage"));
const ModulesPage   = lazy(() => import("../AdminSite/Modules/ModulesPage"));
const Reports       = lazy(() => import("../AdminSite/Reports/Reports"));
const DataImportExport = lazy(() => import("../../features/inventory/pages/DataImportExportPage"));
const PurchaseRequisitions = lazy(() => import("../../features/inventory/pages/PurchaseRequisitionsPage"));

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

              {/* ERP — Import / Export */}
              <Route path="ERP/ImportExport"          element={<DataImportExport />} />

              {/* HR / Admin */}
              <Route path="HR/Users"                  element={<Users />} />
              <Route path="HR/Users/Register"         element={<RegisterUserPage />} />
              <Route path="HR/OrgChart"               element={<OrgChart />} />
              <Route path="HR/Companies"              element={<Company />} />
              <Route path="HR/Roles"                  element={<RoleAccess />} />

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