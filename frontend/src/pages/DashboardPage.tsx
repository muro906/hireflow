import { Link } from 'react-router-dom';
import { Briefcase, Users, Clock, ArrowRight, BarChart2 } from 'lucide-react';
import { useJobs } from '../api/jobs';
import { useApplications } from '../api/applications';
import { useTimeToHire } from '../api/reports';

export default function DashboardPage() {
  const { data: jobs, isLoading } = useJobs('open');
  // Only the total is needed, so ask for the smallest page the API allows.
  const { data: activeResult, isLoading: appsLoading } = useApplications({ limit: 1 });
  const { data: timeToHire, isLoading: tthLoading } = useTimeToHire();

  const totalCandidates = activeResult?.total ?? 0;

  const avgDaysToHire = timeToHire?.length
    ? Math.round(timeToHire.reduce((sum, d) => sum + d.avg_days, 0) / timeToHire.length)
    : null;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-slate-100">Dashboard</h2>
        <p className="text-slate-400 mt-0.5 text-sm">Here's what's happening with your hiring today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: 'Open Jobs',
            value: isLoading ? '–' : String(jobs?.length ?? 0),
            icon: <Briefcase size={18} className="text-brand-400" />,
            color: 'bg-brand-500/10',
          },
          {
            label: 'Total Candidates',
            value: appsLoading ? '–' : String(totalCandidates),
            icon: <Users size={18} className="text-emerald-400" />,
            color: 'bg-emerald-500/10',
          },
          {
            label: 'Avg. Time to Hire',
            value: tthLoading || avgDaysToHire === null ? '–' : `${avgDaysToHire}d`,
            icon: <Clock size={18} className="text-amber-400" />,
            color: 'bg-amber-500/10',
          },
        ].map((stat) => (
          <div key={stat.label} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400">{stat.label}</span>
              <div className={`p-1.5 rounded-lg ${stat.color}`}>{stat.icon}</div>
            </div>
            <div className="text-2xl font-bold text-slate-100">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent jobs */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-slate-300">Open Positions</h3>
            <Link to="/app/jobs" className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {!jobs?.length ? (
            <div className="py-12 text-center text-sm text-slate-500">
              No open jobs yet.{' '}
              <Link to="/app/jobs/create" className="text-brand-400 hover:underline">Create one →</Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {jobs.slice(0, 5).map((job) => (
                <div key={job.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-800/30 transition-colors">
                  <div>
                    <Link to={`/app/jobs/${job.id}/pipeline`} className="text-sm font-medium text-slate-200 hover:text-brand-400 transition-colors">
                      {job.title}
                    </Link>
                    <div className="text-xs text-slate-500 mt-0.5">{job.location}</div>
                  </div>
                  <Link
                    to={`/app/jobs/${job.id}/pipeline`}
                    className="text-xs text-slate-400 hover:text-brand-400 transition-colors"
                  >
                    Pipeline →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Quick Actions</h3>
          <div className="space-y-2">
            {[
              { to: '/app/jobs/create', icon: <Briefcase size={14} />, label: 'Create New Job' },
              { to: '/app/applicants', icon: <Users size={14} />, label: 'View All Applicants' },
              { to: '/app/reports', icon: <BarChart2 size={14} />, label: 'View Reports' },
            ].map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
              >
                {action.icon} {action.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
