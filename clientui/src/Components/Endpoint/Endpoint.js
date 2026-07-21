// API Base URL configuration
// In production, VITE_API_BASE_URL must be set in environment variables
// For local development, use apiMode utility to support Live/Local toggle
import { getApiBaseUrl, getApiMode } from '../../utils/apiMode';

const ENV_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// If VITE_API_BASE_URL is explicitly set (e.g., in production deployment), use it.
// Otherwise, use the apiMode utility which checks localStorage for 'local' or 'live' mode.
let API_BASE_URL_FINAL;
if (ENV_BASE_URL) {
  API_BASE_URL_FINAL = ENV_BASE_URL;
} else if (import.meta.env.DEV) {
  API_BASE_URL_FINAL = getApiBaseUrl();
  console.log(`🔌 API Mode: ${getApiMode().toUpperCase()} → ${API_BASE_URL_FINAL}`);
} else {
  throw new Error('❌ VITE_API_BASE_URL environment variable is required in production');
}

// Ensure we never end up with a double slash when composing URLs.
export const API_BASE_URL = API_BASE_URL_FINAL.replace(/\/$/, "");

const BASE_URL = `${API_BASE_URL}/users`;
const BASE_URL_TOKEN = `${API_BASE_URL}/token`;
const BASE_URL_COMPANY = `${API_BASE_URL}/company`;
const BASE_URL_PRODUCT_CATEGORY = `${API_BASE_URL}/productcategory`;
const BASE_URL_UNITS = `${API_BASE_URL}/units`;

// ==================== USER AUTHENTICATION ====================
export const LOGIN_USER = `${BASE_URL}/login`;
export const FORGOT_PASSWORD = `${BASE_URL}/forgot-password`;
export const RESET_PASSWORD = `${BASE_URL}/reset-password`;
export const PROFILE = `${BASE_URL}/profile`;
export const CREATEUSER = `${BASE_URL}/register`;
export const CREATEUSER_SEND_OTP = `${BASE_URL}/register/send-otp`;
export const GETALLUSERS = `${BASE_URL}/getall/profiles`;
export const UPDATE_USER = `${BASE_URL}/update`;
export const USERS_HIERARCHY = `${BASE_URL}/org/hierarchy`;
export const USERS_MY_TEAM = `${BASE_URL}/my-team`;
export const USERS_DIRECT_REPORTS = (userId) => `${BASE_URL}/direct-reports/${userId}`;
export const USERS_RECORD_SUMMARY = (userId) => `${BASE_URL}/${userId}/record-summary`;
export const USERS_COMPANY_ORG = (companyId) => `${BASE_URL}/company/${companyId}/org-chart`;
export const ROLES = `${API_BASE_URL}/roles`;
export const USER_TYPES = `${API_BASE_URL}/usertypes/get/usertypes`;
export const COMPANY_SETTINGS = `${API_BASE_URL}/system/company-settings`;
export const NOTIFICATION_PREFERENCES = `${API_BASE_URL}/system/notification-preferences`;
export const AUDIT_EVENTS = `${API_BASE_URL}/system/audit-events`;

// ==================== REPORTS & MONITORING ====================
export const REPORTS_DASHBOARD = `${API_BASE_URL}/reports/dashboard`;
export const REPORTS_EMPLOYEE_ACTIVITY = `${API_BASE_URL}/reports/employee-activity`;
export const REPORTS_NOTIFICATIONS = `${API_BASE_URL}/reports/notifications`;
export const REPORTS_OVERVIEW = `${API_BASE_URL}/reports/overview`;
export const MONITORING_EXECUTION_LOG = `${API_BASE_URL}/monitoring/execution-log`;

// ==================== TOKEN ====================
export const REFRESH_TOKEN = `${BASE_URL_TOKEN}/refresh-token`;

// ==================== CRM MASTER DATA ====================
// Legacy exports kept for backward compatibility with older CRM screens.
// Canonical routes are mounted at `/api/crm/*`.
export const TASKTYPE = `${API_BASE_URL}/crm/task-types`;
export const SALESSTAGES = `${API_BASE_URL}/crm/sales-stages`;
export const PRODUCTCATEGORIES = `${API_BASE_URL}/productcategory/list`;
export const INDUSTRIES = `${API_BASE_URL}/crm/industries`;
export const FOLLOWUPTYPES = `${API_BASE_URL}/crm/followup-types`;
export const OPPORTUNITY_PRODUCTS = `${API_BASE_URL}/crm/opportunity-products`;

// TaskType create/delete helpers used by `MasterDetails.jsx`
export const POSTTASKTYPE = `${API_BASE_URL}/crm/task-types`;
export const DELETETASKTYPE = (id) => `${API_BASE_URL}/crm/task-types/${id}`;

// ==================== LEGACY COMPANY ENDPOINTS ====================
export const CREATE_COMPANY = `${BASE_URL_COMPANY}/`;
export const GET_COMPANY = `${BASE_URL_COMPANY}/`;
export const GET_COMPANY_BY_ID = (id) => `${BASE_URL_COMPANY}/${id}`;
export const UPDATE_COMPANY = (id) => `${BASE_URL_COMPANY}/${id}`;
export const DELETE_COMPANY = (id) => `${BASE_URL_COMPANY}/${id}`;
export const TOGGLE_DELETE_COMPANY = (id) => `${BASE_URL_COMPANY}/${id}/toggle-delete`;
export const TOGGLE_ACTIVE_COMPANY = (id) => `${BASE_URL_COMPANY}/${id}/toggle-active`;
export const TOGGLE_FLAG_COMPANY = (id) => `${BASE_URL_COMPANY}/${id}/toggle-flag`;

