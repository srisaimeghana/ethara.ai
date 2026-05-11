export function formatDate(value, opts = {}) {
  if (!value) return '';
  const d = new Date(value);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...opts,
  });
}

export function formatRelative(value) {
  if (!value) return '';
  const d = new Date(value).getTime();
  const diff = d - Date.now();
  const absDays = Math.round(Math.abs(diff) / (1000 * 60 * 60 * 24));
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  if (absDays === 0) return 'today';
  return rtf.format(diff > 0 ? absDays : -absDays, 'day');
}

export function isOverdue(task) {
  if (!task?.dueDate) return false;
  if (task.status === 'DONE') return false;
  return new Date(task.dueDate).getTime() < Date.now();
}

export function toInputDate(value) {
  if (!value) return '';
  const d = new Date(value);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
