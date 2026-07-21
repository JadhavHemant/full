import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from "@headlessui/react";
import {
  Bars3Icon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  ChevronDownIcon,
  Cog6ToothIcon,
  FolderIcon,
  HomeIcon,
  UserCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import React, { useMemo, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import LogoutButton from "../AdminSite/LogoutButton/LogoutButton";
import { getSessionUser } from "../../utils/sessionUser";
import { resolveAssetUrl } from "../../utils/assetUrl";
import { getUserPortalSections } from "./userPortalConfig";

const getDirectIcon = (label) => {
  if (label === "Profile") return UserCircleIcon;
  if (label === "Settings") return Cog6ToothIcon;
  if (label === "Reports") return ChartBarIcon;
  if (label === "Chat") return ChatBubbleLeftRightIcon;
  return HomeIcon;
};

const UserPortalLayout = () => {
  const user = getSessionUser();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [openDropdown, setOpenDropdown] = useState("CRM");
  const [isHovering, setIsHovering] = useState(false);
  const sections = useMemo(() => getUserPortalSections(user?.roleId), [user?.roleId]);

  const navigation = useMemo(() => {
    const items = sections.main.map((item) => ({
      ...item,
      icon: getDirectIcon(item.label),
    }));

    if (sections.crm.length) {
      items.push({
        name: "CRM",
        icon: FolderIcon,
        children: sections.crm.map(({ label, to }) => ({ name: label, href: to })),
      });
    }

    return items;
  }, [sections]);

  const classNames = (...classes) => classes.filter(Boolean).join(" ");

  const handleDropdownToggle = (menuName) => {
    setOpenDropdown((prev) => (prev === menuName ? null : menuName));
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => !prev);
    if (!isSidebarCollapsed) {
      setOpenDropdown(null);
    }
  };

  const isSidebarExpanded = !isSidebarCollapsed || isHovering;

  return (
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
                <h1 className="text-xl font-bold text-white whitespace-nowrap">Sales Hub</h1>
                <p className="text-[11px] text-gray-400">CRM-only workspace</p>
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

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) =>
            item.children ? (
              <div key={item.name}>
                <button
                  onClick={() => isSidebarExpanded && handleDropdownToggle(item.name)}
                  className={classNames(
                    "flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all",
                    openDropdown === item.name
                      ? "bg-gray-800 text-white"
                      : item.children.some((child) => location.pathname === child.href)
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
                        key={subItem.href}
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
                key={item.to}
                to={item.to}
                className={classNames(
                  location.pathname === item.to
                    ? "bg-orange-500 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white",
                  "flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
                )}
                title={!isSidebarExpanded ? item.label : ""}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {isSidebarExpanded && <span className="ml-3">{item.label}</span>}
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
                {user?.image ? (
                  <img
                    src={resolveAssetUrl(user.image)}
                    alt="User"
                    className="w-9 h-9 rounded-full object-cover"
                  />
                ) : (
                  user?.name?.charAt(0).toUpperCase() || "?"
                )}
              </div>
              {isSidebarExpanded && (
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user?.name || "User"}</p>
                  <p className="text-xs text-gray-400 truncate">{user?.email || "user@example.com"}</p>
                </div>
              )}
            </MenuButton>

            <MenuItems className="absolute bottom-full left-0 mb-2 w-48 rounded-lg bg-gray-800 shadow-lg py-1 border border-gray-700">
              <MenuItem>
                <Link
                  to="/user/profile"
                  className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-md mx-1"
                >
                  Your Profile
                </Link>
              </MenuItem>
              <MenuItem>
                <Link
                  to="/user/settings"
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
          <h1 className="text-lg font-bold text-white">Sales Hub</h1>
        </div>

        <Menu as="div" className="relative">
          <MenuButton className="flex items-center justify-center w-9 h-9 rounded-full bg-orange-500 text-white font-bold">
            {user?.image ? (
              <img
                src={resolveAssetUrl(user.image)}
                alt="User"
                className="w-9 h-9 rounded-full object-cover"
              />
            ) : (
              user?.name?.charAt(0).toUpperCase() || "?"
            )}
          </MenuButton>

          <MenuItems className="absolute right-0 mt-2 w-48 rounded-lg bg-gray-800 shadow-lg py-1 border border-gray-700">
            <MenuItem>
              <Link to="/user/profile" className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">
                Your Profile
              </Link>
            </MenuItem>
            <MenuItem>
              <Link to="/user/settings" className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">
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
            onClick={(event) => event.stopPropagation()}
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
                            key={subItem.href}
                            to={subItem.href}
                            onClick={() => setIsMobileOpen(false)}
                            className={classNames(
                              location.pathname === subItem.href
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
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMobileOpen(false)}
                    className={classNames(
                      location.pathname === item.to
                        ? "bg-orange-500 text-white"
                        : "text-gray-300 hover:bg-gray-800 hover:text-white",
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                )
              )}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserPortalLayout;
