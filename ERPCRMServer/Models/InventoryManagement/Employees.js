const { appPool } = require('../../config/db');

const Employees = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "Employees" (
      "Id" SERIAL PRIMARY KEY,
      "EmployeeCode" VARCHAR(50) NOT NULL,
      "FirstName" VARCHAR(100) NOT NULL,
      "LastName" VARCHAR(100) NOT NULL,
      "Email" VARCHAR(200),
      "Phone" VARCHAR(20),
      "DepartmentId" INT,
      "DesignationId" INT,
      "CompanyId" INT,
      "BranchId" INT,
      "ReportingTo" INT,
      "DateOfJoining" DATE,
      "DateOfBirth" DATE,
      "Gender" VARCHAR(20),
      "Address" VARCHAR(500),
      "City" VARCHAR(100),
      "State" VARCHAR(100),
      "PinCode" VARCHAR(10),
      "BloodGroup" VARCHAR(10),
      "EmergencyContact" VARCHAR(20),
      "EmergencyContactName" VARCHAR(100),
      "PAN" VARCHAR(20),
      "Aadhar" VARCHAR(20),
      "BankName" VARCHAR(100),
      "BankAccount" VARCHAR(50),
      "IFSCCode" VARCHAR(20),
      "BasicSalary" DECIMAL(18,2),
      "UserId" INT,
      "ProfileImage" VARCHAR(500),
      "IsActive" BOOLEAN DEFAULT true,
      "IsDeleted" BOOLEAN DEFAULT false,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await appPool.query(query);
    console.log('✅ Employees table initialized');
  } catch (error) {
    console.error('❌ Error creating Employees table:', error.message);
  }
};

const Departments = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "Departments" (
      "Id" SERIAL PRIMARY KEY,
      "Name" VARCHAR(100) NOT NULL,
      "Code" VARCHAR(50),
      "Description" VARCHAR(500),
      "CompanyId" INT,
      "HeadEmployeeId" INT,
      "ParentDepartmentId" INT,
      "IsActive" BOOLEAN DEFAULT true,
      "IsDeleted" BOOLEAN DEFAULT false,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await appPool.query(query);
    console.log('✅ Departments table initialized');
  } catch (error) {
    console.error('❌ Error creating Departments table:', error.message);
  }
};

const Designations = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "Designations" (
      "Id" SERIAL PRIMARY KEY,
      "Name" VARCHAR(100) NOT NULL,
      "Code" VARCHAR(50),
      "Description" VARCHAR(500),
      "DepartmentId" INT,
      "MinSalary" DECIMAL(18,2),
      "MaxSalary" DECIMAL(18,2),
      "IsActive" BOOLEAN DEFAULT true,
      "IsDeleted" BOOLEAN DEFAULT false,
      "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await appPool.query(query);
    console.log('✅ Designations table initialized');
  } catch (error) {
    console.error('❌ Error creating Designations table:', error.message);
  }
};

module.exports = { Employees, Departments, Designations };