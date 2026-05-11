import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';
import { RoleBadge } from '../components/Badges.jsx';
import Modal from '../components/Modal.jsx';
import { formatDate } from '../utils.js';

export default function ProjectsPage() {
  const toast = useToast();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    try {
      const res = await api('/projects');
      setProjects(res.projects);
    } catch (err) {
      toast.error(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Projects</h1>
          <p className="text-slate-500 mt-1">Manage projects you own or belong to.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New project
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5 h-40 bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            </svg>
          </div>
          <h2 className="font-semibold text-slate-900">No projects yet</h2>
          <p className="text-slate-500 text-sm mt-1 mb-4">Create your first project to start collaborating.</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            Create project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <Link
              key={p.id}
              to={`/projects/${p.id}`}
              className="card p-5 hover:border-brand-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-slate-900 group-hover:text-brand-700 line-clamp-1">
                  {p.name}
                </h3>
                <RoleBadge role={p.role} />
              </div>
              <p className="text-sm text-slate-500 line-clamp-2 min-h-[2.5rem]">
                {p.description || 'No description'}
              </p>
              <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-5.13a4 4 0 100-8 4 4 0 000 8z" />
                  </svg>
                  {p.memberCount} member{p.memberCount === 1 ? '' : 's'}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                  </svg>
                  {p.taskCount} task{p.taskCount === 1 ? '' : 's'}
                </span>
                <span className="ml-auto text-slate-400">{formatDate(p.createdAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <CreateProjectModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(p) => {
          setProjects((prev) => [p, ...prev]);
          setShowCreate(false);
          toast.success('Project created');
        }}
      />
    </div>
  );
}

function CreateProjectModal({ open, onClose, onCreated }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
    }
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api('/projects', {
        method: 'POST',
        body: { name, description: description || undefined },
      });
      onCreated(res.project);
    } catch (err) {
      toast.error(err.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create a new project">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="proj-name">Name</label>
          <input
            id="proj-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Q4 Launch"
            required
            autoFocus
          />
        </div>
        <div>
          <label className="label" htmlFor="proj-desc">Description (optional)</label>
          <textarea
            id="proj-desc"
            className="input min-h-[80px] resize-none"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this project about?"
            maxLength={1000}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" className="btn-primary" disabled={loading || !name.trim()}>
            {loading ? 'Creating…' : 'Create project'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
