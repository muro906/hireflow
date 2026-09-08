import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, ExternalLink, MoreHorizontal, Pencil, Archive } from 'lucide-react';
import { useJobs, useDeleteJob } from '../../api/jobs';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Dropdown } from '../../components/ui/Dropdown';
import { useUiStore } from '../../store/ui';
import { formatDate } from '../../utils/format';
import type { Job } from '../../types';

export default function JobListPage() {
  const { data: jobs, isLoading } = useJobs();
  const navigate = useNavigate();
  const deleteJob = useDeleteJob();
  const addToast = useUiStore((s) => s.addToast);
  const [jobToArchive, setJobToArchive] = useState<Job | null>(null);

  const confirmArchive = () => {
    if (!jobToArchive) return;
    const { id, title } = jobToArchive;
    deleteJob.mutate(id, {
      onSuccess: () => {
        addToast({ title: 'Job archived', description: title, variant: 'success' });
        setJobToArchive(null);
      },
      onError: () => {
        addToast({ title: 'Could not archive job', description: 'Please try again.', variant: 'error' });
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Jobs</h2>
          <p className="text-slate-400 mt-0.5 text-sm">Manage your active and draft job postings.</p>
        </div>
        <Link
          to="/app/jobs/create"
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={15} /> Create Job
        </Link>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : !jobs?.length ? (
          <div className="py-16 text-center text-slate-500 text-sm">No jobs yet. Create one to get started.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3 text-left font-medium">Title</th>
                <th className="px-5 py-3 text-left font-medium hidden sm:table-cell">Status</th>
                <th className="px-5 py-3 text-left font-medium hidden md:table-cell">Location</th>
                <th className="px-5 py-3 text-left font-medium hidden lg:table-cell">Created</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {(jobs as Job[]).map((job) => (
                <tr key={job.id} className="hover:bg-slate-800/40 transition-colors group">
                  <td className="px-5 py-4">
                    <Link to={`/app/jobs/${job.id}`} className="font-medium text-slate-200 group-hover:text-brand-400 transition-colors">
                      {job.title}
                    </Link>
                    <div className="text-xs text-slate-500 mt-0.5">{job.employment_type}</div>
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell">
                    <Badge variant={job.status === 'open' ? 'success' : job.status === 'draft' ? 'default' : 'danger'}>
                      {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-slate-400 hidden md:table-cell">{job.location}</td>
                  <td className="px-5 py-4 text-slate-400 hidden lg:table-cell">{formatDate(job.created_at)}</td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/app/jobs/${job.id}/pipeline`}
                        className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-100 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        Pipeline
                      </Link>
                      <Link
                        to={`/jobs/${job.id}/apply`}
                        target="_blank"
                        className="px-2 py-1.5 text-slate-500 hover:text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        <ExternalLink size={13} />
                      </Link>
                      <Dropdown
                        trigger={
                          <span className="flex px-2 py-1.5 text-slate-500 hover:text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
                            <MoreHorizontal size={13} />
                          </span>
                        }
                        items={[
                          {
                            label: 'Edit job',
                            icon: <Pencil size={13} />,
                            onClick: () => navigate(`/app/jobs/${job.id}/edit`),
                          },
                          {
                            label: 'Archive job',
                            icon: <Archive size={13} />,
                            danger: true,
                            onClick: () => setJobToArchive(job),
                          },
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={!!jobToArchive}
        onClose={() => setJobToArchive(null)}
        title="Archive job"
        size="sm"
      >
        <p className="text-sm text-slate-300">
          Archive <span className="font-medium text-slate-100">{jobToArchive?.title}</span>? It will
          stop accepting new applications. Existing applicants are kept.
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="ghost" onClick={() => setJobToArchive(null)}>Cancel</Button>
          <Button variant="danger" isLoading={deleteJob.isPending} onClick={confirmArchive}>
            Archive job
          </Button>
        </div>
      </Modal>
    </div>
  );
}
