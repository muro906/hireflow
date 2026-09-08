import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useCreateJob } from '../../api/jobs';
import { Spinner } from '../../components/ui/Spinner';
import { useUiStore } from '../../store/ui';
import { FieldBuilder } from '../../components/forms/FieldBuilder';
import type { FormField } from '../../types';

const schema = z.object({
  title: z.string().min(1, 'Title required'),
  description: z.string().optional(),
  location: z.string().optional(),
  employment_type: z.string().optional(),
  status: z.enum(['draft', 'open']),
});

type FormValues = z.infer<typeof schema>;

export default function JobCreatePage() {
  const navigate = useNavigate();
  const addToast = useUiStore((s) => s.addToast);
  const createJob = useCreateJob();

  const [fields, setFields] = useState<FormField[]>([]);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: 'draft',
    },
  });

  const onSubmit = (data: FormValues) => {
    const form_schema = { fields };
    createJob.mutate(
      { title: data.title, description: data.description ?? '', location: data.location ?? '', employment_type: data.employment_type ?? 'full-time', status: data.status, form_schema },
      {
        onSuccess: (job) => {
          addToast({ title: 'Job created', description: job.title, variant: 'success' });
          navigate(`/app/jobs/${job.id}/pipeline`);
        },
        onError: () =>
          addToast({ title: 'Could not create job', description: 'Please try again.', variant: 'error' }),
      },
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-100">New Job Posting</h2>
        <p className="text-sm text-slate-400 mt-1">Fill in the details and build the application form.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic info */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-300">Job details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { name: 'title' as const, label: 'Job title', placeholder: 'Senior Engineer', col: 'sm:col-span-2' },
              { name: 'location' as const, label: 'Location', placeholder: 'Remote / London', col: '' },
              { name: 'employment_type' as const, label: 'Employment type', placeholder: 'full-time', col: '' },
            ].map(({ name, label, placeholder, col }) => (
              <div key={name} className={col}>
                <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
                <input {...register(name)} placeholder={placeholder}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                {errors[name] && <p className="text-xs text-rose-400 mt-1">{errors[name]?.message}</p>}
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
            <textarea {...register('description')} rows={4} placeholder="Describe the role…"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Status</label>
            <select {...register('status')}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="draft">Draft</option>
              <option value="open">Open (accepting applications)</option>
            </select>
          </div>
        </div>

        {/* Form builder */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-300">Application form</h3>
          <FieldBuilder onChange={setFields} />
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)}
            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-100 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={createJob.isPending}
            className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60">
            {createJob.isPending ? <Spinner size="sm" /> : 'Create job'}
          </button>
        </div>
      </form>
    </div>
  );
}
