const assert = require("assert");

const { verifyAccessToken } = require("../middlewares/authMiddleware");
const { createCrudController } = require("../controllers/CrmApi/crmCrudFactory");

assert.strictEqual(typeof verifyAccessToken, "function", "verifyAccessToken should be exported");
assert.strictEqual(typeof createCrudController, "function", "createCrudController should be exported");

console.log("Server smoke test passed");
