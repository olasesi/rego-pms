/**
 * Tenant selected for the current browser session. Sent as `x-tenant-id`
 * on every API request; the server also derives the tenant from the JWT.
 */
const TENANT_STORAGE_KEY = 'pms.tenant_id';

let tenantId: string | null =
  typeof window === 'undefined' ? null : window.localStorage.getItem(TENANT_STORAGE_KEY);

export const getTenantId = (): string | null => tenantId;

export const setTenantId = (value: string | number | null): void => {
  tenantId = value === null || value === '' ? null : String(value);
  if (typeof window === 'undefined') return;
  if (tenantId) window.localStorage.setItem(TENANT_STORAGE_KEY, tenantId);
  else window.localStorage.removeItem(TENANT_STORAGE_KEY);
};

export const clearTenantId = (): void => setTenantId(null);
