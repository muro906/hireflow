import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from './client';
import { useUiStore } from '../store/ui';
import type { PipelineData } from '../types';

export const pipelineApi = {
  get: (jobId: string) =>
    client.get<PipelineData>(`/jobs/${jobId}/pipeline`).then((r) => r.data),
};

export function usePipeline(jobId: string) {
  return useQuery({
    queryKey: ['pipeline', jobId],
    queryFn: () => pipelineApi.get(jobId),
    enabled: !!jobId,
  });
}

export function useMoveStage(jobId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ appId, stageId }: { appId: string; stageId: string }) =>
      client.patch(`/applications/${appId}/stage`, { stage_id: stageId }),

    onMutate: async ({ appId, stageId }) => {
      await qc.cancelQueries({ queryKey: ['pipeline', jobId] });
      const previous = qc.getQueryData<PipelineData>(['pipeline', jobId]);

      if (previous) {
        // Optimistically move the card between columns
        const updated: PipelineData = {
          stages: previous.stages,
          applications: { ...previous.applications },
        };

        // Find the application in all columns and move it
        let movedApp = null;
        for (const [sid, apps] of Object.entries(updated.applications)) {
          const idx = apps.findIndex((a) => a.id === appId);
          if (idx !== -1) {
            movedApp = { ...apps[idx], stage_id: stageId };
            updated.applications[sid] = apps.filter((a) => a.id !== appId);
            break;
          }
        }
        if (movedApp) {
          updated.applications[stageId] = [
            movedApp,
            ...(updated.applications[stageId] ?? []),
          ];
        }
        qc.setQueryData(['pipeline', jobId], updated);
      }

      return { previous };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(['pipeline', jobId], ctx.previous);
      }
      useUiStore.getState().addToast({
        title: 'Could not move candidate',
        description: 'The card was returned to its previous stage.',
        variant: 'error',
      });
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['pipeline', jobId] });
    },
  });
}
