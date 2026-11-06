
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

type NotificacaoLocal = {
  id: string;
  tipo: string;
  titulo: string;
  descricao: string;
  data: string;
  demandaId?: number;
  prioridade?: string;
  lida: boolean;
};

type AuditoriaLocal = {
  id: number;
  entidade: string;
  entidadeId?: number;
  acao: string;
  descricao: string;
  usuario: string;
  data: string;
  valorAnterior?: string;
  valorNovo?: string;
  motivo?: string;
};

let dadosCompartilhadosSincronizados = false;
let sincronizacaoEmAndamento: Promise<void> | null = null;

function lerCookie(nome: string): string | null {
  if (typeof document === "undefined") return null;

  const item = document.cookie
    .split(";")
    .map((parte) => parte.trim())
    .find((parte) => parte.startsWith(`${nome}=`));

  if (!item) return null;

  try {
    return decodeURIComponent(item.slice(nome.length + 1));
  } catch {
    return item.slice(nome.length + 1);
  }
}

function lerLocal<T>(chave: string, padrao: T): T {
  try {
    const conteudo = localStorage.getItem(chave);
    return conteudo ? (JSON.parse(conteudo) as T) : padrao;
  } catch {
    return padrao;
  }
}

function obterUsuarioLocalId(): number | null {
  const sessao = lerLocal<{ usuarioId?: unknown } | null>(
    "sessao",
    null,
  );

  const id = Number(sessao?.usuarioId);

  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

async function requisicaoDireta<T>(
  path: string,
  method: "GET" | "PUT" = "GET",
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (method !== "GET") {
    const csrf = lerCookie("sgd_csrf");

    if (csrf) {
      headers["X-CSRF-Token"] = csrf;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: "include",
    headers,
    ...(body !== undefined
      ? { body: JSON.stringify(body) }
      : {}),
  });

  const texto = await response.text();

  let dados: unknown = null;

  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch {
    dados = texto;
  }

  if (!response.ok) {
    const mensagem =
      typeof dados === "object" &&
      dados !== null &&
      typeof (dados as ApiErrorPayload).message === "string"
        ? String((dados as ApiErrorPayload).message)
        : `A consulta ${path} falhou (HTTP ${response.status}).`;

    throw new Error(mensagem);
  }

  return dados as T;
}

function combinarAuditoria(
  local: AuditoriaLocal[],
  banco: AuditoriaLocal[],
): AuditoriaLocal[] {
  const registros = new Map<string, AuditoriaLocal>();

  for (const item of [...local, ...banco]) {
    const chave =
      `${item.usuario ?? ""}|${item.id}|${item.entidade}|${item.acao}`;

    registros.set(chave, item);
  }

  return [...registros.values()]
    .sort(
      (a, b) =>
        new Date(b.data).getTime() -
        new Date(a.data).getTime(),
    )
    .slice(0, 5000);
}

async function sincronizarDadosCompartilhados(): Promise<void> {
  if (
    typeof document === "undefined" ||
    dadosCompartilhadosSincronizados
  ) {
    return;
  }

  if (!sincronizacaoEmAndamento) {
    sincronizacaoEmAndamento = (async () => {
      // ========================================================
      // 1. CONFIGURAÇÕES GLOBAIS
      // ========================================================

      try {
        const configuracoes =
          await requisicaoDireta<unknown>("/configuracoes");

        if (
          typeof configuracoes === "object" &&
          configuracoes !== null &&
          !Array.isArray(configuracoes)
        ) {
          localStorage.setItem(
            "configuracoes_sistema",
            JSON.stringify(configuracoes),
          );
        }
      } catch (erro) {
        console.warn(
          "Não foi possível sincronizar as configurações do PostgreSQL. O cache local será preservado:",
          erro,
        );
      }

      // ========================================================
      // 2. NOTIFICAÇÕES DO USUÁRIO
      // ========================================================

      try {
        const usuarioId = obterUsuarioLocalId();

        const usuarioCache = localStorage.getItem(
          "notificacoes_usuario_cache_id",
        );

        const cachePertenceAoUsuario =
          usuarioId !== null &&
          (
            usuarioCache === null ||
            usuarioCache === String(usuarioId)
          );

        const locais = cachePertenceAoUsuario
          ? lerLocal<NotificacaoLocal[]>("notificacoes", [])
          : [];

        const remotas =
          await requisicaoDireta<NotificacaoLocal[]>("/notificacoes");

        if (!Array.isArray(remotas)) {
          throw new Error(
            "O Backend retornou uma lista de notificações inválida.",
          );
        }

        const porId = new Map<string, NotificacaoLocal>();

        for (const item of remotas) {
          porId.set(String(item.id), item);
        }

        for (const item of locais) {
          if (!porId.has(String(item.id))) {
            porId.set(String(item.id), item);
          }
        }

        const combinadas = [...porId.values()].sort(
          (a, b) =>
            new Date(b.data).getTime() -
            new Date(a.data).getTime(),
        );

        // Migra notificações locais que ainda não estejam no banco.
        if (
          usuarioId !== null &&
          combinadas.length > remotas.length
        ) {
          try {
            await requisicaoDireta<NotificacaoLocal[]>(
              "/notificacoes",
              "PUT",
              combinadas,
            );
          } catch (erro) {
            console.warn(
              "Não foi possível migrar notificações locais para o PostgreSQL:",
              erro,
            );
          }
        }

        localStorage.setItem(
          "notificacoes",
          JSON.stringify(combinadas),
        );

        if (usuarioId !== null) {
          localStorage.setItem(
            "notificacoes_usuario_cache_id",
            String(usuarioId),
          );
        }
      } catch (erro) {
        console.warn(
          "Não foi possível sincronizar notificações do PostgreSQL:",
          erro,
        );
      }

      // ========================================================
      // 3. AUDITORIA
      // ========================================================

      try {
        const remota =
          await requisicaoDireta<AuditoriaLocal[]>("/auditoria");

        if (Array.isArray(remota)) {
          const local = lerLocal<AuditoriaLocal[]>(
            "auditoria",
            [],
          );

          localStorage.setItem(
            "auditoria",
            JSON.stringify(combinarAuditoria(local, remota)),
          );
        }
      } catch (erro) {
        // O GET de auditoria é restrito ao Gestor.
        // Resposta 403 para outros perfis é esperada.
        if (
          !(
            erro instanceof Error &&
            erro.message.toLowerCase().includes(
              "somente o perfil gestor",
            )
          )
        ) {
          console.warn(
            "Não foi possível sincronizar a auditoria do PostgreSQL:",
            erro,
          );
        }
      }

      dadosCompartilhadosSincronizados = true;
    })().finally(() => {
      sincronizacaoEmAndamento = null;
    });
  }

  await sincronizacaoEmAndamento;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const normalizedPath = path.startsWith("/")
    ? path
    : `/${path}`;

  const method = String(
    options.method ?? "GET",
  ).toUpperCase();

  const headers: Record<string, string> = {
    Accept: "application/json",

    ...(options.body
      ? { "Content-Type": "application/json" }
      : {}),

    ...((options.headers ?? {}) as Record<string, string>),
  };

  if (
    typeof document !== "undefined" &&
    !["GET", "HEAD", "OPTIONS"].includes(method)
  ) {
    const csrf = lerCookie("sgd_csrf");

    if (csrf) {
      headers["X-CSRF-Token"] = csrf;
    }
  }

  const response = await fetch(
    `${API_BASE_URL}${normalizedPath}`,
    {
      ...options,
      method,
      credentials: "include",
      headers,
    },
  );

  const texto = await response.text();

  let dados: unknown;

  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch {
    dados = texto;
  }

  if (!response.ok) {
    const payload =
      typeof dados === "object" && dados !== null
        ? (dados as ApiErrorPayload)
        : undefined;

    const partes: string[] = [];

    if (
      typeof payload?.message === "string" &&
      payload.message.trim()
    ) {
      partes.push(payload.message.trim());
    } else if (
      typeof dados === "string" &&
      dados.trim()
    ) {
      partes.push(dados.trim());
    }

    if (
      typeof payload?.detail === "string" &&
      payload.detail.trim()
    ) {
      partes.push(`Detalhe do PostgreSQL: ${payload.detail.trim()}`);
    }

    if (
      typeof payload?.code === "string" &&
      payload.code.trim()
    ) {
      partes.push(`Código: ${payload.code.trim()}`);
    }

    if (
      typeof payload?.constraint === "string" &&
      payload.constraint.trim()
    ) {
      partes.push(`Restrição: ${payload.constraint.trim()}`);
    }

    if (
      typeof payload?.column === "string" &&
      payload.column.trim()
    ) {
      partes.push(`Coluna: ${payload.column.trim()}`);
    }

    if (
      typeof payload?.table === "string" &&
      payload.table.trim()
    ) {
      partes.push(`Tabela: ${payload.table.trim()}`);
    }

    throw new Error(
      partes.length
        ? partes.join("\n")
        : `Erro na API: HTTP ${response.status}`,
    );
  }

  // O App valida a sessão chamando /auth/csrf.
  // Nesse momento sincronizamos os dados compartilhados.
  if (normalizedPath === "/auth/csrf") {
    await sincronizarDadosCompartilhados();
  }

  if (normalizedPath === "/auth/logout") {
    dadosCompartilhadosSincronizados = false;
  }

  return dados as T;
}

export function verificarBackend(): Promise<ApiHealth> {
  return apiRequest<ApiHealth>("/health");
}
