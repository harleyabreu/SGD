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

const CHAVE_NOTIFICACOES = "notificacoes";
const CHAVE_DONO_NOTIFICACOES = "notificacoes_usuario_cache_id";
const CHAVE_AUDITORIA = "auditoria";
const CHAVE_DONO_AUDITORIA = "auditoria_usuario_cache_id";

let usuarioDadosCompartilhadosSincronizados: number | null = null;
let versaoSessao = 0;
let sincronizacaoEmAndamento: Promise<void> | null = null;

class ErroHttpApi extends Error {
  readonly status: number;

  constructor(mensagem: string, status: number) {
    super(mensagem);
    this.name = "ErroHttpApi";
    this.status = status;
  }
}

function invalidarSincronizacao(): void {
  versaoSessao += 1;
  usuarioDadosCompartilhadosSincronizados = null;
}

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
  const sessao = lerLocal<{ usuarioId?: unknown } | null>("sessao", null);
  const id = Number(sessao?.usuarioId);

  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function sessaoAindaEh(
  usuarioId: number,
  versaoCapturada: number,
): boolean {
  return (
    versaoCapturada === versaoSessao &&
    obterUsuarioLocalId() === usuarioId
  );
}

function prepararCacheDoUsuario(
  chaveDados: string,
  chaveDono: string,
  usuarioId: number,
): boolean {
  const donoAtual = localStorage.getItem(chaveDono);
  const pertenceAoUsuario = donoAtual === String(usuarioId);

  if (!pertenceAoUsuario) {
    localStorage.removeItem(chaveDados);
    localStorage.removeItem(chaveDono);
  }

  return pertenceAoUsuario;
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
    if (csrf) headers["X-CSRF-Token"] = csrf;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: "include",
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
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

    throw new ErroHttpApi(mensagem, response.status);
  }

  return dados as T;
}

function combinarAuditoria(
  local: AuditoriaLocal[],
  banco: AuditoriaLocal[],
): AuditoriaLocal[] {
  const registros = new Map<string, AuditoriaLocal>();

  for (const item of [...local, ...banco]) {
    const chave = `${item.usuario ?? ""}|${item.id}|${item.entidade}|${item.acao}`;
    registros.set(chave, item);
  }

  return [...registros.values()]
    .sort(
      (a, b) =>
        new Date(b.data).getTime() - new Date(a.data).getTime(),
    )
    .slice(0, 5000);
}

