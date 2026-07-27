const { appPool } = require("../../config/db");

const createAccount = async (req, res) => {
  try {
    const { companyId, accountCode, accountName, accountType, parentAccountId, isHeader, openingBalance, currencyId } = req.body;
    const userId = req.user?.UserId;
    if (!accountCode || !accountName || !accountType) return res.status(400).json({ message: "AccountCode, AccountName, AccountType required" });
    const result = await appPool.query(
      `INSERT INTO "ChartOfAccounts" ("CompanyId","AccountCode","AccountName","AccountType","ParentAccountId","IsHeader","OpeningBalance","CurrencyId","CreatedBy","UpdatedBy")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9) RETURNING *`,
      [companyId, accountCode, accountName, accountType, parentAccountId||null, isHeader||false, openingBalance||0, currencyId||null, userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating account:", error);
    res.status(500).json({ message: "Failed to create account", error: error.message });
  }
};

const getAccounts = async (req, res) => {
  try {
    const { companyId, accountType, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let query = `SELECT * FROM "ChartOfAccounts" WHERE "IsDeleted" = false`;
    const params = [];
    if (companyId) { query += ` AND "CompanyId" = $${params.length + 1}`; params.push(companyId); }
    if (accountType) { query += ` AND "AccountType" = $${params.length + 1}`; params.push(accountType); }
    query += ` ORDER BY "AccountCode" ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    const result = await appPool.query(query, params);
    res.json({ data: result.rows, total: result.rows.length });
  } catch (error) {
    console.error("Error fetching accounts:", error);
    res.status(500).json({ message: "Failed to fetch accounts", error: error.message });
  }
};

const createJournalEntry = async (req, res) => {
  try {
    const { companyId, entryDate, referenceType, referenceId, description, lines, financialYearId } = req.body;
    const userId = req.user?.UserId;
    if (!lines || lines.length < 2) return res.status(400).json({ message: "At least 2 journal lines required" });
    let totalDebit = 0, totalCredit = 0;
    for (const line of lines) { totalDebit += parseFloat(line.debit||0); totalCredit += parseFloat(line.credit||0); }
    if (Math.abs(totalDebit - totalCredit) > 0.01) return res.status(400).json({ message: "Debit and Credit must balance" });
    const entryNumber = `JE-${Date.now()}`;
    const result = await appPool.query(
      `INSERT INTO "JournalEntry" ("CompanyId","EntryNumber","EntryDate","ReferenceType","ReferenceId","Description","TotalDebit","TotalCredit","FinancialYearId","CreatedBy","UpdatedBy")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10) RETURNING *`,
      [companyId, entryNumber, entryDate||new Date(), referenceType||null, referenceId||null, description||null, totalDebit, totalCredit, financialYearId||null, userId]
    );
    const entryId = result.rows[0].Id;
    for (const line of lines) {
      await appPool.query(
        `INSERT INTO "JournalEntryLine" ("JournalEntryId","AccountId","Debit","Credit","Description") VALUES ($1,$2,$3,$4,$5)`,
        [entryId, line.accountId, line.debit||0, line.credit||0, line.description||null]
      );
      await appPool.query(`UPDATE "ChartOfAccounts" SET "CurrentBalance" = "CurrentBalance" + $1 - $2 WHERE "Id" = $3`, [line.debit||0, line.credit||0, line.accountId]);
    }
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating journal entry:", error);
    res.status(500).json({ message: "Failed to create journal entry", error: error.message });
  }
};

const getJournalEntries = async (req, res) => {
  try {
    const { companyId, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    let query = `SELECT je.* FROM "JournalEntry" je WHERE je."IsDeleted" = false`;
    if (companyId) { query += ` AND je."CompanyId" = $${params.length + 1}`; params.push(companyId); }
    query += ` ORDER BY je."EntryDate" DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    const result = await appPool.query(query, params);
    // Fetch lines for each entry
    for (const entry of result.rows) {
      const lines = await appPool.query(`SELECT * FROM "JournalEntryLine" WHERE "JournalEntryId" = $1`, [entry.Id]);
      entry.Lines = lines.rows;
    }
    res.json({ data: result.rows, total: result.rows.length });
  } catch (error) {
    console.error("Error fetching journal entries:", error);
    res.status(500).json({ message: "Failed to fetch journal entries", error: error.message });
  }
};

const postJournalEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.UserId;
    const result = await appPool.query(
      `UPDATE "JournalEntry" SET "IsPosted" = true, "PostedAt" = CURRENT_TIMESTAMP, "PostedBy" = $1, "UpdatedBy" = $1 WHERE "Id" = $2 RETURNING *`,
      [userId, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Journal entry not found" });
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error posting journal entry:", error);
    res.status(500).json({ message: "Failed to post journal entry", error: error.message });
  }
};

const getTrialBalance = async (req, res) => {
  try {
    const { companyId } = req.query;
    const result = await appPool.query(
      `SELECT coa."AccountCode", coa."AccountName", coa."AccountType", coa."OpeningBalance",
              COALESCE(SUM(jel."Debit"), 0) as "TotalDebit", COALESCE(SUM(jel."Credit"), 0) as "TotalCredit",
              (coa."OpeningBalance" + COALESCE(SUM(jel."Debit"), 0) - COALESCE(SUM(jel."Credit"), 0)) as "Balance"
       FROM "ChartOfAccounts" coa
       LEFT JOIN "JournalEntryLine" jel ON coa."Id" = jel."AccountId"
       LEFT JOIN "JournalEntry" je ON jel."JournalEntryId" = je."Id" AND je."IsPosted" = true
       WHERE coa."IsDeleted" = false ${companyId ? `AND coa."CompanyId" = $1` : ''}
       GROUP BY coa."Id", coa."AccountCode", coa."AccountName", coa."AccountType", coa."OpeningBalance"
       ORDER BY coa."AccountCode" ASC`,
      companyId ? [companyId] : []
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching trial balance:", error);
    res.status(500).json({ message: "Failed to fetch trial balance", error: error.message });
  }
};

module.exports = { createAccount, getAccounts, createJournalEntry, getJournalEntries, postJournalEntry, getTrialBalance };