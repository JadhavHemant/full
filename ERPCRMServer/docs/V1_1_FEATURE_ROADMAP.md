# ERP + CRM v1.1 Feature Roadmap

This roadmap converts the proposed feature list into an execution plan for this codebase.

## 1) Current Baseline (Already Present or Partially Present)

- Notifications foundation exists: `Notifications`, `NotificationPreferences`, `NotificationSettings`.
- Approvals foundation exists: `ApprovalWorkflows`, `ApprovalSteps`, `ApprovalTransactions`, `ApprovalActions`.
- Audit foundation exists: `AuditEvents` and utility-based audit logging.
- Hierarchy/access foundation exists: `Users.ReportingManagerId` and CRM hierarchy access control.
- API monitoring + alerts exists: `ApiExecutionLogs`, `ApiFailureAlerts`, escalation notifications.
- Basic CSV export exists for companies; warehouse bulk import exists.

## 2) v1.1 Priority (First Release After Go-Live)

### P1 (Build First)

1. Audit Trail Hardening (immutable, before/after diffs, per-record history UI)
2. Auto-Assignment Rules (round-robin, load-balanced, territory)
3. Custom Report Builder + Scheduled Reports
4. PDF Export (PO/SO/Invoice/Proposal)
5. Accounting Export (Tally-compatible, then QuickBooks/Zoho connector-ready)
6. Email Integration (Gmail/Outlook sync + thread logging on Contact/Lead/Opportunity)

### P2 (Immediately After P1)

1. Workflow Automation Rules Engine (if-this-then-that)
2. SLA Management + breach indicators + reminder jobs
3. Webhook Outbound + Webhook Inbound
4. Lead Scoring + Revenue Attribution (`CampaignId` on `Leads`)
5. Duplicate Detection + Merge workflow (Contacts/Accounts)

### P3 (Enterprise Expansion)

1. WhatsApp/SMS orchestration
2. Supplier/Customer portals
3. Multi-currency + landed cost + returns
4. 2FA, IP allowlist, GDPR center, field encryption
5. Mobile/PWA + AI assistant features

## 3) Suggested Sprint Plan (6 Sprints)

### Sprint 1

- Audit Trail Hardening
- Lead/Opportunity assignment rule data model
- `CampaignId` on `Leads` for attribution

### Sprint 2

- Auto-assignment engine + reassignment logs
- SLA timers + follow-up breach jobs
- Notification templates for SLA/assignment events

### Sprint 3

- Report Builder query service (saved reports, filters, dimensions/metrics)
- Scheduled report jobs + email delivery

### Sprint 4

- PDF generation service (PO/SO/Invoice/Proposal)
- Proposal template configuration by company branding

### Sprint 5

- Tally export pipeline (XML/CSV) + export history
- Webhook outbound events

### Sprint 6

- Email inbox integration (OAuth + message sync + thread mapping)
- Duplicate detection + merge flow

## 4) Data Model Additions (Recommended)

1. `AutomationRules`  
   Columns: `Id`, `CompanyId`, `EntityType`, `TriggerEvent`, `ConditionJson`, `ActionJson`, `IsActive`, `CreatedBy`, timestamps
2. `AssignmentRules`  
   Columns: `Id`, `CompanyId`, `EntityType`, `Strategy`, `ConfigJson`, `IsActive`, `LastAssignedUserId`, timestamps
3. `SlaPolicies`  
   Columns: `Id`, `CompanyId`, `EntityType`, `Priority`, `SourceId`, `ResponseMinutes`, `EscalateAfterMinutes`, `IsActive`
4. `ScheduledReports`  
   Columns: `Id`, `CompanyId`, `Name`, `ConfigJson`, `CronExpr`, `Format`, `RecipientsJson`, `IsActive`, `LastRunAt`
5. `ReportRuns`  
   Columns: `Id`, `ScheduledReportId`, `Status`, `StartedAt`, `FinishedAt`, `OutputUrl`, `Error`
6. `OutboundWebhooks`  
   Columns: `Id`, `CompanyId`, `EventCode`, `TargetUrl`, `Secret`, `IsActive`, timestamps
7. `WebhookDeliveries`  
   Columns: `Id`, `WebhookId`, `PayloadJson`, `ResponseCode`, `ResponseBody`, `Status`, `AttemptCount`, `NextRetryAt`
8. `Campaigns` + `Leads.CampaignId`
9. `EmailConnections` + `EmailMessages` + `EntityEmailLinks`
10. `MergeHistory` (for account/contact dedupe merges)

## 5) API Surface (Recommended)

1. `/api/automation/rules`
2. `/api/assignment/rules`
3. `/api/sla/policies`
4. `/api/reports/builder`, `/api/reports/scheduled`
5. `/api/export/pdf/:entity/:id`
6. `/api/export/tally`
7. `/api/webhooks/outbound`, `/api/webhooks/inbound/:key`
8. `/api/email/connect`, `/api/email/sync`, `/api/email/threads`
9. `/api/dedupe/accounts`, `/api/dedupe/contacts`, `/api/dedupe/:entity/merge`

## 6) Execution Notes for This Repository

1. Keep schema changes idempotent with `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.
2. Extend existing CRM generic CRUD only where safe; add explicit service/controller for complex behaviors (assignment automation, merge, export, sync).
3. Reuse `AuditEvents` for unified trail instead of creating parallel audit tables per module.
4. Run scheduled logic with a dedicated worker process (cron jobs should not rely on API traffic).
5. Introduce connector abstraction for external integrations (`whatsapp`, `sms`, `email`, `accounting`) to keep provider swaps low-risk.

## 7) Definition of Done (for each major feature)

1. Schema + migration-safe model updates
2. Role/permission checks on every new endpoint
3. Audit event emitted for create/update/delete and rule execution
4. Retry/error handling for external integrations
5. Dashboard/report visibility with company + hierarchy scoping
6. Basic load and failure-path tests