// ==================== COMPANIES ====================
export const COMPANIES = {
    BASE: BASE_URL_COMPANY,
    CREATE: `${API_BASE_URL}/company/create`,
    GET_ALL: (limitOrParams = 10, offset = 0, search = '') => {
        const options = typeof limitOrParams === 'object'
            ? limitOrParams
            : { limit: limitOrParams, offset, search };

        const {
            limit: pageSize = 10,
            offset: pageOffset = 0,
            page,
            search: query = '',
            isActive = '',
            state = '',
            city = '',
            country = '',
            sortBy = 'Id',
            sortOrder = 'DESC'
        } = options;

        const normalizedLimit = Number(pageSize) || 10;
        const normalizedOffset = Number(pageOffset) || 0;
        const normalizedPage = page ? Number(page) : Math.floor(normalizedOffset / normalizedLimit) + 1;

        const params = new URLSearchParams();
        params.append('limit', normalizedLimit);
        params.append('page', normalizedPage);
        if (query) params.append('search', query);
        if (isActive !== '') params.append('isActive', isActive);
        if (state) params.append('state', state);
        if (city) params.append('city', city);
        if (country) params.append('country', country);
        if (sortBy) params.append('sortBy', sortBy);
        if (sortOrder) params.append('sortOrder', sortOrder);

        return `${API_BASE_URL}/company/list?${params.toString()}`;
    },
    GET_ACTIVE: `${API_BASE_URL}/company/active`,
    GET_BY_ID: (id) => `${API_BASE_URL}/company/${id}`,
    UPDATE: (id) => `${API_BASE_URL}/company/${id}`,
    DELETE: (id) => `${API_BASE_URL}/company/delete/${id}`,
    TOGGLE_ACTIVE: (id) => `${API_BASE_URL}/company/${id}/toggle-active`,
    TOGGLE_FLAG: (id) => `${API_BASE_URL}/company/${id}/toggle-flag`,
    GET_STATS: `${API_BASE_URL}/company/stats`,
    EXPORT: `${API_BASE_URL}/company/export`,
};

// ==================== PRODUCT CATEGORIES ====================
export const PRODUCT_CATEGORY = {
    BASE: BASE_URL_PRODUCT_CATEGORY,
    CREATE: `${BASE_URL_PRODUCT_CATEGORY}/create`,
    GET_ALL: (limitOrParams = 10, offset = 0, search = '') => {
        const options = typeof limitOrParams === 'object'
            ? limitOrParams
            : { limit: limitOrParams, offset, search };

        const {
            limit: pageSize = 10,
            offset: pageOffset = 0,
            search: query = '',
            descriptionStatus = '',
            sortBy = 'CreatedAt',
            sortOrder = 'DESC'
        } = options;

        const params = new URLSearchParams();
        params.append('limit', pageSize);
        params.append('offset', pageOffset);
        if (query) params.append('search', query);
        if (descriptionStatus) params.append('descriptionStatus', descriptionStatus);
        if (sortBy) params.append('sortBy', sortBy);
        if (sortOrder) params.append('sortOrder', sortOrder);

        return `${BASE_URL_PRODUCT_CATEGORY}/list?${params.toString()}`;
    },
    GET_ACTIVE: `${BASE_URL_PRODUCT_CATEGORY}/active`,
    GET_BY_ID: (id) => `${BASE_URL_PRODUCT_CATEGORY}/${id}`,
    UPDATE: (id) => `${BASE_URL_PRODUCT_CATEGORY}/${id}`,
    SOFT_DELETE: (id) => `${BASE_URL_PRODUCT_CATEGORY}/delete/${id}`,
    HARD_DELETE: (id) => `${BASE_URL_PRODUCT_CATEGORY}/${id}`
};

export const CATEGORIES = {
    BASE: BASE_URL_PRODUCT_CATEGORY,
    CREATE: `${BASE_URL_PRODUCT_CATEGORY}/create`,
    GET_ALL: (limitOrParams = 10, offset = 0, search = '') => {
        const options = typeof limitOrParams === 'object'
            ? limitOrParams
            : { limit: limitOrParams, offset, search };

        const {
            limit: pageSize = 10,
            offset: pageOffset = 0,
            search: query = '',
            descriptionStatus = '',
            sortBy = 'CreatedAt',
            sortOrder = 'DESC'
        } = options;

        const params = new URLSearchParams();
        params.append('limit', pageSize);
        params.append('offset', pageOffset);
        if (query) params.append('search', query);
        if (descriptionStatus) params.append('descriptionStatus', descriptionStatus);
        if (sortBy) params.append('sortBy', sortBy);
        if (sortOrder) params.append('sortOrder', sortOrder);

        return `${BASE_URL_PRODUCT_CATEGORY}/list?${params.toString()}`;
    },
    GET_ACTIVE: `${BASE_URL_PRODUCT_CATEGORY}/active`,
    GET_BY_ID: (id) => `${BASE_URL_PRODUCT_CATEGORY}/${id}`,
    UPDATE: (id) => `${BASE_URL_PRODUCT_CATEGORY}/${id}`,
    DELETE: (id) => `${BASE_URL_PRODUCT_CATEGORY}/delete/${id}`,
    SOFT_DELETE: (id) => `${BASE_URL_PRODUCT_CATEGORY}/delete/${id}`,
};

// ==================== UNITS ====================
export const UNITS = {
    BASE: BASE_URL_UNITS,
    CREATE: `${BASE_URL_UNITS}/create`,
    BULK_CREATE: `${BASE_URL_UNITS}/bulk-create`,
    GET_ALL: (limitOrParams = 10, offset = 0, search = '') => {
        const options = typeof limitOrParams === 'object'
            ? limitOrParams
            : { limit: limitOrParams, offset, search };

        const {
            limit: pageSize = 10,
            offset: pageOffset = 0,
            search: query = '',
            hasSymbol = '',
            sortBy = 'Id',
            sortOrder = 'DESC'
        } = options;

        const params = new URLSearchParams();
        params.append('limit', pageSize);
        params.append('offset', pageOffset);
        if (query) params.append('search', query);
        if (hasSymbol) params.append('hasSymbol', hasSymbol);
        if (sortBy) params.append('sortBy', sortBy);
        if (sortOrder) params.append('sortOrder', sortOrder);

        return `${BASE_URL_UNITS}/list?${params.toString()}`;
    },
    GET_ACTIVE: `${BASE_URL_UNITS}/active`,
    SEARCH: (query) => `${BASE_URL_UNITS}/search?q=${encodeURIComponent(query)}`,
    GET_BY_ID: (id) => `${BASE_URL_UNITS}/${id}`,
    UPDATE: (id) => `${BASE_URL_UNITS}/${id}`,
    SOFT_DELETE: (id) => `${BASE_URL_UNITS}/delete/${id}`,
    HARD_DELETE: (id) => `${BASE_URL_UNITS}/${id}`
};

