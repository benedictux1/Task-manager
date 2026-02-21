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

// Helper function to format task with persons
const formatTaskWithPersons = (task) => {
  return {
    ...task,
    personIds: task.persons ? task.persons.map(tp => tp.personId) : [],
    personNames: task.persons ? task.persons.map(tp => tp.person?.name).filter(Boolean) : []
  };
};

// Get all tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      include: { 
        project: true,
        persons: {
          include: { person: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(tasks.map(formatTaskWithPersons));
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
      include: {
        persons: {
          include: { person: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(tasks.map(formatTaskWithPersons));
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Get tasks grouped by person (for Person View)
app.get('/api/tasks/by-person', async (req, res) => {
  try {
    const persons = await prisma.person.findMany({
      orderBy: { order: 'asc' },
      include: {
        tasks: {
          include: {
            task: {
              include: {
                project: true,
                persons: {
                  include: { person: true }
                }
              }
            }
          }
        }
      }
    });
    
    // Format the response
    const result = persons.map(person => ({
      ...person,
      tasks: person.tasks.map(tp => formatTaskWithPersons(tp.task))
    }));
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching tasks by person:', error);
    res.status(500).json({ error: 'Failed to fetch tasks by person' });
  }
});

// Create task
app.post('/api/tasks', async (req, res) => {
  try {
    const { name, projectId, type, status, startDate, dueDate, notes, personIds } = req.body;
    const task = await prisma.task.create({
      data: {
        name,
        projectId: parseInt(projectId),
        type: type || 'Regular',
        status: status || 'My action',
        startDate: startDate ?? '',
        dueDate: dueDate || '',
        notes: notes || '',
        // Create person relationships if provided
        persons: personIds && personIds.length > 0 ? {
          create: personIds.map(personId => ({
            personId: parseInt(personId)
          }))
        } : undefined
      },
      include: {
        persons: {
          include: { person: true }
        }
      }
    });
    res.status(201).json(formatTaskWithPersons(task));
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update task
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { name, projectId, type, status, startDate, dueDate, notes, personIds } = req.body;
    const taskId = parseInt(req.params.id);
    const updateData = {};
    
    if (name !== undefined) updateData.name = name;
    if (projectId !== undefined) updateData.projectId = parseInt(projectId);
    if (type !== undefined) updateData.type = type;
    if (startDate !== undefined) updateData.startDate = startDate;
    if (dueDate !== undefined) updateData.dueDate = dueDate;
    if (notes !== undefined) updateData.notes = notes;
    
    // Handle status change and completedAt timestamp
    if (status !== undefined) {
      updateData.status = status;
      
      // Get current task to check if status is changing
      const currentTask = await prisma.task.findUnique({ where: { id: taskId } });
      
      if (status === 'Done' && currentTask?.status !== 'Done') {
        // Task is being marked as Done - set completedAt timestamp
        updateData.completedAt = new Date();
      } else if (status !== 'Done' && currentTask?.status === 'Done') {
        // Task is being unmarked from Done - clear completedAt
        updateData.completedAt = null;
      }
    }
    
    // Update task basic fields
    const task = await prisma.task.update({
      where: { id: taskId },
      data: updateData
    });
    
    // Update person relationships if provided
    if (personIds !== undefined) {
      // Delete existing relationships
      await prisma.taskPerson.deleteMany({
        where: { taskId }
      });
      
      // Create new relationships
      if (personIds.length > 0) {
        await prisma.taskPerson.createMany({
          data: personIds.map(personId => ({
            taskId,
            personId: parseInt(personId)
          }))
        });
      }
    }
    
    // Fetch updated task with persons
    const updatedTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        persons: {
          include: { person: true }
        }
      }
    });
    
    res.json(formatTaskWithPersons(updatedTask));
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete task
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    // TaskPerson entries will be deleted automatically due to onDelete: Cascade
    await prisma.task.delete({
      where: { id: parseInt(req.params.id) }
    });
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// ----- PERSONS (POC - Point of Contact) -----

// Get all persons
app.get('/api/persons', async (req, res) => {
  try {
    const persons = await prisma.person.findMany({
      orderBy: { order: 'asc' }
    });
    res.json(persons);
  } catch (error) {
    console.error('Error fetching persons:', error);
    res.status(500).json({ error: 'Failed to fetch persons' });
  }
});

// Create person
app.post('/api/persons', async (req, res) => {
  try {
    const { name, color } = req.body;
    const maxOrder = await prisma.person.aggregate({ _max: { order: true } });
    const person = await prisma.person.create({
      data: {
        name,
        color: color || null,
        order: (maxOrder._max.order || 0) + 1
      }
    });
    res.status(201).json(person);
  } catch (error) {
    console.error('Error creating person:', error);
    res.status(500).json({ error: 'Failed to create person' });
  }
});

// Update person
app.put('/api/persons/:id', async (req, res) => {
  try {
    const { name, color, order } = req.body;
    const updateData = {};
    
    if (name !== undefined) updateData.name = name;
    if (color !== undefined) updateData.color = color;
    if (order !== undefined) updateData.order = order;
    
    const person = await prisma.person.update({
      where: { id: parseInt(req.params.id) },
      data: updateData
    });
    res.json(person);
  } catch (error) {
    console.error('Error updating person:', error);
    res.status(500).json({ error: 'Failed to update person' });
  }
});

// Delete person
app.delete('/api/persons/:id', async (req, res) => {
  try {
    // TaskPerson entries will be deleted automatically due to onDelete: Cascade
    await prisma.person.delete({
      where: { id: parseInt(req.params.id) }
    });
    res.json({ message: 'Person deleted successfully' });
  } catch (error) {
    console.error('Error deleting person:', error);
    res.status(500).json({ error: 'Failed to delete person' });
  }
});

// ----- SETTINGS (Types, Statuses & Persons) -----

// Get all settings
app.get('/api/settings', async (req, res) => {
  try {
    const types = await prisma.taskType.findMany({ orderBy: { order: 'asc' } });
    const statuses = await prisma.taskStatus.findMany({ orderBy: { order: 'asc' } });
    const persons = await prisma.person.findMany({ orderBy: { order: 'asc' } });
    res.json({ types, statuses, persons });
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

// Update persons
app.put('/api/settings/persons', async (req, res) => {
  try {
    const { persons } = req.body;
    
    // Get existing person IDs to preserve task relationships
    const existingPersons = await prisma.person.findMany();
    const existingIds = new Set(existingPersons.map(p => p.id));
    
    // Delete persons that are not in the new list
    const newIds = new Set(persons.filter(p => p.id).map(p => p.id));
    const idsToDelete = [...existingIds].filter(id => !newIds.has(id));
    
    if (idsToDelete.length > 0) {
      await prisma.person.deleteMany({
        where: { id: { in: idsToDelete } }
      });
    }
    
    // Update or create persons
    const createdPersons = await Promise.all(
      persons.map(async (person, index) => {
        if (person.id && existingIds.has(person.id)) {
          // Update existing
          return prisma.person.update({
            where: { id: person.id },
            data: { name: person.name, color: person.color || null, order: index }
          });
        } else {
          // Create new
          return prisma.person.create({
            data: { name: person.name, color: person.color || null, order: index }
          });
        }
      })
    );
    
    res.json(createdPersons);
  } catch (error) {
    console.error('Error updating persons:', error);
    res.status(500).json({ error: 'Failed to update persons' });
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
