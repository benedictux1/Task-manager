import XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

async function importData() {
  try {
    console.log('Reading Excel file...');
    
    // Read the Excel file
    const workbook = XLSX.readFile(join(__dirname, '..', '25 Jan Current data.xlsx'));
    const worksheet = workbook.Sheets['Sheet1'];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Skip header row
    const rows = data.slice(1);
    
    console.log(`Found ${rows.length} rows in Excel file`);
    
    // Get existing types and statuses from TaskType and TaskStatus tables
    let types = await prisma.taskType.findMany();
    let statuses = await prisma.taskStatus.findMany();
    
    // Create a default project for tasks without a project
    let defaultProject = await prisma.project.findFirst({ where: { name: 'General Tasks' }});
    if (!defaultProject) {
      defaultProject = await prisma.project.create({
        data: {
          name: 'General Tasks',
          notes: 'Default project for imported tasks'
        }
      });
      console.log('Created default project: General Tasks');
    }
    
    // Type colors mapping
    const typeColors = {
      'Weekend': '#9B59B6',
      'Regular': '#3498DB',
      'Backlog': '#95A5A6',
      'Urgent': '#E74C3C',
      'Admin': '#1ABC9C'
    };
    
    // Create any missing types in TaskType table
    const validTypes = ['Weekend', 'Regular', 'Backlog', 'Urgent', 'Admin'];
    for (const typeName of validTypes) {
      const exists = types.find(t => t.name === typeName);
      if (!exists) {
        const created = await prisma.taskType.create({
          data: { 
            name: typeName, 
            color: typeColors[typeName] || '#808080',
            order: types.length 
          }
        });
        types.push(created);
        console.log(`Created type: ${typeName}`);
      }
    }
    
    // Status colors mapping
    const statusColors = {
      'Done': '#34C759',
      'Waiting others': '#FF9500',
      'My action': '#0066CC',
      'Must do': '#FF3B30'
    };
    
    // Create any missing statuses in TaskStatus table
    const validStatuses = ['Done', 'Waiting others', 'My action', 'Must do'];
    for (const statusName of validStatuses) {
      const exists = statuses.find(s => s.name === statusName);
      if (!exists) {
        const created = await prisma.taskStatus.create({
          data: { 
            name: statusName, 
            color: statusColors[statusName] || '#808080',
            order: statuses.length 
          }
        });
        statuses.push(created);
        console.log(`Created status: ${statusName}`);
      }
    }
    
    // Import tasks
    let imported = 0;
    let skipped = 0;
    
    for (const row of rows) {
      const [taskName, projectName, typeName, statusName, dueIn, poc, notes] = row;
      
      // Skip rows without task names or incomplete rows
      if (!taskName || typeof taskName !== 'string' || taskName.trim() === '') {
        skipped++;
        continue;
      }
      
      // Skip rows that look like sub-items (starting with numbers or are very short fragments)
      if (/^\d+\./.test(taskName.trim())) {
        console.log(`Skipping sub-item: ${taskName}`);
        skipped++;
        continue;
      }
      
      // Map type (use string directly in Task table)
      const mappedTypeName = validTypes.includes(typeName) ? typeName : 'Regular';
      
      // Map status (handle trailing spaces, use string directly)
      const cleanStatus = statusName ? statusName.trim() : 'My action';
      const mappedStatusName = validStatuses.includes(cleanStatus) ? cleanStatus : 'My action';
      
      // Check if task already exists (by name)
      const existingTask = await prisma.task.findFirst({
        where: { name: taskName.trim() }
      });
      
      if (existingTask) {
        console.log(`Task already exists, skipping: ${taskName.substring(0, 50)}...`);
        skipped++;
        continue;
      }
      
      // Create the task
      try {
        await prisma.task.create({
          data: {
            name: taskName.trim(),
            projectId: defaultProject.id,
            type: mappedTypeName,
            status: mappedStatusName,
            notes: notes ? String(notes).trim() : '',
            dueDate: '' // No due dates in the Excel
          }
        });
        imported++;
        console.log(`Imported: ${taskName.substring(0, 50)}...`);
      } catch (err) {
        console.error(`Error importing task "${taskName}":`, err.message);
        skipped++;
      }
    }
    
    console.log('\n=== Import Complete ===');
    console.log(`Imported: ${imported} tasks`);
    console.log(`Skipped: ${skipped} rows`);
    
  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importData();
