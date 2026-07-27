const fs = require("fs");
const path = require("path");
const ExcelJS = require("./ERPCRMServer/node_modules/exceljs");

const OUTPUT_FILE = "ERP_CRM_Project_Pending_Complete_Detailed.xlsx";
const SOURCE_FILE = "generate_detailed_project_status_excel.py";

const statusColors = {
  Complete: "FFC6EFCE",
  "Mostly Complete": "FFD9EAD3",
  Partial: "FFFFF2CC",
  Pending: "FFFCE4D6",
  "Not Started": "FFF4CCCC",
  "Needs Verification": "FFD9EAF7",
};

const detailedTimeline = [
  [
    "Phase 1",
    "Frontend completion and verification",
    "2026-07-23",
    "2026-08-05",
    "Verify and finish Financial Year, Documents, RFQ, Price Lists, HSN/SAC, Invoice Matching, reports, 2FA UI, reorder alerts.",
    "New backend-backed pages are usable and verified end to end.",
  ],
  [
    "Phase 2",
    "Core backend hardening",
    "2026-08-06",
    "2026-08-19",
    "WMS controllers, validation across controllers, stock reservation, enhanced audit logging, email templates.",
    "Core ERP APIs are stable, validated, and ready for workflow testing.",
  ],
  [
    "Phase 3",
    "Security and RBAC",
    "2026-08-20",
    "2026-09-02",
    "Field-level permissions, record-level permissions, hierarchy access, department scoping, branch scoping.",
    "Role and hierarchy access rules match business expectations.",
  ],
  [
    "Phase 4",
    "Advanced ERP features",
    "2026-09-03",
    "2026-09-16",
    "Customer portal, multi-currency verification, marketing automation, workflow automation, physical inventory.",
    "Advanced operating workflows are functionally complete.",
  ],
  [
    "Phase 5",
    "Integrations",
    "2026-09-17",
    "2026-09-30",
    "E-commerce sync, shipping integration, SMS notifications, calendar sync, social media integration.",
    "External integrations are connected or ready behind provider credentials.",
  ],
  [
    "Phase 6",
    "Testing and polish",
    "2026-10-01",
    "2026-10-14",
    "Unit tests, integration tests, performance testing, security testing, bug fixes, documentation.",
    "Release candidate ready for UAT/deployment decision.",
  ],
];

function parsePythonArray(source, name, nextName) {
  const start = source.indexOf(`${name} = [`);
  const end = nextName ? source.indexOf(`\n\n\n${nextName}`, start) : source.indexOf("\n]\n", start) + 2;
  if (start === -1 || end === -1) throw new Error(`Could not parse ${name}`);
  const block = source.slice(start + `${name} = `.length, end).trim();
  const jsonish = block
    .replace(/^\s*\(/gm, "[")
    .replace(/\),\s*$/gm, "],")
    .replace(/\),\s*\]/gm, "]\n]")
    .replace(/,\s*\]/g, "]");
  return JSON.parse(jsonish);
}

function addSheet(workbook, name, headers, rows, statusColumnName) {
  const worksheet = workbook.addWorksheet(name, {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  worksheet.addRow(headers);
  rows.forEach((row) => worksheet.addRow(row));

  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E78" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = thinBorder();
  });

  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.alignment = { vertical: "top", wrapText: true };
      cell.border = thinBorder();
      if (rowNumber > 1 && statusColumnName) {
        const statusIndex = headers.indexOf(statusColumnName) + 1;
        const status = row.getCell(statusIndex).value;
        if (statusColors[status]) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: statusColors[status] } };
        }
      }
    });
  });

  headers.forEach((_, index) => {
    const column = worksheet.getColumn(index + 1);
    let max = 12;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const value = cell.value == null ? "" : String(cell.value);
      max = Math.max(max, Math.min(value.length + 2, 55));
    });
    column.width = max;
  });

  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, worksheet.rowCount), column: headers.length },
  };

  return worksheet;
}

function thinBorder() {
  return {
    top: { style: "thin", color: { argb: "FFD9E2F3" } },
    left: { style: "thin", color: { argb: "FFD9E2F3" } },
    bottom: { style: "thin", color: { argb: "FFD9E2F3" } },
    right: { style: "thin", color: { argb: "FFD9E2F3" } },
  };
}

function getGitRows() {
  const { spawnSync } = require("child_process");
  const result = spawnSync("git", ["status", "--short"], { encoding: "utf8" });
  if (result.error || !result.stdout.trim()) return [["Clean/Unavailable", "No git status rows captured"]];

  return result.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const code = line.slice(0, 2).trim() || "?";
      const filePath = line.length > 3 ? line.slice(3) : line;
      const changeType =
        code === "M" ? "Modified" : code === "D" ? "Deleted" : code === "??" ? "Untracked/New" : code;
      return [changeType, filePath];
    });
}

