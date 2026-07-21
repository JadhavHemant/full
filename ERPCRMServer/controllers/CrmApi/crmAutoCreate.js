const nonEmpty = (value) => {
  if (typeof value !== "string") {
    return value ?? null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const normalizePhone = (value) => {
  const raw = nonEmpty(value);
  if (!raw) {
    return null;
  }

  const digits = String(raw).replace(/\D/g, "");
  return digits || null;
};

const splitFullName = (fullName) => {
  const safeName = nonEmpty(fullName);
  if (!safeName) {
    return { firstName: null, lastName: null };
  }

  const parts = safeName.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: null };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
};

const titleCase = (value) =>
  String(value || "")
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

const buildContactIdentity = (payload) => {
  const derived = splitFullName(payload.AutoContactName);
  const firstName =
    nonEmpty(payload.ProspectContactFirstName) ||
    nonEmpty(payload.AutoContactFirstName) ||
    derived.firstName;
  const lastName =
    nonEmpty(payload.ProspectContactLastName) ||
    nonEmpty(payload.AutoContactLastName) ||
    derived.lastName;
  const email =
    nonEmpty(payload.ProspectContactEmail)?.toLowerCase() ||
    nonEmpty(payload.AutoContactEmail)?.toLowerCase() ||
    null;
  const phone = nonEmpty(payload.ProspectContactPhone) || nonEmpty(payload.AutoContactPhone);
  const normalizedPhone = normalizePhone(payload.ProspectContactPhone) || normalizePhone(payload.AutoContactPhone);
  const title = nonEmpty(payload.ProspectContactTitle) || nonEmpty(payload.AutoContactTitle);

  return { firstName, lastName, email, phone, normalizedPhone, title };
};

const deriveAccountName = ({ payload, fallbackName }) => {
  const directName =
    nonEmpty(payload.ProspectAccountName) ||
    nonEmpty(payload.AutoAccountName) ||
    nonEmpty(fallbackName);
  if (directName) {
    return directName;
  }

  const { firstName, lastName, email } = buildContactIdentity(payload);

  if (email && email.includes("@")) {
    const domainPart = email.split("@")[1]?.split(".")[0];
    if (domainPart) {
      return titleCase(domainPart);
    }
  }

  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  return fullName || null;
};

const findExistingAccount = async ({ client, payload, accountName }) => {
  if (!accountName) {
    return null;
  }

  const query = `
    SELECT "Id"
    FROM "Accounts"
    WHERE COALESCE("IsDeleted", FALSE) = FALSE
      AND LOWER("Name") = LOWER($1)
      AND (
        ($2::int IS NULL AND "CompanyId" IS NULL)
        OR "CompanyId" = $2
      )
    ORDER BY "Id" ASC
    LIMIT 1;
  `;

  const { rows } = await client.query(query, [accountName, payload.CompanyId ?? null]);
  return rows[0]?.Id ?? null;
};

const insertAccount = async ({ client, payload, fallbackName }) => {
  const accountName = deriveAccountName({ payload, fallbackName });
  if (!accountName) {
    return null;
  }

  const existingAccountId = await findExistingAccount({
    client,
    payload,
    accountName,
  });
  if (existingAccountId) {
    return existingAccountId;
  }

  const query = `
    INSERT INTO "Accounts" (
      "CompanyId",
      "Name",
      "Website",
      "Description",
      "IndustryId",
      "CreatedBy",
      "IsActive",
      "IsDeleted",
      "Flag"
    )
    VALUES ($1, $2, $3, $4, $5, $6, TRUE, FALSE, FALSE)
    RETURNING "Id";
  `;

  const values = [
    payload.CompanyId ?? null,
    accountName,
    nonEmpty(payload.ProspectAccountWebsite) || nonEmpty(payload.AutoAccountWebsite) || nonEmpty(payload.Website),
    nonEmpty(payload.AutoAccountDescription) || nonEmpty(payload.Description),
    payload.IndustryId ?? null,
    payload.CreatedBy ?? null,
  ];

  const { rows } = await client.query(query, values);
  return rows[0]?.Id ?? null;
};

const findExistingContact = async ({ client, payload, accountId, contact }) => {
  if (contact.email) {
    const byEmailQuery = `
      SELECT "Id", "AccountId"
      FROM "Contacts"
      WHERE COALESCE("IsDeleted", FALSE) = FALSE
        AND LOWER("Email") = LOWER($1)
        AND (
          ($2::int IS NULL AND "CompanyId" IS NULL)
          OR "CompanyId" = $2
        )
      ORDER BY CASE WHEN "AccountId" = $3 THEN 0 ELSE 1 END, "Id" ASC
      LIMIT 1;
    `;

    const byEmail = await client.query(byEmailQuery, [
      contact.email,
      payload.CompanyId ?? null,
      accountId ?? null,
    ]);

    if (byEmail.rows[0]?.Id) {
      return byEmail.rows[0];
    }
  }

  if (contact.normalizedPhone) {
    const byPhoneQuery = `
      SELECT "Id", "AccountId"
      FROM "Contacts"
      WHERE COALESCE("IsDeleted", FALSE) = FALSE
        AND (
          REGEXP_REPLACE(COALESCE("Phone", ''), '\\D', '', 'g') = $1
          OR REGEXP_REPLACE(COALESCE("AltPhone", ''), '\\D', '', 'g') = $1
        )
        AND (
          ($2::int IS NULL AND "CompanyId" IS NULL)
          OR "CompanyId" = $2
        )
      ORDER BY CASE WHEN "AccountId" = $3 THEN 0 ELSE 1 END, "Id" ASC
      LIMIT 1;
    `;

    const byPhone = await client.query(byPhoneQuery, [
      contact.normalizedPhone,
      payload.CompanyId ?? null,
      accountId ?? null,
    ]);

    if (byPhone.rows[0]?.Id) {
      return byPhone.rows[0];
    }
  }

  if (contact.firstName || contact.lastName) {
    const byNameQuery = `
      SELECT "Id", "AccountId"
      FROM "Contacts"
      WHERE COALESCE("IsDeleted", FALSE) = FALSE
        AND COALESCE(LOWER("FirstName"), '') = COALESCE(LOWER($1), '')
        AND COALESCE(LOWER("LastName"), '') = COALESCE(LOWER($2), '')
        AND (
          ($3::int IS NULL AND "CompanyId" IS NULL)
          OR "CompanyId" = $3
        )
        AND (
          ($4::int IS NULL AND "AccountId" IS NULL)
          OR "AccountId" = $4
        )
      ORDER BY "Id" ASC
      LIMIT 1;
    `;

    const byName = await client.query(byNameQuery, [
      contact.firstName,
      contact.lastName,
      payload.CompanyId ?? null,
      accountId ?? null,
    ]);

    if (byName.rows[0]?.Id) {
      return byName.rows[0];
    }
  }

  return null;
};

const linkContactToAccount = async ({ client, contactId, accountId, payload }) => {
  if (!contactId || !accountId) {
    return;
  }

  await client.query(
    `
      UPDATE "Contacts"
      SET "AccountId" = $2,
          "UpdatedBy" = COALESCE($3, "UpdatedBy"),
          "UpdatedAt" = NOW()
      WHERE "Id" = $1
        AND COALESCE("IsDeleted", FALSE) = FALSE
        AND ("AccountId" IS NULL OR "AccountId" <> $2);
    `,
    [contactId, accountId, payload.UpdatedBy ?? payload.CreatedBy ?? null]
  );
};

const insertContact = async ({ client, payload, accountId }) => {
  const contact = buildContactIdentity(payload);

  if (!contact.firstName && !contact.lastName && !contact.email && !contact.phone) {
    return null;
  }

  const existingContact = await findExistingContact({
    client,
    payload,
    accountId,
    contact,
  });
  if (existingContact?.Id) {
    if (accountId && !existingContact.AccountId) {
      await linkContactToAccount({
        client,
        contactId: existingContact.Id,
        accountId,
        payload,
      });
    }

    return {
      contactId: existingContact.Id,
      accountId: existingContact.AccountId ?? accountId ?? null,
    };
  }

  const query = `
    INSERT INTO "Contacts" (
      "CompanyId",
      "AccountId",
      "FirstName",
      "LastName",
      "Email",
      "Phone",
      "Title",
      "CreatedBy",
      "IsActive",
      "IsDeleted",
      "Flag"
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, FALSE, FALSE)
    RETURNING "Id";
  `;

  const values = [
    payload.CompanyId ?? null,
    accountId ?? null,
    contact.firstName,
    contact.lastName,
    contact.email,
    contact.phone,
    contact.title,
    payload.CreatedBy ?? null,
  ];

  const { rows } = await client.query(query, values);
  return {
    contactId: rows[0]?.Id ?? null,
    accountId: accountId ?? null,
  };
};

const withAutoCreatedParties = async ({ payload, client, fallbackAccountName }) => {
  const nextPayload = { ...payload };

  if (!nextPayload.ContactId) {
    const contactMatch = await findExistingContact({
      client,
      payload: nextPayload,
      accountId: nextPayload.AccountId ?? null,
      contact: buildContactIdentity(nextPayload),
    });

    if (contactMatch?.Id) {
      nextPayload.ContactId = contactMatch.Id;
      if (!nextPayload.AccountId && contactMatch.AccountId) {
        nextPayload.AccountId = contactMatch.AccountId;
      }
    }
  }

  if (!nextPayload.AccountId) {
    nextPayload.AccountId = await insertAccount({
      client,
      payload: nextPayload,
      fallbackName: fallbackAccountName,
    });
  }

  if (!nextPayload.ContactId) {
    const linkedContact = await insertContact({
      client,
      payload: nextPayload,
      accountId: nextPayload.AccountId,
    });

    nextPayload.ContactId = linkedContact?.contactId ?? null;
    if (!nextPayload.AccountId && linkedContact?.accountId) {
      nextPayload.AccountId = linkedContact.accountId;
    }
  } else if (nextPayload.ContactId) {
    await linkContactToAccount({
      client,
      contactId: nextPayload.ContactId,
      accountId: nextPayload.AccountId,
      payload: nextPayload,
    });
  }

  return nextPayload;
};

const withLinkedContactAccount = async ({ payload, client }) => {
  const nextPayload = { ...payload };

  if (nextPayload.AccountId || (!nextPayload.Email && !nextPayload.Phone && !nextPayload.AltPhone)) {
    return nextPayload;
  }

  const contactMatch = await findExistingContact({
    client,
    payload: nextPayload,
    accountId: null,
    contact: {
      firstName: nextPayload.FirstName ?? null,
      lastName: nextPayload.LastName ?? null,
      email: nonEmpty(nextPayload.Email)?.toLowerCase() || null,
      phone: nonEmpty(nextPayload.Phone) || nonEmpty(nextPayload.AltPhone),
      normalizedPhone: normalizePhone(nextPayload.Phone) || normalizePhone(nextPayload.AltPhone),
    },
  });

  if (contactMatch?.AccountId) {
    nextPayload.AccountId = contactMatch.AccountId;
  }

  return nextPayload;
};

const ensureOpportunityForQualifiedLead = async ({ payload, existingRecord, client }) => {
  const nextPayload = {
    ...existingRecord,
    ...payload,
    CompanyId: payload.CompanyId ?? existingRecord.CompanyId ?? null,
    CreatedBy: existingRecord.CreatedBy ?? payload.CreatedBy ?? payload.UpdatedBy ?? null,
  };

  const nextStatus = String(nextPayload.Status || "").trim().toLowerCase();
  const previousStatus = String(existingRecord?.Status || "").trim().toLowerCase();

  if (nextStatus !== "qualified" || previousStatus === "qualified") {
    return payload;
  }

  const enrichedLead = await withAutoCreatedParties({
    payload: nextPayload,
    client,
    fallbackAccountName: nextPayload.AutoAccountName || nextPayload.AutoContactName || existingRecord?.Description,
  });

  const opportunityName =
    nonEmpty(nextPayload.AutoOpportunityName) ||
    nonEmpty(existingRecord?.Description) ||
    nonEmpty(nextPayload.Description) ||
    (enrichedLead.AccountId ? `Opportunity for account ${enrichedLead.AccountId}` : `Lead ${existingRecord?.Id} Opportunity`);

  const existingOpportunity = await client.query(
    `
      SELECT "Id"
      FROM "Opportunities"
      WHERE COALESCE("IsDeleted", FALSE) = FALSE
        AND "LeadId" = $1
      ORDER BY "Id" ASC
      LIMIT 1;
    `,
    [existingRecord?.Id ?? null]
  );

  if (!existingOpportunity.rows.length) {
    await client.query(
      `
        INSERT INTO "Opportunities" (
          "CompanyId",
          "LeadId",
          "AccountId",
          "ContactId",
          "OpportunityName",
          "LeadSourceId",
          "ProductCategoryId",
          "IndustryId",
          "Description",
          "Status",
          "CreatedBy",
          "AssignedTo",
          "AssignedFrom",
          "IsActive",
          "IsDeleted",
          "Flag"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Open', $10, $11, $12, TRUE, FALSE, FALSE);
      `,
      [
        enrichedLead.CompanyId ?? null,
        existingRecord?.Id ?? null,
        enrichedLead.AccountId ?? null,
        enrichedLead.ContactId ?? null,
        opportunityName,
        existingRecord?.LeadSourceId ?? null,
        existingRecord?.ProductCategoryId ?? null,
        existingRecord?.IndustryId ?? null,
        existingRecord?.Description ?? nextPayload.Description ?? null,
        nextPayload.UpdatedBy ?? nextPayload.CreatedBy ?? existingRecord?.CreatedBy ?? null,
        existingRecord?.AssignedTo ?? null,
        existingRecord?.AssignedFrom ?? null,
      ]
    );
  }

  return {
    ...payload,
    AccountId: enrichedLead.AccountId ?? payload.AccountId ?? existingRecord?.AccountId ?? null,
    ContactId: enrichedLead.ContactId ?? payload.ContactId ?? existingRecord?.ContactId ?? null,
    ConvertedAt: payload.ConvertedAt ?? new Date().toISOString(),
  };
};

const applyOpportunityCloseLifecycle = async ({ payload, existingRecord }) => {
  const nextStatus = String(payload.Status || existingRecord?.Status || "").trim().toLowerCase();
  if (!nextStatus) {
    return payload;
  }

  if (nextStatus === "won") {
    return {
      ...payload,
      WonAt: payload.WonAt ?? existingRecord?.WonAt ?? new Date().toISOString(),
      LostAt: null,
    };
  }

  if (nextStatus === "lost") {
    return {
      ...payload,
      LostAt: payload.LostAt ?? existingRecord?.LostAt ?? new Date().toISOString(),
      WonAt: null,
    };
  }

  if (nextStatus === "open") {
    return {
      ...payload,
      WonAt: null,
      LostAt: null,
    };
  }

  return payload;
};

module.exports = {
  ensureOpportunityForQualifiedLead,
  applyOpportunityCloseLifecycle,
  withAutoCreatedParties,
  withLinkedContactAccount,
};