// ==================== PRODUCTS ====================
export const PRODUCTS = {
    BASE: `${API_BASE_URL}/products`,
    ACTIVE: `${API_BASE_URL}/products/active`, // ✅ ADDED for getActiveProducts
    CREATE: `${API_BASE_URL}/products/create`,
    GET_ALL: (limit, offset, search, categoryId, companyId, isActive, lowStock, sortBy, sortOrder) => {
        const params = new URLSearchParams();
        if (limit) params.append('limit', limit);
        if (offset) params.append('offset', offset);
        if (search) params.append('search', search);
        if (categoryId) params.append('categoryId', categoryId);
        if (companyId) params.append('companyId', companyId);
        if (isActive !== undefined && isActive !== '') params.append('isActive', isActive);
        if (lowStock) params.append('lowStock', lowStock);
        if (sortBy) params.append('sortBy', sortBy);
        if (sortOrder) params.append('sortOrder', sortOrder);
        return `${API_BASE_URL}/products/list?${params.toString()}`;
    },
    GET_BY_ID: (id) => `${API_BASE_URL}/products/${id}`,
    BY_ID: (id) => `${API_BASE_URL}/products/${id}`, // ✅ ADDED alias
    UPDATE: (id) => `${API_BASE_URL}/products/${id}`,
    DELETE: (id) => `${API_BASE_URL}/products/delete/${id}`,
    HARD_DELETE: (id) => `${API_BASE_URL}/products/delete/${id}`, // ✅ ADDED alias
    TOGGLE_ACTIVE: (id) => `${API_BASE_URL}/products/${id}/toggle-active`,
    TOGGLE_STATUS: (id) => `${API_BASE_URL}/products/${id}/toggle-active`, // ✅ ADDED alias
    LOW_STOCK: (companyId, limit) => {
        const params = new URLSearchParams();
        if (companyId) params.append('companyId', companyId);
        if (limit) params.append('limit', limit);
        return `${API_BASE_URL}/products/alerts/low-stock?${params.toString()}`;
    },
    STATS: (companyId) => {
        const params = new URLSearchParams();
        if (companyId) params.append('companyId', companyId);
        return `${API_BASE_URL}/products/reports/stats?${params.toString()}`;
    },
    BULK_DELETE: `${API_BASE_URL}/products/bulk-delete`,
    BY_CATEGORY: (categoryId) => `${API_BASE_URL}/products/category/${categoryId}`, // ✅ ADDED
    BY_COMPANY: (companyId) => `${API_BASE_URL}/products/company/${companyId}`, // ✅ ADDED
};

// ==================== WAREHOUSES ====================
export const WAREHOUSES = {
    BASE: `${API_BASE_URL}/warehouses`,
    BY_ID: (id) => `${API_BASE_URL}/warehouses/${id}`,
    ACTIVE: `${API_BASE_URL}/warehouses/active`,
    BY_COMPANY: (companyId) => `${API_BASE_URL}/warehouses/company/${companyId}`,
    TOGGLE_STATUS: (id) => `${API_BASE_URL}/warehouses/${id}/toggle`,
    SOFT_DELETE: (id) => `${API_BASE_URL}/warehouses/${id}/soft`,
    HARD_DELETE: (id) => `${API_BASE_URL}/warehouses/${id}/hard`,
    BULK_IMPORT: `${API_BASE_URL}/warehouses/bulk-import`
};

// ==================== PRODUCT STOCK ====================
export const PRODUCT_STOCK = {
    BASE: `${API_BASE_URL}/product-stock`, // ✅ FIXED: Added full URL
    BY_ID: (id) => `${API_BASE_URL}/product-stock/${id}`,
    BY_PRODUCT: (productId) => `${API_BASE_URL}/product-stock/product/${productId}`,
    BY_WAREHOUSE: (warehouseId) => `${API_BASE_URL}/product-stock/warehouse/${warehouseId}`,
    LOW_STOCK: `${API_BASE_URL}/product-stock/low-stock`,
    ADJUST: (id) => `${API_BASE_URL}/product-stock/${id}/adjust`,
    TRANSFER: `${API_BASE_URL}/product-stock/transfer`,
    SOFT_DELETE: (id) => `${API_BASE_URL}/product-stock/${id}/soft`,
    HARD_DELETE: (id) => `${API_BASE_URL}/product-stock/${id}/hard`
};



export const STOCK_MOVEMENTS = {
  BASE: `${API_BASE_URL}/stock-movements`,
  BY_ID: (id) => `${API_BASE_URL}/stock-movements/${id}`,
  STATS: `${API_BASE_URL}/stock-movements/stats`,
  RECENT: `${API_BASE_URL}/stock-movements/recent`,
  CREATE: `${API_BASE_URL}/stock-movements`,
  UPDATE: (id) => `${API_BASE_URL}/stock-movements/${id}`,
  DELETE: (id) => `${API_BASE_URL}/stock-movements/${id}`,
};

