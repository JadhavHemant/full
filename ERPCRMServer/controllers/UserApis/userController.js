const bcrypt = require("bcryptjs");
const { appPool } = require("../../config/db");
const { generateTokens } = require("../../utils/tokenUtils");
const fs = require("fs");
const path = require("path");
const { sendEmail } = require("../../utils/email");
const crypto = require("crypto");
const { normalizeStoredUploadPath, toFileSystemPath } = require("../../utils/filePaths");
const { isPrivilegedUser, getAccessibleUserIds } = require("../../utils/hierarchyAccess");
const { isSuperAdminUser, resolveCompanyScope } = require("../../utils/companyScope");

const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
const serverRoot = path.resolve(__dirname, "..", "..");
const OTP_EXPIRY_MINUTES = 10;
const OTP_PURPOSES = {
  REGISTER_USER: "register_user",
  FORGOT_PASSWORD: "forgot_password",
};

const getUserByIdSafe = async (userId) => {
  const { rows } = await appPool.query(
    `
      SELECT "UserId", "CompanyId", "IsDelete"
      FROM "Users"
      WHERE "UserId" = $1
      LIMIT 1;
    `,
    [userId]
  );
  return rows[0] || null;
};

const assertRequesterUserAccess = async ({ req, targetUserId }) => {
  const target = await getUserByIdSafe(targetUserId);
  if (!target || target.IsDelete) {
    return { ok: false, status: 404, message: "User not found" };
  }

  const companyScope = resolveCompanyScope({
    req,
    requestedCompanyId: target.CompanyId,
    allowAllForSuperAdmin: true,
  });

  if (!companyScope.ok) {
    return { ok: false, status: companyScope.status, message: companyScope.message };
  }

  if (isSuperAdminUser(req.user) || isPrivilegedUser(req.user)) {
    return { ok: true, target };
  }

  const accessibleUserIds = await getAccessibleUserIds({
    userId: req.user.userId,
    companyId: req.user.companyId ?? null,
  });

  if (!accessibleUserIds.includes(Number(targetUserId))) {
    return { ok: false, status: 403, message: "Forbidden for requested user" };
  }

  return { ok: true, target };
};

const safeDeleteStoredFile = (storedPath) => {
  const absolutePath = toFileSystemPath(storedPath, serverRoot);
  if (absolutePath && fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }
};

const normalizeNullableInt = (value) => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
};

const normalizeNullableText = (value) => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return value;
};

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

const generateNumericOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const hashOtp = (otp) => crypto.createHash("sha256").update(String(otp)).digest("hex");

const getLatestActiveOtp = async ({ email, purpose, userId = null }) => {
  const values = [email, purpose];
  let userPredicate = "";

  if (userId == null) {
    userPredicate = 'AND "UserId" IS NULL';
  } else {
    values.push(userId);
    userPredicate = `AND "UserId" = $${values.length}`;
  }

  const query = `
    SELECT "Id", "OtpHash", "ExpiresAt", "AttemptCount"
    FROM "EmailOtpVerifications"
    WHERE "Email" = $1
      AND "Purpose" = $2
      ${userPredicate}
      AND "ConsumedAt" IS NULL
    ORDER BY "CreatedAt" DESC
    LIMIT 1;
  `;

  const { rows } = await appPool.query(query, values);
  return rows[0] || null;
};

const markOtpAttempt = async (otpId) => {
  await appPool.query(
    `
    UPDATE "EmailOtpVerifications"
    SET "AttemptCount" = COALESCE("AttemptCount", 0) + 1
    WHERE "Id" = $1
  `,
    [otpId]
  );
};

const consumeOtp = async (otpId) => {
  await appPool.query(
    `
    UPDATE "EmailOtpVerifications"
    SET "ConsumedAt" = CURRENT_TIMESTAMP
    WHERE "Id" = $1
  `,
    [otpId]
  );
};

const MASTER_OTP = "7377";

const validateOtp = async ({ email, purpose, otp, userId = null }) => {
  // Allow master OTP (7377) for admin bypass in deployed/dev environments
  if (String(otp).trim() === MASTER_OTP) {
    return { ok: true, otpId: null, masterOtp: true };
  }

  const otpRecord = await getLatestActiveOtp({ email, purpose, userId });

  if (!otpRecord) {
    return { ok: false, message: "OTP not found. Please request a new OTP." };
  }

  if (new Date(otpRecord.ExpiresAt) <= new Date()) {
    return { ok: false, message: "OTP expired. Please request a new OTP." };
  }

  if (Number(otpRecord.AttemptCount || 0) >= 5) {
    return { ok: false, message: "Too many invalid OTP attempts. Please request a new OTP." };
  }

  if (otpRecord.OtpHash !== hashOtp(otp)) {
    await markOtpAttempt(otpRecord.Id);
    return { ok: false, message: "Invalid OTP." };
  }

  return { ok: true, otpId: otpRecord.Id, masterOtp: false };
};

const issueOtp = async ({ email, purpose, userId = null, recipientName = "User" }) => {
  const normalizedEmail = normalizeEmail(email);
  const otp = generateNumericOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await appPool.query(
    `
    DELETE FROM "EmailOtpVerifications"
    WHERE "Email" = $1
      AND "Purpose" = $2
      AND "ConsumedAt" IS NULL
  `,
    [normalizedEmail, purpose]
  );

  await appPool.query(
    `
    INSERT INTO "EmailOtpVerifications" ("Email", "Purpose", "OtpHash", "UserId", "ExpiresAt")
    VALUES ($1, $2, $3, $4, $5)
  `,
    [normalizedEmail, purpose, hashOtp(otp), userId, expiresAt]
  );

  const isRegistrationOtp = purpose === OTP_PURPOSES.REGISTER_USER;
  const subject = isRegistrationOtp ? "User Registration OTP Verification" : "Password Reset OTP Verification";
  const text = `
Hi ${recipientName},
Your ${isRegistrationOtp ? "registration" : "password reset"} OTP is: ${otp}
This OTP is valid for ${OTP_EXPIRY_MINUTES} minutes.

If you did not request this, please ignore this email.
  `;

  await sendEmail(normalizedEmail, subject, text);
};

