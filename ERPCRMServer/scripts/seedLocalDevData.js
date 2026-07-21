/**
 * Seed Local Development Data
 * ============================
 * Cleans all data and creates 5 users with password @Hfghksdfsj737this
 * and related company, roles, types, units, categories.
 *
 * Usage: node scripts/seedLocalDevData.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const cleanEnvValue = (value) => {
  if (typeof value !== 'string') return value;
  return value.split('#')[0].trim();
};

const DB_CONFIG = {
  user: cleanEnvValue(process.env.LOCAL_DB_USER),
  password: cleanEnvValue(process.env.LOCAL_DB_PASSWORD) || '',
  host: cleanEnvValue(process.env.LOCAL_DB_HOST) || 'localhost',
  database: cleanEnvValue(process.env.LOCAL_DB_NAME) || 'ERP',
};

const PASSWORD = '@Hfghksdfsj737this';

const USERS = [
  { Name: 'Super Admin', Email: 'superadmin@erp.local', Role: 'SuperAdmin', UserType: 'Internal' },
  { Name: 'Admin User', Email: 'admin@erp.local', Role: 'Admin', UserType: 'Internal' },
  { Name: 'Manager User', Email: 'manager@erp.local', Role: 'Manager', UserType: 'Internal' },
  { Name: 'Employee User', Email: 'employee@erp.local', Role: 'Employee', UserType: 'Internal' },
  { Name: 'Viewer User', Email: 'viewer@erp.local', Role: 'Viewer', UserType: 'External' },
];

const run = async () => {
  const pool = new Pool(DB_CONFIG);
  
  try {
    await pool.connect();
    console.log('✅ Connected to local database\n');

    // Disable FK checks
    await pool.query('SET session_replication_role = replica;');

    // === CLEAN ALL DATA ===
    console.log('🧹 Cleaning all existing data...');
    
    const tables = [
      'Notifications', 'ApprovalWorkflows', 'Expenses',
      'ProductStockPerWarehouse', 'StockMovements',
      'PurchaseOrderItems', 'PurchaseOrders',
      'SalesOrderItems', 'SalesOrders',
      'DeliveryChallanItems', 'DeliveryChallans',
      'SalesReturnItems', 'SalesReturns',
      'SalesQuotationItems', 'SalesQuotations',
      'PurchaseReturnItems', 'PurchaseReturns',
      'PurchaseRequisitionItems', 'PurchaseRequisitions',
      'BOMItems', 'BOM', 'ProductionTracking', 'ProductionOrders',
      'BatchSerial', 'ProductTaxMap', 'Taxes',
      'WarehouseBins', 'WarehouseRacks',
      'Employees', 'Designations', 'Departments',
      'Warehouses', 'Customers', 'Suppliers',
      'Products', 'Brands', 'ProductCategories', 'Units',
      'CompanySettings', 'NotificationPreferences', 'AuditEvents',
      'token_revocation_list', 'refresh_tokens', 'PasswordResets', 'EmailOtpVerifications',
      'EntityVisibility', 'Assignments', 'GroupMembers', 'Groups',
      'PresalesAssignments', 'Comments',
      'OpportunityProducts', 'Cases', 'Presales', 'Retentions',
      'Payments', 'Invoices', 'Quotes', 'Activities',
      'Opportunities', 'Leads', 'Contacts', 'Accounts',
      'SalesStages', 'FollowupTypes', 'Industries', 'LeadSources', 'TaskTypes',
      'ProductCategories', 'Users', 'UserTypes', 'Roles', 'Companies'
    ];

    for (const table of tables) {
      try {
        await pool.query(`TRUNCATE TABLE "${table}" CASCADE`);
      } catch (e) {
        // Table might not exist, skip
      }
    }
    console.log('  ✅ All tables truncated\n');

    // === COMPANIES ===
    const companyRes = await pool.query(
      `INSERT INTO "Companies" ("CompanyName", "Email", "Phone", "Address", "City", "State", "Country", "IsActive")
       VALUES ('Demo Company', 'info@democompany.com', '9999999999', '123 Main St', 'Mumbai', 'Maharashtra', 'India', true)
       RETURNING "Id"`
    );
    const companyId = companyRes.rows[0].Id;
    console.log(`✅ Company created (ID: ${companyId})`);

    // === ROLES ===
    const roles = ['SuperAdmin', 'Admin', 'Manager', 'Employee', 'Viewer'];
    const roleIds = {};
    for (const role of roles) {
      const res = await pool.query(
        `INSERT INTO "Roles" ("Name", "Description", "IsSystem") VALUES ($1, $2, true) ON CONFLICT ("Name") DO UPDATE SET "Name"=EXCLUDED."Name" RETURNING "Id"`,
        [role, `${role} - System role`, true]
      );
      roleIds[role] = res.rows[0].Id;
    }
    console.log(`✅ ${roles.length} roles created`);

    // === USER TYPES ===
    const types = ['Internal', 'External', 'Vendor', 'Customer', 'Partner', 'Consultant'];
    const typeIds = {};
    for (const type of types) {
      const res = await pool.query(
        `INSERT INTO "UserTypes" ("Name") VALUES ($1) ON CONFLICT ("Name") DO UPDATE SET "Name"=EXCLUDED."Name" RETURNING "Id"`,
        [type]
      );
      typeIds[type] = res.rows[0].Id;
    }
    console.log(`✅ ${types.length} user types created`);

    // === USERS ===
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(PASSWORD, salt);

    for (const user of USERS) {
      const res = await pool.query(
        `INSERT INTO "Users" ("Name", "Email", "PasswordHash", "PasswordSalt", "RoleId", "UserTypeId", "CompanyId", "IsActive")
         VALUES ($1, $2, $3, $4, $5, $6, $7, true)
         RETURNING "Id"`,
        [user.Name, user.Email, hashedPassword, salt, roleIds[user.Role], typeIds[user.UserType], companyId]
      );
      console.log(`  👤 ${user.Name.padEnd(16)} (${user.Email.padEnd(25)}) Role: ${user.Role.padEnd(12)} ID: ${res.rows[0].Id}`);
    }

    // === CORE BUSINESS DATA ===

    // Units
    const unitNames = ['Kg', 'Nos', 'Box', 'Meter', 'Liter', 'Piece', 'Pack', 'Set', 'Dozen', 'Gram'];
    let unitCount = 0;
    for (const unit of unitNames) {
      try {
        await pool.query(
          `INSERT INTO "Units" ("Name", "ShortName", "IsActive") VALUES ($1, $2, true) ON CONFLICT DO NOTHING`,
          [unit, unit.substring(0, 3).toUpperCase(), true]
        );
        unitCount++;
      } catch (e) { /* skip duplicate */ }
    }
    console.log(`✅ ${unitCount} units created`);

    // Product Categories
    const categories = [
      { name: 'Electronics', desc: 'Electronic items & components' },
      { name: 'Raw Materials', desc: 'Raw materials for production' },
      { name: 'Finished Goods', desc: 'Ready to sell products' },
      { name: 'Packaging', desc: 'Packaging materials' },
      { name: 'Office Supplies', desc: 'Office stationery & supplies' },
    ];
    for (const cat of categories) {
      await pool.query(
        `INSERT INTO "ProductCategories" ("Name", "Description", "IsActive") VALUES ($1, $2, true) ON CONFLICT DO NOTHING`,
        [cat.name, cat.desc]
      );
    }
    console.log(`✅ ${categories.length} categories created`);

    // === RE-ENABLE FK CHECKS ===
    await pool.query('SET session_replication_role = default;');

    console.log('\n========================================');
    console.log('  SEED COMPLETE');
    console.log('========================================');
    console.log(`  Company:    Demo Company (ID: ${companyId})`);
    console.log(`  Users:      ${USERS.length} created`);
    console.log(`  Password:   ${PASSWORD}`);
    console.log('========================================');
    console.log('\n📋 Login credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    for (const user of USERS) {
      console.log(`  ${user.Email.padEnd(30)} ${PASSWORD}`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    pool.end();
    process.exit(1);
  }
};

run();