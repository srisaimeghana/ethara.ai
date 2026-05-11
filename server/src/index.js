require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const dashboardRoutes = require('./routes/dashboard');
const { errorHandler, notFoundHandler } = require('./middleware/error');

const app = express();

app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : true;

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'tiny' : 'dev'));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts. Please try again later.' },
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/dashboard', dashboardRoutes);

const clientBuildPath = path.resolve(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({
      name: 'Team Task Manager API',
      docs: '/api/health',
      note: 'Client build not found. Run `npm run build --prefix client` to serve the SPA.',
    });
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

const rawPort = process.env.PORT;
const parsedPort = rawPort != null && rawPort !== '' ? Number.parseInt(String(rawPort), 10) : NaN;
const PORT = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Team Task Manager API listening on port ${PORT}`);
});