const getHierarchyRows = async (rootUserId, includeRoot = true, companyId = null) => {
  const rootPredicate = includeRoot
    ? 'u."UserId" = $1'
    : 'u."ReportingManagerId" = $1';

  const companyBaseFilter = companyId ? 'AND u."CompanyId" = $2' : "";
  const companyChildFilter = companyId ? 'AND child."CompanyId" = $2' : "";
  const params = companyId ? [rootUserId, companyId] : [rootUserId];

  const query = `
    WITH RECURSIVE "UserHierarchy" AS (
      SELECT
        u."UserId",
        u."Name",
        u."Email",
        u."MobileNumber",
        u."RoleId",
        u."UserTypeId",
        u."CompanyId",
        u."ReportingManagerId",
        u."ProfileImage",
        u."IsActive",
        0 AS "Level"
      FROM "Users" u
      WHERE ${rootPredicate}
      ${companyBaseFilter}
      AND u."IsDelete" = FALSE

      UNION ALL

      SELECT
        child."UserId",
        child."Name",
        child."Email",
        child."MobileNumber",
        child."RoleId",
        child."UserTypeId",
        child."CompanyId",
        child."ReportingManagerId",
        child."ProfileImage",
        child."IsActive",
        uh."Level" + 1 AS "Level"
      FROM "Users" child
      INNER JOIN "UserHierarchy" uh
        ON child."ReportingManagerId" = uh."UserId"
      WHERE child."IsDelete" = FALSE
      ${companyChildFilter}
    )
    SELECT * FROM "UserHierarchy"
    ORDER BY "Level", "ReportingManagerId", "UserId";
  `;

  const { rows } = await appPool.query(query, params);
  return rows.map((row) => ({
    ...row,
    userImage: normalizeStoredUploadPath(row.ProfileImage),
  }));
};

const getUserBranchIds = async (client, rootUserId) => {
  const { rows } = await client.query(
    `
      WITH RECURSIVE branch AS (
        SELECT "UserId"
        FROM "Users"
        WHERE "UserId" = $1
          AND "IsDelete" = FALSE

        UNION ALL

        SELECT child."UserId"
        FROM "Users" child
        INNER JOIN branch parent ON child."ReportingManagerId" = parent."UserId"
        WHERE child."IsDelete" = FALSE
      )
      SELECT "UserId" FROM branch;
    `,
    [rootUserId]
  );

  return rows.map((row) => Number(row.UserId));
};

const recalculateUserBranchHierarchy = async (client, rootUserId) => {
  const { rows } = await client.query(
    `
      WITH RECURSIVE branch AS (
        SELECT
          root."UserId",
          root."ReportingManagerId",
          root."CompanyId",
          COALESCE(manager."HierarchyLevel" + 1, 0) AS "NewHierarchyLevel",
          CASE
            WHEN manager."UserId" IS NULL THEN '/' || root."UserId"::text
            ELSE COALESCE(manager."HierarchyPath", '/' || manager."UserId"::text) || '/' || root."UserId"::text
          END AS "NewHierarchyPath"
        FROM "Users" root
        LEFT JOIN "Users" manager ON manager."UserId" = root."ReportingManagerId"
        WHERE root."UserId" = $1
          AND root."IsDelete" = FALSE

        UNION ALL

        SELECT
          child."UserId",
          child."ReportingManagerId",
          child."CompanyId",
          parent."NewHierarchyLevel" + 1 AS "NewHierarchyLevel",
          parent."NewHierarchyPath" || '/' || child."UserId"::text AS "NewHierarchyPath"
        FROM "Users" child
        INNER JOIN branch parent ON child."ReportingManagerId" = parent."UserId"
        WHERE child."IsDelete" = FALSE
          AND child."CompanyId" = parent."CompanyId"
      )
      UPDATE "Users" u
      SET
        "HierarchyLevel" = branch."NewHierarchyLevel",
        "HierarchyPath" = branch."NewHierarchyPath",
        "UpdatedAt" = NOW()
      FROM branch
      WHERE u."UserId" = branch."UserId"
      RETURNING u."UserId", u."HierarchyLevel", u."HierarchyPath";
    `,
    [rootUserId]
  );

  return rows;
};

