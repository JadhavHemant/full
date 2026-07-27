const { appPool } = require("../../config/db");

const createCurrency = async (req, res) => {
  try {
    const { companyId, code, name, symbol, isBaseCurrency, decimalPlaces } = req.body;
    const userId = req.user?.UserId;
    if (!code || !name) return res.status(400).json({ message: "Code and Name are required" });
    if (isBaseCurrency) await appPool.query(`UPDATE "Currencies" SET "IsBaseCurrency" = false WHERE "CompanyId" = $1`, [companyId]);
    const result = await appPool.query(
      `INSERT INTO "Currencies" ("CompanyId","Code","Name","Symbol","IsBaseCurrency","DecimalPlaces","CreatedBy","UpdatedBy") VALUES ($1,$2,$3,$4,$5,$6,$7,$7) RETURNING *`,
      [companyId, code.toUpperCase(), name, symbol || null, isBaseCurrency || false, decimalPlaces || 2, userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating currency:", error);
    res.status(500).json({ message: "Failed to create currency", error: error.message });
  }
};

const getCurrencies = async (req, res) => {
  try {
    const { companyId, isActive } = req.query;
    let query = `SELECT * FROM "Currencies" WHERE 1=1`;
    const params = [];
    if (companyId) { query += ` AND "CompanyId" = $${params.length + 1}`; params.push(companyId); }
    if (isActive !== undefined) { query += ` AND "IsActive" = $${params.length + 1}`; params.push(isActive === 'true'); }
    query += ` ORDER BY "IsBaseCurrency" DESC, "Code" ASC`;
    const result = await appPool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching currencies:", error);
    res.status(500).json({ message: "Failed to fetch currencies", error: error.message });
  }
};

const updateExchangeRate = async (req, res) => {
  try {
    const { companyId, fromCurrencyId, toCurrencyId, rate, date } = req.body;
    const userId = req.user?.UserId;
    const result = await appPool.query(
      `INSERT INTO "ExchangeRates" ("CompanyId","FromCurrencyId","ToCurrencyId","Rate","Date","CreatedBy") VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT ("FromCurrencyId","ToCurrencyId","Date") DO UPDATE SET "Rate" = $4 RETURNING *`,
      [companyId, fromCurrencyId, toCurrencyId, rate, date || new Date().toISOString().split('T')[0], userId]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating exchange rate:", error);
    res.status(500).json({ message: "Failed to update exchange rate", error: error.message });
  }
};

const convertCurrency = async (req, res) => {
  try {
    const { fromCurrencyId, toCurrencyId, amount, date } = req.query;
    const result = await appPool.query(
      `SELECT "Rate" FROM "ExchangeRates" WHERE "FromCurrencyId" = $1 AND "ToCurrencyId" = $2 AND "Date" <= $3 ORDER BY "Date" DESC LIMIT 1`,
      [fromCurrencyId, toCurrencyId, date || new Date().toISOString().split('T')[0]]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "No exchange rate found" });
    const convertedAmount = parseFloat(amount) * parseFloat(result.rows[0].Rate);
    res.json({ fromCurrencyId, toCurrencyId, amount: parseFloat(amount), rate: result.rows[0].Rate, convertedAmount });
  } catch (error) {
    console.error("Error converting currency:", error);
    res.status(500).json({ message: "Failed to convert currency", error: error.message });
  }
};

module.exports = { createCurrency, getCurrencies, updateExchangeRate, convertCurrency };