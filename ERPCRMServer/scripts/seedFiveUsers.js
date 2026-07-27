const bcrypt = require("bcryptjs");
const { appPool } = require("../config/db");

const PASSWORD = "Admin@123";

const users = [
  {
    name: "Rahul Sharma",
    email: "rahul.sharma@example.com",
    mobile: "9876543210",
    role: "Owner",
    userType: "Admin",
    firstName: "Rahul",
    lastName: "Sharma",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
  },
  {
    name: "Priya Patel",
    email: "priya.patel@example.com",
    mobile: "9876543211",
    role: "Manager",
    userType: "Manager",
    firstName: "Priya",
    lastName: "Patel",
    city: "Pune",
    state: "Maharashtra",
    country: "India",
  },
  {
    name: "Amit Kumar",
    email: "amit.kumar@example.com",
    mobile: "9876543212",
    role: "TeamLead",
    userType: "TeamLead",
    firstName: "Amit",
    lastName: "Kumar",
    city: "Delhi",
    state: "Delhi",
    country: "India",
  },
  {
    name: "Sneha Reddy",
    email: "sneha.reddy@example.com",
    mobile: "9876543213",
    role: "Employee",
    userType: "Employee",
    firstName: "Sneha",
    lastName: "Reddy",
    city: "Hyderabad",
    state: "Telangana",
    country: "India",
  },
  {
    name: "Vikram Singh",
    email: "vikram.singh@example.com",
    mobile: "9876543214",
    role: "Employee",
    userType: "Employee",
    firstName: "Vikram",
    lastName: "Singh",
    city: "Jaipur",
    state: "Rajasthan",
    country: "India",
  },
];

