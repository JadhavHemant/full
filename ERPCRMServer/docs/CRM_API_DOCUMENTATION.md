# CRM API Documentation

## Base URL
```
/api/crm
```

## Authentication
All endpoints require a valid Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

## Standard Response Format
```json
{
  "success": true,
  "data": {},
  "message": "Operation successful",
  "meta": {
    "pagination": {
      "total": 100,
      "limit": 25,
      "offset": 0
    }
  }
}
```

## Common Query Parameters
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 25)
- `q` (string): Search query
- `sortBy` (string): Field to sort by
- `sortOrder` (string): `ASC` or `DESC` (default: DESC)
- `companyId` (number): Company scope (usually from auth token)

---

## 1. Accounts

### List Accounts
```
GET /accounts
```
**Filters**: `IndustryId`, `AccountOwnerId`, revenue range, employee count range

### Get Account by ID
```
GET /accounts/:id
```

### Create Account
```
POST /accounts
```
**Required fields**: `Name`, `CompanyId`

### Update Account
```
PUT /accounts/:id
```

### Delete Account (Soft Delete)
```
DELETE /accounts/:id
```

### Get Account Summary
```
GET /accounts/:id/summary
```
**Returns**: Rollup of related Contacts, open Opportunities (count + value), open Cases, last Activity

---

## 2. Contacts

### List Contacts
```
GET /contacts
```
**Filters**: `AccountId`, `AssignedTo`, free-text search across FirstName/LastName/Email/Phone

### Get Contact by ID
```
GET /contacts/:id
```

### Create Contact
```
POST /contacts
```
**Required fields**: `FirstName` or `Email` or `Phone`

### Update Contact
```
PUT /contacts/:id
```

### Delete Contact (Soft Delete)
```
DELETE /contacts/:id
```

### List Contacts by Account
```
GET /accounts/:id/contacts
```

---

## 3. Leads

### List Leads
```
GET /leads
```
**Filters**: `Status`, `AssignedTo`, `LeadSourceId`, `FollowUpDate` range, `Rating`

### Get Lead by ID
```
GET /leads/:id
```

### Create Lead
```
POST /leads
```

### Update Lead
```
PUT /leads/:id
```

### Delete Lead (Soft Delete)
```
DELETE /leads/:id
```

### Convert Lead
```
POST /leads/:id/convert
```
**Request Body**:
```json
{
  "accountId": 123,
  "contactId": 456,
  "opportunityName": "New Opportunity",
  "salesStageId": 1,
  "budgetAmount": 50000,
  "expectedValue": 50000,
  "estCloseDate": "2024-12-31"
}
```
**Transaction**: Creates Account → Contact → Opportunity → Updates Lead Status to 'Converted'

### Mark Lead as Lost
```
PATCH /leads/:id/lost
```
**Request Body**:
```json
{
  "lostReason": "Budget constraints"
}
```

### Reassign Lead
```
PATCH /leads/:id/assign
```
**Request Body**:
```json
{
  "assignedTo": 789
}
```

---

## 4. Opportunities

### List Opportunities
```
GET /opportunities
```
**Filters**: `SalesStageId`, `Status`, `AssignedTo`, `EstCloseDate` range, `AccountId`

### Get Opportunity by ID
```
GET /opportunities/:id
```

### Create Opportunity
```
POST /opportunities
```

### Update Opportunity
```
PUT /opportunities/:id
```

### Delete Opportunity (Soft Delete)
```
DELETE /opportunities/:id
```

### Get Pipeline View
```
GET /opportunities/pipeline
```
**Query Params**: `lifecycleScope=active` (optional)
**Returns**: Array of sales stages with count and budget sums

### Transition Stage
```
PATCH /opportunities/:id/stage
```
**Request Body**:
```json
{
  "salesStageId": 3,
  "closeReason": "Lost to competitor"
}
```
**Business Rules**:
- If new stage `IsWon` → Status='Won', WonAt=NOW()
- If new stage `IsLost` → Status='Lost', LostAt=NOW(), requires `closeReason`
- Otherwise → Status='Open'

### Reassign Opportunity
```
PATCH /opportunities/:id/assign
```
**Request Body**:
```json
{
  "assignedTo": 789
}
```

### Opportunity Products
```
GET /opportunities/:id/products
POST /opportunities/:id/products
PUT /opportunities/:id/products/:productId
DELETE /opportunities/:id/products/:productId
```

---

## 5. Quotes

### List Quotes
```
GET /quotes
```
**Filters**: `Status`, `AccountId`, `OpportunityId`

### Get Quote by ID
```
GET /quotes/:id
```

### Create Quote
```
POST /quotes
```
**Note**: `QuoteNumber` auto-generated as `Q-{YYYYMM}-{00001}` if not provided

### Update Quote
```
PUT /quotes/:id
```

### Delete Quote (Soft Delete)
```
DELETE /quotes/:id
```

