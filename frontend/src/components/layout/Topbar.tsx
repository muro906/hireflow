import { useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAuthStore } from '../../store/auth';
import { Avatar } from '../ui/Avatar';
import { Dropdown } from '../ui/Dropdown';
import { useLogout } from '../../api/auth';
import { useNavigate } from 'react-router-dom';

const titles: Record<string, string> = {
  '/app/dashboard': 'Dashboard',
  '/app/jobs': 'Jobs',
  '/app/applicants': 'Applicants',
  '/app/reports': 'Reports',
  '/app/settings': 'Settings',
};

function pageTitle(pathname: string) {
  if (titles[pathname]) return titles[pathname];
  if (pathname.includes('/pipeline')) return 'Pipeline Board';
  if (pathname.includes('/jobs/create')) return 'New Job';
  if (pathname.includes('/jobs/') && pathname.includes('/edit')) return 'Edit Job';
  if (pathname.includes('/jobs/')) return 'Job Details';
  if (pathname.includes('/applicants/')) return 'Applicant Profile';
  return 'HireFlow';
}

export function Topbar() {
  const { pathname } = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const navigate = useNavigate();

  return (
    <header className="h-14 border-b border-slate-800 bg-slate-900/80 backdrop-blur flex items-center justify-between px-6 flex-shrink-0">
      <h1 className="text-base font-semibold text-slate-100">{pageTitle(pathname)}</h1>
      <div className="flex items-center gap-3">
        <button className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors relative">
          <Bell size={18} />
        </button>
        <Dropdown
          trigger={<Avatar name={user?.full_name ?? 'U'} size="sm" className="cursor-pointer ring-2 ring-transparent hover:ring-brand-500 transition-all" />}
          items={[
            { label: 'Profile', onClick: () => {} },
            { label: 'Settings', onClick: () => navigate('/app/settings') },
            { label: 'Sign out', onClick: () => logout.mutate(undefined, { onSettled: () => navigate('/login') }), danger: true },
          ]}
        />
      </div>
    </header>
  );
}
