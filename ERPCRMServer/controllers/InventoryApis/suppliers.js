// controllers/InventoryApis/suppliers.js
const { appPool } = require("../../config/db");

// helper: simple validation
const validateSupplierPayload = (payload, isUpdate = false) => {
  const errors = [];
  const {
    Name,
    ContactPerson,
    Email,
    Phone,
    Address,
    City,
    State,
    Country,
    PostalCode,
  } = payload;

  if (!isUpdate) {
    if (!Name || typeof Name !== "string" || !Name.trim()) {
      errors.push("Name is required.");
    }
  }

  if (Email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(Email)) {
    errors.push("Email format is invalid.");
  }

  if (Phone && Phone.length > 20) {
    errors.push("Phone must be at most 20 characters.");
  }

  return { errors, cleaned: { Name, ContactPerson, Email, Phone, Address, City, State, Country, PostalCode } };
};

// helper: check unique email/phone (per company optional)
const checkUniqueSupplierContact = async ({ Email, Phone, excludeId = null }) => {
  const conditions = [];
  const values = [];
  let index = 1;

  if (Email) {
    conditions.push(`"Email" = $${index++}`);
    values.push(Email);
  }
  if (Phone) {
    conditions.push(`"Phone" = $${index++}`);
    values.push(Phone);
  }

  if (!conditions.length) return null;

  let query = `
    SELECT "Id", "Name", "Email", "Phone"
    FROM "Suppliers"
    WHERE (${conditions.join(" OR ")})
  `;

  if (excludeId) {
    query += ` AND "Id" <> $${index}`;
    values.push(excludeId);
  }

  const { rows } = await appPool.query(query, values);
  return rows[0] || null;
};