### Convert Quote to Invoice
```
POST /quotes/:id/convert-to-invoice
```
**Request Body**:
```json
{
  "paymentMethod": "Bank Transfer",
  "dueDate": "2024-12-31",
  "notes": "Payment due within 30 days"
}
```
**Transaction**: Creates Invoice from Quote → Updates Quote.Status='Invoiced'

---

## 6. Invoices

### List Invoices
```
GET /invoices
```
**Filters**: `PaymentStatus`, `DueDate` range, `AccountId`

### Get Invoice by ID
```
GET /invoices/:id
```

### Create Invoice
```
POST /invoices
```

### Update Invoice
```
PUT /invoices/:id
```

### Delete Invoice (Soft Delete)
```
DELETE /invoices/:id
```

---

## 7. Payments

### List Payments
```
GET /payments
```
**Filters**: `InvoiceId`, `PaymentMethod`, `Status`

### Get Payment by ID
```
GET /payments/:id
```

### Create Payment
```
POST /payments
```

### Record Payment for Invoice
```
POST /invoices/:id/payments
```
**Request Body**:
```json
{
  "amount": 5000,
  "paymentDate": "2024-12-01",
  "paymentMethod": "Bank Transfer",
  "referenceNumber": "TXN123456",
  "notes": "First installment"
}
```
**Transaction**: Creates Payment → Recomputes Invoice.PaymentStatus (Pending/Partial/Paid)

### Update Payment
```
PUT /payments/:id
```

### Delete Payment (Soft Delete)
```
DELETE /payments/:id
```

---

## 8. Cases

### List Cases
```
GET /cases
```
**Filters**: `Status`, `Priority`, `AssignedTo`, `AccountId`

### Get Case by ID
```
GET /cases/:id
```

### Create Case
```
POST /cases
```

### Update Case
```
PUT /cases/:id
```

### Delete Case (Soft Delete)
```
DELETE /cases/:id
```

### Resolve Case
```
PATCH /cases/:id/resolve
```
**Request Body**:
```json
{
  "resolution": "Issue resolved by updating system configuration"
}
```

### Reassign Case
```
PATCH /cases/:id/assign
```
**Request Body**:
```json
{
  "assignedTo": 789
}
```

---

## 9. Activities

### List Activities
```
GET /activities
```
**Filters**: `Type` (Call/Email/Meeting/Task), `Status`, `Priority`, `AssignedTo`, `DueDate` range, `LeadId`, `AccountId`, `ContactId`, `OpportunityId`

### Get Activity by ID
```
GET /activities/:id
```

### Create Activity
```
POST /activities
```

### Update Activity
```
PUT /activities/:id
```

### Delete Activity (Soft Delete)
```
DELETE /activities/:id
```

### Complete Activity
```
PATCH /activities/:id/complete
```

### Reassign Activity
```
PATCH /activities/:id/assign
```
**Request Body**:
```json
{
  "assignedTo": 789
}
```

---

## 10. Presales

### List Presales
```
GET /presales
```
**Filters**: `Status`, `TaskTypeId`, `Hyperscaler`, `StartDate` range, `ETA` range

### Get Presale by ID
```
GET /presales/:id
```

### Create Presale
```
POST /presales
```

### Update Presale
```
PUT /presales/:id
```

### Delete Presale (Soft Delete)
```
DELETE /presales/:id
```

### Reassign Presale
```
PATCH /presales/:id/assign
```
**Request Body**:
```json
{
  "assignedTo": 789
}
```
**Note**: Uses dedicated `PresalesAssignments` table

---

## 11. Retentions

### List Retentions
```
GET /retentions
```
**Filters**: `Status`, `Type`, `NextActionDate` range

### Get Retention by ID
```
GET /retentions/:id
```

### Create Retention
```
POST /retentions
```

### Update Retention
```
PUT /retentions/:id
```

### Delete Retention (Soft Delete)
```
DELETE /retentions/:id
```

### Get Due Today
```
GET /retentions/due-today
```
**Returns**: Retentions where `ReminderDate <= CURRENT_DATE` and Status != 'Completed'

### Reassign Retention
```
PATCH /retentions/:id/assign
```
**Request Body**:
```json
{
  "assignedTo": 789
}
```

---

## 12. Comments (Cross-Cutting)

### List Comments
```
GET /comments?entityType=Lead&entityId=123
```

### Create Comment
```
POST /comments
```
**Request Body**:
```json
{
  "entityType": "Lead",
  "entityId": 123,
  "commentText": "Follow up required"
}
```

### Delete Comment
```
DELETE /comments/:id
```

---

## 13. Assignments (Read-Only History)

### List Assignments
```
GET /assignments?entityType=Lead&entityId=123
```
**Returns**: Assignment history with user names

---

## 14. Entity Visibility

### List Visibility
```
GET /visibility?entityType=Lead&entityId=123
```

### Create/Update Visibility
```
POST /visibility
```
**Request Body**:
```json
{
  "entityType": "Lead",
  "entityId": 123,
  "visibilityType": "private",
  "userId": 456,
  "groupId": 789
}
```

