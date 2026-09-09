export interface AuthUser {
  id: number;
  orgId: number | null;
  email: string;
  firstName: string;
  lastName: string;
  locale: string;
  timezone: string;
  roles: string[];
  permissions: string[];
  isActive: boolean;
}

export interface ListMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export type ListResult<T> = {
  rows: T[];
  meta: ListMeta;
};

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: ListMeta;
  message?: string;
}

export interface ApiErrorShape {
  success: false;
  error: {
    code: string;
    key: string;
    message: string;
    details?: unknown;
  };
}