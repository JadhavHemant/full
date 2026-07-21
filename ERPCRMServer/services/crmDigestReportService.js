const { appPool } = require("../config/db");
const { sendEmail, isEmailConfigured } = require("../utils/email");
const { logAuditEvent } = require("../utils/auditEvents");

const REPORT_MODULES = [
  {
    key: "lead",
    label: "Leads",
    sheetPrefix: "Leads",
    query: `
      SELECT
        l."Id",
        COALESCE(NULLIF(l."Status", ''), 'Unspecified') AS "ReportStatus",
        a."Name" AS "AccountName",
        TRIM(COALESCE(c."FirstName", '') || ' ' || COALESCE(c."LastName", '')) AS "ContactName",
        cb."Name" AS "CreatedByName",
        ato."Name" AS "AssignedToName",
        af."Name" AS "AssignedFromName",
        l."Rating",
        l."ProgressPercentage",
        l."ExpectedValue",
        l."FollowUpDate",
        l."ConvertedAt",
        l."LostReason",
        l."Description",
        l."Comments",
        l."IsActive",
        l."CreatedAt",
        l."UpdatedAt"
      FROM "Leads" l
      LEFT JOIN "Accounts" a ON a."Id" = l."AccountId"
      LEFT JOIN "Contacts" c ON c."Id" = l."ContactId"
      LEFT JOIN "Users" cb ON cb."UserId" = l."CreatedBy"
      LEFT JOIN "Users" ato ON ato."UserId" = l."AssignedTo"
      LEFT JOIN "Users" af ON af."UserId" = l."AssignedFrom"
      WHERE l."CompanyId" = $1
        AND l."IsDeleted" = FALSE
        AND COALESCE(l."UpdatedAt", l."CreatedAt") >= $2
        AND COALESCE(l."UpdatedAt", l."CreatedAt") < $3
      ORDER BY "ReportStatus" ASC, l."Id" ASC;
    `,
    columns: [
      ["Id", "Id"],
      ["Status", "ReportStatus"],
      ["Account", "AccountName"],
      ["Contact", "ContactName"],
      ["Rating", "Rating"],
      ["Progress %", "ProgressPercentage"],
      ["Expected Value", "ExpectedValue"],
      ["Follow Up", "FollowUpDate"],
      ["Converted At", "ConvertedAt"],
      ["Lost Reason", "LostReason"],
      ["Description", "Description"],
      ["Comments", "Comments"],
      ["Assigned To", "AssignedToName"],
      ["Assigned From", "AssignedFromName"],
      ["Created By", "CreatedByName"],
      ["Active", "IsActive"],
      ["Created At", "CreatedAt"],
      ["Updated At", "UpdatedAt"],
    ],
  },
  {
    key: "opportunity",
    label: "Opportunities",
    sheetPrefix: "Opps",
    query: `
      SELECT
        o."Id",
        COALESCE(NULLIF(s."Name", ''), 'Unstaged') AS "ReportStatus",
        o."OpportunityName",
        a."Name" AS "AccountName",
        TRIM(COALESCE(c."FirstName", '') || ' ' || COALESCE(c."LastName", '')) AS "ContactName",
        cb."Name" AS "CreatedByName",
        ato."Name" AS "AssignedToName",
        af."Name" AS "AssignedFromName",
        o."BudgetAmount",
        o."Probability",
        o."ProgressPercentage",
        o."EstCloseDate",
        o."WonAt",
        o."LostAt",
        o."CloseReason",
        o."Description",
        o."QualificationComments",
        o."DetailedSummary",
        o."IsActive",
        o."CreatedAt",
        o."UpdatedAt"
      FROM "Opportunities" o
      LEFT JOIN "Accounts" a ON a."Id" = o."AccountId"
      LEFT JOIN "Contacts" c ON c."Id" = o."ContactId"
      LEFT JOIN "SalesStages" s ON s."Id" = o."SalesStageId"
      LEFT JOIN "Users" cb ON cb."UserId" = o."CreatedBy"
      LEFT JOIN "Users" ato ON ato."UserId" = o."AssignedTo"
      LEFT JOIN "Users" af ON af."UserId" = o."AssignedFrom"
      WHERE o."CompanyId" = $1
        AND o."IsDeleted" = FALSE
        AND COALESCE(o."UpdatedAt", o."CreatedAt") >= $2
        AND COALESCE(o."UpdatedAt", o."CreatedAt") < $3
      ORDER BY "ReportStatus" ASC, o."Id" ASC;
    `,
    columns: [
      ["Id", "Id"],
      ["Stage", "ReportStatus"],
      ["Opportunity", "OpportunityName"],
      ["Account", "AccountName"],
      ["Contact", "ContactName"],
      ["Budget", "BudgetAmount"],
      ["Probability %", "Probability"],
      ["Progress %", "ProgressPercentage"],
      ["Est Close", "EstCloseDate"],
      ["Won At", "WonAt"],
      ["Lost At", "LostAt"],
      ["Close Reason", "CloseReason"],
      ["Description", "Description"],
      ["Qualification", "QualificationComments"],
      ["Summary", "DetailedSummary"],
      ["Assigned To", "AssignedToName"],
      ["Assigned From", "AssignedFromName"],
      ["Created By", "CreatedByName"],
      ["Active", "IsActive"],
      ["Created At", "CreatedAt"],
      ["Updated At", "UpdatedAt"],
    ],
  },
  {
    key: "presale",
    label: "Presales",
    sheetPrefix: "Presales",
    query: `
      SELECT
        p."Id",
        COALESCE(NULLIF(p."Status", ''), 'Unspecified') AS "ReportStatus",
        p."ClientName",
        p."RelatedTo",
        tt."Name" AS "TaskTypeName",
        cb."Name" AS "CreatedByName",
        ato."Name" AS "AssignedToName",
        af."Name" AS "AssignedFromName",
        p."StartDate",
        p."EndDate",
        p."ETA",
        p."DurationMinutes",
        p."Hyperscaler",
        p."FollowUpTriggerStatus",
        p."DetailedSummary",
        p."Description",
        p."Comments",
        p."IsActive",
        p."CreatedAt",
        p."UpdatedAt"
      FROM "Presales" p
      LEFT JOIN "TaskTypes" tt ON tt."Id" = p."TaskTypeId"
      LEFT JOIN "Users" cb ON cb."UserId" = p."CreatedBy"
      LEFT JOIN "Users" ato ON ato."UserId" = p."AssignedTo"
      LEFT JOIN "Users" af ON af."UserId" = p."AssignedFrom"
      WHERE p."CompanyId" = $1
        AND p."IsDeleted" = FALSE
        AND COALESCE(p."UpdatedAt", p."CreatedAt") >= $2
        AND COALESCE(p."UpdatedAt", p."CreatedAt") < $3
      ORDER BY "ReportStatus" ASC, p."Id" ASC;
    `,
    columns: [
      ["Id", "Id"],
      ["Status", "ReportStatus"],
      ["Client", "ClientName"],
      ["Related To", "RelatedTo"],
      ["Task Type", "TaskTypeName"],
      ["Start Date", "StartDate"],
      ["End Date", "EndDate"],
      ["ETA", "ETA"],
      ["Duration Mins", "DurationMinutes"],
      ["Hyperscaler", "Hyperscaler"],
      ["Follow Up Trigger", "FollowUpTriggerStatus"],
      ["Summary", "DetailedSummary"],
      ["Description", "Description"],
      ["Comments", "Comments"],
      ["Assigned To", "AssignedToName"],
      ["Assigned From", "AssignedFromName"],
      ["Created By", "CreatedByName"],
      ["Active", "IsActive"],
      ["Created At", "CreatedAt"],
      ["Updated At", "UpdatedAt"],
    ],
  },
  {
    key: "activity",
    label: "Activities",
    sheetPrefix: "Activities",
    query: `
      SELECT
        ac."Id",
        COALESCE(NULLIF(ac."Status", ''), 'Unspecified') AS "ReportStatus",
        ac."Type",
        ac."Subject",
        a."Name" AS "AccountName",
        TRIM(COALESCE(c."FirstName", '') || ' ' || COALESCE(c."LastName", '')) AS "ContactName",
        o."OpportunityName",
        cb."Name" AS "CreatedByName",
        ato."Name" AS "AssignedToName",
        ac."Priority",
        ac."DueDate",
        ac."ReminderAt",
        ac."Description",
        ac."IsActive",
        ac."CreatedAt",
        ac."UpdatedAt"
      FROM "Activities" ac
      LEFT JOIN "Accounts" a ON a."Id" = ac."AccountId"
      LEFT JOIN "Contacts" c ON c."Id" = ac."ContactId"
      LEFT JOIN "Opportunities" o ON o."Id" = ac."OpportunityId"
      LEFT JOIN "Users" cb ON cb."UserId" = ac."CreatedBy"
      LEFT JOIN "Users" ato ON ato."UserId" = ac."AssignedTo"
      WHERE ac."CompanyId" = $1
        AND ac."IsDeleted" = FALSE
        AND COALESCE(ac."UpdatedAt", ac."CreatedAt") >= $2
        AND COALESCE(ac."UpdatedAt", ac."CreatedAt") < $3
      ORDER BY "ReportStatus" ASC, ac."Id" ASC;
    `,
    columns: [
      ["Id", "Id"],
      ["Status", "ReportStatus"],
      ["Type", "Type"],
      ["Subject", "Subject"],
      ["Account", "AccountName"],
      ["Contact", "ContactName"],
      ["Opportunity", "OpportunityName"],
      ["Priority", "Priority"],
      ["Due Date", "DueDate"],
      ["Reminder", "ReminderAt"],
      ["Description", "Description"],
      ["Assigned To", "AssignedToName"],
      ["Created By", "CreatedByName"],
      ["Active", "IsActive"],
      ["Created At", "CreatedAt"],
      ["Updated At", "UpdatedAt"],
    ],
  },
  {
    key: "case",
    label: "Cases",
    sheetPrefix: "Cases",
    query: `
      SELECT
        cs."Id",
        COALESCE(NULLIF(cs."Status", ''), 'Unspecified') AS "ReportStatus",
        cs."Subject",
        a."Name" AS "AccountName",
        TRIM(COALESCE(c."FirstName", '') || ' ' || COALESCE(c."LastName", '')) AS "ContactName",
        cb."Name" AS "CreatedByName",
        ato."Name" AS "AssignedToName",
        af."Name" AS "AssignedFromName",
        cs."Priority",
        cs."Description",
        cs."Resolution",
        cs."IsActive",
        cs."CreatedAt",
        cs."UpdatedAt"
      FROM "Cases" cs
      LEFT JOIN "Accounts" a ON a."Id" = cs."AccountId"
      LEFT JOIN "Contacts" c ON c."Id" = cs."ContactId"
      LEFT JOIN "Users" cb ON cb."UserId" = cs."CreatedBy"
      LEFT JOIN "Users" ato ON ato."UserId" = cs."AssignedTo"
      LEFT JOIN "Users" af ON af."UserId" = cs."AssignedFrom"
      WHERE cs."CompanyId" = $1
        AND cs."IsDeleted" = FALSE
        AND COALESCE(cs."UpdatedAt", cs."CreatedAt") >= $2
        AND COALESCE(cs."UpdatedAt", cs."CreatedAt") < $3
      ORDER BY "ReportStatus" ASC, cs."Id" ASC;
    `,
    columns: [
      ["Id", "Id"],
      ["Status", "ReportStatus"],
      ["Subject", "Subject"],
      ["Account", "AccountName"],
      ["Contact", "ContactName"],
      ["Priority", "Priority"],
      ["Description", "Description"],
      ["Resolution", "Resolution"],
      ["Assigned To", "AssignedToName"],
      ["Assigned From", "AssignedFromName"],
      ["Created By", "CreatedByName"],
      ["Active", "IsActive"],
      ["Created At", "CreatedAt"],
      ["Updated At", "UpdatedAt"],
    ],
  },
];

