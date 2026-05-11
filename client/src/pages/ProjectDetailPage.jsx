import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { StatusBadge, PriorityBadge, RoleBadge } from '../components/Badges.jsx';
import Modal from '../components/Modal.jsx';
import { formatDate, isOverdue, toInputDate } from '../utils.js';

const STATUS_COLUMNS = [
  { key: 'TODO', label: 'To Do' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'DONE', label: 'Done' },
];

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('tasks');

  const [showCreateTask, setShowCreateTask] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showEditProject, setShowEditProject] = useState(false);
  const [confirmDeleteProject, setConfirmDeleteProject] = useState(false);

  const isAdmin = project?.currentUserRole === 'ADMIN';

  const load = async () => {
    try {
      const [p, t] = await Promise.all([
        api(`/projects/${id}`),
        api(`/projects/${id}/tasks`),
      ]);
      setProject(p.project);
      setTasks(t.tasks);
    } catch (err) {
      toast.error(err.message || 'Failed to load project');
      if (err.status === 403 || err.status === 404) navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    load();
  }, [id]);

  const tasksByStatus = useMemo(() => {
    const map = { TODO: [], IN_PROGRESS: [], DONE: [] };
    for (const t of tasks) {
      (map[t.status] || map.TODO).push(t);
    }
    return map;
  }, [tasks]);

  const updateTaskStatus = async (task, status) => {
    const prev = tasks;
    setTasks((curr) => curr.map((t) => (t.id === task.id ? { ...t, status } : t)));
    try {
      const res = await api(`/tasks/${task.id}/status`, { method: 'PATCH', body: { status } });
      setTasks((curr) => curr.map((t) => (t.id === task.id ? res.task : t)));
    } catch (err) {
      setTasks(prev);
      toast.error(err.message || 'Could not update status');
    }
  };

  const deleteTask = async (task) => {
    if (!confirm(`Delete task "${task.title}"?`)) return;
    try {
      await api(`/tasks/${task.id}`, { method: 'DELETE' });
      setTasks((curr) => curr.filter((t) => t.id !== task.id));
      toast.success('Task deleted');
    } catch (err) {
      toast.error(err.message || 'Could not delete task');
    }
  };

  const removeMember = async (member) => {
    if (!confirm(`Remove ${member.user.name} from this project?`)) return;
    try {
      await api(`/projects/${id}/members/${member.userId}`, { method: 'DELETE' });
      await load();
      toast.success('Member removed');
    } catch (err) {
      toast.error(err.message || 'Could not remove member');
    }
  };

  const updateMemberRole = async (member, role) => {
    try {
      await api(`/projects/${id}/members/${member.userId}`, {
        method: 'PUT',
        body: { role },
      });
      await load();
      toast.success('Role updated');
    } catch (err) {
      toast.error(err.message || 'Could not update role');
    }
  };

  const deleteProject = async () => {
    try {
      await api(`/projects/${id}`, { method: 'DELETE' });
      toast.success('Project deleted');
      navigate('/projects');
    } catch (err) {
      toast.error(err.message || 'Could not delete project');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
        <div className="h-32 bg-slate-100 rounded animate-pulse" />
      </div>
    );
  }
  if (!project) return null;

  const overdueCount = tasks.filter(isOverdue).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 break-words">{project.name}</h1>
            <RoleBadge role={project.currentUserRole} />
          </div>
          {project.description && (
            <p className="text-slate-500 mt-1 max-w-3xl">{project.description}</p>
          )}
          <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
            <span>Owner: <span className="text-slate-700 font-medium">{project.owner.name}</span></span>
            <span>·</span>
            <span>{project.members.length} member{project.members.length === 1 ? '' : 's'}</span>
            <span>·</span>
            <span>{project.taskCount} task{project.taskCount === 1 ? '' : 's'}</span>
            {overdueCount > 0 && (
              <>
                <span>·</span>
                <span className="text-rose-600 font-medium">{overdueCount} overdue</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <button onClick={() => setShowEditProject(true)} className="btn-secondary">
                Edit
              </button>
              <button onClick={() => setConfirmDeleteProject(true)} className="btn-secondary text-rose-600 hover:bg-rose-50">
                Delete
              </button>
            </>
          )}
          {isAdmin && (
            <button onClick={() => setShowCreateTask(true)} className="btn-primary">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New task
            </button>
          )}
        </div>
      </div>

      <div className="border-b border-slate-200 flex gap-1">
        <TabButton active={tab === 'tasks'} onClick={() => setTab('tasks')}>
          Tasks <span className="ml-1 text-xs text-slate-400">{tasks.length}</span>
        </TabButton>
        <TabButton active={tab === 'members'} onClick={() => setTab('members')}>
          Members <span className="ml-1 text-xs text-slate-400">{project.members.length}</span>
        </TabButton>
      </div>

      {tab === 'tasks' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STATUS_COLUMNS.map((col) => (
            <div key={col.key} className="bg-slate-100/60 rounded-xl p-3">
              <div className="flex items-center justify-between px-1 mb-2">
                <h3 className="font-semibold text-sm text-slate-700">{col.label}</h3>
                <span className="text-xs text-slate-500 font-medium">{tasksByStatus[col.key].length}</span>
              </div>
              <div className="space-y-2">
                {tasksByStatus[col.key].length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No tasks</p>
                ) : (
                  tasksByStatus[col.key].map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      currentUserId={user.id}
                      isAdmin={isAdmin}
                      onEdit={() => setEditingTask(task)}
                      onDelete={() => deleteTask(task)}
                      onStatusChange={(status) => updateTaskStatus(task, status)}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'members' && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Team members</h2>
            {isAdmin && (
              <button onClick={() => setShowAddMember(true)} className="btn-primary text-sm py-1.5 px-3">
                Add member
              </button>
            )}
          </div>
          <ul className="divide-y divide-slate-100">
            {project.members.map((m) => (
              <li key={m.id} className="px-5 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold text-sm shrink-0">
                  {(m.user.name || '?').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">
                    {m.user.name}
                    {m.userId === project.ownerId && (
                      <span className="ml-2 text-xs text-slate-500 font-normal">(Owner)</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{m.user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin && m.userId !== project.ownerId ? (
                    <select
                      value={m.role}
                      onChange={(e) => updateMemberRole(m, e.target.value)}
                      className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:border-brand-500"
                    >
                      <option value="MEMBER">Member</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  ) : (
                    <RoleBadge role={m.role} />
                  )}
                  {isAdmin && m.userId !== project.ownerId && (
                    <button
                      onClick={() => removeMember(m)}
                      className="text-rose-500 hover:text-rose-700 p-1"
                      title="Remove member"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22" />
                      </svg>
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <TaskFormModal
        open={showCreateTask}
        onClose={() => setShowCreateTask(false)}
        members={project.members}
        onSaved={(task) => {
          setTasks((prev) => [task, ...prev]);
          setShowCreateTask(false);
          toast.success('Task created');
        }}
        projectId={id}
      />

      <TaskFormModal
        open={!!editingTask}
        onClose={() => setEditingTask(null)}
        members={project.members}
        task={editingTask}
        isAdmin={isAdmin}
        currentUserId={user.id}
        onSaved={(task) => {
          setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
          setEditingTask(null);
          toast.success('Task updated');
        }}
        projectId={id}
      />

      <AddMemberModal
        open={showAddMember}
        onClose={() => setShowAddMember(false)}
        projectId={id}
        existingMemberIds={project.members.map((m) => m.userId)}
        onAdded={async () => {
          setShowAddMember(false);
          await load();
          toast.success('Member added');
        }}
      />

      <EditProjectModal
        open={showEditProject}
        onClose={() => setShowEditProject(false)}
        project={project}
        onSaved={async () => {
          setShowEditProject(false);
          await load();
          toast.success('Project updated');
        }}
      />

      <Modal
        open={confirmDeleteProject}
        onClose={() => setConfirmDeleteProject(false)}
        title="Delete this project?"
      >
        <p className="text-sm text-slate-600">
          This will permanently delete <span className="font-medium">{project.name}</span> and all
          its tasks and member assignments. This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={() => setConfirmDeleteProject(false)} className="btn-secondary">
            Cancel
          </button>
          <button onClick={deleteProject} className="btn-danger">
            Delete project
          </button>
        </div>
      </Modal>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
        active
          ? 'border-brand-600 text-brand-700'
          : 'border-transparent text-slate-500 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  );
}

function TaskCard({ task, currentUserId, isAdmin, onEdit, onDelete, onStatusChange }) {
  const overdue = isOverdue(task);
  const isAssignee = task.assigneeId === currentUserId;
  const canEditAll = isAdmin;
  const canChangeStatus = isAdmin || isAssignee;
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-soft hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-medium text-sm text-slate-900 leading-snug">{task.title}</h4>
        {(canEditAll || isAdmin) && (
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity shrink-0">
            {canEditAll && (
              <button onClick={onEdit} className="text-slate-400 hover:text-slate-700 p-0.5" title="Edit">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
            {isAdmin && (
              <button onClick={onDelete} className="text-slate-400 hover:text-rose-600 p-0.5" title="Delete">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
      {task.description && (
        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{task.description}</p>
      )}
      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
        <PriorityBadge priority={task.priority} />
        {task.dueDate && (
          <span className={overdue ? 'badge-overdue' : 'badge-todo'}>
            {overdue ? 'Overdue · ' : ''}
            {formatDate(task.dueDate, { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-1.5 min-w-0">
          {task.assignee ? (
            <>
              <div className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-[10px] font-semibold shrink-0">
                {task.assignee.name.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <span className="text-xs text-slate-600 truncate">{task.assignee.name}</span>
            </>
          ) : (
            <span className="text-xs text-slate-400">Unassigned</span>
          )}
        </div>
        {canChangeStatus && (
          <select
            value={task.status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="text-[11px] border border-slate-200 rounded px-1.5 py-0.5 bg-white focus:outline-none focus:border-brand-500"
          >
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="DONE">Done</option>
          </select>
        )}
      </div>
    </div>
  );
}

function TaskFormModal({ open, onClose, members, task, projectId, isAdmin, currentUserId, onSaved }) {
  const toast = useToast();
  const isEdit = !!task;
  const memberOnly = isEdit && !isAdmin && task && task.assigneeId === currentUserId;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('TODO');
  const [priority, setPriority] = useState('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setStatus(task.status);
      setPriority(task.priority);
      setDueDate(task.dueDate ? toInputDate(task.dueDate) : '');
      setAssigneeId(task.assigneeId || '');
    } else {
      setTitle('');
      setDescription('');
      setStatus('TODO');
      setPriority('MEDIUM');
      setDueDate('');
      setAssigneeId('');
    }
  }, [open, task]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        title,
        description: description || null,
        status,
        priority,
        dueDate: dueDate || null,
        assigneeId: assigneeId || null,
      };
      if (isEdit) {
        const body = memberOnly ? { status } : payload;
        const res = await api(`/tasks/${task.id}`, { method: 'PUT', body });
        onSaved(res.task);
      } else {
        const res = await api(`/projects/${projectId}/tasks`, { method: 'POST', body: payload });
        onSaved(res.task);
      }
    } catch (err) {
      toast.error(err.message || 'Could not save task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit task' : 'Create task'} size="lg">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Title</label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
            disabled={memberOnly}
            maxLength={160}
          />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            className="input min-h-[90px] resize-none"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={memberOnly}
            maxLength={4000}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label">Status</label>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="DONE">Done</option>
            </select>
          </div>
          <div>
            <label className="label">Priority</label>
            <select
              className="input"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              disabled={memberOnly}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>
          <div>
            <label className="label">Due date</label>
            <input
              type="date"
              className="input"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={memberOnly}
            />
          </div>
        </div>
        <div>
          <label className="label">Assignee</label>
          <select
            className="input"
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            disabled={memberOnly}
          >
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.user.name} · {m.user.email}
              </option>
            ))}
          </select>
        </div>
        {memberOnly && (
          <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md p-2">
            You can only change the status of this task. Admins or the task creator can edit other fields.
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" className="btn-primary" disabled={loading || !title.trim()}>
            {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Create task'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function AddMemberModal({ open, onClose, projectId, existingMemberIds, onAdded }) {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [role, setRole] = useState('MEMBER');
  const [selected, setSelected] = useState(null);
  const [email, setEmail] = useState('');
  const [mode, setMode] = useState('search');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setSelected(null);
      setEmail('');
      setMode('search');
      setRole('MEMBER');
    }
  }, [open]);

  useEffect(() => {
    if (!open || mode !== 'search') return;
    const id = setTimeout(async () => {
      try {
        const res = await api(`/users?q=${encodeURIComponent(query.trim())}&limit=10`);
        setResults(res.users.filter((u) => !existingMemberIds.includes(u.id)));
      } catch {
        setResults([]);
      }
    }, 200);
    return () => clearTimeout(id);
  }, [query, open, mode, existingMemberIds]);

  const submit = async () => {
    setLoading(true);
    try {
      const body = mode === 'search'
        ? { userId: selected.id, role }
        : { email: email.trim(), role };
      await api(`/projects/${projectId}/members`, { method: 'POST', body });
      onAdded();
    } catch (err) {
      toast.error(err.message || 'Could not add member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add a member">
      <div className="flex gap-1 mb-4 text-sm">
        <button
          onClick={() => setMode('search')}
          className={`px-3 py-1.5 rounded-md ${mode === 'search' ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          Find user
        </button>
        <button
          onClick={() => setMode('email')}
          className={`px-3 py-1.5 rounded-md ${mode === 'email' ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          By email
        </button>
      </div>

      {mode === 'search' ? (
        <div>
          <input
            className="input"
            placeholder="Search by name or email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <div className="mt-2 max-h-56 overflow-y-auto border border-slate-200 rounded-lg">
            {results.length === 0 ? (
              <p className="text-sm text-slate-400 p-3 text-center">
                {query ? 'No matching users' : 'Start typing to find users'}
              </p>
            ) : (
              results.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setSelected(u)}
                  type="button"
                  className={`w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 ${
                    selected?.id === u.id ? 'bg-brand-50' : ''
                  }`}
                >
                  <p className="text-sm font-medium text-slate-900">{u.name}</p>
                  <p className="text-xs text-slate-500">{u.email}</p>
                </button>
              ))
            )}
          </div>
        </div>
      ) : (
        <div>
          <label className="label">User email</label>
          <input
            type="email"
            className="input"
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
          <p className="text-xs text-slate-500 mt-1">The user must already have an account.</p>
        </div>
      )}

      <div className="mt-4">
        <label className="label">Role</label>
        <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="MEMBER">Member — can view & update assigned tasks</option>
          <option value="ADMIN">Admin — full control of project</option>
        </select>
      </div>

      <div className="flex justify-end gap-2 mt-5">
        <button onClick={onClose} type="button" className="btn-secondary">Cancel</button>
        <button
          onClick={submit}
          type="button"
          className="btn-primary"
          disabled={loading || (mode === 'search' ? !selected : !email.trim())}
        >
          {loading ? 'Adding…' : 'Add member'}
        </button>
      </div>
    </Modal>
  );
}

function EditProjectModal({ open, onClose, project, onSaved }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && project) {
      setName(project.name);
      setDescription(project.description || '');
    }
  }, [open, project]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api(`/projects/${project.id}`, {
        method: 'PUT',
        body: { name, description: description || null },
      });
      onSaved();
    } catch (err) {
      toast.error(err.message || 'Could not update project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit project">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            className="input min-h-[80px] resize-none"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" className="btn-primary" disabled={loading || !name.trim()}>
            {loading ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
