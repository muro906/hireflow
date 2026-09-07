import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, SlidersHorizontal, Mail, Phone, Calendar } from 'lucide-react';
import { useApplications } from '../../api/applications';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Avatar } from '../../components/ui/Avatar';
import { formatDate } from '../../utils/format';

export default function ApplicantListPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data: apps, isLoading } = useApplications({ search, page, limit: 20 });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Applicants</h2>
          <p className="text-sm text-slate-400 mt-0.5">All candidates across your jobs</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or email…"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <button className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-400 hover:text-slate-100 transition-colors">
          <SlidersHorizontal size={14} /> Filter
        </button>
      </div>

      {/* Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : !apps?.length ? (
          <div className="py-16 text-center text-slate-500">
            <p className="text-sm">No applicants found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3 text-left font-medium">Candidate</th>
                <th className="px-5 py-3 text-left font-medium hidden sm:table-cell">Contact</th>
                <th className="px-5 py-3 text-left font-medium hidden md:table-cell">Applied</th>
                <th className="px-5 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {apps.map((app) => (
                <tr key={app.id} className="hover:bg-slate-800/40 transition-colors group">
                  <td className="px-5 py-4">
                    <Link to={`/app/applicants/${app.id}`} className="flex items-center gap-3">
                      <Avatar name={app.candidate_name} size="sm" />
                      <div>
                        <p className="font-medium text-slate-200 group-hover:text-brand-400 transition-colors">
                          {app.candidate_name}
                        </p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Mail size={11} /> <span className="text-xs">{app.candidate_email}</span>
                      </div>
                      {app.candidate_phone && (
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Phone size={11} /> <span className="text-xs">{app.candidate_phone}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                      <Calendar size={11} /> {formatDate(app.applied_at)}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant={app.hired_at ? 'success' : app.rejected_at ? 'danger' : 'default'}>
                      {app.hired_at ? 'Hired' : app.rejected_at ? 'Rejected' : 'Active'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {(apps?.length ?? 0) === 20 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-slate-100 disabled:opacity-40 transition-colors"
          >
            Previous
          </button>
          <span className="px-3 py-1.5 text-sm text-slate-400">Page {page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-slate-100 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
