import { useQuery } from '@tanstack/react-query';
import client from './client';
import type { ConversionData, TimeToHireData } from '../types';

export const reportsApi = {
  timeToHire: () =>
    client.get<TimeToHireData[]>('/reports/time-to-hire').then((r) => r.data),

  conversion: () =>
    client.get<ConversionData[]>('/reports/conversion').then((r) => r.data),
};

export function useTimeToHire() {
  return useQuery({
    queryKey: ['reports', 'time-to-hire'],
    queryFn: reportsApi.timeToHire,
  });
}

export function useConversion() {
  return useQuery({
    queryKey: ['reports', 'conversion'],
    queryFn: reportsApi.conversion,
  });
}
