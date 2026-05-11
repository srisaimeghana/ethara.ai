const jwt = require('jsonwebtoken');
const prisma = require('../prisma');
const { HttpError } = require('./error');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new HttpError(401, 'Authentication required');

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (e) {
      throw new HttpError(401, 'Invalid or expired token');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { id: true, email: true, name: true },
    });
    if (!user) throw new HttpError(401, 'User no longer exists');

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

async function loadProjectMembership(req, _res, next) {
  try {
    const projectId = req.params.projectId || req.params.id;
    if (!projectId) throw new HttpError(400, 'Missing project id');

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: req.user.id } },
    });

    if (!membership) {
      const projectExists = await prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true },
      });
      if (!projectExists) throw new HttpError(404, 'Project not found');
      throw new HttpError(403, 'You are not a member of this project');
    }

    req.projectId = projectId;
    req.projectMembership = membership;
    next();
  } catch (err) {
    next(err);
  }
}

function requireProjectAdmin(req, _res, next) {
  if (!req.projectMembership || req.projectMembership.role !== 'ADMIN') {
    return next(new HttpError(403, 'Admin role required for this action'));
  }
  next();
}

module.exports = {
  signToken,
  verifyToken,
  requireAuth,
  loadProjectMembership,
  requireProjectAdmin,
};
