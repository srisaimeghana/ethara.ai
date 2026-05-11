/**
 * Railway / Docker entry: always run from the server package root so Prisma
 * finds prisma/schema.prisma and node_modules/.bin resolves correctly.
 */
const path = require('path');
const { execSync } = require('child_process');

const serverRoot = path.resolve(__dirname, '..');
process.chdir(serverRoot);

console.log('[start] cwd=', process.cwd());
console.log('[start] PORT=', process.env.PORT || '(unset)');
console.log('[start] DATABASE_URL set=', Boolean(process.env.DATABASE_URL));

if (!process.env.DATABASE_URL) {
  console.error('[start] FATAL: DATABASE_URL is missing. Add Postgres and reference ${{Postgres.DATABASE_URL}} on this service.');
  process.exit(1);
}

try {
  execSync('npx prisma db push --accept-data-loss --skip-generate', {
    stdio: 'inherit',
    env: process.env,
  });
} catch (e) {
  console.error('[start] prisma db push failed');
  process.exit(1);
}

require('../src/index.js');
