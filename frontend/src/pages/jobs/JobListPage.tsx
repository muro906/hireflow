import { useJobs } from '../api/jobs';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Plus, MoreVertical, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDate } from '../utils/format';

export default function JobListPage() {
  const { data, isLoading } = useJobs();

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Jobs</h1>
          <p className="text-slate-400 mt-1">Manage your active and draft job postings.</p>
        </div>
        <Button asChild>
          <Link to="/app/jobs/create"><Plus className="mr-2 h-4 w-4" /> Create Job</Link>
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-400 bg-slate-900/50 uppercase border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-medium">Job Title</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Location</th>
                <th className="px-6 py-4 font-medium">Created</th>
                <th className="px-6 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">Loading jobs...</td>
                </tr>
              ) : data?.data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">No jobs found. Create one to get started.</td>
                </tr>
              ) : (
                data?.data.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <Link to={`/app/jobs/${job.id}`} className="font-medium text-slate-200 hover:text-brand-400 transition-colors">
                        {job.title}
                      </Link>
                      <div className="text-xs text-slate-500 mt-0.5">{job.employment_type}</div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={job.status === 'open' ? 'success' : job.status === 'draft' ? 'default' : 'danger'}>
                        {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-400">{job.location}</td>
                    <td className="px-6 py-4 text-slate-400">{formatDate(job.created_at)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/app/jobs/${job.id}/pipeline`}>Pipeline</Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild className="text-slate-400 hover:text-slate-100">
                          <Link to={`/jobs/${job.id}/apply`} target="_blank"><ExternalLink className="h-4 w-4" /></Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
