import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from './client';
import { PipelineData, Application } from '../types';

// Mock data
const mockPipelineData: PipelineData = {
  stages: [
    { id: 's1', job_id: '1', name: 'Sourced', position: 1, color: '#94a3b8', is_terminal: false },
    { id: 's2', job_id: '1', name: 'Applied', position: 2, color: '#3b82f6', is_terminal: false },
    { id: 's3', job_id: '1', name: 'Interview', position: 3, color: '#a855f7', is_terminal: false },
    { id: 's4', job_id: '1', name: 'Offer', position: 4, color: '#f59e0b', is_terminal: false },
    { id: 's5', job_id: '1', name: 'Hired', position: 5, color: '#10b981', is_terminal: true },
  ],
  applications: {
    's2': [
      { id: 'a1', job_id: '1', stage_id: 's2', candidate_name: 'Alice Smith', candidate_email: 'alice@example.com', candidate_phone: '', form_data: {}, applied_at: new Date().toISOString() },
    ],
    's3': [
      { id: 'a2', job_id: '1', stage_id: 's3', candidate_name: 'Bob Jones', candidate_email: 'bob@example.com', candidate_phone: '', form_data: {}, applied_at: new Date().toISOString() },
    ]
  }
};

export const usePipeline = (jobId: string) => {
  return useQuery({
    queryKey: ['pipeline', jobId],
    queryFn: async () => {
      // const { data } = await client.get<PipelineData>(`/jobs/${jobId}/pipeline`);
      // return data;
      return mockPipelineData;
    },
  });
};

export const useMoveApplication = (jobId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ applicationId, newStageId }: { applicationId: string; newStageId: string }) => {
      // await client.patch(`/applications/${applicationId}/stage`, { stage_id: newStageId });
      return { applicationId, newStageId };
    },
    onMutate: async ({ applicationId, newStageId }) => {
      await queryClient.cancelQueries({ queryKey: ['pipeline', jobId] });
      const previousPipeline = queryClient.getQueryData<PipelineData>(['pipeline', jobId]);

      if (previousPipeline) {
        queryClient.setQueryData<PipelineData>(['pipeline', jobId], (old) => {
          if (!old) return old;
          const newApps = { ...old.applications };
          let movedApp: Application | undefined;

          // Find and remove from old stage
          for (const stageId in newApps) {
            const index = newApps[stageId].findIndex(a => a.id === applicationId);
            if (index !== -1) {
              movedApp = newApps[stageId][index];
              newApps[stageId] = [
                ...newApps[stageId].slice(0, index),
                ...newApps[stageId].slice(index + 1)
              ];
              break;
            }
          }

          // Add to new stage
          if (movedApp) {
            movedApp.stage_id = newStageId;
            if (!newApps[newStageId]) newApps[newStageId] = [];
            newApps[newStageId] = [...newApps[newStageId], movedApp];
          }

          return { ...old, applications: newApps };
        });
      }

      return { previousPipeline };
    },
    onError: (err, newTodo, context) => {
      if (context?.previousPipeline) {
        queryClient.setQueryData(['pipeline', jobId], context.previousPipeline);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline', jobId] });
    },
  });
};
