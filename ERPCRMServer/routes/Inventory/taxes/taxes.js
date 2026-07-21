const express = require("express");

const router = express.Router();

const {

    createTax,

    updateTax,

    softDeleteTax,

    hardDeleteTax,

    getTaxById,

    getAllTaxes

} = require("../../../controllers/InventoryApis/taxes");
 
// Create Tax

router.post("/", createTax);
 
// Update Tax by Id

router.put("/:id", updateTax);
 
// Soft Delete Tax by Id

router.patch("/soft-delete/:id", softDeleteTax);
 
// Hard Delete Tax by Id

router.delete("/hard-delete/:id", hardDeleteTax);
 
// Get Tax by Id

router.get("/:id", getTaxById);
 
// Get All Taxes (with pagination)

router.get("/", getAllTaxes);
 
module.exports = router;

 