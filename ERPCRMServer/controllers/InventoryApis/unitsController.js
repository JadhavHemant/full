const { appPool } = require('../../config/db');

const createUnit = async (req, res) => {
  const { name, symbol } = req.body;

  try {
    const result = await appPool.query(
      'INSERT INTO "Units" ("Name", "Symbol") VALUES ($1, $2) RETURNING *',
      [name, symbol]
    );
    res.status(201).json({ message: 'Unit created successfully', data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};



const getUnits = async (req, res) => {
  try {
    const result = await appPool.query('SELECT * FROM "Units" ORDER BY "Id"');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};



const getUnitById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await appPool.query('SELECT * FROM "Units" WHERE "Id" = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Unit not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};



const updateUnit = async (req, res) => {
  const { id } = req.params;
  const { name, symbol } = req.body;

  try {
    const result = await appPool.query(
      'UPDATE "Units" SET "Name" = $1, "Symbol" = $2 WHERE "Id" = $3 RETURNING *',
      [name, symbol, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Unit not found' });
    }

    res.status(200).json({ message: 'Unit updated successfully', data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};



const deleteUnit = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await appPool.query('DELETE FROM "Units" WHERE "Id" = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Unit not found' });
    }

    res.status(200).json({ message: 'Unit deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {createUnit,getUnits,getUnitById,updateUnit,deleteUnit,};
