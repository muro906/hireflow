import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { DynamicForm } from '../components/forms/DynamicForm';
import { Job } from '../types';
import client from '../api/client';
import { Briefcase, MapPin, Building, CheckCircle } from 'lucide-react';
import { useState } from 'react';

export default function ApplyPage() {
  const { id } = useParams<{ id: string }>();
  const [submitted, setSubmitted] = useState(false);

  const { data: job, isLoading } = useQuery({
    queryKey: ['jobs', id, 'public'],
    queryFn: async () => {
      // Mocking for the demo
      return {
        id,
        title: 'Senior Frontend Engineer',
        company_name: 'Acme Corp',
        location: 'Remote',
        employment_type: 'Full-time',
        description: 'We are looking for an experienced Frontend Engineer...',
        form_schema: {
          fields: [
            { id: 'portfolio', label: 'Portfolio URL', type: 'url', required: true },
            { id: 'experience', label: 'Years of Experience', type: 'number', required: true },
            { id: 'cover_letter', label: 'Cover Letter', type: 'textarea', required: false },
          ]
        }
      } as unknown as Job & { company_name: string };
    }
  });

  const mutation = useMutation({
    mutationFn: async (formData: any) => {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== undefined) {
          data.append(key, value as Blob | string);
        }
      });
      // await client.post(`/jobs/${id}/apply`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return true;
    },
    onSuccess: () => {
      setSubmitted(true);
    }
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
        Job not found.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-brand-500/10 rounded-xl mb-2">
            <Building className="w-8 h-8 text-brand-500" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white">{job.title}</h1>
          <div className="flex flex-wrap items-center justify-center gap-4 text-slate-400">
            <span className="flex items-center"><Building className="w-4 h-4 mr-1" /> {job.company_name}</span>
            <span className="flex items-center"><MapPin className="w-4 h-4 mr-1" /> {job.location}</span>
            <span className="flex items-center"><Briefcase className="w-4 h-4 mr-1" /> {job.employment_type}</span>
          </div>
        </div>

        {submitted ? (
          <div className="bg-slate-900/50 backdrop-blur-md border border-emerald-500/20 rounded-2xl p-12 text-center shadow-xl">
            <div className="mx-auto w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Application Submitted!</h2>
            <p className="text-slate-400">
              Thank you for applying to {job.company_name}. We've received your application and will be in touch soon.
            </p>
          </div>
        ) : (
          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-8 sm:p-10 border-b border-slate-800">
              <h2 className="text-xl font-semibold text-white mb-4">About the Role</h2>
              <div className="prose prose-invert prose-slate max-w-none">
                {job.description}
              </div>
            </div>
            <div className="p-8 sm:p-10 bg-slate-900/80">
              <h2 className="text-xl font-semibold text-white mb-6">Submit Your Application</h2>
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
