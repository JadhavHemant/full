const { appPool } = require("../config/db");

const accountNames = [
  "Northwind Distribution Pvt Ltd",
  "Apex Industrial Components",
  "BluePeak Retail Ventures",
  "Skyline Healthcare Supplies",
  "GreenField Agri Systems",
  "Vertex Office Interiors",
  "UrbanNest Projects",
  "Sunrise Mobility Services",
];

const contactFirstNames = ["Aarav", "Isha", "Rahul", "Neha", "Vikram", "Pooja", "Karan", "Meera"];
const contactLastNames = ["Sharma", "Patel", "Reddy", "Kapoor", "Nair", "Joshi", "Singh", "Gupta"];
const cities = ["Pune", "Mumbai", "Bengaluru", "Hyderabad", "Chennai", "Delhi", "Ahmedabad", "Jaipur"];
const states = ["Maharashtra", "Maharashtra", "Karnataka", "Telangana", "Tamil Nadu", "Delhi", "Gujarat", "Rajasthan"];

const leadDetails = [
  {
    status: "New",
    rating: 5,
    description: "Inbound enquiry from operations head looking for a 3-month pilot rollout with 25 users.",
    comments: [
      "Initial discovery call completed. Buyer wants a phased rollout with weekly progress updates.",
      "Shared proposal summary and asked for current process documents before the next demo.",
    ],
  },
  {
    status: "Qualified",
    rating: 4,
    description: "Referral lead from an existing customer evaluating replacement of manual reporting workflows.",
    comments: [
      "Confirmed budget range and implementation timeline for the next quarter.",
      "Technical reviewer requested API capability notes and deployment checklist.",
    ],
  },
  {
    status: "Disqualified",
    rating: 2,
    description: "Prospect postponed the project because the internal team is frozen until the next financial year.",
    comments: [
      "Lead parked for later follow-up after budget approval cycle.",
      "No immediate action required beyond a quarterly check-in email.",
    ],
  },
];

const opportunityDetails = [
  {
    name: "Regional rollout expansion",
    description: "Expansion deal covering sales, service, and reporting workflows for three branches.",
    qualificationComments: "Decision maker identified. Commercial review scheduled after final technical validation.",
    summary: "Opportunity is in active evaluation with clear urgency and a confirmed success metric.",
    comments: [
      "Commercial proposal shared with branch-wise license split.",
      "Customer asked for onboarding plan and change-management support details.",
    ],
  },
  {
    name: "Q3 process automation program",
    description: "Customer wants to automate follow-ups, approvals, and status visibility across teams.",
    qualificationComments: "Strong sponsor from operations. Procurement expects a final commercial by month end.",
    summary: "Good win probability if integration questions are answered within this cycle.",
    comments: [
      "Mapped current workflow gaps and documented approval bottlenecks.",
      "Next step is a stakeholder demo with department heads and IT.",
    ],
  },
];

const presalesDetails = [
  {
    clientName: "Enterprise discovery workshop",
    description: "Detailed workshop to validate scope, risk areas, integrations, and rollout sequence.",
    comments: [
      "Captured current-state process map and ownership matrix.",
      "Draft solution note prepared for the technical sign-off session.",
    ],
  },
  {
    clientName: "Solution fitment review",
    description: "Presales engagement focused on data migration complexity and phased adoption planning.",
    comments: [
      "Reviewed master data quality and identified cleanup dependencies.",
      "Customer requested sample migration output before the commercial closure.",
    ],
  },
];

const caseDetails = [
  {
    subject: "Escalation on delayed response",
    description: "Customer reported delayed turnaround on support callbacks for priority tickets.",
    resolution: "Created a priority queue, reassigned the owner, and shared the revised SLA matrix.",
    comments: [
      "Customer acknowledged the revised support process and escalation contact.",
      "Monitoring for two weeks before closing the case fully.",
    ],
  },
  {
    subject: "Incorrect report totals",
    description: "Finance team noticed mismatched totals between exported reports and dashboard values.",
    resolution: "Reproduced the issue with the sample dataset and shared a corrected report configuration.",
    comments: [
      "Validated the corrected totals with the finance coordinator.",
      "Raised an internal follow-up item to prevent the same export mismatch.",
    ],
  },
];

