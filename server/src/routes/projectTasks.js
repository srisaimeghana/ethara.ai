const express = require('express');
const { z } = require('zod');
const prisma = require('../prisma');
const { HttpError } = require('../middleware/error');

const router = express.Router({ mergeParams: true });

const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(160),
  description: z.string().trim().max(4000).optional().nullable(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional().default('TODO'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional().default('MEDIUM'),
  dueDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional()
    .nullable(),
  assigneeId: z.string().min(1).optional().nullable(),
});

const listQuerySchema = z.object({
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  assigneeId: z.string().min(1).optional(),
  q: z.string().trim().min(1).optional(),
});

router.get('/', async (req, res, next) => {
  try {
    const { status, assigneeId, q } = listQuerySchema.parse(req.query);

    const tasks = await prisma.task.findMany({
      where: {
        projectId: req.projectId,
        ...(status ? { status } : {}),
        ...(assigneeId ? { assigneeId } : {}),
        ...(q ? { OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ] } : {}),
      },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    res.json({ tasks });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    if (!req.isProjectAdmin) {
      throw new HttpError(403, 'Only project admins can create tasks');
    }
    const data = createTaskSchema.parse(req.body);

    if (data.assigneeId) {
      const memberCheck = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: req.projectId, userId: data.assigneeId } },
      });
      if (!memberCheck) throw new HttpError(400, 'Assignee must be a project member');
    }

    const task = await prisma.task.create({
      data: {
        projectId: req.projectId,
        title: data.title,
        description: data.description || null,
        status: data.status,
        priority: data.priority,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        assigneeId: data.assigneeId || null,
        createdById: req.user.id,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    res.status(201).json({ task });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
