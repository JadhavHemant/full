const { appPool } = require("../../config/db");

const createTeamsChatTables = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "ChatTeams" (
      "Id" SERIAL PRIMARY KEY,
      "CompanyId" INT NOT NULL REFERENCES "Companies"("Id") ON DELETE CASCADE,
      "Name" VARCHAR(150) NOT NULL,
      "Description" TEXT,
      "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "IsArchived" BOOLEAN NOT NULL DEFAULT FALSE,
      "CreatedAt" TIMESTAMP DEFAULT NOW(),
      "UpdatedAt" TIMESTAMP DEFAULT NOW(),
      UNIQUE ("CompanyId", "Name")
    );

    CREATE INDEX IF NOT EXISTS idx_chat_teams_company ON "ChatTeams"("CompanyId", "IsArchived");
    CREATE INDEX IF NOT EXISTS idx_chat_teams_updated ON "ChatTeams"("UpdatedAt" DESC);

    CREATE TABLE IF NOT EXISTS "ChatTeamMembers" (
      "Id" SERIAL PRIMARY KEY,
      "TeamId" INT NOT NULL REFERENCES "ChatTeams"("Id") ON DELETE CASCADE,
      "UserId" INT NOT NULL REFERENCES "Users"("UserId") ON DELETE CASCADE,
      "MemberRole" VARCHAR(20) NOT NULL DEFAULT 'member',
      "IsMuted" BOOLEAN NOT NULL DEFAULT FALSE,
      "LastReadAt" TIMESTAMP,
      "JoinedAt" TIMESTAMP DEFAULT NOW(),
      UNIQUE ("TeamId", "UserId"),
      CHECK ("MemberRole" IN ('owner', 'member'))
    );

    CREATE INDEX IF NOT EXISTS idx_chat_team_members_team ON "ChatTeamMembers"("TeamId");
    CREATE INDEX IF NOT EXISTS idx_chat_team_members_user ON "ChatTeamMembers"("UserId");

    CREATE TABLE IF NOT EXISTS "ChatChannels" (
      "Id" SERIAL PRIMARY KEY,
      "TeamId" INT NOT NULL REFERENCES "ChatTeams"("Id") ON DELETE CASCADE,
      "Name" VARCHAR(150) NOT NULL,
      "Description" TEXT,
      "ChannelType" VARCHAR(20) NOT NULL DEFAULT 'standard',
      "IsDefault" BOOLEAN NOT NULL DEFAULT FALSE,
      "IsArchived" BOOLEAN NOT NULL DEFAULT FALSE,
      "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "CreatedAt" TIMESTAMP DEFAULT NOW(),
      "UpdatedAt" TIMESTAMP DEFAULT NOW(),
      UNIQUE ("TeamId", "Name")
    );

    CREATE INDEX IF NOT EXISTS idx_chat_channels_team ON "ChatChannels"("TeamId", "IsArchived");
    CREATE INDEX IF NOT EXISTS idx_chat_channels_updated ON "ChatChannels"("UpdatedAt" DESC);

    CREATE TABLE IF NOT EXISTS "ChatMessages" (
      "Id" SERIAL PRIMARY KEY,
      "TeamId" INT NOT NULL REFERENCES "ChatTeams"("Id") ON DELETE CASCADE,
      "ChannelId" INT NOT NULL REFERENCES "ChatChannels"("Id") ON DELETE CASCADE,
      "SenderUserId" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "ParentMessageId" INT REFERENCES "ChatMessages"("Id") ON DELETE SET NULL,
      "MessageType" VARCHAR(20) NOT NULL DEFAULT 'text',
      "MessageText" TEXT NOT NULL,
      "Metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
      "IsDeleted" BOOLEAN NOT NULL DEFAULT FALSE,
      "CreatedAt" TIMESTAMP DEFAULT NOW(),
      "UpdatedAt" TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON "ChatMessages"("ChannelId", "Id" DESC);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_team ON "ChatMessages"("TeamId", "Id" DESC);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON "ChatMessages"("SenderUserId");

    CREATE TABLE IF NOT EXISTS "ChatMessageReads" (
      "Id" SERIAL PRIMARY KEY,
      "MessageId" INT NOT NULL REFERENCES "ChatMessages"("Id") ON DELETE CASCADE,
      "UserId" INT NOT NULL REFERENCES "Users"("UserId") ON DELETE CASCADE,
      "ReadAt" TIMESTAMP DEFAULT NOW(),
      UNIQUE ("MessageId", "UserId")
    );

    CREATE INDEX IF NOT EXISTS idx_chat_message_reads_user ON "ChatMessageReads"("UserId");

    CREATE TABLE IF NOT EXISTS "ChatAppChannels" (
      "Id" SERIAL PRIMARY KEY,
      "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
      "Name" VARCHAR(150) NOT NULL,
      "Description" TEXT,
      "Type" VARCHAR(20) NOT NULL DEFAULT 'group',
      "IsPrivate" BOOLEAN NOT NULL DEFAULT FALSE,
      "CreatedBy" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "LastMessageId" INT,
      "LastActivity" TIMESTAMP DEFAULT NOW(),
      "CreatedAt" TIMESTAMP DEFAULT NOW(),
      "UpdatedAt" TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_chat_app_channels_company ON "ChatAppChannels"("CompanyId");
    CREATE INDEX IF NOT EXISTS idx_chat_app_channels_last_activity ON "ChatAppChannels"("LastActivity" DESC);

    CREATE TABLE IF NOT EXISTS "ChatAppChannelMembers" (
      "Id" SERIAL PRIMARY KEY,
      "ChannelId" INT NOT NULL REFERENCES "ChatAppChannels"("Id") ON DELETE CASCADE,
      "UserId" INT NOT NULL REFERENCES "Users"("UserId") ON DELETE CASCADE,
      "JoinedAt" TIMESTAMP DEFAULT NOW(),
      "LastReadMessageId" INT,
      "LastReadAt" TIMESTAMP,
      UNIQUE ("ChannelId", "UserId")
    );

    CREATE INDEX IF NOT EXISTS idx_chat_app_channel_members_channel ON "ChatAppChannelMembers"("ChannelId");
    CREATE INDEX IF NOT EXISTS idx_chat_app_channel_members_user ON "ChatAppChannelMembers"("UserId");

    CREATE TABLE IF NOT EXISTS "ChatAppMessages" (
      "Id" SERIAL PRIMARY KEY,
      "ChannelId" INT NOT NULL REFERENCES "ChatAppChannels"("Id") ON DELETE CASCADE,
      "SenderUserId" INT REFERENCES "Users"("UserId") ON DELETE SET NULL,
      "Content" TEXT,
      "Type" VARCHAR(20) NOT NULL DEFAULT 'text',
      "FileUrl" TEXT,
      "FileName" VARCHAR(255),
      "FileSize" BIGINT,
      "FileType" VARCHAR(120),
      "IsEdited" BOOLEAN NOT NULL DEFAULT FALSE,
      "EditedAt" TIMESTAMP,
      "IsDeleted" BOOLEAN NOT NULL DEFAULT FALSE,
      "CreatedAt" TIMESTAMP DEFAULT NOW(),
      "UpdatedAt" TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_chat_app_messages_channel_id ON "ChatAppMessages"("ChannelId", "Id" DESC);

    CREATE TABLE IF NOT EXISTS "ChatAppMessageReads" (
      "Id" SERIAL PRIMARY KEY,
      "MessageId" INT NOT NULL REFERENCES "ChatAppMessages"("Id") ON DELETE CASCADE,
      "UserId" INT NOT NULL REFERENCES "Users"("UserId") ON DELETE CASCADE,
      "ReadAt" TIMESTAMP DEFAULT NOW(),
      UNIQUE ("MessageId", "UserId")
    );

    CREATE TABLE IF NOT EXISTS "ChatAppReactions" (
      "Id" SERIAL PRIMARY KEY,
      "MessageId" INT NOT NULL REFERENCES "ChatAppMessages"("Id") ON DELETE CASCADE,
      "UserId" INT NOT NULL REFERENCES "Users"("UserId") ON DELETE CASCADE,
      "Emoji" VARCHAR(32) NOT NULL,
      "CreatedAt" TIMESTAMP DEFAULT NOW(),
      UNIQUE ("MessageId", "UserId", "Emoji")
    );

    CREATE TABLE IF NOT EXISTS "ChatAppPresence" (
      "UserId" INT PRIMARY KEY REFERENCES "Users"("UserId") ON DELETE CASCADE,
      "IsOnline" BOOLEAN NOT NULL DEFAULT FALSE,
      "LastSeen" TIMESTAMP,
      "SocketCount" INT NOT NULL DEFAULT 0,
      "UpdatedAt" TIMESTAMP DEFAULT NOW()
    );
  `;

  await appPool.query(query);
  await appPool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'chat_app_channels_last_message_fk'
      ) THEN
        ALTER TABLE "ChatAppChannels"
        ADD CONSTRAINT chat_app_channels_last_message_fk
        FOREIGN KEY ("LastMessageId") REFERENCES "ChatAppMessages"("Id") ON DELETE SET NULL;
      END IF;
    END $$;
  `);
  console.log("Teams chat tables ready");
};

module.exports = { createTeamsChatTables };