const run = async () => {
  const client = await appPool.connect();
  try {
    await client.query("BEGIN");

    // 1. Create Company
    const companyResult = await client.query(
      `INSERT INTO "Companies" ("CompanyName", "BusinessType", "Email", "Phone", "City", "State", "Country", "OwnerName", "IsActive", "Flag", "IsDelete")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, TRUE, FALSE)
       RETURNING "Id"`,
      ["Demo Corp", "Technology", "contact@democorp.example.com", "9876543200", "Mumbai", "Maharashtra", "India", "Rahul Sharma"]
    );
    const companyId = companyResult.rows[0].Id;
    console.log(`✅ Company created (ID: ${companyId})`);

    // 2. Map to standard 5-role system (1=superadmin, 2=admin, 3=manager, 4=employee, 5=customer)
    const roleNameToId = {
      'Owner': 1,      // superadmin
      'Admin': 2,      // admin
      'Manager': 3,    // manager
      'TeamLead': 3,   // manager
      'Employee': 4,   // employee
    };
    const roleIds = {};
    for (const u of users) {
      const standardRoleId = roleNameToId[u.role] || 4; // default to employee
      const existing = await client.query(`SELECT "Id" FROM "Roles" WHERE "Id" = $1`, [standardRoleId]);
      if (existing.rows.length) {
        roleIds[u.role] = standardRoleId;
      } else {
        // Create the standard role if it doesn't exist
        const roleNameMap = { 1: 'superadmin', 2: 'admin', 3: 'manager', 4: 'employee', 5: 'customer' };
        const ins = await client.query(
          `INSERT INTO "Roles" ("Id", "RoleName", "IsActive", "IsDeleted", "Flag") VALUES ($1, $2, TRUE, FALSE, TRUE) RETURNING "Id"`,
          [standardRoleId, roleNameMap[standardRoleId] || u.role]
        );
        roleIds[u.role] = standardRoleId;
      }
    }
    console.log(`✅ Roles mapped: ${JSON.stringify(roleIds)} (using standard 5-role system)`);

    // 3. Create UserTypes
    const userTypeIds = {};
    for (const u of users) {
      if (!userTypeIds[u.userType]) {
        const existing = await client.query(`SELECT "Id" FROM "UserTypes" WHERE "UserType" = $1`, [u.userType]);
        if (existing.rows.length) {
          userTypeIds[u.userType] = existing.rows[0].Id;
        } else {
          const ins = await client.query(
            `INSERT INTO "UserTypes" ("UserType") VALUES ($1) RETURNING "Id"`,
            [u.userType]
          );
          userTypeIds[u.userType] = ins.rows[0].Id;
        }
      }
    }
    console.log(`✅ UserTypes created: ${JSON.stringify(userTypeIds)}`);

    // 4. Create Users with hierarchy
    const hashedPassword = await bcrypt.hash(PASSWORD, 10);
    const userIds = [];
    let hierarchyPath = "";

    for (let i = 0; i < users.length; i++) {
      const u = users[i];
      const reportingManagerId = i === 0 ? null : userIds[i - 1];
      const hierarchyLevel = i + 1;

      if (i === 0) {
        hierarchyPath = "";
      }

      const result = await client.query(
        `INSERT INTO "Users" (
          "Name", "Email", "Password", "MobileNumber", "CompanyId",
          "RoleId", "UserTypeId", "ReportingManagerId", "CreatedBy",
          "HierarchyLevel", "HierarchyPath", "FirstName", "LastName",
          "City", "State", "Country", "IsActive", "Flag", "IsDelete"
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,TRUE,TRUE,FALSE)
        RETURNING "UserId"`,
        [
          u.name, u.email, hashedPassword, u.mobile, companyId,
          roleIds[u.role], userTypeIds[u.userType], reportingManagerId, reportingManagerId,
          hierarchyLevel, "", u.firstName, u.lastName,
          u.city, u.state, u.country,
        ]
      );
      const userId = result.rows[0].UserId;
      userIds.push(userId);

      // Update hierarchy path
      const newPath = i === 0 ? `${userId}` : `${hierarchyPath}/${userId}`;
      await client.query(`UPDATE "Users" SET "HierarchyPath" = $1 WHERE "UserId" = $2`, [newPath, userId]);
      hierarchyPath = newPath;
    }
    console.log(`✅ Users created: ${userIds.join(", ")}`);

    // 5. Create Accounts (Accounts table: CompanyId, Name, Website, Description, AccountOwnerId, CreatedBy, IsActive, IsDeleted)
    const accountIds = [];
    const accountData = [
      { name: "Tech Solutions Pvt Ltd", website: "https://techsolutions.in", desc: "Technology solutions provider" },
      { name: "Green Energy Corp", website: "https://greenenergy.in", desc: "Renewable energy company" },
      { name: "HealthFirst Hospitals", website: "https://healthfirst.in", desc: "Healthcare services provider" },
    ];

    for (const acc of accountData) {
      const ins = await client.query(
        `INSERT INTO "Accounts" ("CompanyId", "Name", "Website", "Description", "AccountOwnerId", "CreatedBy", "IsActive", "IsDeleted")
         VALUES ($1,$2,$3,$4,$5,$6,TRUE,FALSE) RETURNING "Id"`,
        [companyId, acc.name, acc.website, acc.desc, userIds[0], userIds[0]]
      );
      accountIds.push(ins.rows[0].Id);
    }
    console.log(`✅ Accounts created: ${accountIds.join(", ")}`);

    // 6. Create Contacts
    const contactIds = [];
    const contactData = [
      { first: "Rajesh", last: "Gupta", email: "rajesh@techsolutions.in", phone: "9876543220", title: "CTO", accIdx: 0 },
      { first: "Meera", last: "Joshi", email: "meera@greenenergy.in", phone: "9876543221", title: "VP Sales", accIdx: 1 },
      { first: "Dr. Arjun", last: "Mehta", email: "arjun@healthfirst.in", phone: "9876543222", title: "Director", accIdx: 2 },
    ];

    for (const c of contactData) {
      const ins = await client.query(
        `INSERT INTO "Contacts" ("CompanyId", "AccountId", "FirstName", "LastName", "Email", "Phone", "Title", "IsActive", "IsDeleted", "CreatedBy")
         VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE,FALSE,$8) RETURNING "Id"`,
        [companyId, accountIds[c.accIdx], c.first, c.last, c.email, c.phone, c.title, userIds[0]]
      );
      contactIds.push(ins.rows[0].Id);
    }
    console.log(`✅ Contacts created: ${contactIds.join(", ")}`);

    // 7. Create Leads
    const leadData = [
      { name: "Tech Solutions Pvt Ltd", website: "https://techsolutions.in", first: "Rajesh", last: "Gupta", email: "rajesh@techsolutions.in", phone: "9876543220", title: "CTO", status: "New", rating: 4, value: 500000, desc: "Enterprise software solution for inventory management", assignIdx: 1, accIdx: 0, conIdx: 0 },
      { name: "Green Energy Corp", website: "https://greenenergy.in", first: "Meera", last: "Joshi", email: "meera@greenenergy.in", phone: "9876543221", title: "VP Sales", status: "Contacted", rating: 3, value: 300000, desc: "Solar panel installation project management", assignIdx: 2, accIdx: 1, conIdx: 1 },
      { name: "HealthFirst Hospitals", website: "https://healthfirst.in", first: "Dr. Arjun", last: "Mehta", email: "arjun@healthfirst.in", phone: "9876543222", title: "Director", status: "Qualified", rating: 5, value: 750000, desc: "Hospital management system implementation", assignIdx: 3, accIdx: 2, conIdx: 2 },
      { name: "RetailMax Stores", website: "https://retailmax.in", first: "Kavita", last: "Desai", email: "kavita@retailmax.in", phone: "9876543223", title: "Operations Head", status: "New", rating: 2, value: 200000, desc: "Point of sale system for retail chain", assignIdx: 4, accIdx: 0, conIdx: 0 },
      { name: "EduLearn Academy", website: "https://edulearn.in", first: "Suresh", last: "Nair", email: "suresh@edulearn.in", phone: "9876543224", title: "Principal", status: "Contacted", rating: 4, value: 150000, desc: "Learning management system for schools", assignIdx: 1, accIdx: 1, conIdx: 1 },
    ];

    const leadIds = [];
    for (const l of leadData) {
      const ins = await client.query(
        `INSERT INTO "Leads" (
          "CompanyId", "AccountId", "ContactId", "ProspectAccountName", "ProspectAccountWebsite",
          "ProspectContactFirstName", "ProspectContactLastName", "ProspectContactEmail",
          "ProspectContactPhone", "ProspectContactTitle", "Status", "Rating", "ExpectedValue",
          "Description", "AssignedTo", "CreatedBy", "IsActive", "IsDeleted"
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,TRUE,FALSE)
        RETURNING "Id"`,
        [
          companyId, accountIds[l.accIdx], contactIds[l.conIdx],
          l.name, l.website, l.first, l.last, l.email, l.phone, l.title,
          l.status, l.rating, l.value, l.desc,
          userIds[l.assignIdx], userIds[0],
        ]
      );
      leadIds.push(ins.rows[0].Id);
    }
    console.log(`✅ Leads created: ${leadIds.join(", ")}`);

    // 8. Create Opportunities (Opportunities table: OpportunityName, BudgetAmount, EstCloseDate, Status, AccountOwnerId, AssignedTo, CreatedBy)
    const oppData = [
      { name: "Tech Solutions - ERP Implementation", value: 500000, accIdx: 0, conIdx: 0, assignIdx: 1 },
      { name: "Green Energy - Solar Project CRM", value: 300000, accIdx: 1, conIdx: 1, assignIdx: 2 },
      { name: "HealthFirst - HMS Deployment", value: 750000, accIdx: 2, conIdx: 2, assignIdx: 3 },
    ];

    const oppIds = [];
    for (const o of oppData) {
      const ins = await client.query(
        `INSERT INTO "Opportunities" (
          "CompanyId", "AccountId", "ContactId", "OpportunityName", "BudgetAmount",
          "EstCloseDate", "Status", "AssignedTo", "CreatedBy", "IsActive", "IsDeleted"
        ) VALUES ($1,$2,$3,$4,$5,CURRENT_DATE + INTERVAL '90 days','Open',$6,$7,TRUE,FALSE)
        RETURNING "Id"`,
        [companyId, accountIds[o.accIdx], contactIds[o.conIdx], o.name, o.value, userIds[o.assignIdx], userIds[0]]
      );
      oppIds.push(ins.rows[0].Id);
    }
    console.log(`✅ Opportunities created: ${oppIds.join(", ")}`);

    // 9. Create Activities (tasks/notes for each user)
    const activityData = [
      { subject: "Initial meeting with Tech Solutions", type: "Call", status: "Completed", assignIdx: 1 },
      { subject: "Follow up with Green Energy", type: "Email", status: "Open", assignIdx: 2 },
      { subject: "Demo for HealthFirst Hospitals", type: "Meeting", status: "Open", assignIdx: 3 },
      { subject: "Proposal sent to RetailMax", type: "Task", status: "Completed", assignIdx: 4 },
      { subject: "Onboarding call with EduLearn", type: "Call", status: "Open", assignIdx: 1 },
      { subject: "Weekly team sync", type: "Meeting", status: "Completed", assignIdx: 0 },
      { subject: "Review pending proposals", type: "Task", status: "Open", assignIdx: 0 },
    ];

    for (const a of activityData) {
      await client.query(
        `INSERT INTO "Activities" (
          "CompanyId", "Subject", "Type", "Status", "AssignedTo", "CreatedBy", "IsActive", "IsDeleted"
        ) VALUES ($1,$2,$3,$4,$5,$6,TRUE,FALSE)`,
        [companyId, a.subject, a.type, a.status, userIds[a.assignIdx], userIds[0]]
      );
    }
    console.log(`✅ Activities created: ${activityData.length}`);

    await client.query("COMMIT");

    console.log("\n========================================");
    console.log("   DATABASE SEED COMPLETED SUCCESSFULLY");
    console.log("========================================\n");
    console.log("COMPANY: Demo Corp");
    console.log(`COMPANY ID: ${companyId}`);
    console.log("");
    console.log("USERS CREATED WITH CREDENTIALS:");
    console.log("----------------------------------------");
    for (let i = 0; i < users.length; i++) {
      const u = users[i];
      console.log(`  User ${i + 1}:`);
      console.log(`    Name     : ${u.name}`);
      console.log(`    Email    : ${u.email}`);
      console.log(`    Password : ${PASSWORD}`);
      console.log(`    Role     : ${u.role}`);
      console.log(`    Type     : ${u.userType}`);
      console.log(`    Mobile   : ${u.mobile}`);
      console.log(`    City     : ${u.city}`);
      console.log(`    UserId   : ${userIds[i]}`);
      console.log("");
    }
    console.log("RELATED RECORDS SUMMARY:");
    console.log("----------------------------------------");
    console.log(`  Accounts       : ${accountIds.length}`);
    console.log(`  Contacts       : ${contactIds.length}`);
    console.log(`  Leads          : ${leadIds.length}`);
    console.log(`  Opportunities  : ${oppIds.length}`);
    console.log(`  Activities     : ${activityData.length}`);
    console.log("");
    console.log("========================================");

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Seed failed:", error.message);
    console.error(error);
    process.exitCode = 1;
  } finally {
    client.release();
    await appPool.end();
  }
};

run();