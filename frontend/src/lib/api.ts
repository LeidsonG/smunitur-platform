import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Injeta token JWT nas requisições autenticadas
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('smunitur_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Redireciona para login se token expirar
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.startsWith('/admin') && !path.includes('/admin/login')) {
        localStorage.removeItem('smunitur_token');
        localStorage.removeItem('smunitur_admin');
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
