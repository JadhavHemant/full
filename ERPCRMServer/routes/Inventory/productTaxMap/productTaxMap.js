const express = require("express");

const router = express.Router();

const {

    createProductTaxMap,

    updateProductTaxMap,

    softDeleteProductTaxMap,

    hardDeleteProductTaxMap,

    getProductTaxMapById,

    getAllProductTaxMaps

} = require("../../../controllers/InventoryApis/productTaxMap.controller");
 
// Create ProductTaxMap

router.post("/", createProductTaxMap);
 
// Update ProductTaxMap by Id

router.put("/:id", updateProductTaxMap);
 
// Soft Delete ProductTaxMap by Id

router.patch("/soft-delete/:id", softDeleteProductTaxMap);
 
// Hard Delete ProductTaxMap by Id

router.delete("/hard-delete/:id", hardDeleteProductTaxMap);
 
// Get ProductTaxMap by Id

router.get("/:id", getProductTaxMapById);
 
// Get All ProductTaxMaps (with pagination)

router.get("/", getAllProductTaxMaps);
 
module.exports = router;

 