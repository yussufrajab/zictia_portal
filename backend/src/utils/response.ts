export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  meta?: Record<string, unknown>;
  error: { code: string; message: string; details?: unknown } | null;
}

export function success<T>(data: T, meta?: Record<string, unknown>): ApiResponse<T> {
  return { success: true, data, meta: meta || undefined, error: null };
}

export function error(code: string, message: string, details?: unknown): ApiResponse<null> {
  return { success: false, data: null, error: { code, message, details } };
}
