const { appPool } = require('../../config/db');

const createInspection = async (req, res) => {
  try {
    const { CompanyId, EntityType, EntityId, ProductId, WarehouseId, InspectorId, TotalQuantity, AcceptedQuantity, RejectedQuantity, DefectType, DefectDescription, CorrectiveAction, Remarks, CheckPoints } = req.body;
    if (!EntityType) return res.status(400).json({ message: 'EntityType is required' });
    const inspNum = `QC-${Date.now()}`;
    const result = await appPool.query(
      `INSERT INTO "QualityControl" ("CompanyId","InspectionNumber","EntityType","EntityId","ProductId","WarehouseId","InspectorId","TotalQuantity","AcceptedQuantity","RejectedQuantity","DefectType","DefectDescription","CorrectiveAction","Remarks","CreatedBy","Status")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING "Id"`,
      [CompanyId||null, inspNum, EntityType, EntityId||null, ProductId||null, WarehouseId||null, InspectorId||null, TotalQuantity||0, AcceptedQuantity||0, RejectedQuantity||0, DefectType||null, DefectDescription||null, CorrectiveAction||null, Remarks||null, req.user?.userId||null, RejectedQuantity > 0 ? 'Rejected' : 'Passed']
    );
    const inspId = result.rows[0].Id;
    if (CheckPoints && CheckPoints.length > 0) {
      for (const cp of CheckPoints) {
        await appPool.query(
          `INSERT INTO "QualityControlItems" ("InspectionId","CheckPoint","ExpectedValue","ActualValue","Status","Remarks") VALUES ($1,$2,$3,$4,$5,$6)`,
          [inspId, cp.CheckPoint, cp.ExpectedValue||null, cp.ActualValue||null, cp.Status||'Pass', cp.Remarks||null]
        );
      }
    }
    res.status(201).json({ message: 'Inspection created', data: { Id: inspId, InspectionNumber: inspNum } });
  } catch (error) {
    console.error('Create Inspection Error:', error);
    res.status(500).json({ message: 'Failed to create inspection', error: error.message });
  }
};

const getInspections = async (req, res) => {
  try {
    const { limit = 20, offset = 0, status, companyId, entityType } = req.query;
    let where = 'WHERE qc."IsDeleted" = false';
    const params = [];
    let idx = 0;
    if (status) { idx++; where += ` AND qc."Status" = $${idx}`; params.push(status); }
    if (companyId) { idx++; where += ` AND qc."CompanyId" = $${idx}`; params.push(parseInt(companyId)); }
    if (entityType) { idx++; where += ` AND qc."EntityType" = $${idx}`; params.push(entityType); }
    idx++; const limitIdx = idx; params.push(parseInt(limit));
    idx++; const offsetIdx = idx; params.push(parseInt(offset));
    const result = await appPool.query(
      `SELECT qc.*, p."ProductName" FROM "QualityControl" qc LEFT JOIN "Products" p ON qc."ProductId" = p."Id" ${where} ORDER BY qc."CreatedAt" DESC OFFSET $${offsetIdx} LIMIT $${limitIdx}`, params
    );
    const countResult = await appPool.query(`SELECT COUNT(*) AS total FROM "QualityControl" qc ${where}`, params);
    res.json({ data: result.rows, total: parseInt(countResult.rows[0].total) });
  } catch (error) {
    console.error('Get Inspections Error:', error);
    res.status(500).json({ message: 'Failed to fetch inspections', error: error.message });
  }
};

const getInspectionById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await appPool.query(`SELECT * FROM "QualityControl" WHERE "Id" = $1 AND "IsDeleted" = false`, [parseInt(id)]);
    if (!result.rows.length) return res.status(404).json({ message: 'Inspection not found' });
    const items = await appPool.query(`SELECT * FROM "QualityControlItems" WHERE "InspectionId" = $1`, [parseInt(id)]);
    res.json({ data: { ...result.rows[0], CheckPoints: items.rows } });
  } catch (error) {
    console.error('Get Inspection Error:', error);
    res.status(500).json({ message: 'Failed to fetch inspection', error: error.message });
  }
};

const updateInspectionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { Status, Result, CorrectiveAction, Remarks } = req.body;
    await appPool.query(
      `UPDATE "QualityControl" SET "Status"=COALESCE($1,"Status"), "Result"=COALESCE($2,"Result"), "CorrectiveAction"=COALESCE($3,"CorrectiveAction"), "Remarks"=COALESCE($4,"Remarks"), "UpdatedAt"=NOW() WHERE "Id"=$5`,
      [Status||null, Result||null, CorrectiveAction||null, Remarks||null, parseInt(id)]
    );
    res.json({ message: 'Inspection updated' });
  } catch (error) {
    console.error('Update Inspection Error:', error);
    res.status(500).json({ message: 'Failed to update inspection', error: error.message });
  }
};

const deleteInspection = async (req, res) => {
  try {
    const { id } = req.params;
    await appPool.query(`UPDATE "QualityControl" SET "IsDeleted"=true, "UpdatedAt"=NOW() WHERE "Id"=$1`, [parseInt(id)]);
    res.json({ message: 'Inspection deleted' });
  } catch (error) {
    console.error('Delete Inspection Error:', error);
    res.status(500).json({ message: 'Failed to delete inspection', error: error.message });
  }
};

module.exports = { createInspection, getInspections, getInspectionById, updateInspectionStatus, deleteInspection };