export const SUPPLIERS = {
    BASE: `${API_BASE_URL}/suppliers`,
    CREATE: `${API_BASE_URL}/suppliers`,
    GET_ALL: (limit = 10, offset = 0, search = '', isActive = '', sortBy = 'CreatedAt', sortOrder = 'DESC') => {
        const params = new URLSearchParams();
        if (limit) params.append('limit', limit);
        if (offset) params.append('offset', offset);
        if (search) params.append('search', search);
        if (isActive !== '') params.append('isActive', isActive);
        if (sortBy) params.append('sortBy', sortBy);
        if (sortOrder) params.append('sortOrder', sortOrder);
        return `${API_BASE_URL}/suppliers?${params.toString()}`;
    },
    GET_ACTIVE: `${API_BASE_URL}/suppliers?isActive=true`,
    GET_BY_ID: (id) => `${API_BASE_URL}/suppliers/${id}`,
    BY_ID: (id) => `${API_BASE_URL}/suppliers/${id}`,
    UPDATE: (id) => `${API_BASE_URL}/suppliers/${id}`,
    SOFT_DELETE: (id) => `${API_BASE_URL}/suppliers/soft-delete/${id}`,
    HARD_DELETE: (id) => `${API_BASE_URL}/suppliers/hard-delete/${id}`,
    DELETE: (id) => `${API_BASE_URL}/suppliers/soft-delete/${id}`, // alias for soft delete
};






// ==================== HELPER FUNCTION ====================
export const buildUrl = (endpoint, params = {}) => {
    const queryString = new URLSearchParams(
        Object.entries(params).filter(([, value]) => 
            value !== null && value !== undefined && value !== ''
        )
    ).toString();
    
    return queryString ? `${endpoint}?${queryString}` : endpoint;
};

// ==================== PURCHASE ORDERS ====================
export const PURCHASE_ORDERS = {
    BASE: `${API_BASE_URL}/purchase-orders`,
    CREATE: `${API_BASE_URL}/purchase-orders`,
    GET_ALL: (params = {}) => {
        const {
            limit = 10,
            offset = 0,
            status = '',
            supplierId = '',
            companyId = '',
            search = '',
            sortBy = 'OrderDate',
            sortOrder = 'DESC',
            startDate = '',
            endDate = ''
        } = params;

        const queryParams = new URLSearchParams();
        if (limit) queryParams.append('limit', limit);
        if (offset) queryParams.append('offset', offset);
        if (status) queryParams.append('status', status);
        if (supplierId) queryParams.append('supplierId', supplierId);
        if (companyId) queryParams.append('companyId', companyId);
        if (search) queryParams.append('search', search);
        if (sortBy) queryParams.append('sortBy', sortBy);
        if (sortOrder) queryParams.append('sortOrder', sortOrder);
        if (startDate) queryParams.append('startDate', startDate);
        if (endDate) queryParams.append('endDate', endDate);

        return `${API_BASE_URL}/purchase-orders?${queryParams.toString()}`;
    },
    GET_BY_ID: (id) => `${API_BASE_URL}/purchase-orders/${id}`,
    BY_ID: (id) => `${API_BASE_URL}/purchase-orders/${id}`,
    UPDATE: (id) => `${API_BASE_URL}/purchase-orders/${id}`,
    UPDATE_STATUS: (id) => `${API_BASE_URL}/purchase-orders/${id}/status`,
    SOFT_DELETE: (id) => `${API_BASE_URL}/purchase-orders/soft-delete/${id}`,
    HARD_DELETE: (id) => `${API_BASE_URL}/purchase-orders/hard-delete/${id}`,
    DELETE: (id) => `${API_BASE_URL}/purchase-orders/soft-delete/${id}`,
    BY_SUPPLIER: (supplierId, limit = 10, offset = 0) => 
        `${API_BASE_URL}/purchase-orders/supplier/${supplierId}?limit=${limit}&offset=${offset}`,
    STATS: (companyId = '') => {
        const params = companyId ? `?companyId=${companyId}` : '';
        return `${API_BASE_URL}/purchase-orders/stats${params}`;
    }
};

export const PURCHASE_ORDER_ITEMS = {
    BASE: `${API_BASE_URL}/purchase-order-items`,
    CREATE: `${API_BASE_URL}/purchase-order-items`,
    GET_ALL: (params = {}) => {
        const { limit = 10, offset = 0 } = params;
        const queryParams = new URLSearchParams();
        if (limit) queryParams.append('limit', limit);
        if (offset) queryParams.append('offset', offset);
        return `${API_BASE_URL}/purchase-order-items?${queryParams.toString()}`;
    },
    BY_PURCHASE_ORDER: (purchaseOrderId, limit = 50, offset = 0) => 
        `${API_BASE_URL}/purchase-order-items/purchase-order/${purchaseOrderId}?limit=${limit}&offset=${offset}`,
    SUMMARY: (purchaseOrderId) => 
        `${API_BASE_URL}/purchase-order-items/summary/${purchaseOrderId}`,
    UPDATE: (id) => `${API_BASE_URL}/purchase-order-items/${id}`,
    DELETE: (id) => `${API_BASE_URL}/purchase-order-items/${id}`,
    BULK_RECEIVE: `${API_BASE_URL}/purchase-order-items/bulk-receive`
};


// Add this to your existing Endpoint.js file

export const CUSTOMERS = {
    BASE: `${API_BASE_URL}/customers`,
    GET_ALL: (params = {}) => {
        const { 
            limit = 10, offset = 0, search = '', isActive = '', 
            customerType = '', sortBy = 'CreatedAt', sortOrder = 'DESC', 
            includeDeleted = 'false' 
        } = params;
        
        const queryParams = new URLSearchParams();
        if (limit) queryParams.append('limit', limit);
        if (offset) queryParams.append('offset', offset);
        if (search) queryParams.append('search', search);
        if (isActive !== '') queryParams.append('isActive', isActive);
        if (customerType) queryParams.append('customerType', customerType);
        if (sortBy) queryParams.append('sortBy', sortBy);
        if (sortOrder) queryParams.append('sortOrder', sortOrder);
        if (includeDeleted) queryParams.append('includeDeleted', includeDeleted);
        
        return `${API_BASE_URL}/customers?${queryParams.toString()}`;
    },
    GET_BY_ID: (id) => `${API_BASE_URL}/customers/${id}`,
    GET_ACTIVE: `${API_BASE_URL}/customers/active`,
    STATS: `${API_BASE_URL}/customers/stats`,
    CREATE: `${API_BASE_URL}/customers`,
    UPDATE: (id) => `${API_BASE_URL}/customers/${id}`,
    TOGGLE_ACTIVE: (id) => `${API_BASE_URL}/customers/${id}/toggle-active`,
    UPDATE_OUTSTANDING: (id) => `${API_BASE_URL}/customers/${id}/outstanding`,
    SOFT_DELETE: (id) => `${API_BASE_URL}/customers/${id}/soft-delete`,
    RESTORE: (id) => `${API_BASE_URL}/customers/${id}/restore`,
    HARD_DELETE: (id) => `${API_BASE_URL}/customers/${id}`
};



