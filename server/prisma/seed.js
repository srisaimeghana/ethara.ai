const { PrismaClient, ProjectRole, TaskStatus, TaskPriority } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('password123', 10);

  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: { email: 'alice@example.com', name: 'Alice Admin', passwordHash },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: { email: 'bob@example.com', name: 'Bob Member', passwordHash },
  });

  const carol = await prisma.user.upsert({
    where: { email: 'carol@example.com' },
    update: {},
    create: { email: 'carol@example.com', name: 'Carol Member', passwordHash },
  });

  const existing = await prisma.project.findFirst({
    where: { name: 'Launch Website', ownerId: alice.id },
  });

  let project = existing;
  if (!project) {
    project = await prisma.project.create({
      data: {
        name: 'Launch Website',
        description: 'Marketing site for product launch.',
        ownerId: alice.id,
        members: {
          create: [
            { userId: alice.id, role: ProjectRole.ADMIN },
            { userId: bob.id, role: ProjectRole.MEMBER },
            { userId: carol.id, role: ProjectRole.MEMBER },
          ],
        },
        tasks: {
          create: [
            {
              title: 'Design landing page',
              description: 'Create wireframes and high-fidelity mockups.',
              status: TaskStatus.IN_PROGRESS,
              priority: TaskPriority.HIGH,
              dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              assigneeId: bob.id,
              createdById: alice.id,
            },
            {
              title: 'Set up analytics',
              description: 'Install GA4 and conversion tracking.',
              status: TaskStatus.TODO,
              priority: TaskPriority.MEDIUM,
              dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
              assigneeId: carol.id,
              createdById: alice.id,
            },
            {
              title: 'Write copy',
              description: 'Hero, features, FAQ sections.',
              status: TaskStatus.DONE,
              priority: TaskPriority.MEDIUM,
              assigneeId: alice.id,
              createdById: alice.id,
            },
            {
              title: 'Fix legacy contact form',
              description: 'Past due item to demonstrate overdue indicator.',
              status: TaskStatus.TODO,
              priority: TaskPriority.HIGH,
              dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
              assigneeId: bob.id,
              createdById: alice.id,
            },
          ],
        },
      },
    });
  }

  console.log('Seed complete.');
  console.log('Login with: alice@example.com / password123 (project admin)');
  console.log('         or: bob@example.com  / password123 (project member)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
