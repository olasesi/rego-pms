export interface ApiEnvelope<T = unknown> {
  success: boolean;
  data?: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  message?: string;
}

export interface ApiErrorEnvelope {
  success: false;
  error: {
    message: string;
    code: string;
    details?: unknown;
  };
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    orgId: number | null;
    status: string;
  };
}