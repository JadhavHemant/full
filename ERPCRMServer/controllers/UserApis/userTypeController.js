const { appPool } = require('../../config/db');

const createUserType = async (req, res) => {
  const { userType } = req.body;
  try {
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
    const result = await appPool.query('SELECT * FROM "UserTypes" WHERE "UserTypeId" = $1', [id]);

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
  const { userType } = req.body;

  try {
    const result = await appPool.query(
      'UPDATE "UserTypes" SET "UserType" = $1 WHERE "UserTypeId" = $2 RETURNING *',
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
      'DELETE FROM "UserTypes" WHERE "UserTypeId" = $1 RETURNING *',
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
