# 📋 How to Approve Requests - User Guide

## 🎯 Overview

Your ERP/CRM system has a built-in approval workflow system that allows designated approvers to review and approve/reject requests from various modules like Purchase Orders, Expenses, Stock Adjustments, etc.

---

## 🔐 Access the Approvals Page

### **Step 1: Login**
1. Go to the login page
2. Login with your credentials
3. Make sure you have **approver permissions** (check with your admin)

### **Step 2: Navigate to Approvals**
There are two ways:

**Option A: Via Navigation Menu**
1. Click on the **hamburger menu** (☰) or navigation bar
2. Look for **"Approvals"** section
3. Click on **"Approval Requests"**

**Option B: Direct URL**
- Navigate to: `/Admin/ERP/Approvals`
- Full URL: `http://localhost:5173/Admin/ERP/Approvals` (or your domain)

---

## 📊 Understanding the Approvals Page

### **Columns You'll See:**

| Column | Description |
|--------|-------------|
| **Workflow** | Name of the approval workflow (e.g., "PO Approval", "Expense Approval") |
| **Module** | Which module the request is from (Purchase Order, Expense, etc.) |
| **Requested By** | Name of the person who created the request |
| **Status** | Current status (Pending/Approved/Rejected) |
| **Priority** | Priority level (Low/Medium/High) |
| **Date** | When the request was created |

### **Status Badge Colors:**

- 🟡 **Yellow** = Pending (needs your action)
- 🟢 **Green** = Approved (already processed)
- 🔴 **Red** = Rejected (denied)

---

## ✅ How to Approve a Request

### **Step-by-Step:**

1. **Find Pending Requests**
   - Look for items with **"Pending"** status (yellow badge)
   - These are the ones waiting for your approval

2. **Review the Request**
   - Click on the **row** to see more details (if implemented)
   - OR review the information shown in the table

3. **Approve the Request**
   - Click the **"Approve"** button (green button)
   - The button appears on the right side of pending items
   - Confirmation: Status will change to "Approved" (green badge)

### **Visual Example:**
```
[Workflow]  [Module]  [Requested By]  [Status: Pending]  [Approve] [Reject]
                                                            ↑ Click here
```

---

## ❌ How to Reject a Request

### **Step-by-Step:**

1. **Find the Request** you want to reject
2. **Click the "Reject" button** (red button) next to the Approve button
3. **Confirmation**: Status will change to "Rejected" (red badge)

⚠️ **Note:** Currently, there's no rejection reason field. The action is immediate.

---

## 🔍 Filter & Search Approvals

### **Filter by Status:**
1. Look for the **status dropdown** at the top
2. Select:
   - **Pending** - Show only items waiting for approval
   - **Approved** - Show approved items
   - **Rejected** - Show rejected items
   - **All** - Show everything

### **Filter by Module:**
- If available, select specific module type (Purchase Orders, Expenses, etc.)
- This helps when you have many approval types

### **Search:**
- Use the search box (if available) to find specific requests
- Search by workflow name, requested by, etc.

---

## 📝 What Happens After Approval/Rejection?

### **After You Click "Approve":**
1. ✅ The approval record status changes to "Approved"
2. ✅ The original record (PO, Expense, etc.) status is updated automatically
3. ✅ The requester may receive a notification (if configured)
4. ✅ The request moves forward in its workflow

### **After You Click "Reject":**
1. ❌ The approval record status changes to "Rejected"
2. ❌ The original record status is updated to "Rejected"
3. ❌ The requester may receive a notification (if configured)
4. ❌ The request is blocked from proceeding

---

## 🔄 Common Approval Workflows

### **1. Purchase Order Approval**
- **Trigger:** Employee creates a Purchase Order with status "Pending Approval"
- **Approver Action:** Review PO details → Approve/Reject
- **After Approval:** PO status changes to "Approved" → Can be sent to supplier

### **2. Expense Approval**
- **Trigger:** Employee submits an expense report
- **Approver Action:** Review expense amount and category → Approve/Reject
- **After Approval:** Expense status changes to "Approved" → Can be paid

### **3. Stock Adjustment Approval**
- **Trigger:** Warehouse staff creates a stock adjustment
- **Approver Action:** Review quantity changes → Approve/Reject
- **After Approval:** Stock quantities are updated in the system

### **4. Purchase Requisition Approval**
- **Trigger:** Department requests materials
- **Approver Action:** Review requisition → Approve/Reject
- **After Approval:** Can be converted to Purchase Order

---

## 🛠️ Technical Details (For Admins)

### **API Endpoint:**
```
POST /api/erp/approvals/:id/process
```

**Request Body:**
```json
{
  "Status": "Approved",  // or "Rejected"
  "ApproverComments": "Looks good, approved for processing"
}
```

