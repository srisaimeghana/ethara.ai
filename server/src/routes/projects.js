const express = require('express');
const { z } = require('zod');
const prisma = require('../prisma');
const {
  requireAuth,
  loadProjectMembership,
  requireProjectAdmin,
} = require('../middleware/auth');
const { HttpError } = require('../middleware/error');
const tasksRouter = require('./projectTasks');

const router = express.Router();
router.use(requireAuth);

const createProjectSchema = z.object({
  name: z.string().trim().min(1, 'Project name is required').max(120),
  description: z.string().trim().max(1000).optional().nullable(),
});

const updateProjectSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(1000).optional().nullable(),
});

const addMemberSchema = z.object({
  userId: z.string().min(1).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  role: z.enum(['ADMIN', 'MEMBER']).optional().default('MEMBER'),
}).refine((d) => d.userId || d.email, { message: 'userId or email is required' });

const updateMemberSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER']),
});

router.get('/', async (req, res, next) => {
  try {
    const memberships = await prisma.projectMember.findMany({
      where: { userId: req.user.id },
      orderBy: { joinedAt: 'desc' },
      include: {
        project: {
          include: {
            _count: { select: { tasks: true, members: true } },
          },
        },
      },
    });

    const projects = memberships.map((m) => ({
      id: m.project.id,
      name: m.project.name,
      description: m.project.description,
      ownerId: m.project.ownerId,
      role: m.role,
      taskCount: m.project._count.tasks,
      memberCount: m.project._count.members,
      createdAt: m.project.createdAt,
      updatedAt: m.project.updatedAt,
    }));

    res.json({ projects });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, description } = createProjectSchema.parse(req.body);

    const project = await prisma.project.create({
      data: {
        name,
        description: description || null,
        ownerId: req.user.id,
        members: {
          create: { userId: req.user.id, role: 'ADMIN' },
        },
      },
      include: { _count: { select: { tasks: true, members: true } } },
    });

    res.status(201).json({
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        ownerId: project.ownerId,
        role: 'ADMIN',
        taskCount: project._count.tasks,
        memberCount: project._count.members,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', loadProjectMembership, async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.projectId },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: {
          orderBy: { joinedAt: 'asc' },
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        _count: { select: { tasks: true } },
      },
    });

    res.json({
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        ownerId: project.ownerId,
        owner: project.owner,
        currentUserRole: req.projectMembership.role,
        taskCount: project._count.tasks,
        members: project.members.map((m) => ({
          id: m.id,
          userId: m.userId,
          role: m.role,
          joinedAt: m.joinedAt,
          user: m.user,
        })),
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', loadProjectMembership, requireProjectAdmin, async (req, res, next) => {
  try {
    const data = updateProjectSchema.parse(req.body);
    if (Object.keys(data).length === 0) {
      throw new HttpError(400, 'No fields to update');
    }
    const project = await prisma.project.update({
      where: { id: req.projectId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description || null } : {}),
      },
    });
    res.json({ project });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', loadProjectMembership, requireProjectAdmin, async (req, res, next) => {
  try {
    await prisma.project.delete({ where: { id: req.projectId } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.get('/:id/members', loadProjectMembership, async (req, res, next) => {
  try {
    const members = await prisma.projectMember.findMany({
      where: { projectId: req.projectId },
      orderBy: { joinedAt: 'asc' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    res.json({ members });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/members', loadProjectMembership, requireProjectAdmin, async (req, res, next) => {
  try {
    const { userId, email, role } = addMemberSchema.parse(req.body);

    let user;
    if (userId) {
      user = await prisma.user.findUnique({ where: { id: userId } });
    } else {
      user = await prisma.user.findUnique({ where: { email } });
    }
    if (!user) throw new HttpError(404, 'User not found');

    const existing = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: req.projectId, userId: user.id } },
    });
    if (existing) throw new HttpError(409, 'User is already a member of this project');

    const membership = await prisma.projectMember.create({
      data: { projectId: req.projectId, userId: user.id, role },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    res.status(201).json({ member: membership });
  } catch (err) {
    next(err);
  }
});

router.put(
  '/:id/members/:userId',
  loadProjectMembership,
  requireProjectAdmin,
  async (req, res, next) => {
    try {
      const { role } = updateMemberSchema.parse(req.body);
      const targetUserId = req.params.userId;

      const project = await prisma.project.findUnique({ where: { id: req.projectId } });
      if (project.ownerId === targetUserId && role !== 'ADMIN') {
        throw new HttpError(400, 'The project owner must remain an admin');
      }

      const membership = await prisma.projectMember.update({
        where: { projectId_userId: { projectId: req.projectId, userId: targetUserId } },
        data: { role },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
      res.json({ member: membership });
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  '/:id/members/:userId',
  loadProjectMembership,
  requireProjectAdmin,
  async (req, res, next) => {
    try {
      const targetUserId = req.params.userId;

      const project = await prisma.project.findUnique({ where: { id: req.projectId } });
      if (project.ownerId === targetUserId) {
        throw new HttpError(400, 'Cannot remove the project owner');
      }

      await prisma.projectMember.delete({
        where: { projectId_userId: { projectId: req.projectId, userId: targetUserId } },
      });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
);

router.use('/:projectId/tasks', loadProjectMembership, (req, res, next) => {
  req.isProjectAdmin = req.projectMembership?.role === 'ADMIN';
  next();
}, tasksRouter);

module.exports = router;
