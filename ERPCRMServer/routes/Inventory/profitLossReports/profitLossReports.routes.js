const express = require("express");

const router = express.Router();

const {

    createProfitLossReport,

    updateProfitLossReport,

    softDeleteProfitLossReport,

    hardDeleteProfitLossReport,

    getProfitLossReportById,

    getAllProfitLossReports

} = require("../../../controllers/InventoryApis/profitLossReportscontroller");
 
// Create ProfitLossReport

router.post("/", createProfitLossReport);
 
// Update ProfitLossReport by Id

router.put("/:id", updateProfitLossReport);
 
// Soft Delete ProfitLossReport by Id

router.patch("/soft-delete/:id", softDeleteProfitLossReport);
 
// Hard Delete ProfitLossReport by Id

router.delete("/hard-delete/:id", hardDeleteProfitLossReport);
 
// Get ProfitLossReport by Id

router.get("/:id", getProfitLossReportById);
 
// Get All ProfitLossReports (with pagination)

router.get("/", getAllProfitLossReports);
 
module.exports = router;

 