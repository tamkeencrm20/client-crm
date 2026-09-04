import { useQuery } from '@tanstack/react-query';
import api from '../lib/api.js';

/**
 * Branch and course lists change rarely but are needed by almost every form,
 * so they get a long stale time and a shared cache key.
 */
export function useBranches() {
  return useQuery({
    queryKey: ['branches'],
    queryFn: async () => (await api.get('/branches')).data.data,
    staleTime: 10 * 60_000,
  });
}

export function useCourses(params = {}) {
  return useQuery({
    queryKey: ['courses', params],
    queryFn: async () => (await api.get('/courses', { params })).data.data,
    staleTime: 10 * 60_000,
  });
}

/** Agents a leader/admin may assign a lead to, within one branch. */
export function useAssignableAgents(branchId, enabled = true) {
  return useQuery({
    queryKey: ['users', 'assignable', branchId],
    queryFn: async () => (await api.get('/users/assignable', { params: { branch: branchId } })).data.data,
    enabled: Boolean(enabled),
    staleTime: 60_000,
  });
}