### **Backend Process:**
1. Updates the approval record status
2. Finds the linked source record (PO, Expense, etc.)
3. Updates the source record status
4. Creates audit log entry
5. (Optional) Sends notification to requester

### **Database Tables:**
- `Approvals` - Stores all approval requests
- `ApprovalWorkflows` - Defines which modules need approval
- `ApprovalSteps` - (Optional) Multi-level approval steps

---

## ❓ Frequently Asked Questions

### **Q1: I don't see any pending approvals. Why?**
**A:** Possible reasons:
- No one has submitted requests for approval yet
- You don't have approver permissions (contact admin)
- Filters are applied (check status filter)
- Approval workflows are not configured

### **Q2: Can I approve my own requests?**
**A:** It depends on system configuration. Best practice is NO - someone else should approve your requests to maintain proper controls.

### **Q3: What if I accidentally approved/rejected something?**
**A:** Currently, approvals are final. Contact your system administrator to reverse it manually in the database or through a correction workflow.

### **Q4: Can I see approval history?**
**A:** Yes, approved and rejected items remain in the list. Use the status filter to view them.

### **Q5: How do I know if something needs my approval?**
**A:** 
- Check the Approvals page regularly
- Look for "Pending" status items
- (Future) You may receive email/SMS notifications

### **Q6: Can I delegate my approvals to someone else?**
**A:** This feature is not currently implemented. You need to process approvals yourself.

### **Q7: Is there a mobile app for approvals?**
**A:** Not yet, but the web interface is mobile-responsive. You can approve from your phone browser.

---

## 🚨 Approval Best Practices

### **For Approvers:**
✅ **Review thoroughly** before approving  
✅ **Check amounts, quantities, and details**  
✅ **Verify requester identity**  
✅ **Respond promptly** (within 24-48 hours)  
✅ **Ask questions** if something is unclear  
❌ **Don't approve blindly**  
❌ **Don't share your approver credentials**

### **For Requesters:**
✅ **Provide clear descriptions**  
✅ **Include all necessary details**  
✅ **Choose correct priority level**  
✅ **Follow up if delayed**  
✅ **Be available for questions**

---

## 📞 Need Help?

### **Contact:**
- **System Administrator:** [Your IT Admin Contact]
- **Help Desk:** [Your Support Email/Phone]
- **Documentation:** Check system documentation folder

### **Common Issues & Solutions:**

| Issue | Solution |
|-------|----------|
| Can't see Approvals page | Check RBAC permissions with admin |
| Approve button not working | Check internet connection, refresh page |
| Request not updating | Check browser console for errors, contact IT |
| Need to bulk approve | Feature not available yet - approve individually |

---

## 🎓 Training Resources

### **Video Tutorials:**
- (Coming soon) Approval Workflow Overview
- (Coming soon) How to Approve Purchase Orders
- (Coming soon) Troubleshooting Approvals

### **Quick Reference Card:**
```
┌─────────────────────────────────────┐
│  APPROVAL QUICK REFERENCE           │
├─────────────────────────────────────┤
│ 1. Go to: /Admin/ERP/Approvals      │
│ 2. Find: Yellow "Pending" items     │
│ 3. Review: Check details            │
│ 4. Action: Click Approve or Reject  │
│ 5. Done: Status changes to Green/Red│
└─────────────────────────────────────┘
```

---

## 📅 System Configuration (Admin Only)

### **Enable Approval Workflow:**
1. Go to Workflow Definitions (if available)
2. Create a new workflow:
   - **Workflow Name:** "PO Approval"
   - **Module Type:** "PurchaseOrder"
   - **Trigger Condition:** Status = "Pending Approval"
   - **Approver:** Select user or role
   - **Priority:** Set default priority

3. Save and activate

### **Current Workflow Status:**
- ✅ Backend API implemented
- ✅ Frontend page implemented
- ✅ Approve/Reject buttons functional
- ⚠️ Workflow definitions need configuration
- ⚠️ Email notifications not configured
- ⚠️ Multi-level approvals not fully implemented

---

## 🔮 Future Enhancements

**Planned Features:**
- [ ] Multi-level approval chains
- [ ] Email/SMS notifications for pending approvals
- [ ] Bulk approve/reject
- [ ] Approval comments/notes
- [ ] Approval delegation
- [ ] Approval history & audit trail
- [ ] Mobile app
- [ ] Approval analytics dashboard

---

## 📋 Checklist for Approvers

Before approving, verify:

- [ ] Amount is within budget
- [ ] Requester has authority to request
- [ ] Business justification is clear
- [ ] All required fields are filled
- [ ] Supporting documents are attached (if needed)
- [ ] No duplicate requests
- [ ] Follows company policy

---

**Last Updated:** August 21, 2026  
**Version:** 1.0  
**Author:** System Documentation Team

**Need to update this guide?** Contact your system administrator.
