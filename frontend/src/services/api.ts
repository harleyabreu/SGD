const API_BASE_URL = (
  import.meta.env.VITE_API_URL ?? "http://localhost:3001/api"
).replace(/\/+$/, "");

export interface ApiHealth {
  status: string;
  service: string;
  database?: string;
  user?: string;
}

type ApiErrorPayload = {
  message?: unknown;
  detail?: unknown;
  code?: unknown;
  constraint?: unknown;
  column?: unknown;
  table?: unknown;
};

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
    const payload =
      typeof data === "object" && data !== null
        ? (data as ApiErrorPayload)
        : undefined;
    const messageParts: string[] = [];

    if (typeof payload?.message === "string" && payload.message.trim()) {
      messageParts.push(payload.message.trim());
    } else if (typeof data === "string" && data.trim()) {
      messageParts.push(data.trim());
    }

    if (typeof payload?.detail === "string" && payload.detail.trim()) {
      messageParts.push(`Detalhe do PostgreSQL: ${payload.detail.trim()}`);
    }
    if (typeof payload?.code === "string" && payload.code.trim()) {
      messageParts.push(`Código: ${payload.code.trim()}`);
    }
    if (typeof payload?.constraint === "string" && payload.constraint.trim()) {
      messageParts.push(`Restrição: ${payload.constraint.trim()}`);
    }
    if (typeof payload?.column === "string" && payload.column.trim()) {
      messageParts.push(`Coluna: ${payload.column.trim()}`);
    }
    if (typeof payload?.table === "string" && payload.table.trim()) {
      messageParts.push(`Tabela: ${payload.table.trim()}`);
    }

    const message = messageParts.length
      ? messageParts.join("\n")
      : `Erro na API: HTTP ${response.status}`;

    throw new Error(message);
  }

  return data as T;
}

export function verificarBackend(): Promise<ApiHealth> {
  return apiRequest<ApiHealth>("/health");
}
