const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

type RequestOptions = RequestInit & {
  token?: string | null;
};

function formatApiDetail(detail: unknown): string {
  if (typeof detail === 'string') return detail;

  if (Array.isArray(detail)) {
    const parts = detail
      .map((entry) => {
        if (typeof entry === 'string') return entry;
        if (entry && typeof entry === 'object') {
          const obj = entry as Record<string, unknown>;
          if (typeof obj.msg === 'string') return obj.msg;
          return JSON.stringify(obj);
        }
        return String(entry);
      })
      .filter(Boolean);
    return parts.length > 0 ? parts.join(' | ') : 'Une erreur est survenue.';
  }

  if (detail && typeof detail === 'object') {
    const obj = detail as Record<string, unknown>;
    if (typeof obj.msg === 'string') return obj.msg;
    return JSON.stringify(obj);
  }

  return 'Une erreur est survenue.';
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, headers, ...rest } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
  });

  if (!response.ok) {
    let detail = 'Une erreur est survenue.';
    try {
      const payload = await response.json();
      if (payload?.detail !== undefined) {
        detail = formatApiDetail(payload.detail);
      } else if (payload?.message !== undefined) {
        detail = formatApiDetail(payload.message);
      }
    } catch {
      // Keep fallback message when API returns non-JSON body.
    }
    throw new Error(detail);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return (await response.json()) as T;
}

