/**
 * Idempotent Test Data Seed
 * ==========================
 * Creates test users, companies, branches, and warehouses for automated testing.
 * Safe to run multiple times — uses UPSERT patterns.
 * 
 * Usage: node scripts/seedTestData.js
 * 
 * Environment variables:
 *   TEST_PASSWORD — password for all test users (default: Test@123456)
 *   NODE_ENV — must NOT be 'production' to run
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { appPool } = require('../config/db');

const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Test@123456';

if (process.env.NODE_ENV === 'production') {
  console.error('❌ Refusing to seed test data in production environment');
  process.exit(1);
}

const run = async () => {
  const client = await appPool.connect();
  try {
    await client.query('BEGIN');

    // ==================== COMPANIES ====================
    const companies = [
      { name: 'Test Company Alpha', email: 'alpha@test.local', businessType: 'Technology' },
      { name: 'Test Company Beta', email: 'beta@test.local', businessType: 'Manufacturing' },
    ];

    const companyIds = {};
    for (const c of companies) {
      const existing = await client.query(
        `SELECT "Id" FROM "Companies" WHERE "Email" = $1`,
        [c.email]
      );
      if (existing.rows.length > 0) {
        companyIds[c.email] = existing.rows[0].Id;
        console.log(`  ℹ Company exists: ${c.name} (ID: ${companyIds[c.email]})`);
      } else {
        const result = await client.query(
          `INSERT INTO "Companies" ("CompanyName", "Email", "BusinessType", "IsActive", "Flag", "IsDelete")
           VALUES ($1, $2, $3, TRUE, TRUE, FALSE) RETURNING "Id"`,
          [c.name, c.email, c.businessType]
        );
        companyIds[c.email] = result.rows[0].Id;
        console.log(`  ✅ Company created: ${c.name} (ID: ${companyIds[c.email]})`);
      }
    }

    // ==================== ROLES ====================
    const roleNames = ['superadmin', 'admin', 'manager', 'employee', 'customer'];
    const roleIds = {};
    for (const name of roleNames) {
      const existing = await client.query(
        `SELECT "Id" FROM "Roles" WHERE "RoleName" = $1`,
        [name]
      );
      if (existing.rows.length > 0) {
        roleIds[name] = existing.rows[0].Id;
      } else {
        const result = await client.query(
          `INSERT INTO "Roles" ("RoleName", "IsActive") VALUES ($1, TRUE) RETURNING "Id"`,
          [name]
        );
        roleIds[name] = result.rows[0].Id;
      }
    }
    console.log(`  ✅ Roles ready: ${Object.keys(roleIds).join(', ')}`);

    // ==================== TEST USERS ====================
    const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);
    const testUsers = [
      { name: 'Super Admin Test', email: 'superadmin@test.local', role: 'superadmin', company: null },
      { name: 'Company Admin Alpha', email: 'companyadmin.a@test.local', role: 'admin', company: 'alpha@test.local' },
      { name: 'Inventory Manager Alpha', email: 'inventory.a@test.local', role: 'manager', company: 'alpha@test.local' },
      { name: 'Warehouse Manager A1', email: 'warehouse.a1@test.local', role: 'employee', company: 'alpha@test.local' },
      { name: 'Warehouse Operator A2', email: 'warehouse.a2@test.local', role: 'employee', company: 'alpha@test.local' },
      { name: 'Purchase Manager Alpha', email: 'purchase.a@test.local', role: 'manager', company: 'alpha@test.local' },
      { name: 'Sales Manager Alpha', email: 'sales.a@test.local', role: 'manager', company: 'alpha@test.local' },
      { name: 'Finance Manager Alpha', email: 'finance.a@test.local', role: 'manager', company: 'alpha@test.local' },
      { name: 'Company Admin Beta', email: 'companyadmin.b@test.local', role: 'admin', company: 'beta@test.local' },
      { name: 'Auditor Alpha', email: 'auditor.a@test.local', role: 'employee', company: 'alpha@test.local' },
      { name: 'Read Only Alpha', email: 'readonly.a@test.local', role: 'employee', company: 'alpha@test.local' },
    ];

    const userIds = {};
    for (const u of testUsers) {
      const existing = await client.query(
        `SELECT "UserId" FROM "Users" WHERE "Email" = $1`,
        [u.email]
      );
      if (existing.rows.length > 0) {
        userIds[u.email] = existing.rows[0].UserId;
        console.log(`  ℹ User exists: ${u.name} (${u.email})`);
      } else {
        const result = await client.query(
          `INSERT INTO "Users" ("Name", "Email", "Password", "CompanyId", "RoleId", "IsActive", "Flag", "IsDelete")
           VALUES ($1, $2, $3, $4, $5, TRUE, TRUE, FALSE) RETURNING "UserId"`,
          [u.name, u.email, hashedPassword, u.company ? companyIds[u.company] : null, roleIds[u.role]]
        );
        userIds[u.email] = result.rows[0].UserId;
        console.log(`  ✅ User created: ${u.name} (${u.email}) — Role: ${u.role}`);
      }
    }

    // ==================== WAREHOUSES ====================
    const warehouses = [
      { name: 'Alpha Main Warehouse', code: 'ALPHA-MAIN', company: 'alpha@test.local', city: 'Mumbai' },
      { name: 'Alpha Secondary Warehouse', code: 'ALPHA-SEC', company: 'alpha@test.local', city: 'Pune' },
      { name: 'Beta Main Warehouse', code: 'BETA-MAIN', company: 'beta@test.local', city: 'Delhi' },
    ];

    const warehouseIds = {};
    for (const w of warehouses) {
      const existing = await client.query(
        `SELECT "Id" FROM "Warehouses" WHERE "WarehouseCode" = $1`,
        [w.code]
      );
      if (existing.rows.length > 0) {
        warehouseIds[w.code] = existing.rows[0].Id;
        console.log(`  ℹ Warehouse exists: ${w.name} (${w.code})`);
      } else {
        const result = await client.query(
          `INSERT INTO "Warehouses" ("Name", "WarehouseCode", "CompanyId", "City", "IsActive")
           VALUES ($1, $2, $3, $4, TRUE) RETURNING "Id"`,
          [w.name, w.code, companyIds[w.company], w.city]
        );
        warehouseIds[w.code] = result.rows[0].Id;
        console.log(`  ✅ Warehouse created: ${w.name} (${w.code})`);
      }
    }

    // ==================== PRODUCT CATEGORIES ====================
    const categories = ['Electronics', 'Furniture', 'Stationery'];
    const categoryIds = {};
    for (const name of categories) {
      const existing = await client.query(
        `SELECT "Id" FROM "ProductCategories" WHERE "CategoryName" = $1`,
        [name]
      );
      if (existing.rows.length > 0) {
        categoryIds[name] = existing.rows[0].Id;
      } else {
        const result = await client.query(
          `INSERT INTO "ProductCategories" ("CategoryName") VALUES ($1) RETURNING "Id"`,
          [name]
        );
        categoryIds[name] = result.rows[0].Id;
      }
    }
    console.log(`  ✅ Categories ready: ${Object.keys(categoryIds).join(', ')}`);

    // ==================== UNITS ====================
    const units = ['Pieces', 'Kg', 'Meters'];
    const unitIds = {};
    for (const name of units) {
      const existing = await client.query(
        `SELECT "Id" FROM "Units" WHERE "Name" = $1`,
        [name]
      );
      if (existing.rows.length > 0) {
        unitIds[name] = existing.rows[0].Id;
      } else {
        const result = await client.query(
          `INSERT INTO "Units" ("Name", "Symbol") VALUES ($1, $2) RETURNING "Id"`,
          [name, name.substring(0, 2)]
        );
        unitIds[name] = result.rows[0].Id;
      }
    }
    console.log(`  ✅ Units ready: ${Object.keys(unitIds).join(', ')}`);

    // ==================== TEST PRODUCTS ====================
    const testProducts = [
      { name: 'Test Laptop', code: 'TST-LAP-001', company: 'alpha@test.local', category: 'Electronics', unit: 'Pieces', price: 50000, cost: 40000 },
      { name: 'Test Desk', code: 'TST-DSK-001', company: 'alpha@test.local', category: 'Furniture', unit: 'Pieces', price: 15000, cost: 10000 },
      { name: 'Test Paper', code: 'TST-PPR-001', company: 'alpha@test.local', category: 'Stationery', unit: 'Kg', price: 500, cost: 300 },
    ];

    for (const p of testProducts) {
      const existing = await client.query(
        `SELECT "Id" FROM "Products" WHERE "ProductCode" = $1`,
        [p.code]
      );
      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO "Products" ("ProductName", "ProductCode", "CompanyId", "CategoryId", "UnitId", "Price", "Cost", "StockQuantity", "IsActive", "IsDelete")
           VALUES ($1, $2, $3, $4, $5, $6, $7, 0, TRUE, FALSE)`,
          [p.name, p.code, companyIds[p.company], categoryIds[p.category], unitIds[p.unit], p.price, p.cost]
        );
        console.log(`  ✅ Product created: ${p.name} (${p.code})`);
      } else {
        console.log(`  ℹ Product exists: ${p.name} (${p.code})`);
      }
    }

    // ==================== SUPPLIERS ====================
    const testSuppliers = [
      { name: 'Test Supplier Alpha', email: 'supplier.alpha@test.local', company: 'alpha@test.local' },
      { name: 'Test Supplier Beta', email: 'supplier.beta@test.local', company: 'beta@test.local' },
    ];

    for (const s of testSuppliers) {
      const existing = await client.query(
        `SELECT "Id" FROM "Suppliers" WHERE "Email" = $1`,
        [s.email]
      );
      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO "Suppliers" ("Name", "Email", "CompanyId", "IsActive")
           VALUES ($1, $2, $3, TRUE)`,
          [s.name, s.email, companyIds[s.company]]
        );
        console.log(`  ✅ Supplier created: ${s.name}`);
      } else {
        console.log(`  ℹ Supplier exists: ${s.name}`);
      }
    }

    // ==================== CUSTOMERS ====================
    const testCustomers = [
      { name: 'Test Customer Alpha', email: 'customer.alpha@test.local', company: 'alpha@test.local' },
      { name: 'Test Customer Beta', email: 'customer.beta@test.local', company: 'beta@test.local' },
    ];

    for (const c of testCustomers) {
      const existing = await client.query(
        `SELECT "Id" FROM "Customers" WHERE "Email" = $1`,
        [c.email]
      );
      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO "Customers" ("Name", "Email", "IsActive")
           VALUES ($1, $2, TRUE)`,
          [c.name, c.email]
        );
        console.log(`  ✅ Customer created: ${c.name}`);
      } else {
        console.log(`  ℹ Customer exists: ${c.name}`);
      }
    }

    await client.query('COMMIT');

    console.log('\n========================================');
    console.log('   TEST DATA SEED COMPLETED');
    console.log('========================================\n');
    console.log('Test Credentials:');
    console.log('  Password for all users:', TEST_PASSWORD);
    console.log('');
    console.log('Users:');
    for (const u of testUsers) {
      console.log(`  ${u.name.padEnd(30)} ${u.email.padEnd(35)} Role: ${u.role}`);
    }
    console.log('');
    console.log('Companies:');
    for (const c of companies) {
      console.log(`  ${c.name.padEnd(30)} ID: ${companyIds[c.email]}`);
    }
    console.log('');
    console.log('Warehouses:');
    for (const w of warehouses) {
      console.log(`  ${w.name.padEnd(30)} Code: ${w.code}  ID: ${warehouseIds[w.code]}`);
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', error.message);
    console.error(error);
    process.exitCode = 1;
  } finally {
    client.release();
    await appPool.end();
  }
};

run();