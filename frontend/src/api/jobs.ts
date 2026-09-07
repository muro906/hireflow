import { useQuery } from '@tanstack/react-query';
import client from './client';
import { Job, PaginatedResponse } from '../types';

export const useJobs = (page = 1, limit = 10) => {
  return useQuery({
    queryKey: ['jobs', { page, limit }],
    queryFn: async () => {
      // Stubbing the real API call
      // const { data } = await client.get<PaginatedResponse<Job>>('/jobs', { params: { page, limit } });
      // return data;
      return {
        data: [
          { id: '1', company_id: 'c1', title: 'Senior Frontend Engineer', description: 'React and TS', location: 'Remote', employment_type: 'Full-time', status: 'open', form_schema: { fields: [] }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: '2', company_id: 'c1', title: 'Product Manager', description: 'Lead the product', location: 'New York', employment_type: 'Full-time', status: 'draft', form_schema: { fields: [] }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        ] as Job[],
        total: 2,
        page,
        limit,
      };
    },
  });
};
