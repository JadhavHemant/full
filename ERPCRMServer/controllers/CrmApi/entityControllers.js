const { createCrudController } = require("./crmCrudFactory");
const {
  applyOpportunityCloseLifecycle,
  ensureOpportunityForQualifiedLead,
  withAutoCreatedParties,
  withLinkedContactAccount,
} = require("./crmAutoCreate");

const accountController = createCrudController({
  entityType: "Account",
  tableName: "Accounts",
  fields: [
    "CompanyId",
    "Name",
    "Website",
    "Description",
    "IndustryId",
    "AnnualRevenue",
    "EmployeeCount",
    "AccountOwnerId",
    "CreatedBy",
    "UpdatedBy",
    "IsActive",
    "IsDeleted",
    "Flag",
  ],
  searchColumns: ['a."Name"', 'a."Website"', 'i."Name"', 'ao."Name"'],
  alias: "a",
  joins: `
    LEFT JOIN "Industries" i ON i."Id" = a."IndustryId"
    LEFT JOIN "Users" ao ON ao."UserId" = a."AccountOwnerId"
  `,
  selectColumns: ['a.*', 'i."Name" AS "IndustryName"', 'ao."Name" AS "AccountOwnerName"'],
  defaultFilters: ['a."IsDeleted" = FALSE'],
  accessControl: { ownerColumns: ["CreatedBy", "AccountOwnerId"] },
  touchUpdatedAt: true,
});

const contactController = createCrudController({
  entityType: "Contact",
  tableName: "Contacts",
  fields: [
    "CompanyId",
    "AccountId",
    "FirstName",
    "MiddleName",
    "LastName",
    "Email",
    "Phone",
    "AltPhone",
    "LinkedinUrl",
    "Title",
    "AssignedTo",
    "CreatedBy",
    "UpdatedBy",
    "IsActive",
    "IsDeleted",
    "Flag",
  ],
  searchColumns: ['c."FirstName"', 'c."LastName"', 'c."Email"', 'c."Phone"'],
  alias: "c",
  joins: 'LEFT JOIN "Accounts" a ON a."Id" = c."AccountId"',
  selectColumns: ['c.*', 'a."Name" AS "AccountName"'],
  defaultFilters: ['c."IsDeleted" = FALSE'],
  accessControl: { ownerColumns: ["CreatedBy", "AssignedTo"] },
  beforeCreate: ({ payload, client }) => withLinkedContactAccount({ payload, client }),
  touchUpdatedAt: true,
});

const leadController = createCrudController({
  entityType: "Lead",
  tableName: "Leads",
  fields: [
    "CompanyId",
    "AccountId",
    "ContactId",
    "LeadSourceId",
    "ProductCategoryId",
    "FollowupTypeId",
    "IndustryId",
    "ProspectAccountName",
    "ProspectAccountWebsite",
    "ProspectContactFirstName",
    "ProspectContactLastName",
    "ProspectContactEmail",
    "ProspectContactPhone",
    "ProspectContactTitle",
    "Status",
    "Rating",
    "ProgressPercentage",
    "FollowUpDate",
    "ExpectedValue",
    "ConvertedAt",
    "LostReason",
    "Description",
    "Comments",
    "AssignedTo",
    "AssignedFrom",
    "CreatedBy",
    "UpdatedBy",
    "IsActive",
    "IsDeleted",
    "Flag",
  ],
  searchColumns: ['a."Name"', 'co."FirstName"', 'co."LastName"', 'l."Status"', 'l."Description"'],
  alias: "l",
  joins: `
    LEFT JOIN "Accounts" a ON a."Id" = l."AccountId"
    LEFT JOIN "Contacts" co ON co."Id" = l."ContactId"
    LEFT JOIN "LeadSources" ls ON ls."Id" = l."LeadSourceId"
    LEFT JOIN "Users" assigned_to_user ON assigned_to_user."UserId" = l."AssignedTo"
    LEFT JOIN "Users" assigned_from_user ON assigned_from_user."UserId" = l."AssignedFrom"
    LEFT JOIN "Users" created_by_user ON created_by_user."UserId" = l."CreatedBy"
    LEFT JOIN "Users" updated_by_user ON updated_by_user."UserId" = l."UpdatedBy"
  `,
  selectColumns: [
    'l.*',
    'a."Name" AS "AccountName"',
    `TRIM(COALESCE(co."FirstName", '') || ' ' || COALESCE(co."LastName", '')) AS "ContactName"`,
    'ls."Name" AS "LeadSourceName"',
    'assigned_to_user."Name" AS "AssignedToName"',
    'assigned_from_user."Name" AS "AssignedFromName"',
    'created_by_user."Name" AS "CreatedByName"',
    'updated_by_user."Name" AS "UpdatedByName"',
    `(
      SELECT o1."Id"
      FROM "Opportunities" o1
      WHERE o1."LeadId" = l."Id" AND COALESCE(o1."IsDeleted", FALSE) = FALSE
      ORDER BY o1."Id" ASC
      LIMIT 1
    ) AS "ConvertedOpportunityId"`,
    `(
      SELECT o1."OpportunityName"
      FROM "Opportunities" o1
      WHERE o1."LeadId" = l."Id" AND COALESCE(o1."IsDeleted", FALSE) = FALSE
      ORDER BY o1."Id" ASC
      LIMIT 1
    ) AS "ConvertedOpportunityName"`,
  ],
  defaultFilters: ['l."IsDeleted" = FALSE'],
  accessControl: { ownerColumns: ["CreatedBy", "AssignedTo", "AssignedFrom"] },
  beforeUpdate: ({ payload, existingRecord, client }) =>
    ensureOpportunityForQualifiedLead({
      payload,
      existingRecord,
      client,
    }),
  touchUpdatedAt: true,
  augmentListQuery: async ({ req, alias, values, conditions }) => {
    if (req.query.lifecycleScope === "active" && !req.query.status) {
      const firstIndex = values.push("Qualified");
      const secondIndex = values.push("Disqualified");
      conditions.push(
        `${alias}."Status" NOT IN ($${firstIndex}, $${secondIndex})`
      );
    }

    return { values, conditions };
  },
});

