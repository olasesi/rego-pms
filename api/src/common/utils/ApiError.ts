export interface ApiErrorOptions {
  details?: unknown;
  code?: string;
  /** When true, the raw message is returned to clients even in production. */
  expose?: boolean;
}

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly translationKey: string;
  public readonly details?: unknown;
  public readonly code?: string;
  public readonly expose: boolean;

  constructor(statusCode: number, translationKey: string, optionsOrDetails?: ApiErrorOptions | unknown, codeOrUndefined?: string) {
    super(translationKey);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.translationKey = translationKey;

    if (codeOrUndefined !== undefined) {
      // legacy-style call: (status, key, details, code)
      this.details = optionsOrDetails;
      this.code = codeOrUndefined;
      this.expose = false;
    } else if (optionsOrDetails !== undefined && typeof optionsOrDetails === 'object' && optionsOrDetails !== null && ('details' in optionsOrDetails || 'code' in optionsOrDetails || 'expose' in optionsOrDetails)) {
      const options = optionsOrDetails as ApiErrorOptions;
      this.details = options.details;
      this.code = options.code;
      this.expose = options.expose ?? false;
    } else {
      this.details = optionsOrDetails;
      this.code = 'API_ERROR';
      this.expose = false;
    }
    Error.captureStackTrace?.(this, ApiError);
  }
}