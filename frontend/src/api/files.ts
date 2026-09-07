import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from './client';
import type { ApplicationFile, Note, StageHistoryEntry } from '../types';

export const filesApi = {
  list: (appId: string) =>
    client.get<ApplicationFile[]>(`/applications/${appId}/files`).then((r) => r.data),

  upload: (appId: string, file: File, fileType = 'cv') => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('file_type', fileType);
    return client
      .post<ApplicationFile>(`/applications/${appId}/files`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  getUrl: (appId: string, fileId: string) =>
    client.get(`/applications/${appId}/files/${fileId}`, { maxRedirects: 0 }),

  delete: (appId: string, fileId: string) =>
    client.delete(`/applications/${appId}/files/${fileId}`),
};

export const notesApi = {
  list: (appId: string) =>
    client.get<Note[]>(`/applications/${appId}/notes`).then((r) => r.data),

  create: (appId: string, body: string) =>
    client.post<Note>(`/applications/${appId}/notes`, { body }).then((r) => r.data),

  delete: (appId: string, noteId: string) =>
    client.delete(`/applications/${appId}/notes/${noteId}`),
};

export const historyApi = {
  list: (appId: string) =>
    client.get<StageHistoryEntry[]>(`/applications/${appId}/history`).then((r) => r.data),
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useFiles(appId: string) {
  return useQuery({
    queryKey: ['files', appId],
    queryFn: () => filesApi.list(appId),
    enabled: !!appId,
  });
}

export function useUploadFile(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, fileType }: { file: File; fileType?: string }) =>
      filesApi.upload(appId, file, fileType),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['files', appId] }),
  });
}

export function useDeleteFile(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fileId: string) => filesApi.delete(appId, fileId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['files', appId] }),
  });
}

export function useNotes(appId: string) {
  return useQuery({
    queryKey: ['notes', appId],
    queryFn: () => notesApi.list(appId),
    enabled: !!appId,
  });
}

export function useAddNote(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => notesApi.create(appId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes', appId] }),
  });
}

export function useDeleteNote(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) => notesApi.delete(appId, noteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes', appId] }),
  });
}

export function useStageHistory(appId: string) {
  return useQuery({
    queryKey: ['history', appId],
    queryFn: () => historyApi.list(appId),
    enabled: !!appId,
  });
}
