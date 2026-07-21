# CRM Testing Flow

This document explains how to test the CRM part of the ERP + CRM application using realistic seeded data, UI flows, API checks, and database verification.

## 1. Goal

Use this flow to verify that CRM users can:

- login with correct role and hierarchy scope
- view CRM dashboard data
- create, edit, view, filter, sort, and paginate CRM records
- assign CRM records to allowed users
- move leads through qualification
- manage opportunities, activities, pre-sales, cases, quotes, invoices, payments, and retentions
- see reports, notifications, audit/history, and API monitoring data

## 2. Required Setup

Start from the backend folder:

```bash
cd server
npm install
npm run seed:demo-30x30
npm run dev
```

Start the frontend from the client folder:

```bash
cd client
npm install
npm run dev
```

Important: confirm `server/.env` points to the database you want to test. Avoid `#` inside database names because this project strips text after `#`.

Example:

```env
LOCAL_DB_NAME=erptestingdatabase
NODE_ENV=development
```

## 3. Seeded Test Data

The demo seed command creates:

- 30 users
- 5 hierarchy levels
- 30 records per user for key CRM and ERP tables
- API execution logs, API failure alerts, and notifications

Sample login:

```text
Email: seed.demo30x30.user001@example.com
Password: Seed@123A
Role: Super Admin
```

Other seeded users follow this pattern:

```text
seed.demo30x30.user002@example.com
seed.demo30x30.user003@example.com
seed.demo30x30.user004@example.com
```

All seeded users use:

```text
Seed@123A
```

## 4. Database Verification

Run these queries in PostgreSQL to confirm seeded CRM data exists.

```sql
SELECT current_database();

SELECT COUNT(*) FROM "Users";
SELECT COUNT(*) FROM "Accounts";
SELECT COUNT(*) FROM "Contacts";
SELECT COUNT(*) FROM "Leads";
SELECT COUNT(*) FROM "Opportunities";
SELECT COUNT(*) FROM "Activities";
SELECT COUNT(*) FROM "Presales";
SELECT COUNT(*) FROM "Cases";
SELECT COUNT(*) FROM "Quotes";
SELECT COUNT(*) FROM "Invoices";
SELECT COUNT(*) FROM "Payments";
SELECT COUNT(*) FROM "Retentions";
SELECT COUNT(*) FROM "ApiExecutionLogs";
SELECT COUNT(*) FROM "ApiFailureAlerts";
SELECT COUNT(*) FROM "Notifications";
```

Expected after `npm run seed:demo-30x30`:

- `Users`: 30
- Each major CRM operational table should have at least 900 records
- API monitoring should have execution logs and failure alerts

Check hierarchy:

```sql
SELECT
  "UserId",
  "Name",
  "Email",
  "RoleId",
  "CompanyId",
  "ReportingManagerId",
  "HierarchyLevel",
  "HierarchyPath"
FROM "Users"
ORDER BY "HierarchyLevel", "UserId"
LIMIT 50;
```

## 5. Login And Routing Tests

### Super Admin Login

1. Open frontend login page.
2. Login as `seed.demo30x30.user001@example.com`.
3. Confirm user lands in Admin portal.
4. Open `/Admin`.
5. Confirm CRM dashboard loads.
6. Open `/Admin/reports`.
7. Confirm CRM and API report widgets load.

Expected:

- Admin navigation is visible
- CRM dashboard summary cards show data
- Reports page shows employee activity and API success/failure charts

### Lower-Level User Login

1. Logout.
2. Login as a non-super-admin seeded user, for example `seed.demo30x30.user010@example.com`.
3. Confirm user lands in user portal.
4. Open CRM pages available to user.

Expected:

- User sees scoped CRM data
- User should not see unrelated company data
- User should only assign records inside allowed company/hierarchy scope

## 6. CRM Dashboard Tests

Open:

```text
/Admin
```

Verify:

- lead summary is populated
- opportunity summary is populated
- recent activities are visible
- quotes or pipeline sections show data
- navigation links open the correct CRM modules

If dashboard is empty:

1. Confirm seed command ran on the same database as the backend.
2. Confirm backend server was restarted after `.env` change.
3. Query `"Leads"` and `"Opportunities"` directly in database.

## 7. Master Data Tests

Open these admin CRM master pages:

- Task Types
- Sales Stages
- Industries
- Follow-up Types
- Lead Sources

For each page:

1. Verify list loads.
2. Search by name.
3. Create a new test record.
4. Edit the record.
5. Delete or deactivate the record if supported.
6. Refresh and confirm changes persist.

Expected tables:

- `TaskTypes`
- `SalesStages`
- `Industries`
- `FollowupTypes`
- `LeadSources`

## 8. Accounts And Contacts Tests

Open:

- `/Admin/Accounts`
- `/Admin/Contact`

Test flow:

1. Search for a seeded account.
2. Open account details.
3. Create a new account.
4. Edit website, industry, revenue, and owner.
5. Create a contact under the account.
6. Confirm contact appears in contact list.
7. Filter contacts by assigned user if available.

Database checks:

```sql
SELECT COUNT(*) FROM "Accounts" WHERE "IsDeleted" = FALSE;
SELECT COUNT(*) FROM "Contacts" WHERE "IsDeleted" = FALSE;
```

Expected:

- Account and contact are company-scoped
- Contact can link to an account
- Owner/assigned fields should use valid users from the same company

## 9. Lead Lifecycle Tests

Open:

```text
/Admin/Leads
```

Test flow:

1. Confirm seeded leads load.
2. Search and filter leads by status/source/owner.
3. Create a new lead with prospect account and prospect contact details.
4. Assign the lead to an allowed user.
5. Add or update follow-up date.
6. Edit status and rating.
7. Qualify a lead.
8. Confirm related account/contact/opportunity is created or linked if the controller supports that action.
9. Disqualify another lead and confirm lost reason/comments are stored.

Database checks:

```sql
SELECT "Id", "Status", "AssignedTo", "AssignedFrom", "ConvertedAt", "LostReason"
FROM "Leads"
ORDER BY "Id" DESC
LIMIT 20;
```

Expected:

- New lead is visible after save
- Assignment follows company and hierarchy rules
- Qualified lead updates status and conversion fields
- Disqualified lead stores reason/comments

## 10. Opportunity Tests

Open:

```text
/Admin/Opportunities
```

Test flow:

1. Confirm opportunities load.
2. Search by opportunity name.
3. Filter by sales stage/status.
4. Create a new opportunity linked to account/contact/lead.
5. Add budget, probability, expected close date, stage, and owner.
6. Move opportunity through stages.
7. Mark opportunity as won or lost if action exists.
8. Add opportunity products.

Database checks:

```sql
SELECT "Id", "OpportunityName", "SalesStageId", "Status", "Probability", "AssignedTo"
FROM "Opportunities"
ORDER BY "Id" DESC
LIMIT 20;

SELECT COUNT(*) FROM "OpportunityProducts";
```

Expected:

- Stage and status updates persist
- Probability/progress values show correctly
- Opportunity products link valid product IDs

## 11. Activities Tests

Open:

```text
/Admin/Activities
```

Test flow:

1. Create activity for a lead, account, contact, or opportunity.
2. Assign activity to a user.
3. Set due date, priority, status, and reminder.
4. Mark activity complete.
5. Confirm activity appears in dashboard/recent activity sections if supported.

Database check:

```sql
SELECT "Id", "Subject", "Status", "Priority", "AssignedTo", "DueDate"
FROM "Activities"
ORDER BY "Id" DESC
LIMIT 20;
```

Expected:

- Activity links to selected CRM entity
- Assigned user is valid
- Status changes persist

## 12. Pre-Sales Tests

Open:

```text
/Admin/PreSales
```

Test flow:

1. Create pre-sales record linked to lead or opportunity.
2. Set task type, hyperscaler, ETA, duration, and assigned user.
3. Add detailed summary and documents field if supported.
4. Update status from pending to in progress/completed.

Database check:

```sql
SELECT "Id", "ClientName", "Status", "TaskTypeId", "AssignedTo", "ETA"
FROM "Presales"
ORDER BY "Id" DESC
LIMIT 20;
```

Expected:

- Pre-sales record can be linked to opportunity
- Status and summary persist
- Assignment follows hierarchy rules

## 13. Cases Tests

Open:

```text
/Admin/Cases
```

Test flow:

1. Create support case linked to account/contact/opportunity.
2. Set subject, priority, status, description, and assigned user.
3. Update status to in progress.
4. Add resolution and close case.

Database check:

```sql
SELECT "Id", "Subject", "Status", "Priority", "AssignedTo", "Resolution"
FROM "Cases"
ORDER BY "Id" DESC
LIMIT 20;
```

Expected:

- Case is company scoped
- Case can be assigned to valid users
- Resolution persists when case is resolved

## 14. Quote, Invoice, Payment Tests

Open:

- `/Admin/Quotes`
- `/Admin/Invoices`
- `/Admin/Payments`

Quote flow:

1. Create quote linked to account/contact/opportunity.
2. Set valid till date, subtotal, discount, tax, total, terms, and notes.
3. Change status to sent/approved if supported.

Invoice flow:

1. Create invoice from quote or opportunity.
2. Confirm subtotal, tax, total, due date, payment method, and generated date.
3. Change payment status.

Payment flow:

1. Create payment against invoice.
2. Add amount, method, reference number, payment date, and status.
3. Confirm invoice/payment status updates if supported.

Database checks:

```sql
SELECT COUNT(*) FROM "Quotes";
SELECT COUNT(*) FROM "Invoices";
SELECT COUNT(*) FROM "Payments";
```

Expected:

- Commercial records link to the correct account/opportunity
- Amount fields persist correctly
- Payment references are stored

## 15. Retention Tests

Open:

```text
/Admin/Retentions
```

Test flow:

1. Create retention record for account/contact/opportunity.
2. Set type, status, next action date, reminder date, notes, and assigned user.
3. Update next action date and status.

Database check:

```sql
SELECT "Id", "Type", "Status", "NextActionDate", "ReminderDate", "AssignedTo"
FROM "Retentions"
ORDER BY "Id" DESC
LIMIT 20;
```

