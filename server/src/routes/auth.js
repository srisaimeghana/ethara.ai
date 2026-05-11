const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const prisma = require('../prisma');
const { signToken, requireAuth } = require('../middleware/auth');
const { HttpError } = require('../middleware/error');

const router = express.Router();

const signupSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  email: z.string().trim().toLowerCase().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

router.post('/signup', async (req, res, next) => {
  try {
    const { name, email, password } = signupSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new HttpError(409, 'An account with that email already exists');

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    const token = signToken({ sub: user.id });
    res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new HttpError(401, 'Invalid email or password');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new HttpError(401, 'Invalid email or password');

    const token = signToken({ sub: user.id });
    res.json({
      user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt },
      token,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
