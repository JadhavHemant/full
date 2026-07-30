const { appPool } = require('../../config/db');

const normalizeUserType = (value) => String(value || '').trim();

const createUserType = async (req, res) => {
  const userType = normalizeUserType(req.body.userType);
  if (!userType) {
    return res.status(400).json({ message: 'User type is required' });
  }

  try {
    const existing = await appPool.query(
      'SELECT 1 FROM "UserTypes" WHERE LOWER("UserType") = LOWER($1) LIMIT 1',
      [userType]
    );

    if (existing.rows.length) {
      return res.status(409).json({ message: 'User type already exists' });
    }

    const result = await appPool.query(
      'INSERT INTO "UserTypes" ("UserType") VALUES ($1) RETURNING *',
      [userType]
    );
    res.status(201).json({ message: 'User type created successfully', data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getUserTypes = async (req, res) => {
  try {
    const result = await appPool.query('SELECT * FROM "UserTypes"');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getUserTypeById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await appPool.query('SELECT * FROM "UserTypes" WHERE "Id" = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User type not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateUserType = async (req, res) => {
  const { id } = req.params;
  const userType = normalizeUserType(req.body.userType);

  if (!userType) {
    return res.status(400).json({ message: 'User type is required' });
  }

  try {
    const existing = await appPool.query(
      'SELECT 1 FROM "UserTypes" WHERE LOWER("UserType") = LOWER($1) AND "Id" != $2 LIMIT 1',
      [userType, id]
    );

    if (existing.rows.length) {
      return res.status(409).json({ message: 'User type already exists' });
    }

    const result = await appPool.query(
      'UPDATE "UserTypes" SET "UserType" = $1 WHERE "Id" = $2 RETURNING *',
      [userType, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User type not found' });
    }

    res.status(200).json({ message: 'User type updated successfully', data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteUserType = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await appPool.query(
      'DELETE FROM "UserTypes" WHERE "Id" = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User type not found' });
    }

    res.status(200).json({ message: 'User type deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {createUserType,getUserTypes,getUserTypeById,updateUserType,deleteUserType};
