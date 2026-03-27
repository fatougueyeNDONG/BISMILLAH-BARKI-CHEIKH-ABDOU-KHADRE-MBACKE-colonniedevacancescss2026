const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

type RequestOptions = RequestInit & {
  token?: string | null;
};

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
      if (payload?.detail) detail = payload.detail;
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

