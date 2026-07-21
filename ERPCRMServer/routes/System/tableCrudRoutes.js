const express = require("express");
const { verifyAccessToken } = require("../../middlewares/authMiddleware");
const {
  listTables,
  getTableMeta,
  listRows,
  getRowById,
  createRow,
  updateRow,
  deleteRow,
} = require("../../controllers/System/tableCrudController");

const router = express.Router();

router.use(verifyAccessToken);

router.get("/tables", listTables);
router.get("/tables/:tableName/meta", getTableMeta);
router.get("/tables/:tableName/rows", listRows);
router.get("/tables/:tableName/rows/:id", getRowById);
router.post("/tables/:tableName/rows", createRow);
router.put("/tables/:tableName/rows/:id", updateRow);
router.delete("/tables/:tableName/rows/:id", deleteRow);

module.exports = router;