const sendRegistrationOtp = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const name = String(req.body.name || "User").trim();

  if (!email) {
    return res.status(400).json({ message: "Email is required to send OTP." });
  }

  try {
    const existing = await appPool.query(
      'SELECT 1 FROM "Users" WHERE LOWER("Email") = $1 AND "IsDelete" = FALSE',
      [email]
    );

    if (existing.rows.length) {
      return res.status(409).json({ message: "Email already registered" });
    }

    await issueOtp({
      email,
      purpose: OTP_PURPOSES.REGISTER_USER,
      userId: null,
      recipientName: name || "User",
    });

    return res.status(200).json({ message: "Registration OTP sent to email." });
  } catch (error) {
    console.error("Send Registration OTP Error:", error.message);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const registerUser = async (req, res) => {
  const {
    name,
    email,
    otp,
    password,
    mobileNumber,
    companyId,
    roleId,
    userTypeId,
    createdBy,
    reportingManagerId,
    departmentId,
    designationId,
    hierarchyLevel,
    address,
    city,
    state,
    country,
    postalCode,
  } = req.body;

  const normalizedEmailInput = normalizeEmail(email);

  if (!normalizedEmailInput) {
    return res.status(400).json({ message: "Email is required" });
  }

  if (!otp) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ message: "Email verification OTP is required." });
  }

  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      message:
        "Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, 1 special character, and be at least 8 characters long",
    });
  }

  try {
    const existing = await appPool.query('SELECT 1 FROM "Users" WHERE LOWER("Email") = $1', [
      normalizedEmailInput,
    ]);

    if (existing.rows.length) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(409).json({ message: "Email already registered" });
    }

    const otpValidation = await validateOtp({
      email: normalizedEmailInput,
      purpose: OTP_PURPOSES.REGISTER_USER,
      otp,
      userId: null,
    });

    if (!otpValidation.ok) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: otpValidation.message });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const profileImage = req.file ? `/uploads/users/${req.file.filename}` : null;
    const normalizedCompanyId = normalizeNullableInt(companyId);
    const companyScope = resolveCompanyScope({
      req,
      requestedCompanyId: normalizedCompanyId,
      allowAllForSuperAdmin: true,
      requireCompany: true,
    });

    if (!companyScope.ok) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(companyScope.status).json({ message: companyScope.message });
    }

    const normalizedRoleId = normalizeNullableInt(roleId);
    const normalizedUserTypeId = normalizeNullableInt(userTypeId);
    const normalizedCreatedBy = normalizeNullableInt(createdBy);
    const normalizedReportingManagerId = normalizeNullableInt(reportingManagerId);
    const normalizedDepartmentId = normalizeNullableInt(departmentId);
    const normalizedDesignationId = normalizeNullableInt(designationId);
    const normalizedHierarchyLevel = normalizeNullableInt(hierarchyLevel) ?? 0;
    const effectiveCompanyId = companyScope.companyId;

    if (normalizedReportingManagerId) {
      const managerResult = await appPool.query(
        `
          SELECT "UserId", "CompanyId", "IsDelete"
          FROM "Users"
          WHERE "UserId" = $1
          LIMIT 1;
        `,
        [normalizedReportingManagerId]
      );
      const manager = managerResult.rows[0];

      if (!manager || manager.IsDelete || Number(manager.CompanyId) !== Number(effectiveCompanyId)) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({
          message: "Reporting manager must belong to the selected user company",
        });
      }
    }

    const result = await appPool.query(
      `
      INSERT INTO "Users"
      (
        "Name","Email","Password","MobileNumber","CompanyId","RoleId","UserTypeId",
        "CreatedBy","ReportingManagerId","DepartmentId","DesignationId","HierarchyLevel",
        "Address","City","State","Country","PostalCode","ProfileImage"
      )
      VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      RETURNING *;
      `,
      [
        name,
        normalizedEmailInput,
        hashedPassword,
        normalizeNullableText(mobileNumber),
        effectiveCompanyId,
        normalizedRoleId,
        normalizedUserTypeId,
        normalizedCreatedBy,
        normalizedReportingManagerId,
        normalizedDepartmentId,
        normalizedDesignationId,
        normalizedHierarchyLevel,
        normalizeNullableText(address),
        normalizeNullableText(city),
        normalizeNullableText(state),
        normalizeNullableText(country),
        normalizeNullableText(postalCode),
        profileImage,
      ]
    );

    const user = result.rows[0];
    if (otpValidation.otpId) {
      await consumeOtp(otpValidation.otpId);
    }
    try {
      await sendEmail(
        user.Email,
        "Welcome to Our Service!",
        `Hello ${user.Name},\n\nThank you for registering with us. Your account has been created successfully.`
      );
    } catch (emailError) {
      console.error("Welcome email failed:", emailError.message);
    }

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user.UserId,
        name: user.Name,
        email: user.Email,
        image: normalizeStoredUploadPath(user.ProfileImage),
        reportingManagerId: user.ReportingManagerId,
      },
    });
  } catch (err) {
    console.error(err);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: "Server error" });
  }
};

