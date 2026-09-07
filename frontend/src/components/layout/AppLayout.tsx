import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import { useUiStore } from '../../store/ui';
import { LayoutDashboard, Briefcase, Users, BarChart2, Settings, LogOut, Menu } from 'lucide-react';
import { cn } from '../../utils/cn';

function Sidebar() {
  const { sidebarOpen } = useUiStore();
  const location = useLocation();

  const links = [
    { name: 'Dashboard', to: '/app/dashboard', icon: LayoutDashboard },
    { name: 'Jobs', to: '/app/jobs', icon: Briefcase },
    { name: 'Applicants', to: '/app/applicants', icon: Users },
    { name: 'Reports', to: '/app/reports', icon: BarChart2 },
    { name: 'Settings', to: '/app/settings', icon: Settings },
  ];

  return (
    <aside className={cn("bg-slate-900 border-r border-slate-800 transition-all duration-300 flex flex-col", sidebarOpen ? "w-64" : "w-16")}>
      <div className="h-16 flex items-center justify-center border-b border-slate-800 px-4">
        {sidebarOpen ? <h1 className="text-xl font-bold text-white tracking-tight">HireFlow</h1> : <h1 className="text-xl font-bold text-brand-500">HF</h1>}
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname.startsWith(link.to);
            return (
              <li key={link.name}>
                <Link
                  to={link.to}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                    isActive ? "bg-brand-600/10 text-brand-500" : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {sidebarOpen && <span className="font-medium text-sm">{link.name}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

function Topbar() {
  const { setSidebarOpen, sidebarOpen } = useUiStore();
  const { user, logout } = useAuthStore();

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md flex items-center justify-between px-4 sticky top-0 z-10">
      <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-400 hover:text-slate-100 p-2 rounded-md hover:bg-slate-800">
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-sm font-medium">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <span className="text-sm font-medium hidden sm:block">{user?.full_name || 'User'}</span>
        </div>
        <button onClick={logout} className="text-slate-400 hover:text-rose-500 p-2 rounded-md hover:bg-slate-800" title="Logout">
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}

export default function AppLayout() {
  // Comment out auth check for now to allow viewing layout easily
  // const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  // if (!isAuthenticated) {
  //   return <Navigate to="/login" replace />;
  // }

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
