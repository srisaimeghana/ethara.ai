const express = require('express');
const { z } = require('zod');
const prisma = require('../prisma');
const { requireAuth } = require('../middleware/auth');
const { HttpError } = require('../middleware/error');

const router = express.Router();
router.use(requireAuth);

const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().max(4000).optional().nullable(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  dueDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional()
    .nullable(),
  assigneeId: z.string().min(1).optional().nullable(),
});

const statusSchema = z.object({
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']),
});

async function loadTaskAndMembership(req, _res, next) {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        project: { select: { id: true, ownerId: true } },
      },
    });
    if (!task) throw new HttpError(404, 'Task not found');

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: task.projectId, userId: req.user.id } },
    });
    if (!membership) throw new HttpError(403, 'You are not a member of this project');

    req.task = task;
    req.projectMembership = membership;
    next();
  } catch (err) {
    next(err);
  }
}

router.get('/:id', loadTaskAndMembership, async (req, res, next) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.task.id },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
    });
    res.json({ task });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', loadTaskAndMembership, async (req, res, next) => {
  try {
    const data = updateTaskSchema.parse(req.body);
    if (Object.keys(data).length === 0) {
      throw new HttpError(400, 'No fields to update');
    }

    const isAdmin = req.projectMembership.role === 'ADMIN';
    const isAssignee = req.task.assigneeId === req.user.id;

    if (!isAdmin && !isAssignee) {
      throw new HttpError(403, 'Only admins or the assigned member can modify this task');
    }

    const memberOnlyAllowed = ['status'];
    if (!isAdmin) {
      const disallowed = Object.keys(data).filter((k) => !memberOnlyAllowed.includes(k));
      if (disallowed.length > 0) {
        throw new HttpError(
          403,
          `Members can only update task status. Admins are required to modify: ${disallowed.join(', ')}.`
        );
      }
    }

    if (data.assigneeId) {
      const memberCheck = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: req.task.projectId, userId: data.assigneeId } },
      });
      if (!memberCheck) throw new HttpError(400, 'Assignee must be a project member');
    }

    const updated = await prisma.task.update({
      where: { id: req.task.id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description || null } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.dueDate !== undefined
          ? { dueDate: data.dueDate ? new Date(data.dueDate) : null }
          : {}),
        ...(data.assigneeId !== undefined ? { assigneeId: data.assigneeId || null } : {}),
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
    res.json({ task: updated });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/status', loadTaskAndMembership, async (req, res, next) => {
  try {
    const { status } = statusSchema.parse(req.body);

    const isAdmin = req.projectMembership.role === 'ADMIN';
    const isAssignee = req.task.assigneeId === req.user.id;

    if (!isAdmin && !isAssignee) {
      throw new HttpError(403, 'Only admins or the assigned member can change this task status');
    }

    const updated = await prisma.task.update({
      where: { id: req.task.id },
      data: { status },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
    res.json({ task: updated });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', loadTaskAndMembership, async (req, res, next) => {
  try {
    const isAdmin = req.projectMembership.role === 'ADMIN';
    if (!isAdmin) throw new HttpError(403, 'Only admins can delete tasks');

    await prisma.task.delete({ where: { id: req.task.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