const SCHEDULER_INTERVAL_MS = 60 * 60 * 1000;
const schedulerState = {
  timer: null,
  lastCheckKey: null,
  running: false,
};

const escapeXml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const toIsoDate = (value) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const toIsoDateTime = (value) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().replace("T", " ").slice(0, 19);
};

const slugify = (value) =>
  String(value || "company")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50) || "company";

const normalizeSheetName = (value, usedNames) => {
  const base = String(value || "Sheet")
    .replace(/[\\/*?:[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 31) || "Sheet";

  let candidate = base;
  let suffix = 2;
  while (usedNames.has(candidate)) {
    const suffixText = ` ${suffix}`;
    candidate = `${base.slice(0, Math.max(0, 31 - suffixText.length))}${suffixText}`;
    suffix += 1;
  }
  usedNames.add(candidate);
  return candidate;
};

const firstDayOfMonthUtc = (date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));

const startOfUtcDay = (date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));

const getCompletedWeeklyPeriod = (referenceDate = new Date()) => {
  const utcDay = startOfUtcDay(referenceDate);
  const isoDay = ((utcDay.getUTCDay() + 6) % 7) + 1;
  const currentWeekStart = new Date(utcDay);
  currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() - (isoDay - 1));

  const start = new Date(currentWeekStart);
  start.setUTCDate(start.getUTCDate() - 7);
  const end = currentWeekStart;

  return {
    type: "weekly",
    key: `${toIsoDate(start)}_to_${toIsoDate(new Date(end.getTime() - 1))}`,
    label: `Weekly CRM Report (${toIsoDate(start)} to ${toIsoDate(new Date(end.getTime() - 1))})`,
    start,
    end,
  };
};

const getCompletedMonthlyPeriod = (referenceDate = new Date()) => {
  const currentMonthStart = firstDayOfMonthUtc(referenceDate);
  const start = new Date(Date.UTC(currentMonthStart.getUTCFullYear(), currentMonthStart.getUTCMonth() - 1, 1));
  const end = currentMonthStart;
  const key = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`;

  return {
    type: "monthly",
    key,
    label: `Monthly CRM Report (${key})`,
    start,
    end,
  };
};

const shouldRunWeeklyForDate = (date = new Date()) => date.getUTCDay() === 1;
const shouldRunMonthlyForDate = (date = new Date()) => date.getUTCDate() === 1;

const formatCellValue = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value instanceof Date) return toIsoDateTime(value);
  return String(value);
};

const buildWorksheetXml = (name, rows, usedNames) => {
  const safeName = normalizeSheetName(name, usedNames);
  const rowXml = rows
    .map((row, rowIndex) => {
      const styleId = rowIndex === 0 ? ' ss:StyleID="header"' : "";
      const cells = row
        .map((cell) => `<Cell${styleId}><Data ss:Type="String">${escapeXml(formatCellValue(cell))}</Data></Cell>`)
        .join("");
      return `<Row>${cells}</Row>`;
    })
    .join("");

  return `
    <Worksheet ss:Name="${escapeXml(safeName)}">
      <Table>${rowXml}</Table>
    </Worksheet>
  `;
};

const buildWorkbookXml = ({ companyName, period, modules, generatedAt }) => {
  const usedNames = new Set();
  const summaryRows = [["Module", "Status", "Count", "Active", "Inactive"]];
  const graphRows = [["Module", "Status", "Count"]];

  modules.forEach((moduleData) => {
    moduleData.statusSummaries.forEach((statusSummary) => {
      summaryRows.push([
        moduleData.module.label,
        statusSummary.status,
        statusSummary.count,
        statusSummary.activeCount,
        statusSummary.inactiveCount,
      ]);
      graphRows.push([moduleData.module.label, statusSummary.status, statusSummary.count]);
    });
  });

  const worksheets = [
    buildWorksheetXml(
      "Summary",
      [
        ["Company", companyName],
        ["Report", period.label],
        ["Generated At", toIsoDateTime(generatedAt)],
        [],
        ...summaryRows,
      ],
      usedNames
    ),
    buildWorksheetXml("Graph Data", graphRows, usedNames),
  ];

  modules.forEach((moduleData) => {
    const groupedStatuses = moduleData.groupedStatuses;
    Object.keys(groupedStatuses).forEach((status) => {
      const statusRows = groupedStatuses[status];
      const headers = moduleData.module.columns.map(([label]) => label);
      const dataRows = statusRows.map((row) =>
        moduleData.module.columns.map(([, key]) => {
          if (key === "IsActive") {
            return row[key] ? "Active" : "Inactive";
          }
          return formatCellValue(row[key]);
        })
      );

      worksheets.push(
        buildWorksheetXml(
          `${moduleData.module.sheetPrefix}-${status}`,
          [headers, ...dataRows],
          usedNames
        )
      );
    });

    if (!Object.keys(groupedStatuses).length) {
      worksheets.push(
        buildWorksheetXml(
          `${moduleData.module.sheetPrefix}-No Data`,
          [["Message"], [`No ${moduleData.module.label.toLowerCase()} updated in this period.`]],
          usedNames
        )
      );
    }
  });

  return `<?xml version="1.0"?>
<Workbook
  xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
    <Author>Codex CRM Digest</Author>
    <Created>${escapeXml(new Date(generatedAt).toISOString())}</Created>
    <Company>${escapeXml(companyName)}</Company>
  </DocumentProperties>
  <Styles>
    <Style ss:ID="header">
      <Font ss:Bold="1" />
      <Interior ss:Color="#D9EAF7" ss:Pattern="Solid" />
    </Style>
  </Styles>
  ${worksheets.join("")}
</Workbook>`;
};

const buildStatusSummary = (rows = []) => {
  const statusMap = new Map();
  rows.forEach((row) => {
    const status = String(row.ReportStatus || "Unspecified");
    const current = statusMap.get(status) || {
      status,
      count: 0,
      activeCount: 0,
      inactiveCount: 0,
    };
    current.count += 1;
    if (row.IsActive) {
      current.activeCount += 1;
    } else {
      current.inactiveCount += 1;
    }
    statusMap.set(status, current);
  });

  return [...statusMap.values()].sort((a, b) => a.status.localeCompare(b.status));
};

const buildGraphBlock = (title, statuses) => {
  const maxCount = Math.max(1, ...statuses.map((item) => Number(item.count || 0)));
  const rows = statuses
    .map((item) => {
      const widthPct = Math.max(4, Math.round((Number(item.count || 0) / maxCount) * 100));
      return `
        <tr>
          <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${escapeHtml(item.status)}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;width:220px;">
            <div style="background:#eef2f7;border-radius:999px;height:12px;overflow:hidden;">
              <div style="background:#2f6fdf;height:12px;width:${widthPct}%;"></div>
            </div>
          </td>
          <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">${escapeHtml(item.count)}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <div style="margin:18px 0;">
      <div style="font-weight:700;margin-bottom:8px;">${escapeHtml(title)}</div>
      <table style="border-collapse:collapse;width:100%;font-size:13px;">
        <thead>
          <tr>
            <th style="text-align:left;padding:6px 8px;border-bottom:2px solid #cbd5e1;">Status</th>
            <th style="text-align:left;padding:6px 8px;border-bottom:2px solid #cbd5e1;">Graph</th>
            <th style="text-align:right;padding:6px 8px;border-bottom:2px solid #cbd5e1;">Records</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="3" style="padding:8px;">No records</td></tr>'}</tbody>
      </table>
    </div>
  `;
};

const buildDigestEmailHtml = ({ company, reports }) => {
  const sections = reports
    .map((report) => {
      const blocks = report.modules
        .map((moduleData) => buildGraphBlock(moduleData.module.label, moduleData.statusSummaries))
        .join("");

      const total = report.modules.reduce((sum, moduleData) => sum + moduleData.rows.length, 0);
      return `
        <section style="margin-bottom:28px;">
          <h2 style="margin:0 0 8px;font-size:18px;color:#0f172a;">${escapeHtml(report.period.label)}</h2>
          <p style="margin:0 0 12px;color:#475569;">${escapeHtml(company.CompanyName)} had ${total} CRM records updated in this period.</p>
          ${blocks}
        </section>
      `;
    })
    .join("");

  return `
    <div style="font-family:Segoe UI,Arial,sans-serif;color:#111827;line-height:1.5;">
      <h1 style="margin-bottom:8px;font-size:22px;">CRM Weekly / Monthly Digest</h1>
      <p style="margin-top:0;color:#475569;">
        Company: <strong>${escapeHtml(company.CompanyName)}</strong><br />
        Owner: ${escapeHtml(company.OwnerName || "N/A")}
      </p>
      ${sections}
      <p style="color:#64748b;font-size:12px;">Attached workbook includes status-wise tabs for leads, opportunities, presales, activities, and cases.</p>
    </div>
  `;
};

const buildDigestEmailText = ({ company, reports }) =>
  [
    `CRM Digest for ${company.CompanyName}`,
    company.OwnerName ? `Owner: ${company.OwnerName}` : null,
    "",
    ...reports.flatMap((report) => [
      report.period.label,
      ...report.modules.map((moduleData) => {
        const summary = moduleData.statusSummaries
          .map((item) => `${item.status}: ${item.count}`)
          .join(", ");
        return `${moduleData.module.label}: ${summary || "No records"}`;
      }),
      "",
    ]),
  ]
    .filter(Boolean)
    .join("\n");

const getCompanies = async (client, companyId = null) => {
  const params = [];
  const filters = ['c."Flag" = TRUE'];
  if (companyId) {
    params.push(companyId);
    filters.push(`c."Id" = $${params.length}`);
  }

  const { rows } = await client.query(
    `
      SELECT c."Id", c."CompanyName", c."OwnerName", c."Email"
      FROM "Companies" c
      WHERE ${filters.join(" AND ")}
      ORDER BY c."Id" ASC;
    `,
    params
  );
  return rows;
};

const getCompanyRecipients = async (client, company) => {
  const { rows } = await client.query(
    `
      SELECT DISTINCT u."Email", u."Name", r."RoleName"
      FROM "Users" u
      LEFT JOIN "Roles" r ON r."Id" = u."RoleId"
      WHERE u."CompanyId" = $1
        AND u."IsDelete" = FALSE
        AND u."IsActive" = TRUE
        AND LOWER(COALESCE(r."RoleName", '')) IN ('admin', 'company owner', 'super admin');
    `,
    [company.Id]
  );

  const emails = [...new Set(rows.map((row) => String(row.Email || "").trim()).filter(Boolean))];
  if (!emails.length && company.Email) {
    emails.push(String(company.Email).trim());
  }
  return emails;
};

const loadCompanyReportState = async (client, companyId) => {
  const { rows } = await client.query(
    `
      SELECT "Settings"
      FROM "CompanySettings"
      WHERE "CompanyId" = $1
      LIMIT 1;
    `,
    [companyId]
  );

  const settings = rows[0]?.Settings || {};
  return settings.crmDigestState || {};
};

const saveCompanyReportState = async (client, companyId, nextState, updatedBy = null) => {
  const existingResult = await client.query(
    `
      SELECT "Settings"
      FROM "CompanySettings"
      WHERE "CompanyId" = $1
      LIMIT 1;
    `,
    [companyId]
  );

  const existingSettings = existingResult.rows[0]?.Settings || {};
  const mergedSettings = {
    ...existingSettings,
    crmDigestState: {
      ...(existingSettings.crmDigestState || {}),
      ...nextState,
    },
  };

  await client.query(
    `
      INSERT INTO "CompanySettings" ("CompanyId", "Settings", "Version", "UpdatedBy")
      VALUES ($1, $2::jsonb, 1, $3)
      ON CONFLICT ("CompanyId") DO UPDATE
      SET
        "Settings" = EXCLUDED."Settings",
        "Version" = "CompanySettings"."Version" + 1,
        "UpdatedBy" = EXCLUDED."UpdatedBy",
        "UpdatedAt" = NOW();
    `,
    [companyId, JSON.stringify(mergedSettings), updatedBy]
  );
};

const fetchModuleRows = async (client, module, companyId, period) => {
  const { rows } = await client.query(module.query, [companyId, period.start, period.end]);

  const groupedStatuses = {};
  rows.forEach((row) => {
    const status = String(row.ReportStatus || "Unspecified");
    if (!groupedStatuses[status]) {
      groupedStatuses[status] = [];
    }
    groupedStatuses[status].push(row);
  });

  return {
    module,
    rows,
    groupedStatuses,
    statusSummaries: buildStatusSummary(rows),
  };
};

const createWorkbookAttachment = ({ company, period, modules, generatedAt }) => {
  const xml = buildWorkbookXml({
    companyName: company.CompanyName,
    period,
    modules,
    generatedAt,
  });

  return {
    filename: `${slugify(company.CompanyName)}-crm-${period.type}-${period.key}.xls`,
    content: Buffer.from(xml, "utf8"),
    contentType: "application/vnd.ms-excel",
  };
};

const buildReportPayload = async (client, company, period) => {
  const modules = [];
  for (const module of REPORT_MODULES) {
    modules.push(await fetchModuleRows(client, module, company.Id, period));
  }

  return {
    period,
    modules,
    attachment: createWorkbookAttachment({
      company,
      period,
      modules,
      generatedAt: new Date(),
    }),
  };
};

const sendDigestReportsForCompany = async ({
  client,
  company,
  periods,
  triggeredByUserId = null,
  skipIfAlreadySent = true,
}) => {
  const reportState = await loadCompanyReportState(client, company.Id);
  const nextState = {};
  const duePeriods = [];

  periods.forEach((period) => {
    const stateKey =
      period.type === "weekly" ? "lastWeeklyPeriodKey" : "lastMonthlyPeriodKey";
    if (!skipIfAlreadySent || reportState[stateKey] !== period.key) {
      duePeriods.push(period);
      nextState[stateKey] = period.key;
    }
  });

  if (!duePeriods.length) {
    return {
      companyId: company.Id,
      companyName: company.CompanyName,
      skipped: true,
      reason: "already_sent",
      reports: [],
      recipients: [],
    };
  }

  const recipients = await getCompanyRecipients(client, company);
  if (!recipients.length) {
    return {
      companyId: company.Id,
      companyName: company.CompanyName,
      skipped: true,
      reason: "no_recipients",
      reports: [],
      recipients: [],
    };
  }

  const reports = [];
  for (const period of duePeriods) {
    reports.push(await buildReportPayload(client, company, period));
  }

  if (!isEmailConfigured()) {
    return {
      companyId: company.Id,
      companyName: company.CompanyName,
      skipped: true,
      reason: "email_not_configured",
      reports: reports.map((report) => ({ period: report.period, totalModules: report.modules.length })),
      recipients,
    };
  }

  const attachments = reports.map((report) => report.attachment);
  const subject =
    reports.length === 1
      ? `${company.CompanyName} ${reports[0].period.label}`
      : `${company.CompanyName} CRM Weekly / Monthly Digest`;

  await sendEmail({
    to: recipients,
    subject,
    text: buildDigestEmailText({ company, reports }),
    html: buildDigestEmailHtml({ company, reports }),
    attachments,
  });

  await saveCompanyReportState(client, company.Id, nextState, triggeredByUserId);

  await logAuditEvent({
    client,
    companyId: company.Id,
    userId: triggeredByUserId,
    eventType: "CRMReportDigest",
    action: "Send",
    entityType: "Company",
    entityId: company.Id,
    afterData: {
      periods: duePeriods.map((period) => ({ type: period.type, key: period.key })),
      recipients,
      attachments: attachments.map((item) => item.filename),
    },
    metadata: {
      mode: triggeredByUserId ? "manual" : "scheduled",
    },
  });

  return {
    companyId: company.Id,
    companyName: company.CompanyName,
    skipped: false,
    recipients,
    reports: reports.map((report) => ({
      period: report.period,
      totalRecords: report.modules.reduce((sum, moduleData) => sum + moduleData.rows.length, 0),
      modules: report.modules.map((moduleData) => ({
        module: moduleData.module.label,
        totalRecords: moduleData.rows.length,
        statuses: moduleData.statusSummaries,
      })),
      attachment: report.attachment.filename,
    })),
  };
};

const generateAndSendCrmDigest = async ({
  companyId = null,
  periodTypes = ["weekly", "monthly"],
  triggeredByUserId = null,
  force = false,
}) => {
  const client = await appPool.connect();
  try {
    const companies = await getCompanies(client, companyId);
    const periods = [];
    if (periodTypes.includes("weekly")) {
      periods.push(getCompletedWeeklyPeriod());
    }
    if (periodTypes.includes("monthly")) {
      periods.push(getCompletedMonthlyPeriod());
    }

    const results = [];
    for (const company of companies) {
      results.push(
        await sendDigestReportsForCompany({
          client,
          company,
          periods,
          triggeredByUserId,
          skipIfAlreadySent: !force,
        })
      );
    }

    return {
      generatedAt: new Date().toISOString(),
      periods: periods.map((period) => ({ type: period.type, key: period.key, label: period.label })),
      companies: results,
    };
  } finally {
    client.release();
  }
};

const runScheduledCrmDigestCheck = async (now = new Date()) => {
  const runWeekly = shouldRunWeeklyForDate(now);
  const runMonthly = shouldRunMonthlyForDate(now);
  if (!runWeekly && !runMonthly) {
    return { skipped: true, reason: "no_period_closed" };
  }

  const periodTypes = [];
  if (runWeekly) periodTypes.push("weekly");
  if (runMonthly) periodTypes.push("monthly");

  return generateAndSendCrmDigest({
    periodTypes,
    triggeredByUserId: null,
    force: false,
  });
};

const startCrmDigestScheduler = () => {
  if (schedulerState.timer) {
    return schedulerState.timer;
  }

  const run = async () => {
    const dateKey = toIsoDate(new Date());
    if (schedulerState.running || schedulerState.lastCheckKey === dateKey) {
      return;
    }

    schedulerState.running = true;
    try {
      await runScheduledCrmDigestCheck();
      schedulerState.lastCheckKey = dateKey;
    } catch (error) {
      console.error("CRM digest scheduler failed:", error);
    } finally {
      schedulerState.running = false;
    }
  };

  schedulerState.timer = setInterval(run, SCHEDULER_INTERVAL_MS);
  setTimeout(run, 10 * 1000);
  return schedulerState.timer;
};

module.exports = {
  generateAndSendCrmDigest,
  runScheduledCrmDigestCheck,
  startCrmDigestScheduler,
};
