const express = require("express");
const router = express.Router();
const { verifyAccessToken } = require("../../../middlewares/authMiddleware");
const { createAccount, getAccounts, createJournalEntry, getJournalEntries, postJournalEntry, getTrialBalance } = require("../../../controllers/InventoryApis/accountingController");

router.use(verifyAccessToken);

// Chart of Accounts
router.post("/chart", createAccount);
router.get("/chart", getAccounts);

// Journal Entries
router.post("/journal", createJournalEntry);
router.get("/journal", getJournalEntries);
router.post("/journal/:id/post", postJournalEntry);

// Trial Balance
router.get("/trial-balance", getTrialBalance);

module.exports = router;