# Team Task Manager

A full-stack collaborative task management web application — a simplified Trello/Asana — where
users sign up, create projects, invite teammates, assign tasks, and track progress on a
Kanban-style board with role-based access control.

## Features

### Authentication
- Sign up with **Name, Email, Password**
- Secure JWT-based login (tokens signed with `JWT_SECRET`, stored in `localStorage`)
- Passwords hashed with bcrypt (cost factor 10)
- `GET /api/auth/me` to rehydrate the session
- Rate limiting on auth endpoints (30 requests / 15 min / IP)

### Project & Team Management
- Create projects — the creator is automatically the **Admin** and `owner`
- **Admin** can add and remove members (by user search or email)
- **Admin** can promote a member to admin or demote (the owner cannot be demoted)
- **Members** see only the projects they belong to
- Project edit / delete are admin-only

### Task Management
- Tasks have **Title, Description, Due Date, Priority** (LOW / MEDIUM / HIGH)
- **Status**: `TODO` · `IN_PROGRESS` · `DONE` — rendered as a 3-column Kanban board
- Tasks are assigned to a project member
- Assignees can change the status of their own tasks
- Admins can edit/delete any task in their project

### Dashboard
- Total tasks (mine and across projects)
- Tasks grouped by status (mine and team-wide, with progress bars)
- **Tasks per user** breakdown across your projects
- **Overdue** task counts (mine + team-wide)
- Upcoming personal tasks (sorted by due date)
- Recently completed across all your projects

### Role-Based Access Control
| Action                          | Project Admin | Project Member |
|---------------------------------|:-------------:|:--------------:|
| View project & tasks            | ✅            | ✅             |
| Edit/delete project             | ✅            | ❌             |
| Add/remove/promote members      | ✅            | ❌             |
| Create tasks                    | ✅            | ❌             |
| Edit task (title, due, etc.)    | ✅            | ❌             |
| Delete task                     | ✅            | ❌             |
| Update status of *own* task     | ✅            | ✅             |

RBAC is enforced **server-side** in middleware (`requireAuth`,
`loadProjectMembership`, `requireProjectAdmin`) — the UI hides forbidden actions
purely as a usability layer; tampering with the request returns `403`.

---

## Tech Stack

| Layer       | Choice                                              |
|-------------|-----------------------------------------------------|
| Frontend    | React 18 · Vite 5 · React Router 6 · Tailwind CSS 3 |
| Backend     | Node.js 20 · Express 4 · Zod (validation)           |
| Database    | PostgreSQL via Prisma ORM 5                         |
| Auth        | JWT (`jsonwebtoken`) + bcrypt                       |
| Security    | Helmet · CORS · express-rate-limit                  |
| Deployment  | Railway (Nixpacks builder) — single service         |

---

## Project Structure

```
.
├── client/                     React + Vite SPA
│   ├── src/
│   │   ├── components/         Layout, Modal, Badges, LoadingScreen
│   │   ├── context/            AuthContext, ToastContext
│   │   ├── pages/              Login, Signup, Dashboard, Projects, ProjectDetail
│   │   ├── App.jsx
│   │   ├── api.js              fetch wrapper with JWT injection
│   │   └── main.jsx
│   ├── index.html
│   ├── tailwind.config.js
│   └── vite.config.js
├── server/                     Express REST API
│   ├── prisma/
│   │   ├── schema.prisma       Models: User, Project, ProjectMember, Task
│   │   └── seed.js
│   ├── src/
│   │   ├── middleware/
│   │   │   ├── auth.js         JWT + project-membership guards
│   │   │   └── error.js        Zod + Prisma + HttpError handler
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── users.js        Search users (for adding members)
│   │   │   ├── projects.js     CRUD + member sub-routes
│   │   │   ├── projectTasks.js List/create tasks under a project
│   │   │   ├── tasks.js        Per-task read/update/delete + status patch
│   │   │   └── dashboard.js    Aggregates
│   │   ├── prisma.js
│   │   └── index.js            Express bootstrap + SPA fallback
│   └── package.json
├── package.json                Root scripts (build + start)
├── nixpacks.toml               Railway build instructions
├── railway.json
└── README.md
```

In production, the Express server serves the built React app from `client/dist`, so the entire
stack runs as a single Railway service — no CORS issues, one URL.

---

## Data Model

```
User (id, email, name, passwordHash)
  ├──< owns Project (1..*)
  ├──< ProjectMember (role: ADMIN | MEMBER)
  ├──< assignedTasks
  └──< createdTasks

Project (id, name, description, ownerId)
  ├──< members  (ProjectMember, unique on (projectId, userId))
  └──< tasks

Task (id, projectId, title, description, status, priority, dueDate, assigneeId, createdById)
```

`ON DELETE CASCADE` is configured so deleting a project removes its tasks and memberships;
deleting a user removes the projects they own (you may want to soft-delete in a real product —
left as-is here for simplicity).

---

## REST API Reference

All routes are prefixed with `/api`. Authenticated routes require
`Authorization: Bearer <jwt>`.