### Delete Visibility
```
DELETE /visibility/:id
```

---

## 15. Groups

### List Groups
```
GET /groups
```

### Create Group
```
POST /groups
```
**Request Body**:
```json
{
  "name": "Sales Team",
  "description": "Regional sales team"
}
```

### Update Group
```
PUT /groups/:id
```

### Delete Group (Soft Delete)
```
DELETE /groups/:id
```

---

## 16. Group Members

### List Group Members
```
GET /group-members?groupId=123
```

### Add Group Member
```
POST /group-members
```
**Request Body**:
```json
{
  "groupId": 123,
  "userId": 456
}
```

### Remove Group Member
```
DELETE /group-members/:groupId/:userId
```

---

## 17. Lookup Tables (Settings)

### Task Types
```
GET /task-types
POST /task-types
PUT /task-types/:id
DELETE /task-types/:id
```

### Sales Stages
```
GET /sales-stages
POST /sales-stages
PUT /sales-stages/:id
DELETE /sales-stages/:id
```
**Note**: Returns `SortOrder`, `IsWon`, `IsLost` flags

### Industries
```
GET /industries
POST /industries
PUT /industries/:id
DELETE /industries/:id
```

### Follow-up Types
```
GET /followup-types
POST /followup-types
PUT /followup-types/:id
DELETE /followup-types/:id
```

### Lead Sources
```
GET /lead-sources
POST /lead-sources
PUT /lead-sources/:id
DELETE /lead-sources/:id
```

---

## Error Responses

### 400 Bad Request
```json
{
  "message": "Invalid request parameters"
}
```

### 401 Unauthorized
```json
{
  "message": "Access token missing or invalid"
}
```

### 403 Forbidden
```json
{
  "message": "Forbidden: Missing \"view\" permission for module \"leads\""
}
```

### 404 Not Found
```json
{
  "message": "Lead not found"
}
```

### 500 Internal Server Error
```json
{
  "message": "Failed to convert lead"
}
```

---

## Business Rules

1. **Soft Delete**: All DELETE operations set `IsDeleted = TRUE` and `IsActive = FALSE`
2. **Company Scoping**: All queries automatically filter by `CompanyId` from authenticated user
3. **Audit Trail**: All mutations log to `AuditEvents` table with before/after data
4. **Transactions**: Multi-step operations (lead conversion, quote→invoice, payment recording) use database transactions
5. **Assignment History**: All reassignments create records in `Assignments` or `PresalesAssignments` tables
6. **Superadmin Bypass**: RoleId=1 has full access to all modules
7. **Customer Lockdown**: RoleId=5 can only view sales orders and invoices (read-only)

---

## RBAC Permission Modules

The RBAC system recognizes these module keys:
- `accounts`, `contacts`, `leads`, `opportunities`, `opportunityProducts`
- `activities`, `quotes`, `invoices`, `payments`, `retentions`, `presales`, `cases`
- `comments`, `assignments`, `visibility`, `groups`, `groupMembers`
- `settings` (for task-types, sales-stages, industries, followup-types, lead-sources)
- `products`, `productCategory`, `units`, `warehouses`, `productStock`, `stockMovements`
- `purchaseOrders`, `purchaseOrderItems`, `salesOrders`, `suppliers`, `customers`
- `taxes`, `productTaxMap`, `profitLossReports`, `brands`, `stockTransfers`
- `stockAdjustments`, `grn`, `batches`, `serialNumbers`, `erp`
- `users`, `company`, `roles`, `userTypes`, `auditLogs`

---

## Testing Examples

### Convert a Lead
```bash
curl -X POST https://api.example.com/api/crm/leads/123/convert \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "salesStageId": 1,
    "budgetAmount": 50000,
    "estCloseDate": "2024-12-31"
  }'
```

### Get Pipeline
```bash
curl https://api.example.com/api/crm/opportunities/pipeline \
  -H "Authorization: Bearer <token>"
```

### Convert Quote to Invoice
```bash
curl -X POST https://api.example.com/api/crm/quotes/456/convert-to-invoice \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "Bank Transfer",
    "dueDate": "2024-12-31"
  }'
```

### Record Payment
```bash
curl -X POST https://api.example.com/api/crm/invoices/789/payments \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 5000,
    "paymentMethod": "Bank Transfer",
    "referenceNumber": "TXN123"
  }'
```

---

## Implementation Notes

1. **BudgetAmount**: Manually entered estimate (not auto-computed from OpportunityProducts)
2. **Audit System**: Uses `AuditEvents` table (not `AuditLogs`) for richer tracking
3. **Presales Assignments**: Uses dedicated `PresalesAssignments` table
4. **Comments**: Hard delete (no soft delete in schema)
5. **All SQL**: Parameterized queries only ($1, $2, ...) - no string interpolation
6. **Transactions**: All high-risk workflows wrapped in BEGIN/COMMIT/ROLLBACK