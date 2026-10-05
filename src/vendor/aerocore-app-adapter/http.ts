import { AdapterHttpError, type AdapterErrorBody } from './types';

export function normalizeOrigin(value: string): string {
  return value.replace(/\/$/, '');
}

export function normalizePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

export async function readJsonResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null) as AdapterErrorBody | null;
  if (!response.ok) {
    const message = body?.error || `Request failed (${response.status})`;
    throw new AdapterHttpError(message, {
      status: response.status,
      code: body?.code ?? null,
      correlationId: body?.correlationId ?? response.headers.get('x-correlation-id'),
      body,
    });
  }
  return body as T;
}

export function serializeBody(body: unknown): string {
  if (body === undefined || body === null) return '';
  if (typeof body === 'string') return body;
  return JSON.stringify(body);
}