| Method | Path                                          | Auth | Notes                                  |
|--------|-----------------------------------------------|:----:|----------------------------------------|
| GET    | `/health`                                     | —    | Liveness check                         |
| POST   | `/auth/signup`                                | —    | `{ name, email, password }`            |
| POST   | `/auth/login`                                 | —    | `{ email, password }` → `{ token }`    |
| GET    | `/auth/me`                                    | ✓    | Current user                           |
| GET    | `/users?q=...`                                | ✓    | Search users (for adding members)      |
| GET    | `/projects`                                   | ✓    | List my projects                       |
| POST   | `/projects`                                   | ✓    | Create project (I become admin)        |
| GET    | `/projects/:id`                               | ✓    | Project with members                   |
| PUT    | `/projects/:id`                               | Admin| Update project                         |
| DELETE | `/projects/:id`                               | Admin| Delete project                         |
| GET    | `/projects/:id/members`                       | ✓    | List members                           |
| POST   | `/projects/:id/members`                       | Admin| `{ userId or email, role }`            |
| PUT    | `/projects/:id/members/:userId`               | Admin| `{ role }`                             |
| DELETE | `/projects/:id/members/:userId`               | Admin| Remove member (not owner)              |
| GET    | `/projects/:projectId/tasks?status=&q=&assigneeId=` | ✓ | Filter tasks                  |
| POST   | `/projects/:projectId/tasks`                  | Admin| Create task                            |
| GET    | `/tasks/:id`                                  | ✓    | Task details                           |
| PUT    | `/tasks/:id`                                  | * | Admin full edit; assignee may only patch status |
| PATCH  | `/tasks/:id/status`                           | * | `{ status }` — admin or assignee       |
| DELETE | `/tasks/:id`                                  | Admin| Delete task                            |
| GET    | `/dashboard`                                  | ✓    | Aggregates for current user            |

Validation is done with **Zod** at every entry point; failures return a `400` with the
field-level details. Prisma errors (`P2002` unique, `P2025` not-found) get friendly mappings
in `middleware/error.js`.

---

## Running locally

### Prerequisites
- Node.js 18+ (20+ recommended)
- A PostgreSQL instance — locally or hosted (Neon, Supabase, Railway, etc.)

### 1. Install
```bash
npm install --prefix server
npm install --prefix client
```

### 2. Configure the server
```bash
cp server/.env.example server/.env
```
Edit `server/.env`:
```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DBNAME?schema=public"
JWT_SECRET="a-long-random-string"
JWT_EXPIRES_IN="7d"
PORT=4000
NODE_ENV=development
CORS_ORIGIN="http://localhost:5173"
```

### 3. Run migrations & (optional) seed
```bash
cd server
npx prisma migrate dev --name init
npm run seed         # creates 3 users + 1 sample project with tasks
```

Seed users (password `password123` for all):
- `alice@example.com` — project admin
- `bob@example.com`   — project member
- `carol@example.com` — project member

### 4. Start the dev servers (two terminals)
```bash
# terminal 1
npm run dev --prefix server      # http://localhost:4000

# terminal 2
npm run dev --prefix client      # http://localhost:5173
```
Vite proxies `/api/*` to `localhost:4000`, so the frontend just calls `/api/...`.

---

## Deployment on Railway

This repo is configured for **single-service** deployment on Railway. One service builds
both the frontend and the backend; Express serves the built React app.

### One-time setup

1. **Create a Railway project**
   - Go to https://railway.app → *New Project* → *Deploy from GitHub repo*
   - Pick this repository.

2. **Add a PostgreSQL plugin**
   - In your project: *+ New* → *Database* → *PostgreSQL*.
   - Railway injects a `DATABASE_URL` variable that other services in the project can
     reference.

3. **Configure service environment variables**
   - On the web service tab, *Variables*:
     - `DATABASE_URL` → `${{Postgres.DATABASE_URL}}` (reference the plugin variable)
     - `JWT_SECRET` → a long random string (run `openssl rand -hex 32`)
     - `JWT_EXPIRES_IN` → `7d`
     - `NODE_ENV` → `production`
     - `PORT` is set by Railway automatically — do not override it.
     - `CORS_ORIGIN` — not needed in production since the SPA and API share an origin.

4. **Build & start**
   - `railway.json` and `nixpacks.toml` in the repo root already configure:
     - **Build**: install both packages → `npm run build --prefix client` →
       `prisma generate`
     - **Start**: `npm start` (which runs `prisma migrate deploy` then `node src/index.js`)
   - Health check: `/api/health`

5. **Generate a public domain**
   - In the service *Settings* → *Networking* → *Generate Domain*. Your app is now live.

### Seeding production (optional)
From your local machine, set `DATABASE_URL` to the Railway Postgres URL and run:
```bash
cd server
npx prisma migrate deploy
npm run seed
```

### Subsequent deploys
Push to the connected branch — Railway rebuilds and redeploys automatically.

---

## Security notes

- Passwords are hashed with bcrypt; raw passwords are never stored or logged.
- JWTs are signed with `JWT_SECRET` — set a long random value in production.
- `helmet`, `express-rate-limit`, and `cors` are configured.
- Zod validation runs at every API boundary.
- Role checks are enforced on the **server**, not the client.
- Sensitive fields (e.g. `passwordHash`) are never selected in API responses.

---

## License

MIT
