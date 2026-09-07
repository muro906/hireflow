import { useParams, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { useJob, useUpdateJob } from '../../api/jobs';
import { Spinner } from '../../components/ui/Spinner';
import type { FieldType } from '../../types';

const fieldSchema = z.object({
  id: z.string(),
  label: z.string().min(1),
  type: z.enum(['text','textarea','number','url','email','select','checkbox','date','file']),
  required: z.boolean(),
  options: z.string().optional(),
});

const schema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  location: z.string().optional(),
  employment_type: z.string().optional(),
  status: z.enum(['draft', 'open', 'closed']),
  fields: z.array(fieldSchema),
});

type FormValues = z.infer<typeof schema>;

const FIELD_TYPES: FieldType[] = ['text','textarea','number','url','email','select','checkbox','date','file'];

export default function JobEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: job, isLoading } = useJob(id!);
  const updateJob = useUpdateJob(id!);

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'draft', fields: [] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'fields' });

  useEffect(() => {
    if (job) {
      reset({
        title: job.title,
        description: job.description,
        location: job.location,
        employment_type: job.employment_type,
        status: job.status,
        fields: (job.form_schema?.fields ?? []).map((f) => ({
          ...f,
          options: f.options?.join(', ') ?? '',
        })),
      });
    }
  }, [job, reset]);

  const onSubmit = (data: FormValues) => {
    const form_schema = {
      fields: data.fields.map((f) => ({
        id: f.id,
        label: f.label,
        type: f.type,
        required: f.required,
        options: f.type === 'select' ? (f.options ?? '').split(',').map((o) => o.trim()).filter(Boolean) : undefined,
      })),
    };
    updateJob.mutate(
      { title: data.title, description: data.description, location: data.location, employment_type: data.employment_type, status: data.status, form_schema },
      { onSuccess: () => navigate(`/app/jobs/${id}/pipeline`) },
    );
  };

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
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
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-300">Application form fields</h3>
            <button type="button"
              onClick={() => append({ id: crypto.randomUUID(), label: '', type: 'text', required: false, options: '' })}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-brand-600/20 text-brand-400 hover:bg-brand-600/30 rounded-lg transition-colors">
              <Plus size={12} /> Add field
            </button>
          </div>
          <div className="space-y-3">
            {fields.map((f, i) => (
              <div key={f.id} className="flex gap-3 items-start bg-slate-800/50 rounded-lg p-3">
                <GripVertical size={14} className="text-slate-600 mt-2 flex-shrink-0" />
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input {...register(`fields.${i}.label`)} placeholder="Label"
                    className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
                  <select {...register(`fields.${i}.type`)}
                    className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500">
                    {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                    <input type="checkbox" {...register(`fields.${i}.required`)} className="rounded border-slate-600" />
                    Required
                  </label>
                </div>
                <button type="button" onClick={() => remove(i)} className="p-1.5 text-slate-600 hover:text-rose-400 transition-colors flex-shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
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
