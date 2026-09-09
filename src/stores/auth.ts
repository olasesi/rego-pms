import { defineStore } from 'pinia';
import http from '@/api/http';
import { tokenStore } from '@/api/token';
import type { ApiEnvelope, LoginResponse } from '@/api/types';

interface AuthState {
  user: LoginResponse['user'] | null;
  loading: boolean;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    loading: false,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.user),
  },
  actions: {
    async login(email: string, password: string): Promise<void> {
      this.loading = true;
      try {
        const { data } = await http.post<ApiEnvelope<LoginResponse>>('/auth/login', { email, password });
        if (!data.data) throw new Error('Unexpected empty login response');
        const { accessToken, refreshToken, user } = data.data;
        tokenStore.accessToken = accessToken;
        tokenStore.refreshToken = refreshToken;
        this.user = user;
      } finally {
        this.loading = false;
      }
    },
    async fetchMe(): Promise<void> {
      const { data } = await http.get<ApiEnvelope<LoginResponse['user']>>('/auth/me');
      if (data.data) {
        this.user = data.data;
      }
    },
    logout(): void {
      tokenStore.clear();
      this.user = null;
    },
  },
});