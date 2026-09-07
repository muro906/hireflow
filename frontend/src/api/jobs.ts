import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from './client';
import type { Job, FormSchema } from '../types';

interface CreateJobPayload {
  title: string;
  description: string;
  location: string;
  employment_type: string;
  status: string;
  form_schema: FormSchema;
}

interface UpdateJobPayload extends Partial<CreateJobPayload> {}

export const jobsApi = {
  list: (status?: string) =>
    client.get<Job[]>('/jobs', { params: status ? { status } : {} }).then((r) => r.data),

  get: (id: string) =>
    client.get<Job>(`/jobs/${id}`).then((r) => r.data),

  create: (payload: CreateJobPayload) =>
    client.post<Job>('/jobs', payload).then((r) => r.data),

  update: (id: string, payload: UpdateJobPayload) =>
    client.patch<Job>(`/jobs/${id}`, payload).then((r) => r.data),

  delete: (id: string) =>
    client.delete(`/jobs/${id}`),
};

export function useJobs(status?: string) {
  return useQuery({
    queryKey: ['jobs', status],
    queryFn: () => jobsApi.list(status),
  });
}

export function useJob(id: string) {
  return useQuery({
    queryKey: ['job', id],
    queryFn: () => jobsApi.get(id),
    enabled: !!id,
  });
}

export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateJobPayload) => jobsApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  });
}

export function useUpdateJob(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateJobPayload) => jobsApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jobs'] });
      qc.invalidateQueries({ queryKey: ['job', id] });
    },
  });
}

export function useDeleteJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => jobsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  });
}
