import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { StatusBadge, PriorityBadge } from '../components/Badges.jsx';
import { formatDate, formatRelative, isOverdue } from '../utils.js';

function StatCard({ label, value, sublabel, accent = 'brand', icon }) {
  const accents = {
    brand: 'from-brand-500 to-brand-700',
    emerald: 'from-emerald-500 to-emerald-700',
    amber: 'from-amber-500 to-amber-600',
    rose: 'from-rose-500 to-rose-700',
  };
  return (
    <div className="card p-5 relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${accents[accent]} opacity-10 rounded-full -mr-8 -mt-8`} />
      <div className="flex items-start justify-between gap-3 relative">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
          {sublabel && <p className="text-xs text-slate-500 mt-1">{sublabel}</p>}
        </div>
        {icon && (
          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${accents[accent]} flex items-center justify-center text-white shadow-sm`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api('/dashboard');
        setData(res);
      } catch (err) {
        toast.error(err.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 rounded bg-slate-200 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-5 h-28 animate-pulse bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;
  const { summary, tasksPerUser = [], upcomingTasks, recentlyCompleted } = data;
  const totalAcrossProjects =
    summary.allTasksTotal ??
    summary.allProjectTasksByStatus.TODO +
      summary.allProjectTasksByStatus.IN_PROGRESS +
      summary.allProjectTasksByStatus.DONE;
  const topAssignees = tasksPerUser.filter((r) => r.user).slice(0, 6);
  const maxAssigneeCount = topAssignees.reduce((m, r) => Math.max(m, r.count), 0) || 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Welcome back, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-slate-500 mt-1">Here's what's happening across your projects.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Projects"
          value={summary.projectCount}
          sublabel={`${summary.adminProjectCount} as admin`}
          accent="brand"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            </svg>
          }
        />
        <StatCard
          label="Total Tasks"
          value={totalAcrossProjects}
          sublabel={`${summary.allProjectTasksByStatus.IN_PROGRESS} in progress · ${summary.allProjectTasksByStatus.DONE} done`}
          accent="brand"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <StatCard
          label="My Tasks"
          value={summary.myTasksTotal}
          sublabel={`${summary.myTasksByStatus.IN_PROGRESS} in progress · ${summary.myTasksByStatus.DONE} done`}
          accent="amber"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
        />
        <StatCard
          label="Overdue"
          value={summary.myOverdueCount}
          sublabel={
            summary.allOverdueCount > summary.myOverdueCount
              ? `${summary.allOverdueCount} across all projects`
              : summary.myOverdueCount > 0
              ? 'Need attention'
              : "You're all caught up"
          }
          accent="rose"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">My upcoming tasks</h2>
            <Link to="/projects" className="text-sm text-brand-600 hover:text-brand-700 font-medium">
              View all projects →
            </Link>
          </div>
          {upcomingTasks.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              No upcoming tasks assigned to you.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {upcomingTasks.map((t) => (
                <li key={t.id} className="py-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/projects/${t.project.id}`}
                      className="font-medium text-slate-900 hover:text-brand-700 truncate block"
                    >
                      {t.title}
                    </Link>
                    <p className="text-xs text-slate-500 mt-0.5">
                      <span className="font-medium">{t.project.name}</span>
                      {t.dueDate && (
                        <>
                          {' · '}
                          <span className={isOverdue(t) ? 'text-rose-600 font-medium' : ''}>
                            Due {formatRelative(t.dueDate)} ({formatDate(t.dueDate)})
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <PriorityBadge priority={t.priority} />
                    <StatusBadge status={t.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Team status</h2>
          <div className="space-y-3">
            <StatusBar
              label="To Do"
              count={summary.allProjectTasksByStatus.TODO}
              total={
                summary.allProjectTasksByStatus.TODO +
                summary.allProjectTasksByStatus.IN_PROGRESS +
                summary.allProjectTasksByStatus.DONE
              }
              color="bg-slate-400"
            />
            <StatusBar
              label="In Progress"
              count={summary.allProjectTasksByStatus.IN_PROGRESS}
              total={
                summary.allProjectTasksByStatus.TODO +
                summary.allProjectTasksByStatus.IN_PROGRESS +
                summary.allProjectTasksByStatus.DONE
              }
              color="bg-amber-400"
            />
            <StatusBar
              label="Done"
              count={summary.allProjectTasksByStatus.DONE}
              total={
                summary.allProjectTasksByStatus.TODO +
                summary.allProjectTasksByStatus.IN_PROGRESS +
                summary.allProjectTasksByStatus.DONE
              }
              color="bg-emerald-400"
            />
          </div>
          <h3 className="font-semibold text-slate-900 mt-6 mb-3 text-sm">Recently completed</h3>
          {recentlyCompleted.length === 0 ? (
            <p className="text-sm text-slate-400">No recently completed tasks.</p>
          ) : (
            <ul className="space-y-2">
              {recentlyCompleted.slice(0, 4).map((t) => (
                <li key={t.id} className="text-sm">
                  <Link
                    to={`/projects/${t.project.id}`}
                    className="text-slate-700 hover:text-brand-700 line-clamp-1"
                  >
                    {t.title}
                  </Link>
                  <p className="text-xs text-slate-400">
                    {t.project.name}
                    {t.assignee ? ` · ${t.assignee.name}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">Tasks per user</h2>
          <span className="text-xs text-slate-400">Across your projects</span>
        </div>
        {topAssignees.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">
            No assigned tasks yet across your projects.
          </p>
        ) : (
          <ul className="space-y-3">
            {topAssignees.map((row) => {
              const pct = Math.round((row.count / maxAssigneeCount) * 100);
              const initials = (row.user.name || '?')
                .split(' ')
                .map((s) => s[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();
              return (
                <li key={row.userId} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold text-xs shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {row.user.name}
                      </p>
                      <p className="text-xs text-slate-500 font-medium">
                        {row.count} task{row.count === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full bg-brand-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatusBar({ label, count, total, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-600">{label}</span>
        <span className="text-slate-500 font-medium">{count}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
