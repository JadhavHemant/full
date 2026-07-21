const { appPool } = require('../../config/db');

const QualityControl = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "QualityControl" (
      "Id" SERIAL PRIMARY KEY,
      "CompanyId" INT REFERENCES "Companies"("Id") ON DELETE CASCADE,
      "InspectionNumber" VARCHAR(50) NOT NULL,
      "EntityType" VARCHAR(50) NOT NULL,
      "EntityId" INT,
      "ProductId" INT REFERENCES "Products"("Id"),
      "WarehouseId" INT,
      "InspectorId" INT REFERENCES "Users"("UserId"),
      "InspectionDate" TIMESTAMP DEFAULT NOW(),
      "Status" VARCHAR(50) DEFAULT 'Pending',
      "Result" VARCHAR(50),
      "TotalQuantity" NUMERIC(15,2) DEFAULT 0,
      "AcceptedQuantity" NUMERIC(15,2) DEFAULT 0,
      "RejectedQuantity" NUMERIC(15,2) DEFAULT 0,
      "DefectType" VARCHAR(255),
      "DefectDescription" TEXT,
      "CorrectiveAction" TEXT,
      "Remarks" TEXT,
      "CreatedBy" INT REFERENCES "Users"("UserId"),
      "IsActive" BOOLEAN DEFAULT TRUE,
      "IsDeleted" BOOLEAN DEFAULT FALSE,
      "CreatedAt" TIMESTAMP DEFAULT NOW(),
      "UpdatedAt" TIMESTAMP DEFAULT NOW()
    );
  `;
  await appPool.query(query);
  console.log("✅ QualityControl table ready");
};

const QualityControlItems = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS "QualityControlItems" (
      "Id" SERIAL PRIMARY KEY,
      "InspectionId" INT REFERENCES "QualityControl"("Id") ON DELETE CASCADE,
      "CheckPoint" VARCHAR(255) NOT NULL,
      "ExpectedValue" VARCHAR(255),
      "ActualValue" VARCHAR(255),
      "Status" VARCHAR(50) DEFAULT 'Pass',
      "Remarks" TEXT,
      "CreatedAt" TIMESTAMP DEFAULT NOW()
    );
  `;
  await appPool.query(query);
  console.log("✅ QualityControlItems table ready");
};

module.exports = { QualityControl, QualityControlItems };