const opportunityController = createCrudController({
  entityType: "Opportunity",
  tableName: "Opportunities",
  fields: [
    "CompanyId",
    "LeadId",
    "AccountId",
    "ContactId",
    "OpportunityName",
    "SalesStageId",
    "LeadSourceId",
    "ProductCategoryId",
    "IndustryId",
    "BudgetAmount",
    "EstCloseDate",
    "Probability",
    "ProgressPercentage",
    "Description",
    "QualificationComments",
    "DetailedSummary",
    "WonAt",
    "LostAt",
    "Status",
    "CloseReason",
    "AssignedTo",
    "AssignedFrom",
    "CreatedBy",
    "UpdatedBy",
    "IsActive",
    "IsDeleted",
    "Flag",
  ],
  searchColumns: ['o."OpportunityName"', 'a."Name"', 's."Name"', 'o."Description"', 'o."Status"'],
  alias: "o",
  joins: `
    LEFT JOIN "Accounts" a ON a."Id" = o."AccountId"
    LEFT JOIN "Contacts" c ON c."Id" = o."ContactId"
    LEFT JOIN "SalesStages" s ON s."Id" = o."SalesStageId"
  `,
  selectColumns: [
    'o.*',
    'a."Name" AS "AccountName"',
    `TRIM(COALESCE(c."FirstName", '') || ' ' || COALESCE(c."LastName", '')) AS "ContactName"`,
    's."Name" AS "SalesStageName"',
  ],
  defaultFilters: ['o."IsDeleted" = FALSE'],
  accessControl: { ownerColumns: ["CreatedBy", "AssignedTo", "AssignedFrom"] },
  beforeCreate: async ({ payload, client }) => {
    const enrichedPayload = await withAutoCreatedParties({
      payload,
      client,
      fallbackAccountName: payload.AutoAccountName || payload.OpportunityName,
    });

    return applyOpportunityCloseLifecycle({
      payload: enrichedPayload,
      existingRecord: {},
    });
  },
  beforeUpdate: ({ payload, existingRecord }) =>
    applyOpportunityCloseLifecycle({
      payload,
      existingRecord,
    }),
  touchUpdatedAt: true,
  augmentListQuery: async ({ req, alias, values, conditions }) => {
    if (req.query.lifecycleScope === "active" && !req.query.status) {
      const statusIndex = values.push("Open");
      conditions.push(`COALESCE(${alias}."Status", 'Open') = $${statusIndex}`);
    }

    return { values, conditions };
  },
});

const opportunityProductController = createCrudController({
  entityType: "OpportunityProduct",
  tableName: "OpportunityProducts",
  fields: [
    "CompanyId",
    "OpportunityId",
    "ProductId",
    "Quantity",
    "UnitPrice",
    "DiscountPct",
    "TaxPct",
    "Notes",
    "CreatedBy",
    "UpdatedBy",
    "IsActive",
    "IsDeleted",
    "Flag",
  ],
  searchColumns: ['o."OpportunityName"', 'p."ProductName"', 'op."Notes"'],
  alias: "op",
  joins: `
    LEFT JOIN "Opportunities" o ON o."Id" = op."OpportunityId"
    LEFT JOIN "Products" p ON p."Id" = op."ProductId"
  `,
  selectColumns: [
    'op.*',
    'o."OpportunityName"',
    'p."ProductName"',
    'p."ProductCode"',
  ],
  defaultFilters: ['op."IsDeleted" = FALSE'],
  accessControl: { ownerColumns: ["CreatedBy"] },
  touchUpdatedAt: true,
});

