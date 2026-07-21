const { appPool } = require('../../../config/db');
const { getAutomationConfig } = require('./config');

/**
 * Opportunity automation: stage change handling, stale opportunity detection.
 */

/**
 * Handle opportunity stage change: update probability, timestamps, and auto-create quote if won.
 */
const handleStageChange = async (opportunityId, newStageId, changedBy) => {
  // Get the stage details
  const stageResult = await appPool.query(
    `SELECT "Id", "StageName", "IsWon", "IsLost", "Probability", "SortOrder"
     FROM "SalesStages"
     WHERE "Id" = $1 LIMIT 1`,
    [newStageId]
  );

  if (stageResult.rows.length === 0) {
    throw new Error('Invalid sales stage');
  }

  const stage = stageResult.rows[0];

  // Get current opportunity
  const oppResult = await appPool.query(
    `SELECT * FROM "Opportunities" WHERE "Id" = $1 LIMIT 1`,
    [opportunityId]
  );

  if (oppResult.rows.length === 0) {
    throw new Error('Opportunity not found');
  }

  const opportunity = oppResult.rows[0];
  const beforeData = { ...opportunity };

  // Build update object
  const updates = {
    Probability: stage.Probability || 0,
    UpdatedAt: new Date(),
  };

  // Handle won stage
  if (stage.IsWon) {
    updates.Status = 'Won';
    updates.WonAt = new Date();
  }

  // Handle lost stage
  if (stage.IsLost) {
    updates.Status = 'Lost';
    updates.LostAt = new Date();
  }

  // Update opportunity
  const setClause = Object.keys(updates)
    .map((key, idx) => `"${key}" = $${idx + 2}`)
    .join(', ');

  const values = [opportunityId, ...Object.values(updates)];

  await appPool.query(
    `UPDATE "Opportunities" SET ${setClause} WHERE "Id" = $1`,
    values
  );

  // Auto-create quote if won
  if (stage.IsWon) {
    await createQuoteFromWonOpportunity(opportunity, changedBy);
  }

  // Write audit event
  await writeAudit({
    eventType: 'opportunity.stage_changed',
    entityType: 'Opportunity',
    entityId: opportunityId,
    before: beforeData,
    after: { ...opportunity, ...updates },
    triggeredBy: changedBy,
  });

  return { opportunity: { ...opportunity, ...updates }, stage };
};

/**
 * Create a draft quote from a won opportunity.
 */
const createQuoteFromWonOpportunity = async (opportunity, createdBy) => {
  const config = await getAutomationConfig(opportunity.CompanyId);
  if (!config.wonOpportunityAutoQuote?.enabled) return null;

  // Get opportunity products
  const productsResult = await appPool.query(
    `SELECT * FROM "OpportunityProducts" WHERE "OpportunityId" = $1 AND "IsDeleted" = FALSE`,
    [opportunity.Id]
  );

  const subtotal = productsResult.rows.reduce(
    (sum, p) => sum + (Number(p.Quantity) * Number(p.UnitPrice)),
    0
  );

  // Generate quote number
  const quoteNumber = `QT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Date.now()).slice(-6)}`;

  // Create quote
  const quoteResult = await appPool.query(
    `INSERT INTO "Quotes" ("QuoteNumber", "OpportunityId", "AccountId", "ContactId", "Subtotal", "TaxAmount", "TotalAmount", "Status", "CreatedBy", "CreatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
     RETURNING *`,
    [
      quoteNumber,
      opportunity.Id,
      opportunity.AccountId,
      opportunity.ContactId,
      subtotal,
      0, // TODO: calculate tax
      subtotal,
      'Draft',
      createdBy,
    ]
  );

  const quote = quoteResult.rows[0];

  // Insert quote line items from opportunity products
  for (const product of productsResult.rows) {
    await appPool.query(
      `INSERT INTO "QuoteItems" ("QuoteId", "ProductId", "Quantity", "UnitPrice", "TotalPrice")
       VALUES ($1, $2, $3, $4, $5)`,
      [
        quote.Id,
        product.ProductId,
        product.Quantity,
        product.UnitPrice,
        Number(product.Quantity) * Number(product.UnitPrice),
      ]
    );
  }

  // Notify configured users
  const notifyUserIds = config.wonOpportunityAutoQuote?.notifyUserIds || [];
  if (notifyUserIds.length > 0) {
    for (const userId of notifyUserIds) {
      await appPool.query(
        `INSERT INTO "Notifications" ("CompanyId", "UserId", "Title", "Message", "Type", "Severity", "EntityType", "EntityId", "CreatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          opportunity.CompanyId,
          userId,
          'New Quote Created',
          `Quote ${quoteNumber} has been auto-created from won opportunity #${opportunity.Id}`,
          'QUOTE_CREATED',
          'info',
          'Quote',
          quote.Id,
        ]
      );
    }
  }

  return quote;
};

/**
 * Check for stale open opportunities and notify assigned users.
 */
const checkStaleOpportunities = async () => {
  const companiesResult = await appPool.query(
    `SELECT DISTINCT "CompanyId" FROM "Companies" WHERE "IsActive" = TRUE AND "IsDelete" = FALSE`
  );

  const results = [];

  for (const company of companiesResult.rows) {
    const config = await getAutomationConfig(company.CompanyId);
    if (!config.opportunityStaleCheck?.enabled) continue;

    const staleDays = config.opportunityStaleCheck.staleDays || 10;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - staleDays);

    // Find stale opportunities
    const staleOpps = await appPool.query(
      `
      SELECT o.*, u."Name" AS "AssignedToName", u."Email" AS "AssignedToEmail"
      FROM "Opportunities" o
      LEFT JOIN "Users" u ON u."UserId" = o."AssignedTo"
      WHERE o."CompanyId" = $1
        AND o."Status" = 'Open'
        AND (
          o."EstCloseDate" < $2
          OR (
            o."UpdatedAt" < $2
            AND NOT EXISTS (
              SELECT 1 FROM "Activities" a
              WHERE a."Type" = 'Opportunity'
                AND a."OpportunityId" = o."Id"
                AND a."CreatedAt" >= $2
            )
          )
        )
      `,
      [company.CompanyId, cutoffDate]
    );

    for (const opp of staleOpps.rows) {
      // Notify assigned user
      if (opp.AssignedTo) {
        await appPool.query(
          `INSERT INTO "Notifications" ("CompanyId", "UserId", "Title", "Message", "Type", "Severity", "EntityType", "EntityId", "CreatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
          [
            opp.CompanyId,
            opp.AssignedTo,
            'Stale Opportunity Alert',
            `Opportunity #${opp.Id} has been open for ${staleDays}+ days without recent activity`,
            'STALE_OPPORTUNITY',
            'warning',
            'Opportunity',
            opp.Id,
          ]
        );
      }

      results.push(opp);
    }
  }

  return results;
};

/**
 * Write an audit event.
 */
const writeAudit = async ({ eventType, entityType, entityId, before, after, triggeredBy }) => {
  await appPool.query(
    `INSERT INTO "AuditEvents" ("EventType", "EntityType", "EntityId", "BeforeData", "AfterData", "TriggeredBy", "CreatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [eventType, entityType, entityId, JSON.stringify(before || {}), JSON.stringify(after || {}), triggeredBy || 'system']
  );
};

module.exports = {
  handleStageChange,
  createQuoteFromWonOpportunity,
  checkStaleOpportunities,
};