// Add to your existing Endpoint.js

export const SALES_ORDERS = {
    BASE: `${API_BASE_URL}/sales-orders`,
    GET_ALL: (params = {}) => {
        const { 
            limit = 10, offset = 0, search = '', status = '', paymentStatus = '',
            customerId = '', startDate = '', endDate = '', priority = '',
            sortBy = 'OrderDate', sortOrder = 'DESC', includeDeleted = 'false'
        } = params;
        
        const queryParams = new URLSearchParams();
        if (limit) queryParams.append('limit', limit);
        if (offset) queryParams.append('offset', offset);
        if (search) queryParams.append('search', search);
        if (status) queryParams.append('status', status);
        if (paymentStatus) queryParams.append('paymentStatus', paymentStatus);
        if (customerId) queryParams.append('customerId', customerId);
        if (startDate) queryParams.append('startDate', startDate);
        if (endDate) queryParams.append('endDate', endDate);
        if (priority) queryParams.append('priority', priority);
        if (sortBy) queryParams.append('sortBy', sortBy);
        if (sortOrder) queryParams.append('sortOrder', sortOrder);
        if (includeDeleted) queryParams.append('includeDeleted', includeDeleted);
        
        return `${API_BASE_URL}/sales-orders?${queryParams.toString()}`;
    },
    GET_BY_ID: (id) => `${API_BASE_URL}/sales-orders/${id}`,
    STATS: `${API_BASE_URL}/sales-orders/stats`,
    BY_CUSTOMER: (customerId, limit = 10, offset = 0) => 
        `${API_BASE_URL}/sales-orders/customer/${customerId}?limit=${limit}&offset=${offset}`,
    CREATE: `${API_BASE_URL}/sales-orders`,
    UPDATE: (id) => `${API_BASE_URL}/sales-orders/${id}`,
    UPDATE_STATUS: (id) => `${API_BASE_URL}/sales-orders/${id}/status`,
    UPDATE_PAYMENT: (id) => `${API_BASE_URL}/sales-orders/${id}/payment`,
    SOFT_DELETE: (id) => `${API_BASE_URL}/sales-orders/${id}/soft-delete`,
    RESTORE: (id) => `${API_BASE_URL}/sales-orders/${id}/restore`,
    HARD_DELETE: (id) => `${API_BASE_URL}/sales-orders/${id}`
};

export const CHAT = {
    BASE: `${API_BASE_URL}/chat`,
    USERS: `${API_BASE_URL}/chat/users`,
    TEAMS: `${API_BASE_URL}/teams-chat/teams`,
    TEAM_MEMBERS: (teamId) => `${API_BASE_URL}/teams-chat/teams/${teamId}/members`,
    TEAM_CHANNELS: (teamId) => `${API_BASE_URL}/teams-chat/teams/${teamId}/channels`,
    CHANNEL_MESSAGES: (channelId) => `${API_BASE_URL}/chat/channels/${channelId}/messages`,
    CHANNEL_MARK_READ: (channelId) => `${API_BASE_URL}/chat/channels/${channelId}/read`,
};

export const CASE_EMAIL_ROUTING = {
    BASE: `${API_BASE_URL}/crm/cases/email`,
    INBOUND: `${API_BASE_URL}/crm/cases/email/inbound`,
    ROUTES: `${API_BASE_URL}/crm/cases/email/routes`,
    ROUTE_BY_ID: (id) => `${API_BASE_URL}/crm/cases/email/routes/${id}`,
};

// ==================== BRANDS ====================
export const BRANDS = {
    BASE: `${API_BASE_URL}/brands`,
    GET_ALL: (params = {}) => {
        const { limit = 10, page = 1, search = '', companyId = '', isActive = '', sortBy = 'CreatedAt', sortOrder = 'DESC' } = params;
        const qp = new URLSearchParams();
        if (limit) qp.append('limit', limit);
        if (page) qp.append('page', page);
        if (search) qp.append('search', search);
        if (companyId) qp.append('companyId', companyId);
        if (isActive !== '') qp.append('isActive', isActive);
        if (sortBy) qp.append('sortBy', sortBy);
        if (sortOrder) qp.append('sortOrder', sortOrder);
        return `${API_BASE_URL}/brands?${qp.toString()}`;
    },
    CREATE: `${API_BASE_URL}/brands`,
    UPDATE: (id) => `${API_BASE_URL}/brands/${id}`,
    DELETE: (id) => `${API_BASE_URL}/brands/${id}`,
    GET_BY_ID: (id) => `${API_BASE_URL}/brands/${id}`,
};

// ==================== STOCK TRANSFERS ====================
export const STOCK_TRANSFERS = {
    BASE: `${API_BASE_URL}/stock-transfers`,
    GET_ALL: (params = {}) => {
        const { limit = 10, page = 1, search = '', companyId = '', status = '', sortBy = 'CreatedAt', sortOrder = 'DESC' } = params;
        const qp = new URLSearchParams();
        if (limit) qp.append('limit', limit);
        if (page) qp.append('page', page);
        if (search) qp.append('search', search);
        if (companyId) qp.append('companyId', companyId);
        if (status) qp.append('status', status);
        if (sortBy) qp.append('sortBy', sortBy);
        if (sortOrder) qp.append('sortOrder', sortOrder);
        return `${API_BASE_URL}/stock-transfers?${qp.toString()}`;
    },
    CREATE: `${API_BASE_URL}/stock-transfers`,
    GET_BY_ID: (id) => `${API_BASE_URL}/stock-transfers/${id}`,
    UPDATE_STATUS: (id) => `${API_BASE_URL}/stock-transfers/${id}/status`,
};

