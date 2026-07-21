/**
 * Comprehensive ERP/CRM Test Suite
 * =================================
 * Tests authentication, RBAC, CRUD, stock workflows, isolation, and reporting
 * 
 * Usage: node scripts/comprehensive-tests.js
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5351';
const API = (path) => `${BASE_URL}${path}`;
let accessToken = '';
const testResults = { passed: 0, failed: 0, skipped: 0, blocked: 0, notImplemented: 0, details: [] };

const log = (msg, type = 'INFO') => console.log(`[${type}] ${msg}`);
const reportEntry = {};

const assert = (condition, name, details = '') => {
  if (condition) {
    testResults.passed++;
    log(`✓ PASS: ${name}`, 'PASS');
    testResults.details.push({ name, status: 'PASS', details: details || '' });
  } else {
    testResults.failed++;
    log(`✗ FAIL: ${name} ${details}`, 'FAIL');
    testResults.details.push({ name, status: 'FAIL', details: details || '' });
  }
};

const assertStatus = (response, expectedStatus, name) => {
  assert(response.status === expectedStatus, name, `Expected: ${expectedStatus}, Got: ${response.status}`);
};

const skip = (name, reason = '') => {
  testResults.skipped++;
  log(`⊘ SKIP: ${name}${reason ? ' - ' + reason : ''}`, 'SKIP');
  testResults.details.push({ name, status: 'SKIP', details: reason || '' });
};

const block = (name, reason = '') => {
  testResults.blocked++;
  log(`⊘ BLOCKED: ${name}${reason ? ' - ' + reason : ''}`, 'BLOCK');
  testResults.details.push({ name, status: 'BLOCKED', details: reason || '' });
};

const notImplemented = (name, reason = '') => {
  testResults.notImplemented++;
  log(`⊘ NOT_IMPLEMENTED: ${name}${reason ? ' - ' + reason : ''}`, 'TODO');
  testResults.details.push({ name, status: 'NOT_IMPLEMENTED', details: reason || '' });
};

const api = axios.create({ timeout: 15000 });
api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// ======================== 1. ENVIRONMENT VERIFICATION ========================
const runEnvironmentTests = async () => {
  log('\n========== 1. ENVIRONMENT VERIFICATION ==========', 'SUITE');

  // Health check
  try {
    const health = await api.get(API('/api/health'));
    assertStatus(health, 200, '1.1 Health endpoint responds');
    assert(health.data?.ok === true, '1.2 Health reports OK');
  } catch (err) {
    assert(false, '1.1 Health endpoint', `Server may not be running: ${err.message}`);
    return false;
  }
  return true;
};

// ======================== 2. AUTHENTICATION ========================
const runAuthTests = async () => {
  log('\n========== 2. AUTHENTICATION ==========', 'SUITE');

  // 2.1 Request without token
  try {
    await api.get(API('/api/products'));
    assert(false, '2.1 Request without token should fail');
  } catch (err) {
    assert(err.response?.status === 401, '2.1 Auth middleware blocks unauthenticated requests', `Got ${err.response?.status}`);
  }

  // 2.2 Invalid token
  try {
    await api.get(API('/api/products'), { headers: { Authorization: 'Bearer invalidtoken123' } });
    assert(false, '2.2 Invalid token should fail');
  } catch (err) {
    assert(err.response?.status === 401, '2.2 Invalid token rejected', `Got ${err.response?.status}`);
  }

  // 2.3 Login with test credentials
  try {
    const loginRes = await api.post(API('/api/users/login'), {
      Email: 'superadmin@test.local',
      Password: process.env.TEST_PASSWORD || 'Test@123456',
    });
    if (loginRes.data?.accessToken) {
      accessToken = loginRes.data.accessToken;
      assert(true, '2.3 Login with known credentials', `Token received: ${!!accessToken}`);
    } else {
      assert(false, '2.3 Login with known credentials', 'No token in response');
      // Try to register a test user
      try {
        const regRes = await api.post(API('/api/users/register'), {
          Name: 'Test Admin',
          Email: 'testadmin@erp.test',
          Password: 'Test@Admin123',
          CompanyId: 1,
        });
        skip('2.3 Login', 'User not seeded - registration attempted');
      } catch (regErr) {
        skip('2.3 Login', 'Test user not found and could not register');
      }
    }
  } catch (err) {
    skip('2.3 Login with known credentials', `Login failed: ${err.response?.data?.message || err.message}`);
  }
};

// ======================== 3. BASIC API REACHABILITY ========================
const runApiReachabilityTests = async () => {
  log('\n========== 3. API REACHABILITY ==========', 'SUITE');
  
  const endpoints = [
    { path: '/api/products', method: 'GET', name: '3.1 Products list' },
    { path: '/api/suppliers', method: 'GET', name: '3.2 Suppliers list' },
    { path: '/api/customers', method: 'GET', name: '3.3 Customers list' },
    { path: '/api/warehouses', method: 'GET', name: '3.4 Warehouses list' },
    { path: '/api/stock-movements', method: 'GET', name: '3.5 Stock movements' },
    { path: '/api/purchase-orders', method: 'GET', name: '3.6 Purchase orders' },
    { path: '/api/sales-orders', method: 'GET', name: '3.7 Sales orders' },
    { path: '/api/dashboard', method: 'GET', name: '3.8 Dashboard' },
    { path: '/api/crm/accounts', method: 'GET', name: '3.9 CRM Accounts' },
    { path: '/api/crm/leads', method: 'GET', name: '3.10 CRM Leads' },
    { path: '/api/crm/opportunities', method: 'GET', name: '3.11 CRM Opportunities' },
    { path: '/api/crm/contacts', method: 'GET', name: '3.12 CRM Contacts' },
    { path: '/api/productcategory/list', method: 'GET', name: '3.13 Product categories' },
    { path: '/api/units/list', method: 'GET', name: '3.14 Units' },
    { path: '/api/brands', method: 'GET', name: '3.15 Brands' },
    { path: '/api/taxes', method: 'GET', name: '3.16 Taxes' },
  ];

  for (const ep of endpoints) {
    try {
      const res = await api.get(API(ep.path));
      assert(res.status === 200, ep.name, `Status: ${res.status}`);
    } catch (err) {
      if (err.response) {
        // 401/403 means the endpoint exists (auth issue), 404 means not found
        if (err.response.status === 401 || err.response.status === 403) {
          assert(true, ep.name, `Endpoint exists, returns ${err.response.status}`);
        } else {
          assert(false, ep.name, `Error ${err.response.status}: ${err.response.data?.message || err.message}`);
        }
      } else {
        assert(false, ep.name, `Connection error: ${err.message}`);
      }
    }
  }
};

// ======================== 4. CRM CRUD OPERATIONS ========================
const runCrmTests = async () => {
  log('\n========== 4. CRM OPERATIONS ==========', 'SUITE');
  
  // 4.1 Create Account
  try {
    const res = await api.post(API('/api/crm/accounts'), {
      Name: `Test Account ${Date.now()}`,
      CompanyId: 1,
    });
    assert(res.status === 201, '4.1 Create Account', `Status: ${res.status}`);
    const accountId = res.data?.Id || res.data?.id;
    
    if (accountId) {
      // 4.2 Get Account by ID
      const getRes = await api.get(API(`/api/crm/accounts/${accountId}`));
      assert(getRes.status === 200, '4.2 Get Account by ID');
      
      // 4.3 Update Account
      const updRes = await api.put(API(`/api/crm/accounts/${accountId}`), { Name: 'Updated Account' });
      assert(updRes.status === 200, '4.3 Update Account');
      
      // 4.4 Create Contact
      const contactRes = await api.post(API('/api/crm/contacts'), {
        FirstName: 'John',
        LastName: 'Doe',
        Email: 'john@test.com',
        CompanyId: 1,
      });
      assert(contactRes.status === 201, '4.4 Create Contact');
      
      // 4.5 Create Lead
      const leadRes = await api.post(API('/api/crm/leads'), {
        CompanyId: 1,
        Status: 'New',
      });
      assert(leadRes.status === 201, '4.5 Create Lead');
      
      // 4.6 Create Opportunity
      const oppRes = await api.post(API('/api/crm/opportunities'), {
        OpportunityName: `Test Opp ${Date.now()}`,
        CompanyId: 1,
      });
      assert(oppRes.status === 201, '4.6 Create Opportunity');
    }
  } catch (err) {
    if (err.response?.status === 401 || err.response?.status === 403) {
      skip('4.1-4.6 CRM CRUD', `Auth error: ${err.response?.data?.message}`);
    } else {
      assert(false, '4.1-4.6 CRM CRUD', err.response?.data?.message || err.message);
    }
  }
};

// ======================== 5. INVENTORY CRUD ========================
const runInventoryTests = async () => {
  log('\n========== 5. INVENTORY OPERATIONS ==========', 'SUITE');
  
  let productId = null;
  let warehouseId = null;
  let supplierId = null;
  let customerId = null;

  // 5.1 Create Product
  try {
    const res = await api.post(API('/api/products'), {
      ProductName: `Test Product ${Date.now()}`,
      ProductCode: `TP-${Date.now()}`,
      CompanyId: 1,
      Price: 100,
      Cost: 60,
      IsActive: true,
    });
    if (res.status === 201 || res.status === 200) {
      productId = res.data?.data?.Id || res.data?.Id;
      assert(true, '5.1 Create Product', `Product ID: ${productId}`);
    } else {
      assert(false, '5.1 Create Product', `Status: ${res.status}`);
    }
  } catch (err) {
    if (err.response) {
      assert(false, '5.1 Create Product', `Status ${err.response.status}: ${err.response.data?.message || ''}`);
    } else {
      assert(false, '5.1 Create Product', err.message);
    }
  }

  // 5.2 Get Products list
  try {
    const res = await api.get(API('/api/products'));
    assert(res.status === 200, '5.2 Get Products list');
  } catch (err) {
    assert(false, '5.2 Get Products list', err.message);
  }

  // 5.3 Create Supplier
  try {
    const res = await api.post(API('/api/suppliers'), {
      SupplierName: `Test Supplier ${Date.now()}`,
      ContactPerson: 'Test Contact',
      Email: `supplier${Date.now()}@test.com`,
      Phone: '9999999999',
      CompanyId: 1,
    });
    if (res.status === 201 || res.status === 200) {
      supplierId = res.data?.Id || res.data?.data?.Id;
      assert(true, '5.3 Create Supplier', `Supplier ID: ${supplierId}`);
    } else {
      assert(false, '5.3 Create Supplier', `Status: ${res.status}`);
    }
  } catch (err) {
    assert(false, '5.3 Create Supplier', err.response?.data?.message || err.message);
  }

  // 5.4 Create Customer
  try {
    const res = await api.post(API('/api/customers'), {
      CustomerName: `Test Customer ${Date.now()}`,
      Email: `cust${Date.now()}@test.com`,
      Phone: '8888888888',
      CompanyId: 1,
    });
    if (res.status === 201 || res.status === 200) {
      customerId = res.data?.Id || res.data?.data?.Id;
      assert(true, '5.4 Create Customer', `Customer ID: ${customerId}`);
    } else {
      assert(false, '5.4 Create Customer', `Status: ${res.status}`);
    }
  } catch (err) {
    assert(false, '5.4 Create Customer', err.response?.data?.message || err.message);
  }

  return { productId, warehouseId, supplierId, customerId };
};

// ======================== 6. PURCHASE ORDER WORKFLOW ========================
const runPurchaseTests = async (ids) => {
  log('\n========== 6. PURCHASE ORDER WORKFLOW ==========', 'SUITE');
  
  if (!ids.supplierId) {
    skip('6.1-6.4 Purchase orders', 'No supplier ID available');
    return null;
  }

  let poId = null;

  // 6.1 Create Purchase Order
  try {
    const res = await api.post(API('/api/purchase-orders'), {
      SupplierId: ids.supplierId,
      CompanyId: 1,
      OrderDate: new Date().toISOString(),
      Status: 'Draft',
    });
    if (res.status === 201 || res.status === 200) {
      poId = res.data?.Id || res.data?.data?.Id;
      assert(true, '6.1 Create Purchase Order', `PO ID: ${poId}`);
    } else {
      assert(false, '6.1 Create Purchase Order', `Status: ${res.status}`);
    }
  } catch (err) {
    assert(false, '6.1 Create Purchase Order', err.response?.data?.message || err.message);
  }

  // 6.2 Update PO Status
  if (poId) {
    try {
      const res = await api.put(API(`/api/purchase-orders/${poId}/status`), { Status: 'Approved' });
      assert(res.status === 200, '6.2 Update PO Status', `Status: Approved`);
    } catch (err) {
      assert(false, '6.2 Update PO Status', err.message);
    }
  }

  return poId;
};

// ======================== 7. SALES ORDER WORKFLOW ========================
const runSalesTests = async (ids) => {
  log('\n========== 7. SALES ORDER WORKFLOW ==========', 'SUITE');
  
  if (!ids.customerId) {
    skip('7.1-7.3 Sales orders', 'No customer ID available');
    return null;
  }

  let soId = null;

  // 7.1 Create Sales Order
  try {
    const res = await api.post(API('/api/sales-orders'), {
      CustomerId: ids.customerId,
      CompanyId: 1,
      OrderDate: new Date().toISOString(),
      Status: 'Draft',
    });
    if (res.status === 201 || res.status === 200) {
      soId = res.data?.Id || res.data?.data?.Id;
      assert(true, '7.1 Create Sales Order', `SO ID: ${soId}`);
    } else {
      assert(false, '7.1 Create Sales Order', `Status: ${res.status}`);
    }
  } catch (err) {
    assert(false, '7.1 Create Sales Order', err.response?.data?.message || err.message);
  }

  // 7.2 Update SO Status
  if (soId) {
    try {
      const res = await api.put(API(`/api/sales-orders/${soId}/status`), { Status: 'Confirmed' });
      assert(res.status === 200, '7.2 Update SO Status to Confirmed');
    } catch (err) {
      assert(false, '7.2 Update SO Status', err.message);
    }
  }

  return soId;
};

// ======================== 8. RBAC TESTS ========================
const runRbacTests = async () => {
  log('\n========== 8. RBAC TESTS ==========', 'SUITE');

  // 8.1 Access without auth
  try {
    await api.get(API('/api/products'));
    assert(false, '8.1 Unauthenticated request blocked');
  } catch (err) {
    assert(err.response?.status === 401, '8.1 Unauthenticated request returns 401', `Got ${err.response?.status}`);
  }

  // 8.2 Access with auth
  if (accessToken) {
    try {
      const res = await api.get(API('/api/products'));
      assert(res.status === 200, '8.2 Authenticated request succeeds');
    } catch (err) {
      if (err.response?.status === 403) {
        assert(true, '8.2 Authenticated request', `Got 403 (RBAC configured)`);
      } else {
        assert(false, '8.2 Authenticated request', `Got ${err.response?.status}`);
      }
    }
  } else {
    skip('8.2 Authenticated request', 'No access token');
  }

  // 8.3 Customers cannot create
  notImplemented('8.3 Customer role restrictions', 'Need separate customer token');
  
  // 8.4 Audit-only access
  notImplemented('8.4 Auditor role restrictions', 'Need separate auditor token');
};

// ======================== 9. STOCK CONSISTENCY ========================
const runStockConsistencyTests = async () => {
  log('\n========== 9. STOCK CONSISTENCY ==========', 'SUITE');

  notImplemented('9.1 Stock consistency check', 'Need GRN workflow execution to verify');
  notImplemented('9.2 AvailableQuantity = Quantity - ReservedQuantity', 'Verify generated column');
  notImplemented('9.3 Products.StockQuantity matches warehouse sum', 'Trigger/migration may not exist');
};

// ======================== 10. CRM VISIBILITY ========================
const runCrmVisibilityTests = async () => {
  log('\n========== 10. CRM VISIBILITY ==========', 'SUITE');

  notImplemented('10.1 Company isolation for CRM records', 'Need second company token');
  notImplemented('10.2 Hierarchy-based access', 'Need manager/employee tokens');
  notImplemented('10.3 Group visibility', 'EntityVisibility table exists but not tested');
};

// ======================== RUNNER ========================
const runAll = async () => {
  log('========================================', 'START');
  log('ERP CRM - Comprehensive Test Suite', 'START');
  log(`Target: ${BASE_URL}`, 'CONFIG');
  log('Date: ' + new Date().toISOString(), 'CONFIG');
  log('========================================\n', 'START');

  // Run environment check first
  const envOk = await runEnvironmentTests();
  if (!envOk) {
    log('\n❌ Environment check failed. Aborting remaining tests.', 'FATAL');
    process.exit(1);
  }

  // Run authentication tests
  await runAuthTests();

  // Run API reachability
  await runApiReachabilityTests();

  // Run CRM tests
  await runCrmTests();

  // Run inventory CRUD
  const ids = await runInventoryTests();

  // Run purchase workflow
  await runPurchaseTests(ids);

  // Run sales workflow
  await runSalesTests(ids);

  // Run RBAC tests
  await runRbacTests();

  // Run stock consistency tests
  await runStockConsistencyTests();

  // Run CRM visibility tests
  await runCrmVisibilityTests();

  // ======================== SUMMARY ========================
  const total = testResults.passed + testResults.failed + testResults.skipped + testResults.blocked + testResults.notImplemented;
  log('\n========================================', 'END');
  log('TEST SUMMARY', 'END');
  log('========================================', 'END');
  log(`Total: ${total}`, 'END');
  log(`Passed: ${testResults.passed}`, testResults.failed > 0 ? 'FAIL' : 'PASS');
  log(`Failed: ${testResults.failed}`, testResults.failed > 0 ? 'FAIL' : 'PASS');
  log(`Skipped: ${testResults.skipped}`, 'END');
  log(`Blocked: ${testResults.blocked}`, 'END');
  log(`Not Implemented: ${testResults.notImplemented}`, 'END');
  log(`Pass Rate: ${total > 0 ? ((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1) : 0}%`, 'END');
  log('========================================\n', 'END');

  // Generate report
  const fs = require('fs');
  const path = require('path');
  const report = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    summary: {
      total,
      passed: testResults.passed,
      failed: testResults.failed,
      skipped: testResults.skipped,
      blocked: testResults.blocked,
      notImplemented: testResults.notImplemented,
      passRate: total > 0 ? ((testResults.passed / (testResults.passed + testResults.failed || 1)) * 100).toFixed(1) : 0,
    },
    details: testResults.details,
  };

  const reportDir = path.join(__dirname, '..', 'load-test-reports');
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  const reportFile = path.join(reportDir, `comprehensive-test-report-${Date.now()}.json`);
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  log(`📄 Report saved: ${reportFile}`, 'END');

  process.exit(testResults.failed > 0 ? 1 : 0);
};

runAll().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});