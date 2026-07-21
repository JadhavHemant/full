const { appPool } = require('../../config/db');
const { pgQuery } = require('../../utils/pgCompat');

// ==================== DEPARTMENTS ====================
const createDepartment = async (req, res) => {
  try {
    const { DepartmentName, CompanyId } = req.body;
    if (!DepartmentName) return res.status(400).json({ message: 'Department name is required' });
    const result = await pgQuery(appPool,
      `INSERT INTO "Departments" ("DepartmentName", "CompanyId") VALUES ($1, $2) RETURNING "Id"`,
      [DepartmentName, CompanyId || null]
    );
    res.status(201).json({ message: 'Department created', data: { Id: result.rows[0].Id, DepartmentName } });
  } catch (error) {
    console.error('Create Department Error:', error);
    res.status(500).json({ message: 'Failed to create department', error: error.message });
  }
};

const getDepartments = async (req, res) => {
  try {
    const { limit = 50, offset = 0, search = '', isActive, companyId } = req.query;
    let where = 'WHERE d."IsActive" = true';
    const params = [];
    let idx = 0;
    if (search) { idx++; where += ` AND d."DepartmentName" LIKE $${idx}`; params.push(`%${search}%`); }
    if (isActive !== undefined) { idx++; where += ` AND d."IsActive" = $${idx}`; params.push(isActive === 'true'); }
    if (companyId) { idx++; where += ` AND d."CompanyId" = $${idx}`; params.push(parseInt(companyId)); }
    idx++; const limitIdx = idx; params.push(parseInt(limit));
    idx++; const offsetIdx = idx; params.push(parseInt(offset));
    const result = await pgQuery(appPool,
      `SELECT d.*, (SELECT COUNT(*) FROM "Employees" e WHERE e."DepartmentId" = d."Id" AND e."IsActive" = true) AS "EmployeeCount" FROM "Departments" d ${where} ORDER BY d."DepartmentName" OFFSET $${offsetIdx} LIMIT $${limitIdx}`, params
    );
    const countResult = await pgQuery(appPool, `SELECT COUNT(*) AS total FROM "Departments" d ${where}`, params);
    res.json({ data: result.rows, total: parseInt(countResult.rows[0].total), limit: parseInt(limit), offset: parseInt(offset) });
  } catch (error) {
    console.error('Get Departments Error:', error);
    res.status(500).json({ message: 'Failed to fetch departments', error: error.message });
  }
};

const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { DepartmentName, IsActive } = req.body;
    await pgQuery(appPool,
      `UPDATE "Departments" SET "DepartmentName"=COALESCE($1,"DepartmentName"), "IsActive"=COALESCE($2,"IsActive") WHERE "Id"=$3`,
      [DepartmentName||null, IsActive !== undefined ? IsActive : null, parseInt(id)]
    );
    res.json({ message: 'Department updated' });
  } catch (error) {
    console.error('Update Department Error:', error);
    res.status(500).json({ message: 'Failed to update department', error: error.message });
  }
};

const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    await pgQuery(appPool, 'UPDATE "Departments" SET "IsActive"=false WHERE "Id"=$1', [parseInt(id)]);
    res.json({ message: 'Department deleted' });
  } catch (error) {
    console.error('Delete Department Error:', error);
    res.status(500).json({ message: 'Failed to delete department', error: error.message });
  }
};

// ==================== DESIGNATIONS ====================
const createDesignation = async (req, res) => {
  try {
    const { DesignationName, CompanyId } = req.body;
    if (!DesignationName) return res.status(400).json({ message: 'Designation name is required' });
    const result = await pgQuery(appPool,
      `INSERT INTO "Designations" ("DesignationName", "CompanyId") VALUES ($1, $2) RETURNING "Id"`,
      [DesignationName, CompanyId || null]
    );
    res.status(201).json({ message: 'Designation created', data: { Id: result.rows[0].Id, DesignationName } });
  } catch (error) {
    console.error('Create Designation Error:', error);
    res.status(500).json({ message: 'Failed to create designation', error: error.message });
  }
};