const activityDetails = [
  {
    subject: "Follow-up review call",
    description: "Scheduled call to review implementation blockers and next ownership steps.",
  },
  {
    subject: "Commercial proposal review",
    description: "Meeting to review commercials, payment milestones, and approval dependencies.",
  },
];

const quoteNotes = [
  "Quote prepared for the negotiated scope with separate onboarding and annual support line items.",
  "Discount applied based on multi-team subscription and annual payment commitment.",
];

const invoiceNotes = [
  "Invoice raised after customer approval of milestone one deliverables.",
  "Payment reminder shared with accounts contact along with supporting documents.",
];

const paymentNotes = [
  "Payment received against milestone billing and reconciled with the finance team.",
  "Reference collected from bank transfer confirmation shared by the customer.",
];

const retentionNotes = [
  "Account health review planned to keep adoption steady across the implementation teams.",
  "Renewal follow-up aligned with quarterly business review and customer success check-in.",
];

const toDetail = (list, index) => list[index % list.length];

const insertCommentsForEntity = async (client, entityType, entityId, userId, comments) => {
  if (!comments?.length) {
    return;
  }

  for (const commentText of comments) {
    await client.query(
      `
        INSERT INTO "Comments" ("EntityType", "EntityId", "CommentText", "CommentedBy", "CreatedAt")
        VALUES ($1, $2, $3, $4, NOW() - (random() * INTERVAL '10 days'));
      `,
      [entityType, entityId, commentText, userId || null]
    );
  }
};

const insertAuditEvent = async (client, companyId, userId, entityType, entityId, action, afterData) => {
  await client.query(
    `
      INSERT INTO "AuditEvents" (
        "CompanyId", "UserId", "EventType", "Action", "EntityType", "EntityId", "AfterData", "CreatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW() - (random() * INTERVAL '10 days'));
    `,
    [companyId || null, userId || null, `${entityType}.${action}`, action, entityType, entityId, JSON.stringify(afterData || {})]
  );
};

