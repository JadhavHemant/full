import { ADMIN_ROLE_ID, MANAGER_ROLE_ID, SUPER_ADMIN_ROLE_ID } from "../../utils/sessionUser";

const USER_PORTAL_ITEMS = [
  { label: "Dashboard", to: "/user", section: "main" },
  { label: "Profile", to: "/user/profile", section: "main" },
  { label: "Settings", to: "/user/settings", section: "main" },
  { label: "Accounts", to: "/user/accounts", section: "crm" },
  { label: "Contacts", to: "/user/contacts", section: "crm" },
  { label: "Leads", to: "/user/leads", section: "crm" },
  { label: "Opportunities", to: "/user/opportunities", section: "crm" },
  { label: "Activities", to: "/user/activities", section: "crm" },
  { label: "Quotes", to: "/user/quotes", section: "crm" },
  { label: "Invoices", to: "/user/invoices", section: "crm" },
  { label: "Payments", to: "/user/payments", section: "crm" },
  { label: "PreSales", to: "/user/presales", section: "crm" },
  { label: "Cases", to: "/user/cases", section: "crm" },
  { label: "Retention", to: "/user/retentions", section: "crm" },
];

export const getUserPortalItems = (roleId) => {
  const normalizedRoleId = Number(roleId);
  const blockedRoles = new Set([SUPER_ADMIN_ROLE_ID, ADMIN_ROLE_ID, MANAGER_ROLE_ID]);
  const allowPreSales = normalizedRoleId !== 6;

  return USER_PORTAL_ITEMS.filter((item) => {
    if (!normalizedRoleId || blockedRoles.has(normalizedRoleId)) {
      return false;
    }

    if (item.to === "/user/presales") {
      return allowPreSales;
    }

    return true;
  });
};

export const getUserPortalSections = (roleId) => {
  const items = getUserPortalItems(roleId);

  return {
    main: items.filter((item) => item.section === "main"),
    crm: items.filter((item) => item.section === "crm"),
  };
};
