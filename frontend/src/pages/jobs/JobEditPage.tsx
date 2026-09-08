import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import { useJob, useUpdateJob } from '../../api/jobs';
import { Spinner } from '../../components/ui/Spinner';
import { useUiStore } from '../../store/ui';
import { FieldBuilder } from '../../components/forms/FieldBuilder';
import type { FormField } from '../../types';

const schema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  location: z.string().optional(),
  employment_type: z.string().optional(),
  status: z.enum(['draft', 'open', 'closed']),
});

type FormValues = z.infer<typeof schema>;

export default function JobEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: job, isLoading } = useJob(id!);
  const addToast = useUiStore((s) => s.addToast);
  const updateJob = useUpdateJob(id!);

  const [fields, setFields] = useState<FormField[]>([]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'draft' },
  });

  useEffect(() => {
    if (job) {
      reset({
        title: job.title,
        description: job.description,
        location: job.location,
        employment_type: job.employment_type,
        status: job.status,
      });
      setFields(job.form_schema?.fields ?? []);
    }
  }, [job, reset]);

  const onSubmit = (data: FormValues) => {
    const form_schema = { fields };
    updateJob.mutate(
      { title: data.title, description: data.description, location: data.location, employment_type: data.employment_type, status: data.status, form_schema },
      {
        onSuccess: () => {
          addToast({ title: 'Changes saved', description: data.title, variant: 'success' });
          navigate(`/app/jobs/${id}/pipeline`);
        },
        onError: () =>
          addToast({ title: 'Could not save changes', description: 'Please try again.', variant: 'error' }),
      },
    );
  };

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-100">Edit Job</h2>
        <p className="text-sm text-slate-400 mt-1">{job?.title}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-300">Job details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {([
              { name: 'title' as const, label: 'Job title', col: 'sm:col-span-2' },
              { name: 'location' as const, label: 'Location', col: '' },
              { name: 'employment_type' as const, label: 'Employment type', col: '' },
            ] as const).map(({ name, label, col }) => (
              <div key={name} className={col}>
                <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
                <input {...register(name)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                {errors[name] && <p className="text-xs text-rose-400 mt-1">{errors[name]?.message}</p>}
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
            <textarea {...register('description')} rows={4}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Status</label>
            <select {...register('status')}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="draft">Draft</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-300">Application form</h3>
          <FieldBuilder key={job?.id} initialFields={job?.form_schema?.fields ?? []} onChange={setFields} />
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-100 transition-colors">Cancel</button>
          <button type="submit" disabled={updateJob.isPending}
            className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60">
            {updateJob.isPending ? <Spinner size="sm" /> : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