Expected:

- Retention record is linked to customer relationship
- Reminder and next action dates persist

## 16. Comments And History Tests

Many CRM workspaces support comments/history panels.

For a supported CRM module:

1. Open a record.
2. Add a comment.
3. Edit the record.
4. Open history panel.
5. Confirm changes are visible.

Database tables to check:

- `Comments`
- CRM audit/history tables if configured
- `AuditEvents` for system audit events

Example:

```sql
SELECT * FROM "Comments" ORDER BY "Id" DESC LIMIT 20;
SELECT * FROM "AuditEvents" ORDER BY "Id" DESC LIMIT 20;
```

## 17. Assignment And Hierarchy Tests

Test with three user types:

- Super Admin
- Admin or manager
- Lower-level user

Flow:

1. Login as Super Admin.
2. Assign a lead/opportunity/activity/case to any user in the company.
3. Login as manager.
4. Assign a record to a direct report.
5. Assign to a user under the same manager branch up to two levels deep.
6. Try assigning to unrelated branch or another company user.

Expected:

- Super Admin has broad assignment access
- Normal users are restricted by company and hierarchy
- Invalid assignment should be blocked by API or not appear in dropdown

Useful query:

```sql
SELECT
  child."UserId",
  child."Name",
  child."ReportingManagerId",
  manager."Name" AS "ManagerName",
  child."HierarchyLevel",
  child."HierarchyPath"
FROM "Users" child
LEFT JOIN "Users" manager ON manager."UserId" = child."ReportingManagerId"
ORDER BY child."HierarchyLevel", child."UserId";
```

## 18. Report And Monitoring Tests

Open:

```text
/Admin/reports
```

Verify:

- API Success vs Failure Trend shows data
- API Health Share shows success/failure split
- Recent API Alerts shows failed API records
- Employee Activity chart shows leads/opportunities
- Recent Notifications includes API escalation notifications and CRM notifications

API failure email test:

1. Trigger or insert failed API logs for the same integration and endpoint.
2. Once failures reach 10 in 24 hours, an email should be sent to Super Admin users.
3. Only one email should be sent for the same API within 24 hours.
4. Check `ApiFailureAlerts` for `API_FAILURE_EMAIL`.

Database check:

```sql
SELECT
  a."Id",
  a."AlertType",
  a."AlertChannel",
  a."AlertStatus",
  a."CreatedAt",
  l."IntegrationId",
  l."EndpointId",
  l."ResponseStatusCode"
FROM "ApiFailureAlerts" a
LEFT JOIN "ApiExecutionLogs" l ON l."Id" = a."ApiExecutionLogId"
ORDER BY a."Id" DESC
LIMIT 50;
```

Expected:

- Individual failures create `API_FAILURE` alerts
- Threshold escalation creates one `API_FAILURE_EMAIL` record
- Email status is `Sent`, `Failed`, or `Skipped`

## 19. User Access Panel Status

Current UI access controls are in:

- `/Admin/users`
- `/Admin/users/register`

Current fields:

- `Role`
- `Access Type`
- `Reporting Manager`
- `Company`
- `Hierarchy Level`

Important files:

- `client/src/Components/AdminSite/Users/UsersPage.jsx`
- `client/src/Components/AdminSite/Users/RegisterUserPage.jsx`
- `client/src/Components/MainRouting/MainRouting.jsx`

Database tables already exist for future permission panel work:

- `Permissions`
- `RolePermissions`
- `UserPermissions`
- `Modules`

Current limitation:

- There is no complete per-module permission panel UI yet.
- Access is mostly controlled by role, company, user type, and hierarchy.

## 20. Pass Criteria

CRM testing is considered passed when:

- seeded users can login
- CRM dashboard loads real data
- all CRM modules list seeded records
- create/edit/view flows work for each module
- search, filter, sort, and pagination work
- assignment respects company and hierarchy scope
- lead qualification and opportunity flow work
- quote, invoice, payment, and retention records persist
- reports show CRM and API monitoring data
- API failure email sends once after 10 failures for the same API in 24 hours

## 21. Common Issues

### Seed data not visible

Check current database:

```sql
SELECT current_database();
```

Then check `.env`:

```env
LOCAL_DB_NAME=your_database_name
NODE_ENV=development
```

Restart backend after `.env` changes.

### Charts empty

Check:

```sql
SELECT COUNT(*) FROM "ApiExecutionLogs";
SELECT COUNT(*) FROM "Leads";
SELECT COUNT(*) FROM "Opportunities";
```

If zero, run:

```bash
npm run seed:demo-30x30
```

### Email not sent

Check:

```env
EMAIL_USER=your_gmail_address
EMAIL_PASS=your_gmail_app_password
```

Then check:

```sql
SELECT * FROM "ApiFailureAlerts"
WHERE "AlertType" = 'API_FAILURE_EMAIL'
ORDER BY "Id" DESC
LIMIT 20;
```

Status meanings:

- `Sent`: email sent successfully
- `Failed`: email attempted but failed
- `Skipped`: email credentials were not configured

