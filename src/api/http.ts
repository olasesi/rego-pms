import axios from 'axios';
import { getTenantId } from '@/api/tenant';
import { tokenStore } from '@/api/token';

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

http.interceptors.request.use((config) => {
  const token = tokenStore.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const tenantId = getTenantId();
  if (tenantId) {
    config.headers['x-tenant-id'] = tenantId;
  }
  if (typeof document !== 'undefined' && document.documentElement.lang) {
    config.headers['Accept-Language'] = document.documentElement.lang;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      tokenStore.clear();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pms:unauthorized'));
      }
    }
    return Promise.reject(error);
  },
);

export default http;
