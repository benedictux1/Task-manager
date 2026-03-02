const express = require("express");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

// --- DB Connection ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Required for Render hosted DBs
});

// --- Health Check ---
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Tasks API is running" });
});

// --- GET /projects ---
// Returns all projects with a count of open tasks
app.get("/projects", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        p.id,
        p.name,
        p.notes,
        p.context,
        p."createdAt",
        p."updatedAt",
        COUNT(t.id) FILTER (WHERE t.status != 'Done') AS "openTaskCount"
      FROM "Project" p
      LEFT JOIN "Task" t ON t."projectId" = p.id
      GROUP BY p.id
      ORDER BY p."updatedAt" DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("GET /projects error:", err.message);
    res.status(500).json({ error: "Failed to fetch projects", detail: err.message });
  }
});

// --- GET /tasks ---
// Returns all non-Done tasks, enriched with project and person names
app.get("/tasks", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        t.id,
        t.name,
        t.type,
        t.status,
        t."startDate",
        t."dueDate",
        t.notes,
        t.context,
        t."createdAt",
        t."updatedAt",
        -- Primary project
        p.id AS "primaryProjectId",
        p.name AS "primaryProjectName",
        -- All linked projects (via join table)
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', tp_proj.id, 'name', tp_proj.name))
          FILTER (WHERE tp_proj.id IS NOT NULL), '[]'
        ) AS projects,
        -- All linked persons
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', per.id, 'name', per.name))
          FILTER (WHERE per.id IS NOT NULL), '[]'
        ) AS persons
      FROM "Task" t
      LEFT JOIN "Project" p ON p.id = t."projectId"
      LEFT JOIN "TaskProject" tproj ON tproj."taskId" = t.id
      LEFT JOIN "Project" tp_proj ON tp_proj.id = tproj."projectId"
      LEFT JOIN "TaskPerson" tperson ON tperson."taskId" = t.id
      LEFT JOIN "Person" per ON per.id = tperson."personId"
      WHERE t.status != 'Done'
      GROUP BY t.id, p.id
      ORDER BY
        CASE t.status
          WHEN 'Must do' THEN 1
          WHEN 'Urgent' THEN 2
          WHEN 'My action' THEN 3
          WHEN 'Waiting others' THEN 4
          ELSE 5
        END,
        t."dueDate" ASC NULLS LAST,
        t."updatedAt" DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("GET /tasks error:", err.message);
    res.status(500).json({ error: "Failed to fetch tasks", detail: err.message });
  }
});

// --- GET /summary ---
// Compact AI-friendly snapshot of current work
app.get("/summary", async (req, res) => {
  try {
    // Projects with open task counts
    const projectsResult = await pool.query(`
      SELECT
        p.id,
        p.name,
        p.context,
        p.notes,
        COUNT(t.id) FILTER (WHERE t.status != 'Done') AS "openTaskCount"
      FROM "Project" p
      LEFT JOIN "Task" t ON t."projectId" = p.id
      GROUP BY p.id
      ORDER BY "openTaskCount" DESC, p."updatedAt" DESC
    `);

    // Active tasks — compact shape
    const tasksResult = await pool.query(`
      SELECT
        t.id,
        t.name,
        t.status,
        t.type,
        t."dueDate",
        t.notes,
        t.context,
        p.name AS "project",
        COALESCE(
          array_agg(DISTINCT per.name) FILTER (WHERE per.name IS NOT NULL), '{}'
        ) AS "people"
      FROM "Task" t
      LEFT JOIN "Project" p ON p.id = t."projectId"
      LEFT JOIN "TaskPerson" tperson ON tperson."taskId" = t.id
      LEFT JOIN "Person" per ON per.id = tperson."personId"
      WHERE t.status != 'Done'
      GROUP BY t.id, p.name
      ORDER BY
        CASE t.status
          WHEN 'Must do' THEN 1
          WHEN 'Urgent' THEN 2
          WHEN 'My action' THEN 3
          WHEN 'Waiting others' THEN 4
          ELSE 5
        END,
        t."dueDate" ASC NULLS LAST
    `);

    // Status breakdown counts
    const statusResult = await pool.query(`
      SELECT status, COUNT(*) AS count
      FROM "Task"
      WHERE status != 'Done'
      GROUP BY status
      ORDER BY count DESC
    `);

    res.json({
      generatedAt: new Date().toISOString(),
      summary: {
        totalOpenTasks: tasksResult.rowCount,
        totalProjects: projectsResult.rowCount,
        byStatus: statusResult.rows.reduce((acc, row) => {
          acc[row.status] = parseInt(row.count);
          return acc;
        }, {}),
      },
      projects: projectsResult.rows,
      tasks: tasksResult.rows,
    });
  } catch (err) {
    console.error("GET /summary error:", err.message);
    res.status(500).json({ error: "Failed to fetch summary", detail: err.message });
  }
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Tasks API running on port ${PORT}`);
});