const main = async () => {
  const client = await appPool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`DELETE FROM "Comments" WHERE "EntityType" IN ('Lead', 'Opportunity', 'Presale', 'Case', 'Activity', 'Quote', 'Invoice', 'Payment', 'Retention');`);
    await client.query(`DELETE FROM "AuditEvents" WHERE "EntityType" IN ('Lead', 'Opportunity', 'Presale', 'Case', 'Activity', 'Quote', 'Invoice', 'Payment', 'Retention');`);

    const { rows: accountRows } = await client.query(`SELECT "Id", "CreatedBy" FROM "Accounts" ORDER BY "Id";`);
    for (const [index, row] of accountRows.entries()) {
      const name = `${toDetail(accountNames, index)} ${index + 1}`;
      await client.query(
        `
          UPDATE "Accounts"
          SET "Name" = $1,
              "Website" = $2,
              "Description" = $3,
              "UpdatedBy" = COALESCE("UpdatedBy", "CreatedBy")
          WHERE "Id" = $4;
        `,
        [
          name,
          `https://www.${name.toLowerCase().replace(/[^a-z0-9]+/g, "")}.com`,
          `Strategic account focused on improving visibility, coordination, and response times across business teams in ${toDetail(cities, index)}.`,
          row.Id,
        ]
      );
    }

    const { rows: contactRows } = await client.query(`SELECT "Id", "CreatedBy" FROM "Contacts" ORDER BY "Id";`);
    for (const [index, row] of contactRows.entries()) {
      const firstName = toDetail(contactFirstNames, index);
      const lastName = toDetail(contactLastNames, index);
      await client.query(
        `
          UPDATE "Contacts"
          SET "FirstName" = $1,
              "LastName" = $2,
              "Email" = $3,
              "Phone" = $4,
              "Title" = $5,
              "UpdatedBy" = COALESCE("UpdatedBy", "CreatedBy")
          WHERE "Id" = $6;
        `,
        [
          firstName,
          lastName,
          `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index + 1}@examplecrm.in`,
          `98${String(10000000 + index).slice(-8)}`,
          index % 2 === 0 ? "Operations Manager" : "Business Head",
          row.Id,
        ]
      );
    }

    const { rows: leadRows } = await client.query(`SELECT "Id", "CompanyId", "CreatedBy" FROM "Leads" ORDER BY "Id";`);
    for (const [index, row] of leadRows.entries()) {
      const detail = toDetail(leadDetails, index);
      await client.query(
        `
          UPDATE "Leads"
          SET "Status" = $1,
              "Rating" = $2,
              "Description" = $3,
              "Comments" = $4,
              "UpdatedBy" = COALESCE("UpdatedBy", "CreatedBy")
          WHERE "Id" = $5;
        `,
        [detail.status, detail.rating, detail.description, detail.comments[0], row.Id]
      );
      await insertCommentsForEntity(client, "Lead", row.Id, row.CreatedBy, detail.comments);
      await insertAuditEvent(client, row.CompanyId, row.CreatedBy, "Lead", row.Id, "update", detail);
    }

    const { rows: opportunityRows } = await client.query(`SELECT "Id", "CompanyId", "CreatedBy" FROM "Opportunities" ORDER BY "Id";`);
    for (const [index, row] of opportunityRows.entries()) {
      const detail = toDetail(opportunityDetails, index);
      await client.query(
        `
          UPDATE "Opportunities"
          SET "OpportunityName" = $1,
              "Description" = $2,
              "QualificationComments" = $3,
              "DetailedSummary" = $4,
              "UpdatedBy" = COALESCE("UpdatedBy", "CreatedBy")
          WHERE "Id" = $5;
        `,
        [detail.name, detail.description, detail.qualificationComments, detail.summary, row.Id]
      );
      await insertCommentsForEntity(client, "Opportunity", row.Id, row.CreatedBy, detail.comments);
      await insertAuditEvent(client, row.CompanyId, row.CreatedBy, "Opportunity", row.Id, "update", detail);
    }

    const { rows: presalesRows } = await client.query(`SELECT "Id", "CompanyId", "CreatedBy" FROM "Presales" ORDER BY "Id";`);
    for (const [index, row] of presalesRows.entries()) {
      const detail = toDetail(presalesDetails, index);
      await client.query(
        `
          UPDATE "Presales"
          SET "ClientName" = $1,
              "Description" = $2,
              "Comments" = $3,
              "DetailedSummary" = $4,
              "UpdatedBy" = COALESCE("UpdatedBy", "CreatedBy")
          WHERE "Id" = $5;
        `,
        [detail.clientName, detail.description, detail.comments[0], `${detail.description} Scope and assumptions documented for the next customer review.`, row.Id]
      );
      await insertCommentsForEntity(client, "Presale", row.Id, row.CreatedBy, detail.comments);
      await insertAuditEvent(client, row.CompanyId, row.CreatedBy, "Presale", row.Id, "update", detail);
    }

    const { rows: caseRows } = await client.query(`SELECT "Id", "CompanyId", "CreatedBy" FROM "Cases" ORDER BY "Id";`);
    for (const [index, row] of caseRows.entries()) {
      const detail = toDetail(caseDetails, index);
      await client.query(
        `
          UPDATE "Cases"
          SET "Subject" = $1,
              "Description" = $2,
              "Resolution" = $3,
              "UpdatedBy" = COALESCE("UpdatedBy", "CreatedBy")
          WHERE "Id" = $4;
        `,
        [detail.subject, detail.description, detail.resolution, row.Id]
      );
      await insertCommentsForEntity(client, "Case", row.Id, row.CreatedBy, detail.comments);
      await insertAuditEvent(client, row.CompanyId, row.CreatedBy, "Case", row.Id, "update", detail);
    }

    const { rows: activityRows } = await client.query(`SELECT "Id", "CompanyId", "CreatedBy" FROM "Activities" ORDER BY "Id";`);
    for (const [index, row] of activityRows.entries()) {
      const detail = toDetail(activityDetails, index);
      await client.query(
        `
          UPDATE "Activities"
          SET "Subject" = $1,
              "Description" = $2,
              "UpdatedBy" = COALESCE("UpdatedBy", "CreatedBy")
          WHERE "Id" = $3;
        `,
        [detail.subject, detail.description, row.Id]
      );
      await insertAuditEvent(client, row.CompanyId, row.CreatedBy, "Activity", row.Id, "update", detail);
    }

    const { rows: quoteRows } = await client.query(`SELECT "Id", "CompanyId", "CreatedBy" FROM "Quotes" ORDER BY "Id";`);
    for (const [index, row] of quoteRows.entries()) {
      const note = toDetail(quoteNotes, index);
      await client.query(
        `
          UPDATE "Quotes"
          SET "Notes" = $1,
              "TermsAndConditions" = $2,
              "UpdatedBy" = COALESCE("UpdatedBy", "CreatedBy")
          WHERE "Id" = $3;
        `,
        [note, "Commercial validity: 15 days. Implementation starts after purchase order and kickoff sign-off.", row.Id]
      );
      await insertCommentsForEntity(client, "Quote", row.Id, row.CreatedBy, [note]);
      await insertAuditEvent(client, row.CompanyId, row.CreatedBy, "Quote", row.Id, "update", { note });
    }

    const { rows: invoiceRows } = await client.query(`SELECT "Id", "CompanyId", "CreatedBy" FROM "Invoices" ORDER BY "Id";`);
    for (const [index, row] of invoiceRows.entries()) {
      const note = toDetail(invoiceNotes, index);
      await client.query(
        `UPDATE "Invoices" SET "Notes" = $1, "UpdatedBy" = COALESCE("UpdatedBy", "CreatedBy") WHERE "Id" = $2;`,
        [note, row.Id]
      );
      await insertCommentsForEntity(client, "Invoice", row.Id, row.CreatedBy, [note]);
      await insertAuditEvent(client, row.CompanyId, row.CreatedBy, "Invoice", row.Id, "update", { note });
    }

    const { rows: paymentRows } = await client.query(`SELECT "Id", "CompanyId", "CreatedBy" FROM "Payments" ORDER BY "Id";`);
    for (const [index, row] of paymentRows.entries()) {
      const note = toDetail(paymentNotes, index);
      await client.query(
        `UPDATE "Payments" SET "Notes" = $1, "UpdatedBy" = COALESCE("UpdatedBy", "CreatedBy") WHERE "Id" = $2;`,
        [note, row.Id]
      );
      await insertCommentsForEntity(client, "Payment", row.Id, row.CreatedBy, [note]);
      await insertAuditEvent(client, row.CompanyId, row.CreatedBy, "Payment", row.Id, "update", { note });
    }

    const { rows: retentionRows } = await client.query(`SELECT "Id", "CompanyId", "CreatedBy" FROM "Retentions" ORDER BY "Id";`);
    for (const [index, row] of retentionRows.entries()) {
      const note = toDetail(retentionNotes, index);
      await client.query(
        `UPDATE "Retentions" SET "Notes" = $1, "UpdatedBy" = COALESCE("UpdatedBy", "CreatedBy") WHERE "Id" = $2;`,
        [note, row.Id]
      );
      await insertCommentsForEntity(client, "Retention", row.Id, row.CreatedBy, [note]);
      await insertAuditEvent(client, row.CompanyId, row.CreatedBy, "Retention", row.Id, "update", { note });
    }

    await client.query("COMMIT");
    console.log("CRM demo data refreshed with realistic details, comments, and history.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to refresh CRM demo data:", error);
    process.exitCode = 1;
  } finally {
    client.release();
    await appPool.end();
  }
};

main();
