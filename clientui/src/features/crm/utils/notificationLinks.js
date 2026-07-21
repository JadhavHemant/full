export const buildCrmNotificationLink = (notification, isUserPortal = false) => {
  const entityType = String(notification?.EntityType || "").toLowerCase();
  const entityId = Number(notification?.EntityId || 0);

  if (!entityId) {
    return null;
  }

  const routeByEntity = {
    lead: { admin: "/Admin/Leads", user: "/user/leads" },
    opportunity: { admin: "/Admin/Opportunities", user: "/user/opportunities" },
    presale: { admin: "/Admin/PreSales", user: "/user/presales" },
    activity: { admin: "/Admin/Activities", user: "/user/activities" },
    case: { admin: "/Admin/Cases", user: "/user/cases" },
    account: { admin: "/Admin/Accounts", user: "/user/accounts" },
    contact: { admin: "/Admin/Contact", user: "/user/contacts" },
    quote: { admin: "/Admin/Quotes", user: "/user/quotes" },
    invoice: { admin: "/Admin/Invoices", user: "/user/invoices" },
    payment: { admin: "/Admin/Payments", user: "/user/payments" },
    retention: { admin: "/Admin/Retentions", user: "/user/retentions" },
  };

  const routeConfig = routeByEntity[entityType];
  if (!routeConfig) {
    return null;
  }

  return `${isUserPortal ? routeConfig.user : routeConfig.admin}?openId=${entityId}`;
};