// ==================== STOCK ADJUSTMENTS ====================
export const STOCK_ADJUSTMENTS = {
    BASE: `${API_BASE_URL}/stock-adjustments`,
    GET_ALL: (params = {}) => {
        const { limit = 10, page = 1, companyId = '', adjustmentType = '', status = '', sortBy = 'CreatedAt', sortOrder = 'DESC' } = params;
        const qp = new URLSearchParams();
        if (limit) qp.append('limit', limit);
        if (page) qp.append('page', page);
        if (companyId) qp.append('companyId', companyId);
        if (adjustmentType) qp.append('adjustmentType', adjustmentType);
        if (status) qp.append('status', status);
        if (sortBy) qp.append('sortBy', sortBy);
        if (sortOrder) qp.append('sortOrder', sortOrder);
        return `${API_BASE_URL}/stock-adjustments?${qp.toString()}`;
    },
    CREATE: `${API_BASE_URL}/stock-adjustments`,
    GET_BY_ID: (id) => `${API_BASE_URL}/stock-adjustments/${id}`,
    UPDATE_STATUS: (id) => `${API_BASE_URL}/stock-adjustments/${id}/status`,
};

// ==================== GRN ====================
export const GRN = {
    BASE: `${API_BASE_URL}/grn`,
    GET_ALL: (params = {}) => {
        const { limit = 10, page = 1, search = '', companyId = '', status = '', sortBy = 'CreatedAt', sortOrder = 'DESC' } = params;
        const qp = new URLSearchParams();
        if (limit) qp.append('limit', limit);
        if (page) qp.append('page', page);
        if (search) qp.append('search', search);
        if (companyId) qp.append('companyId', companyId);
        if (status) qp.append('status', status);
        if (sortBy) qp.append('sortBy', sortBy);
        if (sortOrder) qp.append('sortOrder', sortOrder);
        return `${API_BASE_URL}/grn?${qp.toString()}`;
    },
    CREATE: `${API_BASE_URL}/grn`,
    GET_BY_ID: (id) => `${API_BASE_URL}/grn/${id}`,
};

// ==================== BATCHES & SERIAL NUMBERS ====================
export const BATCHES = {
    BASE: `${API_BASE_URL}/batches`,
    GET_ALL: (params = {}) => {
        const { limit = 10, page = 1, search = '', companyId = '', productId = '', warehouseId = '', expiryAlert = '' } = params;
        const qp = new URLSearchParams();
        if (limit) qp.append('limit', limit);
        if (page) qp.append('page', page);
        if (search) qp.append('search', search);
        if (companyId) qp.append('companyId', companyId);
        if (productId) qp.append('productId', productId);
        if (warehouseId) qp.append('warehouseId', warehouseId);
        if (expiryAlert) qp.append('expiryAlert', expiryAlert);
        return `${API_BASE_URL}/batches?${qp.toString()}`;
    },
    CREATE: `${API_BASE_URL}/batches`,
    EXPIRING: (params = {}) => {
        const { companyId = '', days = 30 } = params;
        const qp = new URLSearchParams();
        if (companyId) qp.append('companyId', companyId);
        if (days) qp.append('days', days);
        return `${API_BASE_URL}/batches/expiring?${qp.toString()}`;
    },
};

export const SERIAL_NUMBERS = {
    BASE: `${API_BASE_URL}/serial-numbers`,
    GET_ALL: (params = {}) => {
        const { limit = 10, page = 1, search = '', companyId = '', productId = '', status = '' } = params;
        const qp = new URLSearchParams();
        if (limit) qp.append('limit', limit);
        if (page) qp.append('page', page);
        if (search) qp.append('search', search);
        if (companyId) qp.append('companyId', companyId);
        if (productId) qp.append('productId', productId);
        if (status) qp.append('status', status);
        return `${API_BASE_URL}/serial-numbers?${qp.toString()}`;
    },
    CREATE: `${API_BASE_URL}/serial-numbers`,
    BULK_CREATE: `${API_BASE_URL}/serial-numbers/bulk`,
    UPDATE_STATUS: (id) => `${API_BASE_URL}/serial-numbers/${id}/status`,
};


