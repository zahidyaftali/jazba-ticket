// Thin fetch wrapper for the custom /api backend.
// Stores the session JWT in localStorage and attaches it to every request.

const TOKEN_KEY = 'jz_token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage unavailable (private mode) — session just won't persist.
  }
}

export async function apiRequest<T = any>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON response (e.g. gateway error page)
  }

  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const apiGet = <T = any>(path: string) => apiRequest<T>('GET', path);
export const apiPost = <T = any>(path: string, body?: unknown) => apiRequest<T>('POST', path, body);
export const apiPut = <T = any>(path: string, body?: unknown) => apiRequest<T>('PUT', path, body);
export const apiPatch = <T = any>(path: string, body?: unknown) => apiRequest<T>('PATCH', path, body);
export const apiDelete = <T = any>(path: string) => apiRequest<T>('DELETE', path);
