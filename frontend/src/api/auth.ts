import client from './client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth';
import type { AuthTokens } from '../types';

// ─── API calls ────────────────────────────────────────────────────────────────

export const authApi = {
  register: (data: { company_name: string; email: string; password: string; full_name: string }) =>
    client.post<AuthTokens>('/auth/register', data).then((r) => r.data),

  login: (data: { email: string; password: string }) =>
    client.post<AuthTokens>('/auth/login', data).then((r) => r.data),

  refresh: (refresh_token: string) =>
    client.post<AuthTokens>('/auth/refresh', { refresh_token }).then((r) => r.data),

  logout: (refresh_token: string) =>
    client.delete('/auth/logout', { data: { refresh_token } }),
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setAuth(data.user, data.access_token, data.refresh_token);
    },
  });
}

export function useRegister() {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      setAuth(data.user, data.access_token, data.refresh_token);
    },
  });
}

export function useLogout() {
  const { refreshToken, logout } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => authApi.logout(refreshToken ?? ''),
    onSettled: () => {
      logout();
      qc.clear();
    },
  });
}