// Create Supplier
const createSupplier = async (req, res) => {
  const { errors, cleaned } = validateSupplierPayload(req.body, false);
  if (errors.length) {
    return res.status(400).json({ message: "Validation failed", errors });
  }

  const { Name, ContactPerson, Email, Phone, Address, City, State, Country, PostalCode } = cleaned;

  try {
    // unique constraint on Email/Phone (optional behavior)
    const existing = await checkUniqueSupplierContact({ Email, Phone });
    if (existing) {
      return res.status(409).json({
        message: "Supplier with same email or phone already exists",
        existing,
      });
    }

    const query = `
      INSERT INTO "Suppliers"
        ("Name", "ContactPerson", "Email", "Phone", "Address", "City", "State", "Country", "PostalCode")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;

    const { rows } = await appPool.query(query, [
      Name,
      ContactPerson,
      Email,
      Phone,
      Address,
      City,
      State,
      Country,
      PostalCode,
    ]);

    return res.status(201).json(rows[0]);
  } catch (error) {
    console.error("Error creating Supplier:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Update Supplier by Id
const updateSupplier = async (req, res) => {
  const { id } = req.params;

  const { errors, cleaned } = validateSupplierPayload(req.body, true);
  if (errors.length) {
    return res.status(400).json({ message: "Validation failed", errors });
  }

  const {
    Name,
    ContactPerson,
    Email,
    Phone,
    Address,
    City,
    State,
    Country,
    PostalCode,
  } = cleaned;
  const { IsActive } = req.body;

  try {
    // check unique on update
    const existing = await checkUniqueSupplierContact({ Email, Phone, excludeId: id });
    if (existing) {
      return res.status(409).json({
        message: "Supplier with same email or phone already exists",
        existing,
      });
    }

    const query = `
      UPDATE "Suppliers"
      SET
        "Name" = COALESCE($1, "Name"),
        "ContactPerson" = COALESCE($2, "ContactPerson"),
        "Email" = COALESCE($3, "Email"),
        "Phone" = COALESCE($4, "Phone"),
        "Address" = COALESCE($5, "Address"),
        "City" = COALESCE($6, "City"),
        "State" = COALESCE($7, "State"),
        "Country" = COALESCE($8, "Country"),
        "PostalCode" = COALESCE($9, "PostalCode"),
        "IsActive" = COALESCE($10, "IsActive")
      WHERE "Id" = $11
      RETURNING *;
    `;

    const { rows } = await appPool.query(query, [
      Name,
      ContactPerson,
      Email,
      Phone,
      Address,
      City,
      State,
      Country,
      PostalCode,
      typeof IsActive === "boolean" ? IsActive : null,
      id,
    ]);

    if (!rows.length) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    return res.json(rows[0]);
  } catch (error) {
    console.error("Error updating Supplier:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Soft Delete Supplier by Id (set IsActive = false)
const softDeleteSupplier = async (req, res) => {
  const { id } = req.params;

  const query = `
    UPDATE "Suppliers"
    SET "IsActive" = false
    WHERE "Id" = $1
    RETURNING *;
  `;

  try {
    const { rows } = await appPool.query(query, [id]);
    if (!rows.length) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    return res.json({ message: "Soft deleted successfully", record: rows[0] });
  } catch (error) {
    console.error("Error soft deleting Supplier:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Hard Delete Supplier by Id
const hardDeleteSupplier = async (req, res) => {
  const { id } = req.params;

  const query = `DELETE FROM "Suppliers" WHERE "Id" = $1 RETURNING *;`;

  try {
    const { rows } = await appPool.query(query, [id]);
    if (!rows.length) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    return res.json({ message: "Hard deleted successfully", record: rows[0] });
  } catch (error) {
    console.error("Error hard deleting Supplier:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get Supplier by Id
const getSupplierById = async (req, res) => {
  const { id } = req.params;

  const query = `SELECT * FROM "Suppliers" WHERE "Id" = $1 LIMIT 1;`;

  try {
    const { rows } = await appPool.query(query, [id]);
    if (!rows.length) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    return res.json(rows[0]);
  } catch (error) {
    console.error("Error fetching Supplier by Id:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get All Suppliers with Pagination, filtering and sorting
const getAllSuppliers = async (req, res) => {
  let {
    limit = 10,
    offset = 0,
    isActive,       // "true" | "false" | undefined
    search,         // text search on name/contact/email
    sortBy = "CreatedAt", // column
    sortOrder = "DESC",   // ASC | DESC
  } = req.query;

  limit = Number(limit);
  offset = Number(offset);
  if (Number.isNaN(limit) || limit <= 0 || limit > 100) limit = 10;
  if (Number.isNaN(offset) || offset < 0) offset = 0;

  // allowlisted sort columns
  const sortableColumns = new Set(["Id", "Name", "CreatedAt"]);
  if (!sortableColumns.has(sortBy)) sortBy = "CreatedAt";
  sortOrder = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

  const filters = [];
  const values = [];
  let idx = 1;

  if (typeof isActive !== "undefined") {
    filters.push(`"IsActive" = $${idx++}`);
    values.push(isActive === "true");
  }

  if (search && search.trim()) {
    filters.push(`(
      LOWER("Name") LIKE $${idx} OR
      LOWER("ContactPerson") LIKE $${idx} OR
      LOWER("Email") LIKE $${idx}
    )`);
    values.push(`%${search.toLowerCase()}%`);
    idx++;
  }

  const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  const dataQuery = `
    SELECT *
    FROM "Suppliers"
    ${whereClause}
    ORDER BY "${sortBy}" ${sortOrder}
    LIMIT $${idx} OFFSET $${idx + 1};
  `;
  values.push(limit, offset);

  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM "Suppliers"
    ${whereClause};
  `;

  try {
    const [dataResult, countResult] = await Promise.all([
      appPool.query(dataQuery, values),
      appPool.query(countQuery, values.slice(0, idx - 1)),
    ]);

    return res.json({
      data: dataResult.rows,
      pagination: {
        total: countResult.rows[0].total,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error("Error fetching all Suppliers:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  createSupplier,
  updateSupplier,
  softDeleteSupplier,
  hardDeleteSupplier,
  getSupplierById,
  getAllSuppliers,
};
