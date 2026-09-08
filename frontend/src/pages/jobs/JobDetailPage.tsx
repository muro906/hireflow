import { Link, useParams } from 'react-router-dom';
import { Pencil, ExternalLink } from 'lucide-react';
import { useJob } from '../../api/jobs';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { formatDate } from '../../utils/format';

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: job, isLoading } = useJob(id!);

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  if (!job) return (
    <div className="py-20 text-center text-slate-500 text-sm">
      Job not found. <Link to="/app/jobs" className="text-brand-400">Back to jobs</Link>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">{job.title}</h2>
          <div className="flex items-center gap-3 mt-1.5">
            <Badge variant={job.status === 'open' ? 'success' : job.status === 'draft' ? 'default' : 'danger'}>
              {job.status}
            </Badge>
            {job.location && <span className="text-sm text-slate-400">{job.location}</span>}
            {job.employment_type && <span className="text-sm text-slate-400">{job.employment_type}</span>}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Link
            to={`/app/jobs/${job.id}/edit`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
          >
            <Pencil size={12} /> Edit
          </Link>
          <Link
            to={`/app/jobs/${job.id}/pipeline`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors"
          >
            View Pipeline
          </Link>
          {job.status === 'open' && (
            <Link
              to={`/jobs/${job.id}/apply`}
              target="_blank"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
            >
              <ExternalLink size={12} /> Apply page
            </Link>
          )}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="text-xs text-slate-500">Created {formatDate(job.created_at)}</div>
        {job.description && (
          <p className="text-sm text-slate-300 leading-relaxed">{job.description}</p>
        )}
      </div>

      {job.form_schema?.fields && job.form_schema.fields.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Application form fields</h3>
          <div className="space-y-2">
            {job.form_schema.fields.map((f) => (
              <div key={f.id} className="flex items-center gap-3 text-sm">
                <span className="text-slate-200">{f.label}</span>
                <span className="text-xs text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">{f.type}</span>
                {f.required && <span className="text-xs text-rose-400">required</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
