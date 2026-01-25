import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the React app build
app.use(express.static(path.join(__dirname, '../dist')));

// ==================== API ROUTES ====================

// ----- PROJECTS -----

// Get all projects
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get single project
app.get('/api/projects/:id', async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: parseInt(req.params.id) }
    });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Create project
app.post('/api/projects', async (req, res) => {
  try {
    const { name, notes } = req.body;
    const project = await prisma.project.create({
      data: { name: name || 'New Project', notes: notes || '' }
    });
    res.status(201).json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Update project
app.put('/api/projects/:id', async (req, res) => {
  try {
    const { name, notes } = req.body;
    const project = await prisma.project.update({
      where: { id: parseInt(req.params.id) },
      data: { name, notes }
    });
    res.json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete project
app.delete('/api/projects/:id', async (req, res) => {
  try {
    // First delete all tasks associated with this project
    await prisma.task.deleteMany({
      where: { projectId: parseInt(req.params.id) }
    });
    // Then delete the project
    await prisma.project.delete({
      where: { id: parseInt(req.params.id) }
    });
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// ----- TASKS -----

// Get all tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      include: { project: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Get tasks by project
app.get('/api/projects/:projectId/tasks', async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { projectId: parseInt(req.params.projectId) },
      orderBy: { createdAt: 'desc' }
    });
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Create task
app.post('/api/tasks', async (req, res) => {
  try {
    const { name, projectId, type, status, dueDate, notes } = req.body;
    const task = await prisma.task.create({
      data: {
        name,
        projectId: parseInt(projectId),
        type: type || 'Regular',
        status: status || 'My action',
        dueDate: dueDate || '',
        notes: notes || ''
      }
    });
    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update task
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { name, projectId, type, status, dueDate, notes } = req.body;
    const updateData = {};
    
    if (name !== undefined) updateData.name = name;
    if (projectId !== undefined) updateData.projectId = parseInt(projectId);
    if (type !== undefined) updateData.type = type;
    if (status !== undefined) updateData.status = status;
    if (dueDate !== undefined) updateData.dueDate = dueDate;
    if (notes !== undefined) updateData.notes = notes;
    
    const task = await prisma.task.update({
      where: { id: parseInt(req.params.id) },
      data: updateData
    });
    res.json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete task
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    await prisma.task.delete({
      where: { id: parseInt(req.params.id) }
    });
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// ----- SETTINGS (Types & Statuses) -----

// Get all settings
app.get('/api/settings', async (req, res) => {
  try {
    const types = await prisma.taskType.findMany({ orderBy: { order: 'asc' } });
    const statuses = await prisma.taskStatus.findMany({ orderBy: { order: 'asc' } });
    res.json({ types, statuses });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update types
app.put('/api/settings/types', async (req, res) => {
  try {
    const { types } = req.body;
    
    // Delete all existing types and recreate
    await prisma.taskType.deleteMany();
    
    const createdTypes = await Promise.all(
      types.map((type, index) => 
        prisma.taskType.create({
          data: { name: type.name, color: type.color, order: index }
        })
      )
    );
    
    res.json(createdTypes);
  } catch (error) {
    console.error('Error updating types:', error);
    res.status(500).json({ error: 'Failed to update types' });
  }
});

// Update statuses
app.put('/api/settings/statuses', async (req, res) => {
  try {
    const { statuses } = req.body;
    
    // Delete all existing statuses and recreate
    await prisma.taskStatus.deleteMany();
    
    const createdStatuses = await Promise.all(
      statuses.map((status, index) => 
        prisma.taskStatus.create({
          data: { name: status.name, color: status.color, order: index }
        })
      )
    );
    
    res.json(createdStatuses);
  } catch (error) {
    console.error('Error updating statuses:', error);
    res.status(500).json({ error: 'Failed to update statuses' });
  }
});

// ==================== CATCH-ALL ROUTE ====================

// Handle React routing - serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📦 API available at http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
