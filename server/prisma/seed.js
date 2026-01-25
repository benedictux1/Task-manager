import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data (order matters due to foreign keys)
  await prisma.taskPerson.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.taskType.deleteMany();
  await prisma.taskStatus.deleteMany();
  await prisma.person.deleteMany();

  // Create task types
  const types = [
    { name: 'Admin', color: '#6C757D', order: 0 },
    { name: 'Urgent', color: '#DC3545', order: 1 },
    { name: 'Regular', color: '#0066CC', order: 2 },
    { name: 'Night', color: '#343A40', order: 3 },
    { name: 'Weekend', color: '#28A745', order: 4 },
    { name: 'Backlog', color: '#FFC107', order: 5 },
    { name: 'Others', color: '#6F42C1', order: 6 },
  ];

  for (const type of types) {
    await prisma.taskType.create({ data: type });
  }
  console.log('✅ Created task types');

  // Create task statuses
  const statuses = [
    { name: 'Must do', color: '#FF6B6B', order: 0 },
    { name: 'Waiting others', color: '#1D1D1F', order: 1 },
    { name: 'My action', color: '#FFD93D', order: 2 },
    { name: 'Done', color: '#6BCF7F', order: 3 },
  ];

  for (const status of statuses) {
    await prisma.taskStatus.create({ data: status });
  }
  console.log('✅ Created task statuses');

  // Create people (POC - Point of Contact)
  const people = [
    { name: 'Efa', color: null, order: 0 },
    { name: 'Shirley', color: null, order: 1 },
    { name: 'Joelle', color: null, order: 2 },
    { name: 'Ying Wen', color: null, order: 3 },
  ];

  const createdPeople = [];
  for (const person of people) {
    const created = await prisma.person.create({ data: person });
    createdPeople.push(created);
  }
  console.log('✅ Created people (POC)');

  // Create sample projects
  const project1 = await prisma.project.create({
    data: {
      name: 'Website Redesign',
      notes: '<p>Modernize company website with new branding.</p><h3>Key objectives:</h3><ul><li>Improve mobile responsiveness</li><li>Update color scheme to match new brand guidelines</li><li>Optimize page load speed</li></ul><p><strong>Stakeholders:</strong> Marketing team, Design team, Dev team</p><p><mark>Deadline: End of Q1</mark></p>'
    }
  });

  const project2 = await prisma.project.create({
    data: {
      name: 'Q1 Planning',
      notes: '<p>Strategic planning for Q1 2026.</p><h3>Focus areas:</h3><ol><li>Revenue targets</li><li>Team expansion</li><li>Product roadmap priorities</li></ol><p><strong>Meeting notes from 1/15:</strong> Board approved budget increase for hiring.</p>'
    }
  });

  const project3 = await prisma.project.create({
    data: {
      name: 'Client Onboarding System',
      notes: '<p>Build automated onboarding flow for new clients.</p><h3>Requirements:</h3><ul><li>Welcome email sequence</li><li>Documentation portal</li><li>Kickoff meeting scheduler</li><li>Contract signing workflow</li></ul>'
    }
  });
  console.log('✅ Created projects');

  // Create sample tasks
  const tasks = [
    { name: 'Review design mockups', projectId: project1.id, type: 'Urgent', status: 'Must do', dueDate: '25/Jan', notes: '' },
    { name: 'Update homepage copy', projectId: project1.id, type: 'Regular', status: 'My action', dueDate: '28/Jan', notes: '' },
    { name: 'Get feedback from CEO', projectId: project1.id, type: 'Regular', status: 'Waiting others', dueDate: '', notes: '' },
    { name: 'Finalize Q1 OKRs', projectId: project2.id, type: 'Urgent', status: 'Must do', dueDate: '24/Jan', notes: '' },
    { name: 'Schedule team kickoff', projectId: project2.id, type: 'Admin', status: 'My action', dueDate: '27/Jan', notes: '' },
    { name: 'Review budget proposals', projectId: project2.id, type: 'Regular', status: 'Done', dueDate: '20/Jan', notes: '' },
    { name: 'Draft welcome email template', projectId: project3.id, type: 'Regular', status: 'My action', dueDate: '', notes: '' },
    { name: 'Build documentation site', projectId: project3.id, type: 'Backlog', status: 'Waiting others', dueDate: '', notes: '' },
  ];

  for (const task of tasks) {
    await prisma.task.create({ data: task });
  }
  console.log('✅ Created tasks');

  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