const getDesignations = async (req, res) => {
  try {
    const { limit = 50, offset = 0, search = '', companyId } = req.query;
    let where = 'WHERE des."IsActive" = true';
    const params = [];
    let idx = 0;
    if (search) { idx++; where += ` AND des."DesignationName" LIKE $${idx}`; params.push(`%${search}%`); }
    if (companyId) { idx++; where += ` AND des."CompanyId" = $${idx}`; params.push(parseInt(companyId)); }
    idx++; const limitIdx = idx; params.push(parseInt(limit));
    idx++; const offsetIdx = idx; params.push(parseInt(offset));
    const result = await pgQuery(appPool,
      `SELECT des.* FROM "Designations" des ${where} ORDER BY des."DesignationName" OFFSET $${offsetIdx} LIMIT $${limitIdx}`, params
    );
    const countResult = await pgQuery(appPool, `SELECT COUNT(*) AS total FROM "Designations" des ${where}`, params);
    res.json({ data: result.rows, total: parseInt(countResult.rows[0].total) });
  } catch (error) {
    console.error('Get Designations Error:', error);
    res.status(500).json({ message: 'Failed to fetch designations', error: error.message });
  }
};

const updateDesignation = async (req, res) => {
  try {
    const { id } = req.params;
    const { DesignationName, IsActive } = req.body;
    await pgQuery(appPool,
      `UPDATE "Designations" SET "DesignationName"=COALESCE($1,"DesignationName"), "IsActive"=COALESCE($2,"IsActive") WHERE "Id"=$3`,
      [DesignationName||null, IsActive !== undefined ? IsActive : null, parseInt(id)]
    );
    res.json({ message: 'Designation updated' });
  } catch (error) {
    console.error('Update Designation Error:', error);
    res.status(500).json({ message: 'Failed to update designation', error: error.message });
  }
};

const deleteDesignation = async (req, res) => {
  try {
    const { id } = req.params;
    await pgQuery(appPool, 'UPDATE "Designations" SET "IsActive"=false WHERE "Id"=$1', [parseInt(id)]);
    res.json({ message: 'Designation deleted' });
  } catch (error) {
    console.error('Delete Designation Error:', error);
    res.status(500).json({ message: 'Failed to delete designation', error: error.message });
  }
};

// ==================== EMPLOYEES ====================
const createEmployee = async (req, res) => {
  try {
    const { EmployeeCode, FirstName, LastName, Email, Phone, DepartmentId, DesignationId, CompanyId, BranchId, ReportingTo, DateOfJoining, DateOfBirth, Gender, Address, City, State, PinCode, BasicSalary } = req.body;
    if (!EmployeeCode || !FirstName || !LastName) return res.status(400).json({ message: 'EmployeeCode, FirstName, and LastName are required' });
    const result = await pgQuery(appPool,
      `INSERT INTO "Employees" ("EmployeeCode", "FirstName", "LastName", "Email", "Phone", "DepartmentId", "DesignationId", "CompanyId", "BranchId", "ReportingTo", "DateOfJoining", "DateOfBirth", "Gender", "Address", "City", "State", "PinCode", "BasicSalary") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING "Id"`,
      [EmployeeCode, FirstName, LastName, Email||null, Phone||null, DepartmentId||null, DesignationId||null, CompanyId||null, BranchId||null, ReportingTo||null, DateOfJoining||null, DateOfBirth||null, Gender||null, Address||null, City||null, State||null, PinCode||null, BasicSalary||null]
    );
    res.status(201).json({ message: 'Employee created', data: { Id: result.rows[0].Id, EmployeeCode, FirstName, LastName } });
  } catch (error) {
    console.error('Create Employee Error:', error);
    res.status(500).json({ message: 'Failed to create employee', error: error.message });
  }
};

