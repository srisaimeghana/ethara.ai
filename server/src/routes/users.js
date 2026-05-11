const express = require('express');
const { z } = require('zod');
const prisma = require('../prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

const querySchema = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});

router.get('/', async (req, res, next) => {
  try {
    const { q, limit } = querySchema.parse(req.query);

    const users = await prisma.user.findMany({
      where: q
        ? {
            OR: [
              { email: { contains: q, mode: 'insensitive' } },
              { name: { contains: q, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { name: 'asc' },
      take: limit,
      select: { id: true, name: true, email: true },
    });

    res.json({ users });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
