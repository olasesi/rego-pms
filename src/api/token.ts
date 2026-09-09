const ACCESS_KEY = 'pms.access_token';
const REFRESH_KEY = 'pms.refresh_token';

export const tokenStore = {
  get accessToken(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  },
  set accessToken(token: string | null) {
    if (token) localStorage.setItem(ACCESS_KEY, token);
    else localStorage.removeItem(ACCESS_KEY);
  },
  get refreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  },
  set refreshToken(token: string | null) {
    if (token) localStorage.setItem(REFRESH_KEY, token);
    else localStorage.removeItem(REFRESH_KEY);
  },
  clear(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};