const getEmployees = async (req, res) => {
  try {
    const { limit = 20, offset = 0, search = '', departmentId, designationId, companyId, isActive } = req.query;
    let where = 'WHERE e."IsActive" = true';
    const params = [];
    let idx = 0;
    if (search) { idx++; where += ` AND (e."FirstName" LIKE $${idx} OR e."LastName" LIKE $${idx} OR e."EmployeeCode" LIKE $${idx} OR e."Email" LIKE $${idx})`; params.push(`%${search}%`); }
    if (departmentId) { idx++; where += ` AND e."DepartmentId" = $${idx}`; params.push(parseInt(departmentId)); }
    if (designationId) { idx++; where += ` AND e."DesignationId" = $${idx}`; params.push(parseInt(designationId)); }
    if (companyId) { idx++; where += ` AND e."CompanyId" = $${idx}`; params.push(parseInt(companyId)); }
    if (isActive !== undefined) { idx++; where += ` AND e."IsActive" = $${idx}`; params.push(isActive === 'true'); }
    idx++; const limitIdx = idx; params.push(parseInt(limit));
    idx++; const offsetIdx = idx; params.push(parseInt(offset));
    const result = await pgQuery(appPool,
      `SELECT e.*, d."DepartmentName", des."DesignationName" FROM "Employees" e LEFT JOIN "Departments" d ON e."DepartmentId" = d."Id" LEFT JOIN "Designations" des ON e."DesignationId" = des."Id" ${where} ORDER BY e."FirstName" OFFSET $${offsetIdx} LIMIT $${limitIdx}`, params
    );
    const countResult = await pgQuery(appPool, `SELECT COUNT(*) AS total FROM "Employees" e ${where}`, params);
    res.json({ data: result.rows, total: parseInt(countResult.rows[0].total), limit: parseInt(limit), offset: parseInt(offset) });
  } catch (error) {
    console.error('Get Employees Error:', error);
    res.status(500).json({ message: 'Failed to fetch employees', error: error.message });
  }
};

const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pgQuery(appPool,
      `SELECT e.*, d."DepartmentName", des."DesignationName" FROM "Employees" e LEFT JOIN "Departments" d ON e."DepartmentId" = d."Id" LEFT JOIN "Designations" des ON e."DesignationId" = des."Id" WHERE e."Id" = $1`,
      [parseInt(id)]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Employee not found' });
    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Get Employee Error:', error);
    res.status(500).json({ message: 'Failed to fetch employee', error: error.message });
  }
};

const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const fields = ['EmployeeCode','FirstName','LastName','Email','Phone','DepartmentId','DesignationId','CompanyId','BranchId','ReportingTo','DateOfJoining','DateOfBirth','Gender','Address','City','State','PinCode','BasicSalary','IsActive'];
    const setClauses = [];
    const params = [];
    let idx = 0;
    for (const field of fields) {
      if (req.body[field] !== undefined) {
        idx++;
        setClauses.push(`"${field}" = $${idx}`);
        params.push(req.body[field]);
      }
    }
    if (setClauses.length === 0) return res.status(400).json({ message: 'No fields to update' });
    setClauses.push('"UpdatedAt" = NOW()');
    idx++;
    params.push(parseInt(id));
    await pgQuery(appPool, `UPDATE "Employees" SET ${setClauses.join(', ')} WHERE "Id" = $${idx}`, params);
    res.json({ message: 'Employee updated' });
  } catch (error) {
    console.error('Update Employee Error:', error);
    res.status(500).json({ message: 'Failed to update employee', error: error.message });
  }
};

const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    await pgQuery(appPool, 'UPDATE "Employees" SET "IsActive"=false, "UpdatedAt"=NOW() WHERE "Id"=$1', [parseInt(id)]);
    res.json({ message: 'Employee deleted' });
  } catch (error) {
    console.error('Delete Employee Error:', error);
    res.status(500).json({ message: 'Failed to delete employee', error: error.message });
  }
};

module.exports = { createDepartment, getDepartments, updateDepartment, deleteDepartment, createDesignation, getDesignations, updateDesignation, deleteDesignation, createEmployee, getEmployees, getEmployeeById, updateEmployee, deleteEmployee };