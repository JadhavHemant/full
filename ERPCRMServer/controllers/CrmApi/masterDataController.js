const { createCrudController } = require("./crmCrudFactory");

const taskTypeController = createCrudController({
  tableName: "TaskTypes",
  fields: ["Name", "DefaultDurationMinutes", "CreatedBy", "UpdatedBy", "IsActive", "IsDeleted"],
  searchColumns: ['t."Name"'],
  orderBy: 't."Id" DESC',
  defaultFilters: ['COALESCE(t."IsDeleted", FALSE) = FALSE'],
  touchUpdatedAt: true,
});

const salesStageController = createCrudController({
  tableName: "SalesStages",
  fields: ["Name", "SortOrder", "IsWon", "IsLost", "CreatedBy", "UpdatedBy", "IsActive", "IsDeleted"],
  searchColumns: ['t."Name"'],
  orderBy: 'COALESCE(t."SortOrder", 0) ASC, t."Name" ASC',
  defaultFilters: ['t."IsDeleted" = FALSE'],
  touchUpdatedAt: true,
});

const industryController = createCrudController({
  tableName: "Industries",
  fields: ["Name", "CreatedBy", "UpdatedBy", "IsActive", "IsDeleted"],
  searchColumns: ['t."Name"'],
  defaultFilters: ['t."IsDeleted" = FALSE'],
  touchUpdatedAt: true,
});

const followupTypeController = createCrudController({
  tableName: "FollowupTypes",
  fields: ["Name", "CreatedBy", "UpdatedBy", "IsActive", "IsDeleted"],
  searchColumns: ['t."Name"'],
  defaultFilters: ['t."IsDeleted" = FALSE'],
  touchUpdatedAt: true,
});

const leadSourceController = createCrudController({
  tableName: "LeadSources",
  fields: ["Name", "CreatedBy", "UpdatedBy", "IsActive", "IsDeleted"],
  searchColumns: ['t."Name"'],
  defaultFilters: ['COALESCE(t."IsDeleted", FALSE) = FALSE'],
  touchUpdatedAt: true,
});

module.exports = {
  taskTypeController,
  salesStageController,
  industryController,
  followupTypeController,
  leadSourceController,
};
