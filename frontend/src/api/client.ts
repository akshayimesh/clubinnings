const TOKEN_KEY = 'clubinnings.token';
const BASE_URL = import.meta.env.VITE_API_URL ?? '';

export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
  },
};

/** Mirrors the API's `{ error: { code, message, details? } }` shape. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let onUnauthorized: (() => void) | undefined;

/** Lets the auth layer react (e.g. log out) when any request comes back 401. */
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

export async function apiRequest<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  const finalHeaders = new Headers(headers);
  finalHeaders.set('Accept', 'application/json');
  if (json !== undefined) finalHeaders.set('Content-Type', 'application/json');

  const token = tokenStore.get();
  if (token) finalHeaders.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized?.();
    const err = body?.error;
    throw new ApiError(res.status, err?.code ?? 'HTTP_ERROR', err?.message ?? `Request failed (${res.status})`, err?.details);
  }
  return body as T;
}
