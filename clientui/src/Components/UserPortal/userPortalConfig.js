const USER_PORTAL_ITEMS = [
  { label: "Dashboard", to: "/user", roles: [2, 3, 4, 5, 6], section: "main" },
  { label: "Profile", to: "/user/profile", roles: [2, 3, 4, 5, 6], section: "main" },
  { label: "Settings", to: "/user/settings", roles: [2, 3, 4, 5, 6], section: "main" },
  { label: "Accounts", to: "/user/accounts", roles: [2, 3, 4, 5, 6], section: "crm" },
  { label: "Contacts", to: "/user/contacts", roles: [2, 3, 4, 5, 6], section: "crm" },
  { label: "Leads", to: "/user/leads", roles: [2, 3, 4, 5, 6], section: "crm" },
  { label: "Opportunities", to: "/user/opportunities", roles: [2, 3, 4, 5, 6], section: "crm" },
  { label: "Activities", to: "/user/activities", roles: [2, 3, 4, 5, 6], section: "crm" },
  { label: "Quotes", to: "/user/quotes", roles: [2, 3, 4, 5, 6], section: "crm" },
  { label: "Invoices", to: "/user/invoices", roles: [2, 3, 4, 5, 6], section: "crm" },
  { label: "Payments", to: "/user/payments", roles: [2, 3, 4, 5, 6], section: "crm" },
  { label: "PreSales", to: "/user/presales", roles: [2, 3, 4, 5], section: "crm" },
  { label: "Cases", to: "/user/cases", roles: [2, 3, 4, 5, 6], section: "crm" },
  { label: "Retention", to: "/user/retentions", roles: [2, 3, 4, 5, 6], section: "crm" },
];

export const getUserPortalItems = (roleId) =>
  USER_PORTAL_ITEMS.filter((item) => item.roles.includes(Number(roleId)));

export const getUserPortalSections = (roleId) => {
  const items = getUserPortalItems(roleId);

  return {
    main: items.filter((item) => item.section === "main"),
    crm: items.filter((item) => item.section === "crm"),
  };
};
