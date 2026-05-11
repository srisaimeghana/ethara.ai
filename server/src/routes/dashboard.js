const express = require('express');
const prisma = require('../prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    const memberships = await prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true, role: true },
    });
    const projectIds = memberships.map((m) => m.projectId);

    const [
      projectCount,
      adminProjectCount,
      myTasksTotal,
      myTasksByStatus,
      myOverdue,
      allTasksTotal,
      projectTaskAggByStatus,
      allOverdueCount,
      tasksPerUserRaw,
      upcomingTasks,
      recentlyCompleted,
    ] = await Promise.all([
      Promise.resolve(memberships.length),
      Promise.resolve(memberships.filter((m) => m.role === 'ADMIN').length),
      prisma.task.count({ where: { assigneeId: userId } }),
      prisma.task.groupBy({
        by: ['status'],
        where: { assigneeId: userId },
        _count: { _all: true },
      }),
      prisma.task.count({
        where: {
          assigneeId: userId,
          status: { not: 'DONE' },
          dueDate: { lt: now },
        },
      }),
      prisma.task.count({ where: { projectId: { in: projectIds } } }),
      prisma.task.groupBy({
        by: ['status'],
        where: { projectId: { in: projectIds } },
        _count: { _all: true },
      }),
      prisma.task.count({
        where: {
          projectId: { in: projectIds },
          status: { not: 'DONE' },
          dueDate: { lt: now },
        },
      }),
      prisma.task.groupBy({
        by: ['assigneeId'],
        where: { projectId: { in: projectIds } },
        _count: { _all: true },
      }),
      prisma.task.findMany({
        where: {
          assigneeId: userId,
          status: { not: 'DONE' },
          dueDate: { gte: now },
        },
        orderBy: { dueDate: 'asc' },
        take: 5,
        include: {
          project: { select: { id: true, name: true } },
        },
      }),
      prisma.task.findMany({
        where: {
          projectId: { in: projectIds },
          status: 'DONE',
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        include: {
          project: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true } },
        },
      }),
    ]);

    const assigneeIds = tasksPerUserRaw
      .map((r) => r.assigneeId)
      .filter((id) => id !== null);
    const assignees = assigneeIds.length
      ? await prisma.user.findMany({
          where: { id: { in: assigneeIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
    const assigneeMap = Object.fromEntries(assignees.map((u) => [u.id, u]));

    const tasksPerUser = tasksPerUserRaw
      .map((r) => ({
        userId: r.assigneeId,
        user: r.assigneeId ? assigneeMap[r.assigneeId] : null,
        count: r._count._all,
      }))
      .sort((a, b) => b.count - a.count);

    const statusMap = (rows) =>
      rows.reduce(
        (acc, r) => ({ ...acc, [r.status]: r._count._all }),
        { TODO: 0, IN_PROGRESS: 0, DONE: 0 }
      );

    res.json({
      summary: {
        projectCount,
        adminProjectCount,
        myTasksTotal,
        myOverdueCount: myOverdue,
        myTasksByStatus: statusMap(myTasksByStatus),
        allTasksTotal,
        allOverdueCount,
        allProjectTasksByStatus: statusMap(projectTaskAggByStatus),
      },
      tasksPerUser,
      upcomingTasks,
      recentlyCompleted,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
