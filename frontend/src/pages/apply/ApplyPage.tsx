import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { DynamicForm } from '../../components/forms/DynamicForm';
import { Briefcase, MapPin, Building, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import client from '../../api/client';
import type { Job } from '../../types';

export default function ApplyPage() {
  const { id } = useParams<{ id: string }>();
  const [submitted, setSubmitted] = useState(false);
  // The application saves even if the CV upload fails; say so rather than
  // letting the candidate believe their CV arrived.
  const [cvError, setCvError] = useState<string | null>(null);

  const { data: job, isLoading } = useQuery({
    queryKey: ['job-public', id],
    queryFn: async () => {
      const { data } = await client.get<Job & { company_name: string }>(`/jobs/${id}/form-schema`);
      return data;
    },
    enabled: !!id,
  });

  const mutation = useMutation({
    mutationFn: async (formData: Record<string, unknown>) => {
      // DynamicForm collects the standard fields under fixed keys and each custom
      // field under its own field id; only the custom answers belong in form_data.
      const { full_name, email, phone, cv, ...answers } = formData;

      // Sent as multipart so the CV travels with the application in one request.
      const body = new FormData();
      body.append('candidate_name', full_name as string);
      body.append('candidate_email', email as string);
      body.append('candidate_phone', (phone as string) || '');
      body.append('form_data', JSON.stringify(answers));
      if (cv instanceof File) body.append('cv', cv);

      // Content-Type is left unset: the browser must add the multipart boundary.
      const { data } = await client.post<{ cv_error?: string }>(`/jobs/${id}/apply`, body);
      return data;
    },
    onSuccess: (data) => {
      setCvError(data?.cv_error ?? null);
      setSubmitted(true);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-pulse text-brand-500 font-medium">Loading job details...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        Job not found or not open for applications.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-brand-500/10 rounded-xl mb-2">
            <Building className="w-8 h-8 text-brand-500" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white">{job.title}</h1>
          <div className="flex flex-wrap items-center justify-center gap-4 text-slate-400">
            {job.location && <span className="flex items-center"><MapPin className="w-4 h-4 mr-1" /> {job.location}</span>}
            {job.employment_type && <span className="flex items-center"><Briefcase className="w-4 h-4 mr-1" /> {job.employment_type}</span>}
          </div>
        </div>

        {submitted ? (
          <div className="bg-slate-900/50 backdrop-blur-md border border-emerald-500/20 rounded-2xl p-12 text-center shadow-xl">
            <div className="mx-auto w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Application Submitted!</h2>
            <p className="text-slate-400">We've received your application and will be in touch soon.</p>
            {cvError && (
              <p className="mt-4 text-sm text-amber-400">
                We couldn't attach your CV ({cvError}). Please reply to our confirmation email with it attached.
              </p>
            )}
          </div>
        ) : (
          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            {job.description && (
              <div className="p-8 sm:p-10 border-b border-slate-800">
                <h2 className="text-xl font-semibold text-white mb-4">About the Role</h2>
                <p className="text-slate-300 leading-relaxed">{job.description}</p>
              </div>
            )}
            <div className="p-8 sm:p-10 bg-slate-900/80">
              <h2 className="text-xl font-semibold text-white mb-6">Submit Your Application</h2>
              {mutation.isError && (
                <div className="mb-6 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                  We couldn't submit your application. Please check your details and try again.
                </div>
              )}
              <DynamicForm
                schema={job.form_schema}
                onSubmit={(data) => mutation.mutate(data)}
                isLoading={mutation.isPending}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