const activityController = createCrudController({
  entityType: "Activity",
  tableName: "Activities",
  fields: [
    "CompanyId",
    "LeadId",
    "AccountId",
    "ContactId",
    "OpportunityId",
    "Type",
    "Subject",
    "Description",
    "DueDate",
    "Status",
    "Priority",
    "AssignedTo",
    "ReminderAt",
    "CreatedBy",
    "UpdatedBy",
    "IsActive",
    "IsDeleted",
    "Flag",
  ],
  searchColumns: ['ac."Subject"', 'ac."Description"', 'ac."Type"', 'ac."Status"', 'ac."Priority"'],
  alias: "ac",
  joins: `
    LEFT JOIN "Leads" l ON l."Id" = ac."LeadId"
    LEFT JOIN "Accounts" a ON a."Id" = ac."AccountId"
    LEFT JOIN "Contacts" c ON c."Id" = ac."ContactId"
    LEFT JOIN "Opportunities" o ON o."Id" = ac."OpportunityId"
  `,
  selectColumns: [
    'ac.*',
    'l."Status" AS "LeadStatus"',
    'a."Name" AS "AccountName"',
    `TRIM(COALESCE(c."FirstName", '') || ' ' || COALESCE(c."LastName", '')) AS "ContactName"`,
    'o."OpportunityName"',
  ],
  defaultFilters: ['ac."IsDeleted" = FALSE'],
  accessControl: { ownerColumns: ["CreatedBy", "AssignedTo"] },
  touchUpdatedAt: true,
});

const quoteController = createCrudController({
  entityType: "Quote",
  tableName: "Quotes",
  fields: [
    "CompanyId",
    "QuoteNumber",
    "AccountId",
    "ContactId",
    "OpportunityId",
    "ValidTillDate",
    "Status",
    "Subtotal",
    "DiscountAmount",
    "TaxAmount",
    "TotalAmount",
    "TermsAndConditions",
    "Notes",
    "CreatedBy",
    "UpdatedBy",
    "IsActive",
    "IsDeleted",
    "Flag",
  ],
  searchColumns: ['q."QuoteNumber"', 'a."Name"', 'o."OpportunityName"', 'q."Status"'],
  alias: "q",
  joins: `
    LEFT JOIN "Accounts" a ON a."Id" = q."AccountId"
    LEFT JOIN "Contacts" c ON c."Id" = q."ContactId"
    LEFT JOIN "Opportunities" o ON o."Id" = q."OpportunityId"
  `,
  selectColumns: [
    'q.*',
    'a."Name" AS "AccountName"',
    `TRIM(COALESCE(c."FirstName", '') || ' ' || COALESCE(c."LastName", '')) AS "ContactName"`,
    'o."OpportunityName"',
  ],
  defaultFilters: ['q."IsDeleted" = FALSE'],
  accessControl: { ownerColumns: ["CreatedBy"] },
  touchUpdatedAt: true,
});

const invoiceController = createCrudController({
  entityType: "Invoice",
  tableName: "Invoices",
  fields: [
    "CompanyId",
    "InvoiceNumber",
    "AccountId",
    "OpportunityId",
    "QuoteId",
    "Subtotal",
    "TaxAmount",
    "TotalAmount",
    "PaymentStatus",
    "PaymentMethod",
    "DueDate",
    "GeneratedDate",
    "Notes",
    "CreatedBy",
    "UpdatedBy",
    "IsActive",
    "IsDeleted",
    "Flag",
  ],
  searchColumns: ['i."InvoiceNumber"', 'a."Name"', 'o."OpportunityName"', 'i."PaymentStatus"'],
  alias: "i",
  joins: `
    LEFT JOIN "Accounts" a ON a."Id" = i."AccountId"
    LEFT JOIN "Opportunities" o ON o."Id" = i."OpportunityId"
    LEFT JOIN "Quotes" q ON q."Id" = i."QuoteId"
  `,
  selectColumns: [
    'i.*',
    'a."Name" AS "AccountName"',
    'o."OpportunityName"',
    'q."QuoteNumber"',
  ],
  defaultFilters: ['i."IsDeleted" = FALSE'],
  accessControl: { ownerColumns: ["CreatedBy"] },
  touchUpdatedAt: true,
});