// ==================== ERP MODULES ====================
export const ERP = {
    // Departments
    DEPARTMENTS: {
        BASE: `${API_BASE_URL}/erp/departments`,
        CREATE: `${API_BASE_URL}/erp/departments`,
        GET_ALL: (params = {}) => {
            const qp = new URLSearchParams();
            if (params.limit) qp.append('limit', params.limit);
            if (params.offset) qp.append('offset', params.offset);
            if (params.search) qp.append('search', params.search);
            if (params.companyId) qp.append('companyId', params.companyId);
            return `${API_BASE_URL}/erp/departments?${qp.toString()}`;
        },
        UPDATE: (id) => `${API_BASE_URL}/erp/departments/${id}`,
        DELETE: (id) => `${API_BASE_URL}/erp/departments/${id}`,
    },
    // Designations
    DESIGNATIONS: {
        BASE: `${API_BASE_URL}/erp/designations`,
        CREATE: `${API_BASE_URL}/erp/designations`,
        GET_ALL: (params = {}) => {
            const qp = new URLSearchParams();
            if (params.limit) qp.append('limit', params.limit);
            if (params.offset) qp.append('offset', params.offset);
            if (params.search) qp.append('search', params.search);
            if (params.departmentId) qp.append('departmentId', params.departmentId);
            return `${API_BASE_URL}/erp/designations?${qp.toString()}`;
        },
        UPDATE: (id) => `${API_BASE_URL}/erp/designations/${id}`,
        DELETE: (id) => `${API_BASE_URL}/erp/designations/${id}`,
    },
    // Employees
    EMPLOYEES: {
        BASE: `${API_BASE_URL}/erp/employees`,
        CREATE: `${API_BASE_URL}/erp/employees`,
        GET_ALL: (params = {}) => {
            const qp = new URLSearchParams();
            if (params.limit) qp.append('limit', params.limit);
            if (params.offset) qp.append('offset', params.offset);
            if (params.search) qp.append('search', params.search);
            if (params.departmentId) qp.append('departmentId', params.departmentId);
            if (params.designationId) qp.append('designationId', params.designationId);
            if (params.companyId) qp.append('companyId', params.companyId);
            return `${API_BASE_URL}/erp/employees?${qp.toString()}`;
        },
        GET_BY_ID: (id) => `${API_BASE_URL}/erp/employees/${id}`,
        UPDATE: (id) => `${API_BASE_URL}/erp/employees/${id}`,
        DELETE: (id) => `${API_BASE_URL}/erp/employees/${id}`,
    },
    // Purchase Requisitions
    PURCHASE_REQUISITIONS: {
        BASE: `${API_BASE_URL}/erp/purchase-requisitions`,
        CREATE: `${API_BASE_URL}/erp/purchase-requisitions`,
        GET_ALL: (params = {}) => {
            const qp = new URLSearchParams();
            if (params.limit) qp.append('limit', params.limit);
            if (params.offset) qp.append('offset', params.offset);
            if (params.search) qp.append('search', params.search);
            if (params.status) qp.append('status', params.status);
            if (params.companyId) qp.append('companyId', params.companyId);
            return `${API_BASE_URL}/erp/purchase-requisitions?${qp.toString()}`;
        },
        GET_BY_ID: (id) => `${API_BASE_URL}/erp/purchase-requisitions/${id}`,
        UPDATE_STATUS: (id) => `${API_BASE_URL}/erp/purchase-requisitions/${id}/status`,
        DELETE: (id) => `${API_BASE_URL}/erp/purchase-requisitions/${id}`,
    },
    // Purchase Returns
    PURCHASE_RETURNS: {
        BASE: `${API_BASE_URL}/erp/purchase-returns`,
        CREATE: `${API_BASE_URL}/erp/purchase-returns`,
        GET_ALL: (params = {}) => {
            const qp = new URLSearchParams();
            if (params.limit) qp.append('limit', params.limit);
            if (params.offset) qp.append('offset', params.offset);
            if (params.search) qp.append('search', params.search);
            if (params.status) qp.append('status', params.status);
            return `${API_BASE_URL}/erp/purchase-returns?${qp.toString()}`;
        },
        GET_BY_ID: (id) => `${API_BASE_URL}/erp/purchase-returns/${id}`,
        UPDATE_STATUS: (id) => `${API_BASE_URL}/erp/purchase-returns/${id}/status`,
        DELETE: (id) => `${API_BASE_URL}/erp/purchase-returns/${id}`,
    },
    // Sales Quotations
    SALES_QUOTATIONS: {
        BASE: `${API_BASE_URL}/erp/sales-quotations`,
        CREATE: `${API_BASE_URL}/erp/sales-quotations`,
        GET_ALL: (params = {}) => {
            const qp = new URLSearchParams();
            if (params.limit) qp.append('limit', params.limit);
            if (params.offset) qp.append('offset', params.offset);
            if (params.search) qp.append('search', params.search);
            if (params.status) qp.append('status', params.status);
            if (params.customerId) qp.append('customerId', params.customerId);
            return `${API_BASE_URL}/erp/sales-quotations?${qp.toString()}`;
        },
        GET_BY_ID: (id) => `${API_BASE_URL}/erp/sales-quotations/${id}`,
        UPDATE_STATUS: (id) => `${API_BASE_URL}/erp/sales-quotations/${id}/status`,
        CONVERT: (id) => `${API_BASE_URL}/erp/sales-quotations/${id}/convert`,
        DELETE: (id) => `${API_BASE_URL}/erp/sales-quotations/${id}`,
    },
    // Delivery Challans
    DELIVERY_CHALLANS: {
        BASE: `${API_BASE_URL}/erp/delivery-challans`,
        CREATE: `${API_BASE_URL}/erp/delivery-challans`,
        GET_ALL: (params = {}) => {
            const qp = new URLSearchParams();
            if (params.limit) qp.append('limit', params.limit);
            if (params.offset) qp.append('offset', params.offset);
            if (params.search) qp.append('search', params.search);
            if (params.status) qp.append('status', params.status);
            return `${API_BASE_URL}/erp/delivery-challans?${qp.toString()}`;
        },
        GET_BY_ID: (id) => `${API_BASE_URL}/erp/delivery-challans/${id}`,
        UPDATE_STATUS: (id) => `${API_BASE_URL}/erp/delivery-challans/${id}/status`,
        DELETE: (id) => `${API_BASE_URL}/erp/delivery-challans/${id}`,
    },
    // Sales Returns
    SALES_RETURNS: {
        BASE: `${API_BASE_URL}/erp/sales-returns`,
        CREATE: `${API_BASE_URL}/erp/sales-returns`,
        GET_ALL: (params = {}) => {
            const qp = new URLSearchParams();
            if (params.limit) qp.append('limit', params.limit);
            if (params.offset) qp.append('offset', params.offset);
            if (params.search) qp.append('search', params.search);
            if (params.status) qp.append('status', params.status);
            return `${API_BASE_URL}/erp/sales-returns?${qp.toString()}`;
        },
        GET_BY_ID: (id) => `${API_BASE_URL}/erp/sales-returns/${id}`,
        UPDATE_STATUS: (id) => `${API_BASE_URL}/erp/sales-returns/${id}/status`,
        DELETE: (id) => `${API_BASE_URL}/erp/sales-returns/${id}`,
    },
    // BOM
    BOM: {
        BASE: `${API_BASE_URL}/erp/bom`,
        CREATE: `${API_BASE_URL}/erp/bom`,
        GET_ALL: (params = {}) => {
            const qp = new URLSearchParams();
            if (params.limit) qp.append('limit', params.limit);
            if (params.offset) qp.append('offset', params.offset);
            if (params.search) qp.append('search', params.search);
            return `${API_BASE_URL}/erp/bom?${qp.toString()}`;
        },
        GET_BY_ID: (id) => `${API_BASE_URL}/erp/bom/${id}`,
        DELETE: (id) => `${API_BASE_URL}/erp/bom/${id}`,
    },
    // Production Orders
    PRODUCTION_ORDERS: {
        BASE: `${API_BASE_URL}/erp/production-orders`,
        CREATE: `${API_BASE_URL}/erp/production-orders`,
        GET_ALL: (params = {}) => {
            const qp = new URLSearchParams();
            if (params.limit) qp.append('limit', params.limit);
            if (params.offset) qp.append('offset', params.offset);
            if (params.search) qp.append('search', params.search);
            if (params.status) qp.append('status', params.status);
            return `${API_BASE_URL}/erp/production-orders?${qp.toString()}`;
        },
        GET_BY_ID: (id) => `${API_BASE_URL}/erp/production-orders/${id}`,
        UPDATE_STATUS: (id) => `${API_BASE_URL}/erp/production-orders/${id}/status`,
        DELETE: (id) => `${API_BASE_URL}/erp/production-orders/${id}`,
    },
    // Notifications
    NOTIFICATIONS: {
        GET_ALL: (params = {}) => {
            const qp = new URLSearchParams();
            if (params.userId) qp.append('userId', params.userId);
            if (params.limit) qp.append('limit', params.limit);
            if (params.offset) qp.append('offset', params.offset);
            if (params.isRead !== undefined) qp.append('isRead', params.isRead);
            return `${API_BASE_URL}/erp/notifications?${qp.toString()}`;
        },
        MARK_READ: (id) => `${API_BASE_URL}/erp/notifications/${id}/read`,
        MARK_ALL_READ: (userId) => `${API_BASE_URL}/erp/notifications/user/${userId}/read-all`,
    },
    // Approvals
    APPROVALS: {
        BASE: `${API_BASE_URL}/erp/approvals`,
        CREATE: `${API_BASE_URL}/erp/approvals`,
        GET_ALL: (params = {}) => {
            const qp = new URLSearchParams();
            if (params.limit) qp.append('limit', params.limit);
            if (params.offset) qp.append('offset', params.offset);
            if (params.status) qp.append('status', params.status);
            if (params.moduleType) qp.append('moduleType', params.moduleType);
            return `${API_BASE_URL}/erp/approvals?${qp.toString()}`;
        },
        PROCESS: (id) => `${API_BASE_URL}/erp/approvals/${id}/process`,
    },
    // Expenses
    EXPENSES: {
        BASE: `${API_BASE_URL}/erp/expenses`,
        CREATE: `${API_BASE_URL}/erp/expenses`,
        GET_ALL: (params = {}) => {
            const qp = new URLSearchParams();
            if (params.limit) qp.append('limit', params.limit);
            if (params.offset) qp.append('offset', params.offset);
            if (params.search) qp.append('search', params.search);
            if (params.status) qp.append('status', params.status);
            if (params.category) qp.append('category', params.category);
            if (params.companyId) qp.append('companyId', params.companyId);
            return `${API_BASE_URL}/erp/expenses?${qp.toString()}`;
        },
        GET_BY_ID: (id) => `${API_BASE_URL}/erp/expenses/${id}`,
        UPDATE_STATUS: (id) => `${API_BASE_URL}/erp/expenses/${id}/status`,
        DELETE: (id) => `${API_BASE_URL}/erp/expenses/${id}`,
    },
    // Warehouse Racks & Bins
    RACKS: {
        BASE: `${API_BASE_URL}/erp/racks`,
        CREATE: `${API_BASE_URL}/erp/racks`,
        GET_ALL: (params = {}) => {
            const qp = new URLSearchParams();
            if (params.warehouseId) qp.append('warehouseId', params.warehouseId);
            return `${API_BASE_URL}/erp/racks?${qp.toString()}`;
        },
        DELETE: (id) => `${API_BASE_URL}/erp/racks/${id}`,
    },
    BINS: {
        BASE: `${API_BASE_URL}/erp/bins`,
        CREATE: `${API_BASE_URL}/erp/bins`,
        GET_ALL: (params = {}) => {
            const qp = new URLSearchParams();
            if (params.warehouseId) qp.append('warehouseId', params.warehouseId);
            if (params.rackId) qp.append('rackId', params.rackId);
            return `${API_BASE_URL}/erp/bins?${qp.toString()}`;
        },
        DELETE: (id) => `${API_BASE_URL}/erp/bins/${id}`,
    },
};

// ==================== DASHBOARD ====================
export const DASHBOARD = {
    STATS: (companyId = '') => {
        const params = companyId ? `?companyId=${companyId}` : '';
        return `${API_BASE_URL}/dashboard${params}`;
    },
};

// ==================== DEFAULT EXPORT ====================
export default {
    API_BASE_URL,
    COMPANIES,
    CATEGORIES,
    PRODUCT_CATEGORY,
    UNITS,
    PRODUCTS,
    WAREHOUSES,
    PRODUCT_STOCK,
    LOGIN_USER,
    FORGOT_PASSWORD,
    RESET_PASSWORD,
    PROFILE,
    CREATEUSER,
    GETALLUSERS,
    COMPANY_SETTINGS,
    NOTIFICATION_PREFERENCES,
    AUDIT_EVENTS,
    CHAT,
    CASE_EMAIL_ROUTING,
    OPPORTUNITY_PRODUCTS,
    REFRESH_TOKEN,
    PURCHASE_ORDERS,
    PURCHASE_ORDER_ITEMS,
    BRANDS,
    STOCK_TRANSFERS,
    STOCK_ADJUSTMENTS,
    GRN,
    BATCHES,
    SERIAL_NUMBERS,
    buildUrl
};
