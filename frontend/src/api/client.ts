import axios from 'axios';
import { useAuthStore } from '../store/auth';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach access token
client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor: handle 401
client.interceptors.response.use(
  (res) => res,
  async (error) => {
    // If we receive a 401 and we have logic for refresh token, we would do it here.
    // For now, if unauthorized, we might log out.
    if (error.response?.status === 401) {
      // In a full implementation, attempt refresh token first.
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default client;
