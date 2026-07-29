const express = require("express");
const router = express.Router();
const { verifyAccessToken } = require("../../../middlewares/authMiddleware");
const {
  createPutawayTask, getPutawayTasks, completePutawayTask, deletePutawayTask,
  createPickingList, getPickingLists, getPickingListById, confirmPicking, deletePickingList,
  createCycleCount, getCycleCounts, getCycleCountById, recordCountResult, deleteCycleCount,
} = require("../../../controllers/InventoryApis/wmsController");

// ── Putaway ────────────────────────────────────────────────────────────────────
router.get("/putaway",               verifyAccessToken, getPutawayTasks);
router.post("/putaway",              verifyAccessToken, createPutawayTask);
router.put("/putaway/:id/complete",  verifyAccessToken, completePutawayTask);
router.delete("/putaway/:id",        verifyAccessToken, deletePutawayTask);

// ── Picking Lists ──────────────────────────────────────────────────────────────
router.get("/picking",               verifyAccessToken, getPickingLists);
router.post("/picking",              verifyAccessToken, createPickingList);
router.get("/picking/:id",           verifyAccessToken, getPickingListById);
router.post("/picking/:id/confirm",  verifyAccessToken, confirmPicking);
router.delete("/picking/:id",        verifyAccessToken, deletePickingList);

// ── Cycle Count ────────────────────────────────────────────────────────────────
router.get("/cycle-count",           verifyAccessToken, getCycleCounts);
router.post("/cycle-count",          verifyAccessToken, createCycleCount);
router.get("/cycle-count/:id",       verifyAccessToken, getCycleCountById);
router.post("/cycle-count/:id/record", verifyAccessToken, recordCountResult);
router.delete("/cycle-count/:id",    verifyAccessToken, deleteCycleCount);

module.exports = router;
