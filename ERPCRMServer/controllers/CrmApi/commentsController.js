const { appPool } = require("../../config/db");
const { resolveCompanyScope } = require("../../utils/companyScope");

const listComments = async (req, res) => {
  try {
    const entityType = req.query.entityType;
    const entityId = parseInt(req.query.entityId, 10);
    
    if (!entityType || !entityId) {
      return res.status(400).json({ message: "entityType and entityId are required" });
    }

    const scope = resolveCompanyScope({
      req,
      requestedCompanyId: req.query.companyId,
      allowAllForSuperAdmin: true,
    });
    if (!scope.ok) {
      return res.status(scope.status).json({ message: scope.message });
    }

    const query = `
      SELECT
        c.*,
        u."Name" AS "CommentedByName",
        u."Email" AS "CommentedByEmail"
      FROM "Comments" c
      LEFT JOIN "Users" u ON u."UserId" = c."CommentedBy"
      WHERE c."EntityType" = $1
        AND c."EntityId" = $2
      ORDER BY c."CreatedAt" DESC, c."Id" DESC;
    `;

    const { rows } = await appPool.query(query, [entityType, entityId]);
    res.json({ data: rows });
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ message: "Failed to fetch comments" });
  }
};

const createComment = async (req, res) => {
  const client = await appPool.connect();
  const entityType = req.body.entityType;
  const entityId = parseInt(req.body.entityId, 10);
  const commentText = String(req.body.commentText || "").trim();

  if (!entityType || !entityId) {
    return res.status(400).json({ message: "entityType and entityId are required" });
  }

  if (!commentText) {
    return res.status(400).json({ message: "commentText is required" });
  }

  try {
    await client.query("BEGIN");

    const scope = resolveCompanyScope({
      req,
      requestedCompanyId: req.body.companyId || req.query.companyId,
      allowAllForSuperAdmin: true,
    });
    if (!scope.ok) {
      await client.query("ROLLBACK");
      return res.status(scope.status).json({ message: scope.message });
    }

    const insert = await client.query(
      `
      INSERT INTO "Comments" ("EntityType", "EntityId", "CommentText", "CommentedBy")
      VALUES ($1, $2, $3, $4)
      RETURNING *;
      `,
      [entityType, entityId, commentText, req.user.userId]
    );

    const createdComment = insert.rows[0];

    const enriched = await client.query(
      `
      SELECT
        c.*,
        u."Name" AS "CommentedByName",
        u."Email" AS "CommentedByEmail"
      FROM "Comments" c
      LEFT JOIN "Users" u ON u."UserId" = c."CommentedBy"
      WHERE c."Id" = $1
      LIMIT 1;
      `,
      [createdComment.Id]
    );

    await client.query("COMMIT");
    res.status(201).json(enriched.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating comment:", error);
    res.status(500).json({ message: "Failed to create comment" });
  } finally {
    client.release();
  }
};

const deleteComment = async (req, res) => {
  const client = await appPool.connect();
  const commentId = parseInt(req.params.id, 10);

  if (!commentId) {
    return res.status(400).json({ message: "Invalid comment id" });
  }

  try {
    await client.query("BEGIN");

    const scope = resolveCompanyScope({
      req,
      requestedCompanyId: req.query.companyId,
      allowAllForSuperAdmin: true,
    });
    if (!scope.ok) {
      await client.query("ROLLBACK");
      return res.status(scope.status).json({ message: scope.message });
    }

    const existing = await client.query(
      `SELECT * FROM "Comments" WHERE "Id" = $1 LIMIT 1;`,
      [commentId]
    );

    if (!existing.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Comment not found" });
    }

    await client.query(`DELETE FROM "Comments" WHERE "Id" = $1;`, [commentId]);

    await client.query("COMMIT");
    res.json({ message: "Comment deleted successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error deleting comment:", error);
    res.status(500).json({ message: "Failed to delete comment" });
  } finally {
    client.release();
  }
};

module.exports = {
  listComments,
  createComment,
  deleteComment,
};