const { createCrudRouter } = require("./createCrudRouter");
const {
  taskTypeController,
  salesStageController,
  industryController,
  followupTypeController,
  leadSourceController,
} = require("../../controllers/CrmApi/masterDataController");

module.exports = {
  taskTypeRoutes: createCrudRouter(taskTypeController),
  salesStageRoutes: createCrudRouter(salesStageController),
  industryRoutes: createCrudRouter(industryController),
  followupTypeRoutes: createCrudRouter(followupTypeController),
  leadSourceRoutes: createCrudRouter(leadSourceController),
};
