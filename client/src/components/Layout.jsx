import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 group">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-sm">
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <span className="font-bold text-slate-900 text-base">TeamTasks</span>
    </Link>
  );
}

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = (user?.name || '?')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Logo />
            <nav className="hidden sm:flex items-center gap-1">
              <NavItem to="/">Dashboard</NavItem>
              <NavItem to="/projects">Projects</NavItem>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end leading-tight">
              <span className="text-sm font-medium text-slate-900">{user?.name}</span>
              <span className="text-xs text-slate-500">{user?.email}</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold text-sm">
              {initials}
            </div>
            <button onClick={handleLogout} className="btn-secondary text-xs px-3 py-1.5">
              Sign out
            </button>
          </div>
        </div>
        <nav className="sm:hidden border-t border-slate-200 px-4 py-2 flex items-center gap-1">
          <NavItem to="/">Dashboard</NavItem>
          <NavItem to="/projects">Projects</NavItem>
        </nav>
      </header>
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <Outlet />
        </div>
      </main>
      <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        Team Task Manager · Built for collaborative teams
      </footer>
    </div>
  );
}