async function main() {
  const source = fs.readFileSync(path.join(__dirname, SOURCE_FILE), "utf8");
  const features = parsePythonArray(source, "FEATURES", "NEW_VERIFICATION_ITEMS");
  const verificationItems = parsePythonArray(source, "NEW_VERIFICATION_ITEMS", "ROADMAP");
  const roadmap = parsePythonArray(source, "ROADMAP", "def git_lines");

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Codex";
  workbook.created = new Date();

  const counts = features.reduce((acc, row) => {
    acc[row[3]] = (acc[row[3]] || 0) + 1;
    return acc;
  }, {});
  const average = (
    features.reduce((sum, row) => sum + Number(row[4] || 0), 0) / features.length
  ).toFixed(1);

  addSheet(
    workbook,
    "Executive Summary",
    ["Metric", "Value"],
    [
      ["Report Generated", new Date().toLocaleString()],
      ["Project", "ERP/CRM Full Project"],
      ["Source", "Local repo docs, route/model/page scan, and git status"],
      ["Overall completion from roadmap", "52.9% complete / 47.1% remaining"],
      ["Detailed feature rows in this workbook", features.length],
      ["Average completion from detailed rows", `${average}%`],
      ["Complete", counts.Complete || 0],
      ["Partial", counts.Partial || 0],
      ["Needs Verification", counts["Needs Verification"] || 0],
      ["Pending", counts.Pending || 0],
      ["Not Started", counts["Not Started"] || 0],
      ["Main strength", "CRM core flow and RBAC/auth foundation are strong."],
      [
        "Main risk",
        "Several newly added ERP/Auth features need database/API/frontend verification before calling them complete.",
      ],
    ],
  );

  const headers = ["Area", "Module", "Feature", "Status", "Completion %", "Priority", "Phase", "Details / Evidence"];
  addSheet(workbook, "All Feature Details", headers, features, "Status");
  addSheet(
    workbook,
    "Completed",
    headers,
    features.filter((row) => row[3] === "Complete" || row[3] === "Mostly Complete"),
    "Status",
  );
  addSheet(
    workbook,
    "Pending Partial",
    headers,
    features.filter((row) => row[3] === "Partial" || row[3] === "Pending"),
    "Status",
  );
  addSheet(
    workbook,
    "Not Started",
    headers,
    features.filter((row) => row[3] === "Not Started"),
    "Status",
  );
  addSheet(
    workbook,
    "Needs Verification",
    headers,
    features.filter((row) => row[3] === "Needs Verification"),
    "Status",
  );
  addSheet(
    workbook,
    "New Files To Verify",
    ["Area", "Feature", "Files / Evidence", "Current Finding", "Next Validation Step"],
    verificationItems,
  );
  addSheet(workbook, "Roadmap", ["Phase", "Focus", "Timeline", "Major Work", "Target"], roadmap);
  addSheet(
    workbook,
    "Timeline 12 Weeks",
    ["Phase", "Focus", "Start Date", "End Date", "Planned Work", "Exit Criteria"],
    detailedTimeline,
  );
  addSheet(workbook, "Git Pending Changes", ["Change Type", "Path"], getGitRows());
  addSheet(workbook, "Priority Next Actions", ["Priority", "Action", "Scope", "Reason"], [
    ["P0", "Run backend schema verification", "ERPCRMServer/scripts/verify_schema.js", "Confirms database fix and new tables."],
    ["P0", "Smoke test backend APIs", "npm test or Postman collection", "Confirms new routes do not break startup/API behavior."],
    ["P1", "Validate stock valuation", "Stock valuation page and API", "High business impact; must verify formulas."],
    ["P1", "Validate reorder levels", "Reorder levels page and API", "High operations impact; confirm min/max and alert logic."],
    ["P1", "Validate 2FA login flow", "Auth 2FA routes", "Security feature must be tested end to end."],
    ["P1", "Validate RFQ and invoice matching", "RFQ/invoiceMatch routes", "Important purchase workflow gap."],
    ["P2", "Complete missing WMS workflows", "Putaway, picking, cycle count", "Needed for advanced warehouse operations."],
    ["P2", "Complete reporting gaps", "ABC, aging, vendor performance, reconciliation", "Needed for management visibility."],
    ["P3", "Add external integrations", "Email/calendar/SMS/e-commerce/logistics", "Useful after core workflows are stable."],
  ]);

  await workbook.xlsx.writeFile(path.join(__dirname, OUTPUT_FILE));
  console.log(OUTPUT_FILE);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
