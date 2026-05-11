const { ZodError } = require('zod');

class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function notFoundHandler(req, res, next) {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: `Not found: ${req.method} ${req.path}` });
  }
  next();
}

function errorHandler(err, req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  if (err && err.code === 'P2002') {
    return res.status(409).json({
      error: 'Unique constraint violated',
      details: err.meta,
    });
  }

  if (err && err.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found' });
  }

  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
}

module.exports = { HttpError, notFoundHandler, errorHandler };