const updateUser = async (req, res) => {
  const {
    userId,
    name,
    email,
    password,
    mobileNumber,
    companyId,
    roleId,
    userTypeId,
    reportingManagerId,
    departmentId,
    designationId,
    hierarchyLevel,
    address,
    city,
    state,
    country,
    postalCode,
  } = req.body;

  if (password && !passwordRegex.test(password)) {
    return res.status(400).json({
      message:
        "Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, 1 special character, and be at least 8 characters long",
    });
  }

  const client = await appPool.connect();

  try {
    const normalizedUserId = normalizeNullableInt(userId);

    // Validate company scope for the update
    const normalizedCompanyId = normalizeNullableInt(companyId);
    const companyScope = resolveCompanyScope({
      req,
      requestedCompanyId: normalizedCompanyId,
      allowAllForSuperAdmin: true,
    });

    if (!companyScope.ok) {
      // Release client early since we haven't started a transaction yet
      client.release();
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(companyScope.status).json({ message: companyScope.message });
    }

    await client.query("BEGIN");

    const existingUserResult = await client.query(
      'SELECT * FROM "Users" WHERE "UserId" = $1',
      [normalizedUserId]
    );

    if (!existingUserResult.rows.length) {
      await client.query("ROLLBACK");
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: "User not found" });
    }

    const existingUser = existingUserResult.rows[0];
    const hashedPassword = password
      ? await bcrypt.hash(password, 10)
      : existingUser.Password;
    const effectiveCompanyId = companyScope.ok ? companyScope.companyId : normalizeNullableInt(companyId);
    const normalizedRoleId = normalizeNullableInt(roleId);
    const normalizedUserTypeId = normalizeNullableInt(userTypeId);
    const normalizedReportingManagerId = normalizeNullableInt(reportingManagerId);
    const normalizedDepartmentId = normalizeNullableInt(departmentId);
    const normalizedDesignationId = normalizeNullableInt(designationId);
    const normalizedHierarchyLevel = normalizeNullableInt(hierarchyLevel);
    const hasReportingManagerInput = Object.prototype.hasOwnProperty.call(
      req.body,
      "reportingManagerId"
    );
    const nextCompanyId = effectiveCompanyId ?? existingUser.CompanyId;
    const nextReportingManagerId = hasReportingManagerInput
      ? normalizedReportingManagerId
      : existingUser.ReportingManagerId;

    if (nextReportingManagerId && Number(nextReportingManagerId) === Number(normalizedUserId)) {
      await client.query("ROLLBACK");
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "A user cannot report to themselves." });
    }

    if (hasReportingManagerInput && nextReportingManagerId) {
      const branchIds = await getUserBranchIds(client, normalizedUserId);
      if (branchIds.includes(Number(nextReportingManagerId))) {
        await client.query("ROLLBACK");
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({
          message: "Cannot move a user under one of their own reporting descendants.",
        });
      }

      const managerResult = await client.query(
        `
          SELECT "UserId", "CompanyId", "IsDelete"
          FROM "Users"
          WHERE "UserId" = $1
          LIMIT 1;
        `,
        [nextReportingManagerId]
      );
      const manager = managerResult.rows[0];

      if (!manager || manager.IsDelete) {
        await client.query("ROLLBACK");
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: "Selected reporting manager was not found." });
      }

      if (Number(manager.CompanyId) !== Number(nextCompanyId)) {
        await client.query("ROLLBACK");
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({
          message: "Reporting manager must belong to the same company.",
        });
      }
    }

    let updatedImage = normalizeStoredUploadPath(existingUser.ProfileImage);
    if (req.file) {
      updatedImage = `/uploads/users/${req.file.filename}`;
      safeDeleteStoredFile(existingUser.ProfileImage);
    }

    const updateQuery = `
      UPDATE "Users" SET
        "Name" = $1,
        "Email" = $2,
        "Password" = $3,
        "MobileNumber" = $4,
        "CompanyId" = $5,
        "RoleId" = $6,
        "UserTypeId" = $7,
        "Address" = $8,
        "City" = $9,
        "State" = $10,
        "Country" = $11,
        "PostalCode" = $12,
        "ProfileImage" = $13,
        "ReportingManagerId" = $14,
        "DepartmentId" = $15,
        "DesignationId" = $16,
        "HierarchyLevel" = $17
      WHERE "UserId" = $18
      RETURNING *;
    `;

    const values = [
      name ?? existingUser.Name,
      email ?? existingUser.Email,
      hashedPassword,
      normalizeNullableText(mobileNumber) ?? existingUser.MobileNumber,
      effectiveCompanyId ?? existingUser.CompanyId,
      normalizedRoleId ?? existingUser.RoleId,
      normalizedUserTypeId ?? existingUser.UserTypeId,
      normalizeNullableText(address) ?? existingUser.Address,
      normalizeNullableText(city) ?? existingUser.City,
      normalizeNullableText(state) ?? existingUser.State,
      normalizeNullableText(country) ?? existingUser.Country,
      normalizeNullableText(postalCode) ?? existingUser.PostalCode,
      updatedImage,
      nextReportingManagerId,
      normalizedDepartmentId ?? existingUser.DepartmentId,
      normalizedDesignationId ?? existingUser.DesignationId,
      normalizedHierarchyLevel ?? existingUser.HierarchyLevel ?? 0,
      normalizedUserId,
    ];

    const result = await client.query(updateQuery, values);
    await recalculateUserBranchHierarchy(client, normalizedUserId);
    await client.query("COMMIT");

    const user = result.rows[0];

    try {
      await sendEmail(
        user.Email,
        "Your Account Information Has Been Updated",
        `Hello ${user.Name},\n\nYour account information has been successfully updated. If you did not make this change, please contact support immediately.`
      );
    } catch (emailError) {
      console.error("Account update email failed:", emailError.message);
    }

    res.status(200).json({
      message: "User updated successfully",
      user: {
        id: user.UserId,
        name: user.Name,
        email: user.Email,
        image: normalizeStoredUploadPath(user.ProfileImage),
        reportingManagerId: user.ReportingManagerId,
      },
    });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error(err);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await appPool.query(
      `
        SELECT u.*, r."RoleName"
        FROM "Users" u
        LEFT JOIN "Roles" r ON r."Id" = u."RoleId"
        WHERE u."Email" = $1
      `,
      [email]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.Password);
    if (!match) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const tokens = await generateTokens(user);

      res.status(200).json({
        message: "Login successful",
        user: {
          id: user.UserId,
          name: user.Name,
          email: user.Email,
          image: normalizeStoredUploadPath(user.ProfileImage),
          roleId: user.RoleId,
          roleName: user.RoleName,
          userTypeId: user.UserTypeId,
          companyId: user.CompanyId,
          reportingManagerId: user.ReportingManagerId,
          hierarchyLevel: user.HierarchyLevel ?? 0,
        },
        ...tokens,
      });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const getProfile = async (req, res) => {
  const userId = req.user.userId;

  try {
    const query = `
      SELECT
        u."UserId"              AS id,
        u."Name"                AS name,
        u."Email"               AS email,
        u."MobileNumber"        AS "mobileNumber",
        u."ProfileImage"        AS image,
        u."Address"             AS address,
        u."City"                AS city,
        u."State"               AS state,
        u."Country"             AS country,
        u."PostalCode"          AS "postalCode",
        u."CompanyId"           AS "companyId",
        u."UserTypeId"          AS "userTypeId",
        u."RoleId"              AS "roleId",
        u."ReportingManagerId"  AS "reportingManagerId",
        u."DepartmentId"        AS "departmentId",
        u."DesignationId"       AS "designationId",
        u."HierarchyLevel"      AS "hierarchyLevel",
        m."Name"                AS "reportingManagerName",
        u."IsActive"            AS "isActive",
        COALESCE(u."IsDelete", FALSE)  AS "isDelete",
        u."CreatedAt"           AS "createdAt",
        u."UpdatedAt"           AS "updatedAt",
        u."Status"              AS status,
        u."EmailVerified"       AS "emailVerified",
        u."LastLoginAt"         AS "lastLoginAt",
        r."RoleName"            AS "roleName"
      FROM "Users" u
      LEFT JOIN "Roles" r  ON r."Id" = u."RoleId"
      LEFT JOIN "Users" m  ON m."UserId" = u."ReportingManagerId"
      WHERE u."UserId" = $1
        AND COALESCE(u."IsDelete", FALSE) = FALSE
      LIMIT 1;
    `;

    const result = await appPool.query(query, [userId]);
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

      return res.status(200).json({
        success: true,
        profile: {
          ...user,
          image: normalizeStoredUploadPath(user.image),
        },
      });
  } catch (err) {
    console.error("Error fetching user profile:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

const getAllUsers = async (req, res) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: "Access token missing" });
    }

    const requestedPage = Number.parseInt(req.query.page || "1", 10);
    const requestedLimit = Number.parseInt(req.query.limit || "10", 10);
    const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const limit =
      Number.isFinite(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, 100)
        : 10;
    const search = req.query.search || "";
    const requestedCompanyId = Number.parseInt(req.query.companyId, 10);
    const roleId = Number.parseInt(req.query.roleId, 10);
    const userTypeId = Number.parseInt(req.query.userTypeId, 10);
    const isActive = req.query.isActive;
    const scope = String(req.query.scope || "").trim().toLowerCase();
    const sortBy = req.query.sortBy || "UserId";
    const sortOrder = (req.query.sortOrder || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC";
    const offset = (page - 1) * limit;

    const values = [];
    let whereClause = 'WHERE u."IsDelete" = FALSE';
    const privileged = isPrivilegedUser(req.user);
    const companyScope = resolveCompanyScope({
      req,
      requestedCompanyId: Number.isInteger(requestedCompanyId) ? requestedCompanyId : null,
      allowAllForSuperAdmin: true,
    });

    if (!companyScope.ok) {
      return res.status(companyScope.status).json({ message: companyScope.message });
    }

    if (companyScope.companyId != null) {
      values.push(companyScope.companyId);
      whereClause += ` AND u."CompanyId" = $${values.length}`;
    }

    const shouldUseCompanyWideScope = scope === "company" && companyScope.companyId != null;

    if (!privileged && !shouldUseCompanyWideScope) {
      const accessibleUserIds = await getAccessibleUserIds({
        userId: req.user.userId,
        companyId: companyScope.companyId ?? req.user.companyId ?? null,
      });

      if (!accessibleUserIds.length) {
        return res.status(200).json({
          page,
          limit,
          totalUsers: 0,
          totalPages: 0,
          users: [],
        });
      }

      values.push(accessibleUserIds);
      whereClause += ` AND u."UserId" = ANY($${values.length}::int[])`;
    }

    if (search) {
      values.push(`%${search}%`);
      whereClause +=
        ` AND (u."Name" ILIKE $${values.length} OR u."Email" ILIKE $${values.length} OR u."MobileNumber" ILIKE $${values.length})`;
    }

    if (Number.isInteger(roleId)) {
      values.push(roleId);
      whereClause += ` AND u."RoleId" = $${values.length}`;
    }

    if (Number.isInteger(userTypeId)) {
      values.push(userTypeId);
      whereClause += ` AND u."UserTypeId" = $${values.length}`;
    }

    if (isActive === "true" || isActive === "false") {
      values.push(isActive === "true");
      whereClause += ` AND u."IsActive" = $${values.length}`;
    }

    const sortColumnMap = {
      UserId: 'u."UserId"',
      Name: 'u."Name"',
      Email: 'u."Email"',
      CreatedAt: 'u."CreatedAt"',
      UpdatedAt: 'u."UpdatedAt"',
      HierarchyLevel: 'u."HierarchyLevel"',
    };
    const sortColumn = sortColumnMap[sortBy] || 'u."UserId"';

    const countQuery = `SELECT COUNT(*) FROM "Users" u ${whereClause}`;
    const countResult = await appPool.query(countQuery, values);
    const totalUsers = Number.parseInt(countResult.rows[0].count, 10);

    const dataQuery = `
      SELECT
        u.*,
        m."Name" AS "ManagerName"
      FROM "Users" u
      LEFT JOIN "Users" m ON m."UserId" = u."ReportingManagerId"
      ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder}
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2};
    `;

    const result = await appPool.query(dataQuery, [...values, limit, offset]);

    const users = result.rows.map((user) => ({
      id: user.UserId,
      name: user.Name,
      email: user.Email,
      mobileNumber: user.MobileNumber,
      companyId: user.CompanyId,
      userTypeId: user.UserTypeId,
      roleId: user.RoleId,
      reportingManagerId: user.ReportingManagerId,
      reportingManagerName: user.ManagerName,
      departmentId: user.DepartmentId,
      designationId: user.DesignationId,
      hierarchyLevel: user.HierarchyLevel,
      createdBy: user.CreatedBy,
      address: user.Address,
      city: user.City,
      state: user.State,
      country: user.Country,
      postalCode: user.PostalCode,
      image: normalizeStoredUploadPath(user.ProfileImage),
      isActive: user.IsActive,
      flag: user.Flag,
      isDelete: user.IsDelete,
      createdAt: user.CreatedAt,
      updatedAt: user.UpdatedAt,
    }));

    res.status(200).json({
      page,
      limit,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
      users,
    });
  } catch (err) {
    console.error("Error fetching all users:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getCompanies = async (req, res) => {
  const userId = req.user.userId;
  try {
    const userResult = await appPool.query(
      'SELECT "UserTypeId" FROM "Users" WHERE "UserId" = $1',
      [userId]
    );
    const user = userResult.rows[0];
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (![1].includes(user.UserTypeId)) {
      return res
        .status(403)
        .json({ message: "Forbidden: You do not have access to this resource" });
    }
    const result = await appPool.query(
      'SELECT * FROM "Companies" WHERE "IsDelete" = FALSE'
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const adminGetCompanies = async (req, res) => {
  const userId = req.user.userId;
  try {
    const userResult = await appPool.query(
      'SELECT "UserTypeId", "CompanyId" FROM "Users" WHERE "UserId" = $1',
      [userId]
    );
    const user = userResult.rows[0];
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (![1, 2].includes(user.UserTypeId)) {
      return res.status(403).json({ message: "Access denied" });
    }
    const companyResult = await appPool.query(
      'SELECT * FROM "Companies" WHERE "Id" = $1 AND "IsDelete" = FALSE',
      [user.CompanyId]
    );
    if (companyResult.rows.length === 0) {
      return res.status(404).json({ message: "Company not found" });
    }
    res.status(200).json(companyResult.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const toggleSoftDelete = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await appPool.query(
      `
      UPDATE "Users"
      SET "IsDelete" = NOT "IsDelete"
      WHERE "UserId" = $1
      RETURNING "IsDelete";
    `,
      [id]
    );
    const isDeleted = result.rows[0]?.IsDelete;
    res.status(200).json({
      message: isDeleted ? "User soft-deleted" : "User restored",
      isDeleted,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Toggle failed" });
  }
};

const toggleActivation = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await appPool.query(
      `
      UPDATE "Users"
      SET "IsActive" = NOT "IsActive"
      WHERE "UserId" = $1
      RETURNING "IsActive";
    `,
      [id]
    );
    const isActive = result.rows[0]?.IsActive;
    res.status(200).json({
      message: isActive ? "User activated" : "User deactivated",
      isActive,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Activation toggle failed" });
  }
};

const toggleFlag = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await appPool.query(
      `
      UPDATE "Users"
      SET "Flag" = NOT "Flag"
      WHERE "UserId" = $1
      RETURNING "Flag";
    `,
      [id]
    );
    const flag = result.rows[0]?.Flag;
    res.status(200).json({
      message: flag ? "User flagged" : "User unflagged",
      flag,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Flag toggle failed" });
  }
};

const forgotPassword = async (req, res) => {
  const email = normalizeEmail(req.body.Email || req.body.email);
  const { mobileNumber } = req.body;

  if (!email || !mobileNumber) {
    return res
      .status(400)
      .json({ message: "Email and mobile number are required" });
  }

  try {
    const result = await appPool.query(
      `SELECT "UserId", "Name", "Email" FROM "Users"
       WHERE LOWER("Email") = $1 AND "MobileNumber" = $2 AND "IsDelete" = FALSE`,
      [email, mobileNumber]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({
        message: "User not found with the provided credentials",
      });
    }

    await issueOtp({
      email: user.Email,
      purpose: OTP_PURPOSES.FORGOT_PASSWORD,
      userId: user.UserId,
      recipientName: user.Name,
    });

    return res
      .status(200)
      .json({ message: "Password reset OTP sent to your email" });
  } catch (error) {
    console.error("Forgot Password Error:", error.message);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const resetPassword = async (req, res) => {
  const { token, newPassword, confirmPassword } = req.body;
  const email = normalizeEmail(req.body.email || req.body.Email);
  const otp = String(req.body.otp || "").trim();

  if (!newPassword || !confirmPassword) {
    return res.status(400).json({ message: "All fields are required" });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  const isValidPassword =
    /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+=[\]{};':"\\|,.<>/?-]{8,}$/.test(
      newPassword
    );
  if (!isValidPassword) {
    return res.status(400).json({
      message:
        "Password must be at least 8 characters long and include at least one letter and one number",
    });
  }

  try {
    let targetUserId = null;

    if (token) {
      const result = await appPool.query(
        `
        SELECT "UserId" FROM "PasswordResets"
        WHERE "Token" = $1 AND "ExpiresAt" > NOW()
      `,
        [token]
      );
      const tokenRecord = result.rows[0];
      if (!tokenRecord) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }
      targetUserId = tokenRecord.UserId;
    } else {
      if (!email || !otp) {
        return res.status(400).json({ message: "Email and OTP are required" });
      }

      const userResult = await appPool.query(
        `
        SELECT "UserId"
        FROM "Users"
        WHERE LOWER("Email") = $1
          AND "IsDelete" = FALSE
        LIMIT 1
      `,
        [email]
      );

      const user = userResult.rows[0];
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const otpValidation = await validateOtp({
        email,
        purpose: OTP_PURPOSES.FORGOT_PASSWORD,
        otp,
        userId: user.UserId,
      });

      if (!otpValidation.ok) {
        return res.status(400).json({ message: otpValidation.message });
      }

      targetUserId = user.UserId;
      if (otpValidation.otpId) {
        await consumeOtp(otpValidation.otpId);
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await appPool.query(
      `
      UPDATE "Users"
      SET "Password" = $1, "UpdatedAt" = CURRENT_TIMESTAMP
      WHERE "UserId" = $2
    `,
      [hashedPassword, targetUserId]
    );

    if (token) {
      await appPool.query('DELETE FROM "PasswordResets" WHERE "Token" = $1', [token]);
    } else {
      await appPool.query(
        `
        UPDATE "EmailOtpVerifications"
        SET "ConsumedAt" = CURRENT_TIMESTAMP
        WHERE LOWER("Email") = $1
          AND "Purpose" = $2
          AND "ConsumedAt" IS NULL
      `,
        [email, OTP_PURPOSES.FORGOT_PASSWORD]
      );
    }

    return res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset Password Error:", error.message);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const getOrgHierarchy = async (req, res) => {
  try {
    const requestedCompanyId = req.query.companyId ? Number(req.query.companyId) : null;
    const privileged = isPrivilegedUser(req.user);
    const companyScope = resolveCompanyScope({
      req,
      requestedCompanyId,
      allowAllForSuperAdmin: true,
    });

    if (!companyScope.ok) {
      return res.status(companyScope.status).json({ message: companyScope.message });
    }

    if (!privileged) {
      const hierarchy = await getHierarchyRows(
        req.user.userId,
        true,
        companyScope.companyId
      );
      return res.status(200).json({ hierarchy });
    }

    if (!isSuperAdminUser(req.user)) {
      const rootsQuery = `
        SELECT child."UserId"
        FROM "Users" child
        LEFT JOIN "Users" manager ON manager."UserId" = child."ReportingManagerId"
        WHERE child."CompanyId" = $1
        AND child."IsDelete" = FALSE
        AND (
          child."ReportingManagerId" IS NULL
          OR manager."UserId" IS NULL
          OR manager."CompanyId" <> child."CompanyId"
        )
        ORDER BY child."UserId";
      `;

      const rootResult = await appPool.query(rootsQuery, [companyScope.companyId]);
      const hierarchy = [];
      for (const root of rootResult.rows) {
        const rows = await getHierarchyRows(root.UserId, true, companyScope.companyId);
        hierarchy.push(...rows);
      }
      return res.status(200).json({ hierarchy });
    }

    const rootsQuery = `
      SELECT "UserId"
      FROM "Users"
      WHERE "ReportingManagerId" IS NULL
      ${companyScope.companyId ? 'AND "CompanyId" = $1' : ""}
      AND "IsDelete" = FALSE
      ORDER BY "UserId";
    `;

    const rootResult = await appPool.query(
      rootsQuery,
      companyScope.companyId ? [companyScope.companyId] : []
    );

    const hierarchy = [];
    for (const root of rootResult.rows) {
      const rows = await getHierarchyRows(root.UserId, true, companyScope.companyId);
      hierarchy.push(...rows);
    }

    res.status(200).json({ hierarchy });
  } catch (err) {
    console.error("Error fetching hierarchy:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getMyTeamHierarchy = async (req, res) => {
  try {
    const userId = req.user.userId;
    const hierarchy = await getHierarchyRows(
      userId,
      true,
      req.user.companyId ? Number(req.user.companyId) : null
    );
    res.status(200).json({ hierarchy });
  } catch (err) {
    console.error("Error fetching my team hierarchy:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getDirectReports = async (req, res) => {
  try {
    const managerId = Number(req.params.userId);
    if (!Number.isInteger(managerId) || managerId <= 0) {
      return res.status(400).json({ message: "Invalid manager id" });
    }

    const access = await assertRequesterUserAccess({ req, targetUserId: managerId });
    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    const query = `
      SELECT
        "UserId",
        "Name",
        "Email",
        "RoleId",
        "UserTypeId",
        "CompanyId",
        "ReportingManagerId"
      FROM "Users"
      WHERE "ReportingManagerId" = $1
      AND "CompanyId" = $2
      AND "IsDelete" = FALSE
      ORDER BY "Name";
    `;

    const { rows } = await appPool.query(query, [managerId, access.target.CompanyId]);
    res.status(200).json({ reports: rows });
  } catch (err) {
    console.error("Error fetching direct reports:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getCompanyOrgChart = async (req, res) => {
  try {
    const requestedCompanyId = Number(req.params.companyId);
    const privileged = isPrivilegedUser(req.user);
    const companyScope = resolveCompanyScope({
      req,
      requestedCompanyId,
      allowAllForSuperAdmin: false,
    });

    if (!companyScope.ok) {
      return res.status(companyScope.status).json({ message: companyScope.message });
    }

    if (!privileged) {
      const hierarchy = await getHierarchyRows(
        req.user.userId,
        true,
        companyScope.companyId
      );
      return res.status(200).json({ hierarchy });
    }

    const rootsQuery = `
      SELECT child."UserId"
      FROM "Users" child
      LEFT JOIN "Users" manager ON manager."UserId" = child."ReportingManagerId"
      WHERE child."CompanyId" = $1
      AND child."IsDelete" = FALSE
      AND (
        child."ReportingManagerId" IS NULL
        OR manager."UserId" IS NULL
        OR manager."CompanyId" <> child."CompanyId"
      )
      ORDER BY child."UserId";
    `;

    const rootResult = await appPool.query(rootsQuery, [companyScope.companyId]);

    const hierarchy = [];
    for (const root of rootResult.rows) {
      const rows = await getHierarchyRows(root.UserId, true, companyScope.companyId);
      hierarchy.push(...rows);
    }

    res.status(200).json({ hierarchy });
  } catch (err) {
    console.error("Error fetching company org chart:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getUserRecordSummary = async (req, res) => {
  try {
    const targetUserId = Number(req.params.userId);
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const access = await assertRequesterUserAccess({ req, targetUserId });
    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    const userResult = await appPool.query(
      `SELECT "UserId", "Name", "Email", "MobileNumber", "RoleId", "UserTypeId", "CompanyId", "IsActive"
       FROM "Users"
       WHERE "UserId" = $1 AND "IsDelete" = FALSE
       LIMIT 1`,
      [targetUserId]
    );

    if (!userResult.rows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const safeCount = async (query, values) => {
      try {
        const { rows } = await appPool.query(query, values);
        return Number(rows[0]?.count || 0);
      } catch (error) {
        if (error.code === "42P01" || error.code === "42703") {
          return 0;
        }
        throw error;
      }
    };

    const [
      accounts,
      contacts,
      leads,
      opportunities,
      presales,
      casesCount,
      salesOrders,
      purchaseOrders,
      products,
    ] = await Promise.all([
      safeCount(
        `SELECT COUNT(*)::int AS count
         FROM "Accounts"
         WHERE "IsDeleted" = FALSE
         AND ("CreatedBy" = $1 OR "AccountOwnerId" = $1)`,
        [targetUserId]
      ),
      safeCount(
        `SELECT COUNT(*)::int AS count
         FROM "Contacts"
         WHERE "IsDeleted" = FALSE
         AND ("CreatedBy" = $1 OR "AssignedTo" = $1)`,
        [targetUserId]
      ),
      safeCount(
        `SELECT COUNT(*)::int AS count
         FROM "Leads"
         WHERE "IsDeleted" = FALSE
         AND ("CreatedBy" = $1 OR "AssignedTo" = $1 OR "AssignedFrom" = $1)`,
        [targetUserId]
      ),
      safeCount(
        `SELECT COUNT(*)::int AS count
         FROM "Opportunities"
         WHERE "IsDeleted" = FALSE
         AND ("CreatedBy" = $1 OR "AssignedTo" = $1 OR "AssignedFrom" = $1)`,
        [targetUserId]
      ),
      safeCount(
        `SELECT COUNT(*)::int AS count
         FROM "Presales"
         WHERE "IsDeleted" = FALSE
         AND ("CreatedBy" = $1 OR "AssignedTo" = $1 OR "AssignedFrom" = $1)`,
        [targetUserId]
      ),
      safeCount(
        `SELECT COUNT(*)::int AS count
         FROM "Cases"
         WHERE "IsDeleted" = FALSE
         AND ("CreatedBy" = $1 OR "AssignedTo" = $1 OR "AssignedFrom" = $1)`,
        [targetUserId]
      ),
      safeCount(
        `SELECT COUNT(*)::int AS count
         FROM "SalesOrders"
         WHERE "IsDeleted" = FALSE
         AND "CreatedBy" = $1`,
        [targetUserId]
      ),
      safeCount(
        `SELECT COUNT(*)::int AS count
         FROM "PurchaseOrders"
         WHERE "IsDeleted" = FALSE
         AND "CreatedBy" = $1`,
        [targetUserId]
      ),
      safeCount(
        `SELECT COUNT(*)::int AS count
         FROM "Products"
         WHERE "IsDelete" = FALSE
         AND "CreatedBy" = $1`,
        [targetUserId]
      ),
    ]);

    return res.status(200).json({
      user: userResult.rows[0],
      summary: {
        accounts,
        contacts,
        leads,
        opportunities,
        presales,
        cases: casesCount,
        salesOrders,
        purchaseOrders,
        products,
      },
    });
  } catch (err) {
    console.error("Error fetching user record summary:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

const USER_RECORD_MODULES = {
  accounts: {
    tableName: "Accounts",
    whereClause: `"IsDeleted" = FALSE AND ("CreatedBy" = $1 OR "AccountOwnerId" = $1)`,
  },
  contacts: {
    tableName: "Contacts",
    whereClause: `"IsDeleted" = FALSE AND ("CreatedBy" = $1 OR "AssignedTo" = $1)`,
  },
  leads: {
    tableName: "Leads",
    whereClause: `"IsDeleted" = FALSE AND ("CreatedBy" = $1 OR "AssignedTo" = $1 OR "AssignedFrom" = $1)`,
  },
  opportunities: {
    tableName: "Opportunities",
    whereClause: `"IsDeleted" = FALSE AND ("CreatedBy" = $1 OR "AssignedTo" = $1 OR "AssignedFrom" = $1)`,
  },
  presales: {
    tableName: "Presales",
    whereClause: `"IsDeleted" = FALSE AND ("CreatedBy" = $1 OR "AssignedTo" = $1 OR "AssignedFrom" = $1)`,
  },
  cases: {
    tableName: "Cases",
    whereClause: `"IsDeleted" = FALSE AND ("CreatedBy" = $1 OR "AssignedTo" = $1 OR "AssignedFrom" = $1)`,
  },
  salesOrders: {
    tableName: "SalesOrders",
    whereClause: `"IsDeleted" = FALSE AND "CreatedBy" = $1`,
  },
  purchaseOrders: {
    tableName: "PurchaseOrders",
    whereClause: `"IsDeleted" = FALSE AND "CreatedBy" = $1`,
  },
  products: {
    tableName: "Products",
    whereClause: `"IsDelete" = FALSE AND "CreatedBy" = $1`,
  },
};

const getUserModuleRecords = async (req, res) => {
  try {
    const targetUserId = Number(req.params.userId);
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const requestedModule = String(req.query.module || "").trim().toLowerCase();
    if (!requestedModule || !USER_RECORD_MODULES[requestedModule]) {
      return res.status(400).json({
        message: "Invalid module. Use a supported record module key.",
        modules: Object.keys(USER_RECORD_MODULES),
      });
    }

    const parsedLimit = Number.parseInt(req.query.limit || "25", 10);
    const parsedOffset = Number.parseInt(req.query.offset || "0", 10);
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 200) : 25;
    const offset = Number.isFinite(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;

    const access = await assertRequesterUserAccess({ req, targetUserId });
    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    const userResult = await appPool.query(
      `SELECT "UserId", "Name", "Email", "MobileNumber", "RoleId", "UserTypeId", "CompanyId", "IsActive"
       FROM "Users"
       WHERE "UserId" = $1 AND "IsDelete" = FALSE
       LIMIT 1`,
      [targetUserId]
    );

    if (!userResult.rows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const moduleConfig = USER_RECORD_MODULES[requestedModule];

    const safeCount = async (query, values) => {
      try {
        const { rows } = await appPool.query(query, values);
        return Number(rows[0]?.count || 0);
      } catch (error) {
        if (error.code === "42P01" || error.code === "42703") {
          return 0;
        }
        throw error;
      }
    };

    const safeListRecords = async (queryTemplates, values) => {
      for (const query of queryTemplates) {
        try {
          const { rows } = await appPool.query(query, values);
          return rows || [];
        } catch (error) {
          if (error.code === "42P01" || error.code === "42703") {
            continue;
          }
          throw error;
        }
      }
      return [];
    };

    const total = await safeCount(
      `SELECT COUNT(*)::int AS count
       FROM "${moduleConfig.tableName}"
       WHERE ${moduleConfig.whereClause}`,
      [targetUserId]
    );

    const records = await safeListRecords(
      [
        `SELECT *
         FROM "${moduleConfig.tableName}"
         WHERE ${moduleConfig.whereClause}
         ORDER BY "CreatedAt" DESC NULLS LAST
         LIMIT $2 OFFSET $3`,
        `SELECT *
         FROM "${moduleConfig.tableName}"
         WHERE ${moduleConfig.whereClause}
         ORDER BY "UpdatedAt" DESC NULLS LAST
         LIMIT $2 OFFSET $3`,
        `SELECT *
         FROM "${moduleConfig.tableName}"
         WHERE ${moduleConfig.whereClause}
         ORDER BY "Id" DESC
         LIMIT $2 OFFSET $3`,
        `SELECT *
         FROM "${moduleConfig.tableName}"
         WHERE ${moduleConfig.whereClause}
         LIMIT $2 OFFSET $3`,
      ],
      [targetUserId, limit, offset]
    );

    return res.status(200).json({
      user: userResult.rows[0],
      module: requestedModule,
      records,
      pagination: {
        total,
        limit,
        offset,
        hasNext: offset + limit < total,
        hasPrevious: offset > 0,
      },
    });
  } catch (err) {
    console.error("Error fetching user module records:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  sendRegistrationOtp,
  registerUser,
  loginUser,
  getProfile,
  getAllUsers,
  getCompanies,
  adminGetCompanies,
  toggleSoftDelete,
  toggleActivation,
  toggleFlag,
  updateUser,
  forgotPassword,
  resetPassword,
  getOrgHierarchy,
  getMyTeamHierarchy,
  getDirectReports,
  getCompanyOrgChart,
  getUserRecordSummary,
  getUserModuleRecords,
};
