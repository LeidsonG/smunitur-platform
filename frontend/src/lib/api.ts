import axios from 'axios';

/**
 * Cliente HTTP central — usado por toda a UI (landing + admin).
 *
 * - `API_URL`  : base da API REST, com sufixo `/api` (ex.: http://host/api).
 * - `API_BASE` : mesma origem SEM o sufixo `/api` — usado para montar URLs
 *                de arquivos estáticos servidos pelo backend (ex.:
 *                `${API_BASE}/uploads/imagem.png`). Mantido aqui para
 *                evitar a repetição do `.replace('/api', '')` em vários
 *                componentes.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const API_BASE = API_URL.replace(/\/api\/?$/, '');

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

// Redireciona para login se token expirar.
//
// Quando o redirect acontece, retornamos uma Promise pendente (que nunca
// resolve nem rejeita) em vez de Promise.reject. O componente que fez a
// chamada será desmontado pelo navigation imediatamente em seguida, então
// não há ninguém para receber o erro — propagar a rejeição apenas geraria
// `unhandledRejection` em qualquer chamada `useEffect` sem `.catch()`.
// Fora desse caso (401 fora do /admin, ou outros status) seguimos rejeitando
// normalmente para que o chamador possa tratar.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.startsWith('/admin') && !path.includes('/admin/login')) {
        localStorage.removeItem('smunitur_token');
        localStorage.removeItem('smunitur_admin');
        window.location.href = '/admin/login';
        return new Promise(() => { /* nunca resolve — redirect destruirá o componente */ });
      }
    }
    return Promise.reject(err);
  }
);

export default api;
