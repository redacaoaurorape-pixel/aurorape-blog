const SERVER_BASE = process.env.API_URL ?? "http://localhost:8000/api/v1";
const CLIENT_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

function baseUrl() {
  return typeof window === "undefined" ? SERVER_BASE : CLIENT_BASE;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  init?: RequestInit & { next?: NextFetchRequestConfig }
): Promise<T> {
  const isFormData = init?.body instanceof FormData;
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      detail = data.detail ?? detail;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function apiGet<T>(path: string, opts?: { revalidate?: number }): Promise<T> {
  return request<T>(path, opts?.revalidate !== undefined ? { next: { revalidate: opts.revalidate } } : undefined);
}

export function apiPost<T>(path: string, body?: unknown, token?: string): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : undefined,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

export function apiPostForm<T>(path: string, formData: FormData, token?: string): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body: formData,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

export function apiPut<T>(path: string, body: unknown, token?: string): Promise<T> {
  return request<T>(path, {
    method: "PUT",
    body: JSON.stringify(body),
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

export function apiDelete<T>(path: string, token?: string): Promise<T> {
  return request<T>(path, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

export function apiGetAuthed<T>(path: string, token: string): Promise<T> {
  return request<T>(path, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
}
