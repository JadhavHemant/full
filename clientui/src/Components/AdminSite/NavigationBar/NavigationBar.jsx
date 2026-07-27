import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from "@headlessui/react";
import {
  HomeIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  FolderIcon,
} from "@heroicons/react/24/outline";
import { Link, Outlet, useLocation } from "react-router-dom";
import LogoutButton from "../LogoutButton/LogoutButton";
import { useEffect, useState } from "react";
import { startSessionKeepalive, stopSessionKeepalive } from "../utils/sessionKeepalive";
import axiosInstance from "../utils/axiosInstance";
import * as API from "../../Endpoint/Endpoint";
import { resolveAssetUrl } from "../../../utils/assetUrl";
import { isSuperAdminUser } from "../../../utils/sessionUser";

export default function NavigationBar() {
  const [uData, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [isHovering, setIsHovering] = useState(false);
  const location = useLocation();

  // Determine if user is super admin from the loaded profile data
  const isSuperAdmin = uData && isSuperAdminUser(uData);

  // Build navigation dynamically based on user role
  const navigation = [
    { name: "Dashboard", href: "/Admin", icon: HomeIcon },
    ...(isSuperAdmin
      ? [{ name: "Modules", href: "/Admin/modules", icon: FolderIcon }]
      : []),
    {
      name: "CRM",
      icon: FolderIcon,
      children: [
        { name: "Accounts",        href: "/Admin/Accounts" },
        { name: "Contacts",        href: "/Admin/Contact" },
        { name: "Leads",           href: "/Admin/Leads" },
        { name: "Opportunities",   href: "/Admin/Opportunities" },
        { name: "Activities",      href: "/Admin/Activities" },
        { name: "Quotes",          href: "/Admin/Quotes" },
        { name: "Invoices",        href: "/Admin/Invoices" },
        { name: "Payments",        href: "/Admin/Payments" },
        { name: "PreSales",        href: "/Admin/PreSales" },
        { name: "Cases",           href: "/Admin/Cases" },
        { name: "Retention",       href: "/Admin/Retentions" },
      ],
    },
    {
      name: "Master",
      icon: FolderIcon,
      children: [
        { name: "All Master Data",   href: "/Admin/Master" },
        { name: "Task Types",        href: "/Admin/CRM/TaskTypes" },
        { name: "Sales Stages",      href: "/Admin/CRM/SalesStages" },
        { name: "Industries",        href: "/Admin/CRM/Industries" },
        { name: "Follow-up Types",   href: "/Admin/CRM/FollowupTypes" },
        { name: "Lead Sources",      href: "/Admin/CRM/LeadSources" },
        { name: "Roles & Access",    href: "/Admin/HR/Roles" },
        { name: "User Types",        href: "/Admin/HR/UserTypes" },
        { name: "Product Categories",href: "/Admin/ERP/ProductCategory" },
        { name: "Units",             href: "/Admin/ERP/Units" },
        { name: "Brands",            href: "/Admin/ERP/Brands" },
      ],
    },
    {
      name: "Inventory",
      icon: FolderIcon,
      children: [
        { name: "Overview",          href: "/Admin/ERP" },
        { name: "Products",          href: "/Admin/ERP/Products" },
        { name: "Product Categories",href: "/Admin/ERP/ProductCategory" },
        { name: "Units",             href: "/Admin/ERP/Units" },
        { name: "Brands",            href: "/Admin/ERP/Brands" },
        { name: "Warehouse",         href: "/Admin/ERP/Warehouse" },
        { name: "Product Stock",     href: "/Admin/ERP/ProductStock" },
        { name: "Stock Movements",   href: "/Admin/ERP/StockMovements" },
        { name: "Stock Transfers",   href: "/Admin/ERP/StockTransfers" },
        { name: "Stock Adjustments", href: "/Admin/ERP/StockAdjustments" },
        { name: "Batches",           href: "/Admin/ERP/Batches" },
        { name: "Serial Numbers",    href: "/Admin/ERP/SerialNumbers" },
      ],
    },
    {
      name: "Procurement",
      icon: FolderIcon,
      children: [
        { name: "Purchase Orders",    href: "/Admin/ERP/PurchaseOrders" },
        { name: "Purchase Items",     href: "/Admin/ERP/PurchaseOrderItems" },
        { name: "Requisitions",       href: "/Admin/ERP/PurchaseRequisitions" },
        { name: "GRN",                href: "/Admin/ERP/GRN" },
        { name: "Suppliers",          href: "/Admin/ERP/Suppliers" },
      ],
    },
    {
      name: "Sales",
      icon: FolderIcon,
      children: [
        { name: "Sales Orders",     href: "/Admin/ERP/SalesOrders" },
        { name: "Sales Quotations", href: "/Admin/ERP/SalesQuotations" },
        { name: "Delivery Challans", href: "/Admin/ERP/DeliveryChallans" },
        { name: "Sales Returns",    href: "/Admin/ERP/SalesReturns" },
        { name: "Sell",             href: "/Admin/ERP/Sell" },
        { name: "Customers",        href: "/Admin/ERP/Customers" },
      ],
    },
    {
      name: "Finance",
      icon: FolderIcon,
      children: [
        { name: "Expenses",        href: "/Admin/ERP/Expenses" },
        { name: "Purchase Returns", href: "/Admin/ERP/PurchaseReturns" },
      ],
    },
    {
      name: "Production",
      icon: FolderIcon,
      children: [
        { name: "Bill of Materials",  href: "/Admin/ERP/BOM" },
        { name: "Production Orders",  href: "/Admin/ERP/ProductionOrders" },
      ],
    },
    {
      name: "Approvals",
      icon: FolderIcon,
      children: [
        { name: "Approval Requests", href: "/Admin/ERP/Approvals" },
      ],
    },
    {
      name: "HR & Admin",
      icon: FolderIcon,
      children: [
        { name: "Users",       href: "/Admin/HR/Users" },
        { name: "Org Chart",   href: "/Admin/HR/OrgChart" },
        { name: "Companies",   href: "/Admin/HR/Companies" },
        { name: "Roles",       href: "/Admin/HR/Roles" },
      ],
    },
    { name: "Chat",      href: "/Admin/Chat",       icon: FolderIcon },
    { name: "Reports",   href: "/Admin/Reports",    icon: FolderIcon },
    {
      name: "Settings",
      icon: FolderIcon,
      children: [
        { name: "Profile",        href: "/Admin/profile" },
        { name: "App Settings",   href: "/Admin/settings" },
        { name: "Import / Export",href: "/Admin/ERP/ImportExport" },
        ...(isSuperAdmin ? [{ name: "System Modules", href: "/Admin/modules" }] : []),
      ],
    },
  ];

  useEffect(() => {
    axiosInstance
      .get(API.PROFILE)
      .then((res) => setData(res.data?.profile || null))
      .catch((err) => {
        const message =
          err.response?.data?.message || "Failed to fetch profile.";
        setError(message);
      })
      .finally(() => setLoading(false));

    startSessionKeepalive();

    return () => {
      stopSessionKeepalive();
    };
  }, []);

  function classNames(...classes) {
    return classes.filter(Boolean).join(" ");
  }

  const isPathActive = (href) => location.pathname === href;

  const isGroupActive = (item) =>
    item.children?.some((child) => isPathActive(child.href));

  const handleDropdownToggle = (menuName) => {
    setOpenDropdown((prev) => (prev === menuName ? null : menuName));
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
    if (!isSidebarCollapsed) {
      setOpenDropdown(null);
    }
  };

  const isSidebarExpanded = !isSidebarCollapsed || isHovering;

  return (
    <>
      <div className="flex h-screen overflow-hidden">
      <aside
        className={classNames(
          "hidden sm:flex sm:flex-col bg-gray-900 text-gray-300 transition-all duration-300 ease-in-out flex-shrink-0 border-r border-gray-800",
          isSidebarExpanded ? "w-64" : "w-20"
        )}
        onMouseEnter={() => !isSidebarCollapsed && setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div className="h-16 bg-gray-800 flex items-center justify-between px-4 border-b border-gray-700 flex-shrink-0">
          {isSidebarExpanded ? (
            <>
              <div>
<<<<<<< HEAD
                <h1 className="text-xl font-bold text-white whitespace-nowrap">Shivani.ERP</h1>
=======
                <h1 className="text-xl font-bold text-white whitespace-nowrap">Test</h1>
>>>>>>> 874ff444e83b8c6282f05ae369cd8d0dbff37337
                <p className="text-[11px] text-gray-400">All in one</p>
              </div>
              <button
                onClick={toggleSidebar}
                className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700 transition"
                title="Collapse sidebar"
              >
                <ChevronDoubleLeftIcon className="h-5 w-5" />
              </button>
            </>
          ) : (
            <button
              onClick={toggleSidebar}
              className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700 transition mx-auto"
              title="Expand sidebar"
            >
              <ChevronDoubleRightIcon className="h-5 w-5" />
            </button>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navigation.map((item) =>
            item.children ? (
              <div key={item.name}>
                <button
                  onClick={() => isSidebarExpanded && handleDropdownToggle(item.name)}
                  className={classNames(
                    "flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all",
                    openDropdown === item.name
                      ? "bg-gray-800 text-white"
                      : isGroupActive(item)
                      ? "bg-orange-500 text-white"
                      : "hover:bg-gray-800 text-gray-300 hover:text-white"
                  )}
                  title={!isSidebarExpanded ? item.name : ""}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {isSidebarExpanded && (
                    <>
                      <span className="ml-3 flex-1 text-left">{item.name}</span>
                      <ChevronDownIcon
                        className={classNames(
                          "h-4 w-4 transition-transform duration-200",
                          openDropdown === item.name ? "rotate-180" : ""
                        )}
                      />
                    </>
                  )}
                </button>

                {openDropdown === item.name && isSidebarExpanded && (
                  <div className="ml-11 mt-1 space-y-1">
                    {item.children.map((subItem) => (
                      <Link
                        key={subItem.name}
                        to={subItem.href}
                        className={classNames(
                          location.pathname === subItem.href
                            ? "bg-orange-500 text-white"
                            : "text-gray-400 hover:bg-gray-800 hover:text-white",
                          "block px-3 py-2 rounded-lg text-sm transition-all"
                        )}
                      >
                        {subItem.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={item.name}
                to={item.href}
                className={classNames(
                  isPathActive(item.href)
                    ? "bg-orange-500 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white",
                  "flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
                )}
                title={!isSidebarExpanded ? item.name : ""}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {isSidebarExpanded && <span className="ml-3">{item.name}</span>}
              </Link>
            )
          )}
        </nav>

        <div className="border-t border-gray-800 p-3 flex-shrink-0">
          <Menu as="div" className="relative">
            <MenuButton
              className={classNames(
                "flex items-center w-full rounded-lg hover:bg-gray-800 p-2 transition",
                isSidebarExpanded ? "gap-3" : "justify-center"
              )}
            >
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-orange-500 text-white font-bold flex-shrink-0">
                {uData?.image ? (
                  <img
                    src={resolveAssetUrl(uData.image)}
                    alt="User"
                    className="w-9 h-9 rounded-full object-cover"
                  />
                ) : (
                  uData?.name?.charAt(0).toUpperCase() || "?"
                )}
              </div>
              {isSidebarExpanded && (
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {uData?.name || "User"}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {uData?.email || "user@example.com"}
                  </p>
                </div>
              )}
            </MenuButton>

            <MenuItems className="absolute bottom-full left-0 mb-2 w-48 rounded-lg bg-gray-800 shadow-lg py-1 border border-gray-700">
              <MenuItem>
                <Link
                  to="/Admin/profile"
                  className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-md mx-1"
                >
                  Your Profile
                </Link>
              </MenuItem>
              <MenuItem>
                <Link
                  to="/Admin/settings"
                  className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-md mx-1"
                >
                  Settings
                </Link>
              </MenuItem>
              <MenuItem>
                <div className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 cursor-pointer rounded-md mx-1">
                  <LogoutButton />
                </div>
              </MenuItem>
            </MenuItems>
          </Menu>
        </div>
      </aside>

      <div className="sm:hidden fixed top-0 left-0 right-0 h-16 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="text-gray-200 hover:bg-gray-700 p-1.5 rounded-md"
          >
            {isMobileOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
          </button>
          <h1 className="text-lg font-bold text-white">CRM System</h1>
        </div>

        <Menu as="div" className="relative">
          <MenuButton className="flex items-center justify-center w-9 h-9 rounded-full bg-orange-500 text-white font-bold">
            {uData?.image ? (
              <img
                src={resolveAssetUrl(uData.image)}
                alt="User"
                className="w-9 h-9 rounded-full object-cover"
              />
            ) : (
              uData?.name?.charAt(0).toUpperCase() || "?"
            )}
          </MenuButton>

          <MenuItems className="absolute right-0 mt-2 w-48 rounded-lg bg-gray-800 shadow-lg py-1 border border-gray-700">
            <MenuItem>
              <Link to="/Admin/profile" className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">
                Your Profile
              </Link>
            </MenuItem>
            <MenuItem>
              <Link to="/Admin/settings" className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">
                Settings
              </Link>
            </MenuItem>
            <MenuItem>
              <div className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 cursor-pointer">
                <LogoutButton />
              </div>
            </MenuItem>
          </MenuItems>
        </Menu>
      </div>

      <main className="flex-1 overflow-auto bg-gray-50 pt-16 sm:pt-0">
        <Outlet />
      </main>

      {isMobileOpen && (
        <div className="fixed inset-0 z-40 sm:hidden" onClick={() => setIsMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="absolute top-16 left-0 w-72 h-[calc(100vh-4rem)] bg-gray-900 shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="p-4 space-y-1">
              {navigation.map((item) =>
                item.children ? (
                  <div key={item.name}>
                    <button
                      onClick={() => handleDropdownToggle(item.name)}
                      className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-gray-800 text-gray-300 hover:text-white"
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="h-5 w-5" />
                        <span>{item.name}</span>
                      </div>
                      <ChevronDownIcon
                        className={classNames(
                          "h-4 w-4 transition-transform",
                          openDropdown === item.name ? "rotate-180" : ""
                        )}
                      />
                    </button>

                    {openDropdown === item.name && (
                      <div className="ml-11 mt-1 space-y-1">
                        {item.children.map((subItem) => (
                          <Link
                            key={subItem.name}
                            to={subItem.href}
                            onClick={() => setIsMobileOpen(false)}
                            className={classNames(
                              isPathActive(subItem.href)
                                ? "bg-orange-500 text-white"
                                : "text-gray-400 hover:bg-gray-800 hover:text-white",
                              "block px-3 py-2 rounded-lg text-sm"
                            )}
                          >
                            {subItem.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    className={classNames(
                      isPathActive(item.href)
                        ? "bg-orange-500 text-white"
                        : "text-gray-300 hover:bg-gray-800 hover:text-white",
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                )
              )}
            </nav>
          </div>
        </div>
      )}
    </div>
    </>
  );
}