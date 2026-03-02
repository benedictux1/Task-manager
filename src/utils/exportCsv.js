import { getWorkingDaysUntilDue } from './dateUtils';

function escapeCsvValue(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportTasksToCsv({ tasks, context }) {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    alert('No tasks to export.');
    return;
  }

  const headers = [
    'Context',
    'Task ID',
    'Task Name',
    'Type',
    'Status',
    'Start Date',
    'Due Date',
    'Working Days Until Due',
    'Project IDs',
    'Project Names',
    'Person IDs',
    'Person Names',
    'Notes',
    'Completed At',
    'Created At',
    'Updated At',
  ];

  const lines = [headers.map(escapeCsvValue).join(',')];

  tasks.forEach((task) => {
    const workingDaysLeft = getWorkingDaysUntilDue(task.dueDate);

    const row = [
      context || task.context || '',
      task.id,
      task.name || '',
      task.type || '',
      task.status || '',
      task.startDate || '',
      task.dueDate || '',
      workingDaysLeft ?? '',
      (task.projectIds || []).join('; '),
      (task.projectNames || []).join('; '),
      (task.personIds || []).join('; '),
      (task.personNames || []).join('; '),
      task.notes || '',
      task.completedAt || '',
      task.createdAt || '',
      task.updatedAt || '',
    ];

    lines.push(row.map(escapeCsvValue).join(','));
  });

  const csvContent = lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download = `task-manager-${context || 'all'}-${dateStr}.csv`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

