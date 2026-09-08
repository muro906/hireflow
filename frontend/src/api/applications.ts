import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from './client';
import type { Application, PaginatedResponse } from '../types';

interface ListParams {
  job_id?: string;
  stage_id?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const applicationsApi = {
  list: (params: ListParams) =>
    client.get<PaginatedResponse<Application>>('/applications', { params }).then((r) => r.data),

  get: (id: string) =>
    client.get<Application>(`/applications/${id}`).then((r) => r.data),

  delete: (id: string) =>
    client.delete(`/applications/${id}`),

  moveStage: (id: string, stage_id: string) =>
    client.patch(`/applications/${id}/stage`, { stage_id }),
};

export function useApplications(params: ListParams = {}) {
  return useQuery({
    queryKey: ['applications', params],
    queryFn: () => applicationsApi.list(params),
  });
}

export function useApplication(id: string) {
  return useQuery({
    queryKey: ['application', id],
    queryFn: () => applicationsApi.get(id),
    enabled: !!id,
  });
}

export function useDeleteApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => applicationsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications'] });
      qc.invalidateQueries({ queryKey: ['pipeline'] });
    },
  });
}