async function executarSincronizacaoDoUsuario(
  usuarioId: number,
  versaoCapturada: number,
): Promise<void> {
  let configuracoesSincronizadas = false;
  let notificacoesSincronizadas = false;
  let auditoriaSincronizada = false;

  // ========================================================
  // 1. CONFIGURAÇÕES GLOBAIS
  // ========================================================

  try {
    const configuracoes = await requisicaoDireta<unknown>("/configuracoes");

    if (!sessaoAindaEh(usuarioId, versaoCapturada)) return;

    if (
      typeof configuracoes === "object" &&
      configuracoes !== null &&
      !Array.isArray(configuracoes)
    ) {
      localStorage.setItem(
        "configuracoes_sistema",
        JSON.stringify(configuracoes),
      );
      configuracoesSincronizadas = true;
    } else {
      throw new Error("O Backend retornou configurações inválidas.");
    }
  } catch (erro) {
    if (!sessaoAindaEh(usuarioId, versaoCapturada)) return;

    console.warn(
      "Não foi possível sincronizar as configurações do PostgreSQL. O cache global existente será mantido apenas como contingência:",
      erro,
    );
  }

  // ========================================================
  // 2. NOTIFICAÇÕES DO USUÁRIO AUTENTICADO
  // ========================================================
  // Nunca importamos notificações antigas para o PostgreSQL.
  // O cache só é reutilizado quando possui o mesmo usuário.

  if (!sessaoAindaEh(usuarioId, versaoCapturada)) return;

  prepararCacheDoUsuario(
    CHAVE_NOTIFICACOES,
    CHAVE_DONO_NOTIFICACOES,
    usuarioId,
  );

  try {
    const remotas = await requisicaoDireta<NotificacaoLocal[]>("/notificacoes");

    if (!sessaoAindaEh(usuarioId, versaoCapturada)) return;

    if (!Array.isArray(remotas)) {
      throw new Error("O Backend retornou uma lista de notificações inválida.");
    }

    const notificacoesOrdenadas = [...remotas].sort(
      (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime(),
    );

    localStorage.setItem(
      CHAVE_NOTIFICACOES,
      JSON.stringify(notificacoesOrdenadas),
    );
    localStorage.setItem(CHAVE_DONO_NOTIFICACOES, String(usuarioId));
    notificacoesSincronizadas = true;
  } catch (erro) {
    if (!sessaoAindaEh(usuarioId, versaoCapturada)) return;

    console.warn(
      "Não foi possível sincronizar notificações do PostgreSQL. O cache do mesmo usuário, quando existente, foi preservado:",
      erro,
    );
  }

  // ========================================================
  // 3. AUDITORIA
  // ========================================================
  // O cache local de auditoria também é separado por usuário.
  // Gestor e Diretor recebem a auditoria completa do PostgreSQL.
  // Para os demais perfis, HTTP 403 é uma restrição esperada.

  if (!sessaoAindaEh(usuarioId, versaoCapturada)) return;

  const cacheAuditoriaPertenceAoUsuario = prepararCacheDoUsuario(
    CHAVE_AUDITORIA,
    CHAVE_DONO_AUDITORIA,
    usuarioId,
  );

  try {
    const remota = await requisicaoDireta<AuditoriaLocal[]>("/auditoria");

    if (!sessaoAindaEh(usuarioId, versaoCapturada)) return;

    if (!Array.isArray(remota)) {
      throw new Error("O Backend retornou uma lista de auditoria inválida.");
    }

    const local = cacheAuditoriaPertenceAoUsuario
      ? lerLocal<AuditoriaLocal[]>(CHAVE_AUDITORIA, [])
      : [];

    localStorage.setItem(
      CHAVE_AUDITORIA,
      JSON.stringify(combinarAuditoria(local, remota)),
    );
    localStorage.setItem(CHAVE_DONO_AUDITORIA, String(usuarioId));
    auditoriaSincronizada = true;
  } catch (erro) {
    if (!sessaoAindaEh(usuarioId, versaoCapturada)) return;

    if (erro instanceof ErroHttpApi && erro.status === 403) {
      // O perfil operacional não pode consultar a auditoria completa.
      // O cache próprio desse usuário pode ser preservado, sem misturar contas.
      localStorage.setItem(CHAVE_DONO_AUDITORIA, String(usuarioId));
      auditoriaSincronizada = true;
    } else {
      console.warn(
        "Não foi possível sincronizar a auditoria do PostgreSQL:",
        erro,
      );
    }
  }

  if (
    sessaoAindaEh(usuarioId, versaoCapturada) &&
    configuracoesSincronizadas &&
    notificacoesSincronizadas &&
    auditoriaSincronizada
  ) {
    usuarioDadosCompartilhadosSincronizados = usuarioId;
  }
}

async function sincronizarDadosCompartilhados(): Promise<void> {
  if (typeof document === "undefined") return;

  const usuarioId = obterUsuarioLocalId();
  if (usuarioId === null) return;

  if (usuarioDadosCompartilhadosSincronizados === usuarioId) return;

  // Evita sincronizações concorrentes. Se a sessão mudou enquanto outra
  // sincronização estava em andamento, a chamada seguinte executa para o novo usuário.
  if (sincronizacaoEmAndamento) {
    await sincronizacaoEmAndamento.catch(() => undefined);
    if (usuarioDadosCompartilhadosSincronizados === usuarioId) return;
  }

  const versaoCapturada = versaoSessao;
  const trabalho = executarSincronizacaoDoUsuario(
    usuarioId,
    versaoCapturada,
  );

  sincronizacaoEmAndamento = trabalho;

  try {
    await trabalho;
  } finally {
    if (sincronizacaoEmAndamento === trabalho) {
      sincronizacaoEmAndamento = null;
    }
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const method = String(options.method ?? "GET").toUpperCase();

  // Login e logout mudam o contexto de autenticação. Invalidar antes da
  // requisição também cobre logout que falha por indisponibilidade da API.
  if (
    (normalizedPath === "/auth/login" && method === "POST") ||
    (normalizedPath === "/auth/logout" && method === "POST")
  ) {
    invalidarSincronizacao();
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...((options.headers ?? {}) as Record<string, string>),
  };

  if (
    typeof document !== "undefined" &&
    !["GET", "HEAD", "OPTIONS"].includes(method)
  ) {
    const csrf = lerCookie("sgd_csrf");
    if (csrf) headers["X-CSRF-Token"] = csrf;
  }

  const response = await fetch(`${API_BASE_URL}${normalizedPath}`, {
    ...options,
    method,
    credentials: "include",
    headers,
  });

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

    if (typeof payload?.message === "string" && payload.message.trim()) {
      partes.push(payload.message.trim());
    } else if (typeof dados === "string" && dados.trim()) {
      partes.push(dados.trim());
    }

    if (typeof payload?.detail === "string" && payload.detail.trim()) {
      partes.push(`Detalhe do PostgreSQL: ${payload.detail.trim()}`);
    }
    if (typeof payload?.code === "string" && payload.code.trim()) {
      partes.push(`Código: ${payload.code.trim()}`);
    }
    if (typeof payload?.constraint === "string" && payload.constraint.trim()) {
      partes.push(`Restrição: ${payload.constraint.trim()}`);
    }
    if (typeof payload?.column === "string" && payload.column.trim()) {
      partes.push(`Coluna: ${payload.column.trim()}`);
    }
    if (typeof payload?.table === "string" && payload.table.trim()) {
      partes.push(`Tabela: ${payload.table.trim()}`);
    }

    throw new Error(
      partes.length
        ? partes.join("\n")
        : `Erro na API: HTTP ${response.status}`,
    );
  }

  if (normalizedPath === "/auth/login" && method === "POST") {
    // O servidor acabou de criar outra sessão. A próxima chamada a /auth/csrf
    // buscará os dados do usuário efetivamente autenticado.
    invalidarSincronizacao();
  }

  if (normalizedPath === "/auth/csrf") {
    await sincronizarDadosCompartilhados();
  }

  if (normalizedPath === "/auth/logout" && method === "POST") {
    invalidarSincronizacao();
  }

  return dados as T;
}

export function verificarBackend(): Promise<ApiHealth> {
  return apiRequest<ApiHealth>("/health");
}
