export function StatusBadge({ status }) {
  if (status === 'TODO') return <span className="badge-todo">To Do</span>;
  if (status === 'IN_PROGRESS') return <span className="badge-progress">In Progress</span>;
  if (status === 'DONE') return <span className="badge-done">Done</span>;
  return <span className="badge-todo">{status}</span>;
}

export function PriorityBadge({ priority }) {
  if (priority === 'HIGH') return <span className="badge-high">High</span>;
  if (priority === 'MEDIUM') return <span className="badge-medium">Medium</span>;
  return <span className="badge-low">Low</span>;
}

export function RoleBadge({ role }) {
  if (role === 'ADMIN') return <span className="badge-admin">Admin</span>;
  return <span className="badge-member">Member</span>;
}