const paymentController = createCrudController({
  entityType: "Payment",
  tableName: "Payments",
  fields: [
    "CompanyId",
    "InvoiceId",
    "Amount",
    "PaymentDate",
    "PaymentMethod",
    "ReferenceNumber",
    "Status",
    "Notes",
    "CreatedBy",
    "UpdatedBy",
    "IsActive",
    "IsDeleted",
    "Flag",
  ],
  searchColumns: ['p."ReferenceNumber"', 'p."PaymentMethod"', 'p."Status"', 'i."InvoiceNumber"'],
  alias: "p",
  joins: 'LEFT JOIN "Invoices" i ON i."Id" = p."InvoiceId"',
  selectColumns: ['p.*', 'i."InvoiceNumber"'],
  defaultFilters: ['p."IsDeleted" = FALSE'],
  accessControl: { ownerColumns: ["CreatedBy"] },
  touchUpdatedAt: true,
});

const retentionController = createCrudController({
  entityType: "Retention",
  tableName: "Retentions",
  fields: [
    "CompanyId",
    "AccountId",
    "ContactId",
    "OpportunityId",
    "Type",
    "Status",
    "NextActionDate",
    "ReminderDate",
    "Notes",
    "AssignedTo",
    "CreatedBy",
    "UpdatedBy",
    "IsActive",
    "IsDeleted",
    "Flag",
  ],
  searchColumns: ['r."Type"', 'r."Status"', 'a."Name"', 'o."OpportunityName"'],
  alias: "r",
  joins: `
    LEFT JOIN "Accounts" a ON a."Id" = r."AccountId"
    LEFT JOIN "Contacts" c ON c."Id" = r."ContactId"
    LEFT JOIN "Opportunities" o ON o."Id" = r."OpportunityId"
  `,
  selectColumns: [
    'r.*',
    'a."Name" AS "AccountName"',
    `TRIM(COALESCE(c."FirstName", '') || ' ' || COALESCE(c."LastName", '')) AS "ContactName"`,
    'o."OpportunityName"',
  ],
  defaultFilters: ['r."IsDeleted" = FALSE'],
  accessControl: { ownerColumns: ["CreatedBy", "AssignedTo"] },
  touchUpdatedAt: true,
});

const presalesController = createCrudController({
  entityType: "Presale",
  tableName: "Presales",
  fields: [
    "CompanyId",
    "LeadId",
    "OpportunityId",
    "ClientName",
    "RelatedTo",
    "StartDate",
    "EndDate",
    "ETA",
    "DurationMinutes",
    "Status",
    "Hyperscaler",
    "FollowUpTriggerStatus",
    "TaskTypeId",
    "Documents",
    "DetailedSummary",
    "Description",
    "Comments",
    "AssignedTo",
    "AssignedFrom",
    "CreatedBy",
    "UpdatedBy",
    "IsActive",
    "IsDeleted",
    "Flag",
  ],
  searchColumns: ['p."ClientName"', 'p."RelatedTo"', 'tt."Name"', 'p."Status"'],
  alias: "p",
  joins: 'LEFT JOIN "TaskTypes" tt ON tt."Id" = p."TaskTypeId"',
  selectColumns: ['p.*', 'tt."Name" AS "TaskTypeName"'],
  defaultFilters: ['p."IsDeleted" = FALSE'],
  accessControl: { ownerColumns: ["CreatedBy", "AssignedTo", "AssignedFrom"] },
  touchUpdatedAt: true,
});

const caseController = createCrudController({
  entityType: "Case",
  tableName: "Cases",
  fields: [
    "CompanyId",
    "AccountId",
    "ContactId",
    "LeadId",
    "OpportunityId",
    "Subject",
    "Status",
    "Priority",
    "Description",
    "Resolution",
    "AssignedTo",
    "AssignedFrom",
    "CreatedBy",
    "UpdatedBy",
    "IsActive",
    "IsDeleted",
    "Flag",
  ],
  searchColumns: ['cs."Subject"', 'cs."Status"', 'cs."Priority"'],
  alias: "cs",
  defaultFilters: ['cs."IsDeleted" = FALSE'],
  accessControl: { ownerColumns: ["CreatedBy", "AssignedTo", "AssignedFrom"] },
  touchUpdatedAt: true,
});

module.exports = {
  accountController,
  contactController,
  leadController,
  opportunityController,
  opportunityProductController,
  activityController,
  quoteController,
  invoiceController,
  paymentController,
  retentionController,
  presalesController,
  caseController,
};
