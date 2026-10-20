const API_BASE_URL = (
  import.meta.env.VITE_API_URL ?? "http://localhost:3001/api"
).replace(/\/+$/, "");

export interface ApiHealth {
  status: string;
  service: string;
  database?: string;
  user?: string;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const response = await fetch(`${API_BASE_URL}${normalizedPath}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const text = await response.text();
  let data: unknown;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null && "message" in data
        ? String(data.message)
        : `Erro na API: HTTP ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

export function verificarBackend(): Promise<ApiHealth> {
  return apiRequest<ApiHealth>("/health");
}
