import express from "express";
import cors from "cors";
import "dotenv/config";
import argon2 from "argon2";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { criarRotasFeriados } from "./feriadosRoutes.js";
import { criarRotasOperacionais } from "./operacionalRoutes.js";

const app = express();
const port = Number(process.env.PORT ?? 3001);

const pool = new Pool({
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME ?? "sgd",
  user: process.env.DB_USER ?? "sgd_app",
  password: process.env.DB_PASSWORD,
  connectionTimeoutMillis: 5000,
});

const FRONTEND_ORIGIN = (process.env.FRONTEND_URL ?? "http://localhost:5173").replace(/\/+$/, "");
const COOKIE_SESSAO = "sgd_session";
const COOKIE_CSRF = "sgd_csrf";
const DURACAO_SESSAO_MS = 8 * 60 * 60 * 1000;
const DURACAO_SESSAO_SEGUNDOS = Math.floor(DURACAO_SESSAO_MS / 1000);
const limiteTentativasLogin = new Map<string, { tentativas: number; inicio: number; bloqueadoAte: number }>();

app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Accept", "X-CSRF-Token"],
  }),
);

app.use(express.json({ limit: "100mb" }));

function cookiesDaRequisicao(cookieHeader: string | undefined): Record<string, string> {
  const resultado: Record<string, string> = {};
  if (!cookieHeader) return resultado;
  for (const parte of cookieHeader.split(";")) {
    const indice = parte.indexOf("=");
    if (indice < 1) continue;
    const nome = parte.slice(0, indice).trim();
    const valor = parte.slice(indice + 1).trim();
    try {
      resultado[nome] = decodeURIComponent(valor);
    } catch {
      resultado[nome] = valor;
    }
  }
  return resultado;
}

function cookieBase(seguro: boolean): string {
  return `Path=/; SameSite=Lax${seguro ? "; Secure" : ""}`;
}

function gravarCookiesSessao(res: express.Response, idSessao: string, csrfToken: string): void {
  const seguro = process.env.NODE_ENV === "production";
  const base = cookieBase(seguro);
  res.append("Set-Cookie", `${COOKIE_SESSAO}=${encodeURIComponent(idSessao)}; HttpOnly; ${base}; Max-Age=${DURACAO_SESSAO_SEGUNDOS}`);
  // O CSRF token é propositalmente legível pelo frontend para ser enviado em um header.
  res.append("Set-Cookie", `${COOKIE_CSRF}=${encodeURIComponent(csrfToken)}; ${base}; Max-Age=${DURACAO_SESSAO_SEGUNDOS}`);
}

function limparCookiesSessao(res: express.Response): void {
  const seguro = process.env.NODE_ENV === "production";
  const base = cookieBase(seguro);
  res.append("Set-Cookie", `${COOKIE_SESSAO}=; HttpOnly; ${base}; Max-Age=0`);
  res.append("Set-Cookie", `${COOKIE_CSRF}=; ${base}; Max-Age=0`);
}

function hashesIguais(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, "utf8");
  const bufferB = Buffer.from(b, "utf8");
  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
}

function origemPermitida(req: express.Request): boolean {
  const origem = req.get("origin");
  // Requisições sem Origin só podem prosseguir se também tiverem sessão válida.
  return !origem || origem.replace(/\/+$/, "") === FRONTEND_ORIGIN;
}

function registrarFalhaLogin(chave: string): number {
  const agora = Date.now();
  const atual = limiteTentativasLogin.get(chave);
  if (!atual || agora - atual.inicio > 10 * 60 * 1000) {
    limiteTentativasLogin.set(chave, { tentativas: 1, inicio: agora, bloqueadoAte: 0 });
    return 1;
  }
  atual.tentativas += 1;
  if (atual.tentativas >= 5) atual.bloqueadoAte = agora + 15 * 60 * 1000;
  limiteTentativasLogin.set(chave, atual);
  return atual.tentativas;
}

// ============================================================
// AUTENTICAÇÃO
// ============================================================
// Aceita hashes Argon2 e migra hashes SHA-256 legados para Argon2
// após uma autenticação válida. Não aceita senhas em texto puro.
app.post("/api/auth/login", async (req, res) => {
  if (!origemPermitida(req)) {
    return res.status(403).json({ message: "Origem da requisição não autorizada." });
  }

  const login = typeof req.body?.login === "string" ? req.body.login.trim() : "";
  const senha = typeof req.body?.senha === "string" ? req.body.senha : "";
  const chaveTentativa = `${req.ip || req.socket.remoteAddress || "desconhecido"}:${login.toLowerCase()}`;
  const tentativaAtual = limiteTentativasLogin.get(chaveTentativa);
  if (tentativaAtual && tentativaAtual.bloqueadoAte > Date.now()) {
    return res.status(429).json({ message: "Muitas tentativas de login. Aguarde 15 minutos e tente novamente." });
  }

  if (!login || !senha) {
    return res.status(400).json({ message: "Informe usuário e senha." });
  }

  if (senha.length < 8) {
    return res.status(400).json({
      message: "A senha deve possuir no mínimo 8 caracteres.",
    });
  }

  try {
    const resultado = await pool.query(
      `SELECT id, nome, login, email, telefone, senha_hash, perfil, status,
              diretoria_sigla, diretoria_nome, gerencia_sigla, gerencia_nome,
              divisao_nome, criado_em, atualizado_em, ultimo_acesso, exigir_troca_senha
         FROM usuarios
        WHERE LOWER(BTRIM(login)) = LOWER(BTRIM($1))
        LIMIT 1`,
      [login],
    );

    if (resultado.rows.length === 0) {
      registrarFalhaLogin(chaveTentativa);
      return res.status(401).json({ message: "Usuário ou senha inválidos." });
    }

    const usuario = resultado.rows[0];
    const statusUsuario = String(usuario.status ?? "").trim().toLowerCase();
    if (statusUsuario !== "ativo") {
      registrarFalhaLogin(chaveTentativa);
      return res.status(401).json({ message: "Usuário ou senha inválidos." });
    }

    const hashArmazenado = String(usuario.senha_hash ?? "");
    let senhaValida = false;
    let hashAtualizado: string | null = null;

    if (hashArmazenado.startsWith("$argon2")) {
      try {
        senhaValida = await argon2.verify(hashArmazenado, senha);
      } catch {
        senhaValida = false;
      }
    } else if (/^[a-f0-9]{64}$/i.test(hashArmazenado)) {
      // O login anterior calculava SHA-256 no navegador.
      const hashCalculado = createHash("sha256").update(senha, "utf8").digest();
      const hashLegado = Buffer.from(hashArmazenado, "hex");
      senhaValida =
        hashLegado.length === hashCalculado.length &&
        timingSafeEqual(hashLegado, hashCalculado);

      if (senhaValida) {
        hashAtualizado = await argon2.hash(senha);
      }
    }

    if (!senhaValida) {
      registrarFalhaLogin(chaveTentativa);
      return res.status(401).json({ message: "Usuário ou senha inválidos." });
    }

    limiteTentativasLogin.delete(chaveTentativa);

    const atualizacao = await pool.query(
      `UPDATE usuarios
          SET ultimo_acesso = CURRENT_TIMESTAMP,
              atualizado_em = CASE WHEN $2::text IS NOT NULL
                                    THEN CURRENT_TIMESTAMP
                                    ELSE atualizado_em END,
              senha_hash = COALESCE($2, senha_hash)
        WHERE id = $1
        RETURNING ultimo_acesso, atualizado_em`,
      [usuario.id, hashAtualizado],
    );

    const atualizado = atualizacao.rows[0];
    const estruturaCompleta = Boolean(
      usuario.diretoria_sigla &&
      usuario.diretoria_nome &&
      usuario.gerencia_sigla &&
      usuario.gerencia_nome &&
      usuario.divisao_nome,
    );

    // Cria uma sessão opaca no PostgreSQL. O navegador recebe apenas um cookie HttpOnly.
    const idSessao = randomBytes(32).toString("base64url");
    const csrfToken = randomBytes(32).toString("base64url");
    const idSessaoHash = createHash("sha256").update(idSessao).digest("hex");
    const csrfHash = createHash("sha256").update(csrfToken).digest("hex");
    await pool.query(
      `INSERT INTO sessoes_autenticacao (id_hash, usuario_id, csrf_hash, expira_em)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP + INTERVAL '8 hours')`,
      [idSessaoHash, usuario.id, csrfHash],
    );
    gravarCookiesSessao(res, idSessao, csrfToken);

    return res.json({
      csrfToken,
      usuario: {
        id: Number(usuario.id),
        nome: usuario.nome,
        login: usuario.login,
        email: usuario.email,
        ...(usuario.telefone ? { telefone: usuario.telefone } : {}),
        perfil: usuario.perfil,
        status: usuario.status,
        criadoEm: usuario.criado_em,
        atualizadoEm: atualizado?.atualizado_em ?? usuario.atualizado_em,
        ultimoAcesso: atualizado?.ultimo_acesso ?? null,
        ...(estruturaCompleta
          ? {
              estruturaOrganizacional: {
                diretoriaSigla: usuario.diretoria_sigla,
                diretoriaNome: usuario.diretoria_nome,
                gerenciaSigla: usuario.gerencia_sigla,
                gerenciaNome: usuario.gerencia_nome,
                divisaoNome: usuario.divisao_nome,
              },
            }
          : {}),
      },
      exigirTrocaSenha: Boolean(usuario.exigir_troca_senha),
    });
  } catch (error) {
    console.error("Falha na autenticação:", error);
    return res.status(500).json({
      message: "Não foi possível realizar o login neste momento.",
    });
  }
});

// ============================================================
// SESSÃO, CSRF E AUTORIZAÇÃO POR PERFIL
// ============================================================
// Todas as rotas /api ficam protegidas, exceto health e login.
// A sessão é armazenada no PostgreSQL; o cookie do navegador é HttpOnly.
app.use("/api", async (req, res, next) => {
  const caminho = req.originalUrl.split("?")[0].replace(/^\/api(?=\/|$)/, "") || "/";
  if (req.method === "OPTIONS" || (req.method === "GET" && caminho === "/health") || (req.method === "POST" && caminho === "/auth/login")) {
    return next();
  }

  const cookies = cookiesDaRequisicao(req.headers.cookie);
  const idSessao = cookies[COOKIE_SESSAO];
  if (!idSessao) {
    limparCookiesSessao(res);
    return res.status(401).json({ message: "Sessão não autenticada. Entre novamente no SGD." });
  }

  const idSessaoHash = createHash("sha256").update(idSessao).digest("hex");

  try {
    const resultado = await pool.query(
      `SELECT s.id_hash, s.csrf_hash, s.usuario_id,
              u.nome, u.login, u.perfil, u.status, u.exigir_troca_senha
         FROM sessoes_autenticacao s
         JOIN usuarios u ON u.id = s.usuario_id
        WHERE s.id_hash = $1 AND s.expira_em > CURRENT_TIMESTAMP`,
      [idSessaoHash],
    );

    if (resultado.rows.length === 0 || String(resultado.rows[0].status ?? "").trim().toLowerCase() !== "ativo") {
      await pool.query("DELETE FROM sessoes_autenticacao WHERE id_hash = $1", [idSessaoHash]);
      limparCookiesSessao(res);
      return res.status(401).json({ message: "Sessão expirada ou usuário inativo. Entre novamente." });
    }

    const usuario = resultado.rows[0];
    const metodoEscrita = !["GET", "HEAD", "OPTIONS"].includes(req.method.toUpperCase());
    if (metodoEscrita) {
      if (!origemPermitida(req)) {
        return res.status(403).json({ message: "Origem da requisição não autorizada." });
      }
      const csrfCookie = cookies[COOKIE_CSRF] ?? "";
      const csrfHeader = typeof req.get("X-CSRF-Token") === "string" ? req.get("X-CSRF-Token")! : "";
      const csrfHashCookie = createHash("sha256").update(csrfCookie).digest("hex");
      const csrfHashHeader = createHash("sha256").update(csrfHeader).digest("hex");
      if (!csrfCookie || !csrfHeader || !hashesIguais(csrfCookie, csrfHeader) ||
          !hashesIguais(csrfHashCookie, String(usuario.csrf_hash)) ||
          !hashesIguais(csrfHashHeader, String(usuario.csrf_hash))) {
        return res.status(403).json({ message: "Token de segurança inválido ou expirado. Atualize a página e tente novamente." });
      }
    }

    const perfilNormalizado = String(usuario.perfil ?? "").trim().toLowerCase();
    const perfilGestor = perfilNormalizado === "gestor/administrador" || perfilNormalizado === "diretor (a)";
    const rotaUsuarios = /^\/usuarios(?:\/|$)/.test(caminho);
    const rotaSenhaPropria = req.method === "POST" && Boolean(usuario.exigir_troca_senha) &&
      /^\/usuarios\/(\d+)\/senha$/.test(caminho) &&
      Number(caminho.match(/^\/usuarios\/(\d+)\/senha$/)?.[1]) === Number(usuario.usuario_id);
    const rotaCatalogo = /^\/(clientes|sistemas|tipos)(?:\/|$)/.test(caminho);
    const escritaCatalogo = rotaCatalogo && metodoEscrita;
    const exclusaoDemanda = /^\/demandas\/\d+$/.test(caminho) && req.method === "DELETE";

    if (Boolean(usuario.exigir_troca_senha) &&
        caminho !== "/auth/csrf" && caminho !== "/auth/me" && caminho !== "/auth/logout" && !rotaSenhaPropria) {
      return res.status(403).json({ message: "Troque a senha inicial antes de usar as demais funções do SGD." });
    }

    if ((rotaUsuarios && !rotaSenhaPropria && !perfilGestor) ||
        (escritaCatalogo && !perfilGestor) ||
        (exclusaoDemanda && !perfilGestor)) {
      return res.status(403).json({ message: "Seu perfil não possui permissão para esta operação." });
    }

    res.locals.sgdAuth = {
      id: Number(usuario.usuario_id),
      nome: String(usuario.nome),
      login: String(usuario.login),
      perfil: String(usuario.perfil),
      exigirTrocaSenha: Boolean(usuario.exigir_troca_senha),
      sessaoHash: idSessaoHash,
      csrfHash: String(usuario.csrf_hash),
    };
    return next();
  } catch (error) {
    console.error("Falha ao validar sessão:", error);
    return res.status(500).json({ message: "Não foi possível validar a sessão." });
  }
});

app.get("/api/auth/csrf", async (_req, res) => {
  const autenticacao = res.locals.sgdAuth as { csrfHash: string; sessaoHash: string } | undefined;
  const cookies = cookiesDaRequisicao(_req.headers.cookie);
  const atual = cookies[COOKIE_CSRF] ?? "";
  const atualHash = atual ? createHash("sha256").update(atual).digest("hex") : "";

  if (autenticacao && atual && hashesIguais(atualHash, autenticacao.csrfHash)) {
    return res.json({ csrfToken: atual });
  }

  const novoToken = randomBytes(32).toString("base64url");
  const novoHash = createHash("sha256").update(novoToken).digest("hex");
  try {
    await pool.query(
      "UPDATE sessoes_autenticacao SET csrf_hash = $1 WHERE id_hash = $2",
      [novoHash, autenticacao?.sessaoHash],
    );
    const cookiesDaSessao = cookiesDaRequisicao(_req.headers.cookie);
    const idSessao = cookiesDaSessao[COOKIE_SESSAO];
    if (idSessao) {
      const secure = process.env.NODE_ENV === "production";
      res.append("Set-Cookie", `${COOKIE_CSRF}=${encodeURIComponent(novoToken)}; ${cookieBase(secure)}; Max-Age=${DURACAO_SESSAO_SEGUNDOS}`);
    }
    return res.json({ csrfToken: novoToken });
  } catch (error) {
    console.error("Falha ao renovar token CSRF:", error);
    return res.status(500).json({ message: "Não foi possível atualizar o token de segurança." });
  }
});

app.post("/api/auth/logout", async (_req, res) => {
  const autenticacao = res.locals.sgdAuth as { sessaoHash: string };
  try {
    await pool.query("DELETE FROM sessoes_autenticacao WHERE id_hash = $1", [autenticacao.sessaoHash]);
    limparCookiesSessao(res);
    return res.json({ ok: true });
  } catch (error) {
    console.error("Falha ao encerrar sessão:", error);
    return res.status(500).json({ message: "Não foi possível encerrar a sessão." });
  }
});

// ============================================================
// USUÁRIOS — PostgreSQL como fonte oficial
// ============================================================
// As rotas são protegidas por sessão HttpOnly, token CSRF e perfil Gestor.

type UsuarioBanco = {
  id: number | string;
  nome: string;
  login: string;
  email: string;
  telefone: string | null;
  perfil: string;
  status: string;
  diretoria_sigla: string | null;
  diretoria_nome: string | null;
  gerencia_sigla: string | null;
  gerencia_nome: string | null;
  divisao_nome: string | null;
  criado_em: string;
  atualizado_em: string;
  ultimo_acesso: string | null;
  exigir_troca_senha: boolean;
};

const PERFIS_USUARIO = new Set([
  "Gestor/Administrador",
  "Diretor (a)",
  "Analista",
  "Desenvolvedor",
  "Estagiário",
]);

function ehPerfilDiretor(perfil: string): boolean {
  return perfil === "Diretor (a)";
}

function validarEstruturaPorPerfil(perfil: string, estrutura: ReturnType<typeof lerEstruturaOrganizacional>): string | null {
  if (ehPerfilDiretor(perfil)) {
    if (estrutura.diretoriaSigla !== "DDS" || estrutura.diretoriaNome !== "Diretoria de Desenvolvimento de Sistemas") {
      return "O Diretor (a) deve estar vinculado à DDS.";
    }
    return null;
  }

  if (!estrutura.diretoriaSigla || !estrutura.diretoriaNome || !estrutura.gerenciaSigla || !estrutura.gerenciaNome || !estrutura.divisaoNome) {
    return "Selecione Diretoria, Gerência e Divisão do usuário.";
  }

  return null;
}

function usuarioPublico(row: UsuarioBanco) {
  const estruturaCompleta = Boolean(
    row.diretoria_sigla && row.diretoria_nome && row.gerencia_sigla &&
    row.gerencia_nome && row.divisao_nome,
  );

  return {
    id: Number(row.id),
    nome: row.nome,
    login: row.login,
    email: row.email,
    telefone: row.telefone ?? "",
    perfil: row.perfil,
    status: row.status,
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
    ultimoAcesso: row.ultimo_acesso,
    exigirTrocaSenha: Boolean(row.exigir_troca_senha),
    ...(estruturaCompleta ? {
      estruturaOrganizacional: {
        diretoriaSigla: row.diretoria_sigla,
        diretoriaNome: row.diretoria_nome,
        gerenciaSigla: row.gerencia_sigla,
        gerenciaNome: row.gerencia_nome,
        divisaoNome: row.divisao_nome,
      },
    } : {}),
  };
}

function lerEstruturaOrganizacional(valor: unknown) {
  const estrutura = valor && typeof valor === "object"
    ? valor as Record<string, unknown>
    : {};

  const diretoriaSigla = typeof estrutura.diretoriaSigla === "string" ? estrutura.diretoriaSigla.trim() : "";
  const diretoriaNome = typeof estrutura.diretoriaNome === "string" ? estrutura.diretoriaNome.trim() : "";
  const gerenciaSigla = typeof estrutura.gerenciaSigla === "string" ? estrutura.gerenciaSigla.trim() : "";
  const gerenciaNome = typeof estrutura.gerenciaNome === "string" ? estrutura.gerenciaNome.trim() : "";
  const divisaoNome = typeof estrutura.divisaoNome === "string" ? estrutura.divisaoNome.trim() : "";

  return { diretoriaSigla, diretoriaNome, gerenciaSigla, gerenciaNome, divisaoNome };
}

const SELECT_USUARIO_PUBLICO = `
  SELECT id, nome, login, email, telefone, perfil, status,
         diretoria_sigla, diretoria_nome, gerencia_sigla, gerencia_nome,
         divisao_nome, criado_em, atualizado_em, ultimo_acesso,
         exigir_troca_senha
    FROM usuarios
`;

app.get("/api/auth/me", async (_req, res) => {
  const autenticacao = res.locals.sgdAuth as { id: number } | undefined;
  if (!autenticacao) return res.status(401).json({ message: "Sessão não autenticada." });
  try {
    const resultado = await pool.query(`${SELECT_USUARIO_PUBLICO} WHERE id = $1`, [autenticacao.id]);
    if (resultado.rows.length === 0) return res.status(401).json({ message: "Usuário não encontrado." });
    return res.json({ usuario: usuarioPublico(resultado.rows[0] as UsuarioBanco) });
  } catch (error) {
    console.error("Falha ao consultar usuário da sessão:", error);
    return res.status(500).json({ message: "Não foi possível consultar a sessão atual." });
  }
});

app.get("/api/usuarios", async (_req, res) => {
  try {
    const resultado = await pool.query(`${SELECT_USUARIO_PUBLICO} ORDER BY nome, id`);
    res.json(resultado.rows.map((row) => usuarioPublico(row as UsuarioBanco)));
  } catch (error) {
    console.error("Falha ao consultar usuários:", error);
    res.status(500).json({ message: "Não foi possível consultar os usuários." });
  }
});

app.post("/api/usuarios", async (req, res) => {
  const body = req.body ?? {};
  const nome = typeof body.nome === "string" ? body.nome.trim() : "";
  const login = typeof body.login === "string" ? body.login.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const telefone = typeof body.telefone === "string" ? body.telefone.trim() : "";
  const perfil = typeof body.perfil === "string" ? body.perfil.trim() : "";
  const senha = typeof body.senha === "string" ? body.senha : "";
  const estrutura = lerEstruturaOrganizacional(body.estruturaOrganizacional);

  if (!nome || !login || !email || !perfil || !senha) {
    return res.status(400).json({ message: "Informe nome, login, e-mail, perfil e senha temporária." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: "Informe um e-mail válido." });
  }
  if (senha.length < 8) {
    return res.status(400).json({ message: "A senha deve possuir no mínimo 8 caracteres." });
  }
  if (!PERFIS_USUARIO.has(perfil)) {
    return res.status(400).json({ message: "Perfil de usuário inválido." });
  }
  const erroEstrutura = validarEstruturaPorPerfil(perfil, estrutura);
  if (erroEstrutura) {
    return res.status(400).json({ message: erroEstrutura });
  }

  if (ehPerfilDiretor(perfil)) {
    const diretorExistente = await pool.query(
      "SELECT id FROM usuarios WHERE perfil = 'Diretor (a)' LIMIT 1",
    );
    if (diretorExistente.rowCount && Number(diretorExistente.rows[0].id) > 0) {
      return res.status(409).json({ message: "Já existe um usuário com o perfil Diretor (a). O sistema permite apenas um Diretor (a)." });
    }
  }

  try {
    const senhaHash = await argon2.hash(senha, { type: argon2.argon2id });
    const resultado = await pool.query(
      `INSERT INTO usuarios (
         nome, login, email, telefone, senha_hash, perfil, status,
         diretoria_sigla, diretoria_nome, gerencia_sigla, gerencia_nome,
         divisao_nome, exigir_troca_senha, criado_em, atualizado_em
       ) VALUES ($1,$2,$3,$4,$5,$6,'Ativo',$7,$8,$9,$10,$11,TRUE,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
       RETURNING id, nome, login, email, telefone, perfil, status,
                 diretoria_sigla, diretoria_nome, gerencia_sigla, gerencia_nome,
                 divisao_nome, criado_em, atualizado_em, ultimo_acesso,
                 exigir_troca_senha`,
      [nome, login, email, telefone || null, senhaHash, perfil,
       estrutura.diretoriaSigla, estrutura.diretoriaNome,
       ehPerfilDiretor(perfil) ? null : estrutura.gerenciaSigla,
       ehPerfilDiretor(perfil) ? null : estrutura.gerenciaNome,
       ehPerfilDiretor(perfil) ? null : estrutura.divisaoNome],
    );
    return res.status(201).json(usuarioPublico(resultado.rows[0] as UsuarioBanco));
  } catch (error) {
    const dbError = error as { code?: string };
    if (dbError.code === "23505") {
      return res.status(409).json({ message: "Este login ou e-mail já está cadastrado." });
    }
    console.error("Falha ao cadastrar usuário:", error);
    return res.status(500).json({ message: "Não foi possível cadastrar o usuário." });
  }
});

app.put("/api/usuarios/:id", async (req, res) => {
  const id = Number(req.params.id);
  const body = req.body ?? {};
  const nome = typeof body.nome === "string" ? body.nome.trim() : "";
  const login = typeof body.login === "string" ? body.login.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const telefone = typeof body.telefone === "string" ? body.telefone.trim() : "";
  const perfil = typeof body.perfil === "string" ? body.perfil.trim() : "";
  const senha = typeof body.senha === "string" && body.senha.length > 0 ? body.senha : null;
  const estrutura = lerEstruturaOrganizacional(body.estruturaOrganizacional);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({ message: "ID de usuário inválido." });
  }
  if (!nome || !login || !email || !perfil) {
    return res.status(400).json({ message: "Informe nome, login, e-mail e perfil." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: "Informe um e-mail válido." });
  }
  if (!PERFIS_USUARIO.has(perfil)) {
    return res.status(400).json({ message: "Perfil de usuário inválido." });
  }
  if (senha && senha.length < 8) {
    return res.status(400).json({ message: "A senha deve possuir no mínimo 8 caracteres." });
  }
  const erroEstrutura = validarEstruturaPorPerfil(perfil, estrutura);
  if (erroEstrutura) {
    return res.status(400).json({ message: erroEstrutura });
  }

  if (ehPerfilDiretor(perfil)) {
    const diretorExistente = await pool.query(
      "SELECT id FROM usuarios WHERE perfil = 'Diretor (a)' AND id <> $1 LIMIT 1",
      [id],
    );
    if (diretorExistente.rowCount) {
      return res.status(409).json({ message: "Já existe um usuário com o perfil Diretor (a). O sistema permite apenas um Diretor (a)." });
    }
  }

  try {
    const senhaHash = senha ? await argon2.hash(senha, { type: argon2.argon2id }) : null;
    const resultado = await pool.query(
      `UPDATE usuarios SET
         nome=$1, login=$2, email=$3, telefone=$4, perfil=$5,
         diretoria_sigla=$6, diretoria_nome=$7, gerencia_sigla=$8,
         gerencia_nome=$9, divisao_nome=$10,
         senha_hash=COALESCE($11, senha_hash),
         exigir_troca_senha=CASE WHEN $11::text IS NOT NULL THEN FALSE ELSE exigir_troca_senha END,
         atualizado_em=CURRENT_TIMESTAMP
       WHERE id=$12
       RETURNING id, nome, login, email, telefone, perfil, status,
                 diretoria_sigla, diretoria_nome, gerencia_sigla, gerencia_nome,
                 divisao_nome, criado_em, atualizado_em, ultimo_acesso,
                 exigir_troca_senha`,
      [nome, login, email, telefone || null, perfil,
       estrutura.diretoriaSigla, estrutura.diretoriaNome,
       ehPerfilDiretor(perfil) ? null : estrutura.gerenciaSigla,
       ehPerfilDiretor(perfil) ? null : estrutura.gerenciaNome,
       ehPerfilDiretor(perfil) ? null : estrutura.divisaoNome, senhaHash, id],
    );
    if (resultado.rowCount === 0) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }
    return res.json(usuarioPublico(resultado.rows[0] as UsuarioBanco));
  } catch (error) {
    const dbError = error as { code?: string };
    if (dbError.code === "23505") {
      return res.status(409).json({ message: "Este login ou e-mail já está cadastrado." });
    }
    console.error("Falha ao editar usuário:", error);
    return res.status(500).json({ message: "Não foi possível editar o usuário." });
  }
});

app.delete("/api/usuarios/:id", async (req, res) => {
  const id = Number(req.params.id);
  const autenticacao = res.locals.sgdAuth as { id: number } | undefined;

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({ message: "ID de usuário inválido." });
  }

  if (autenticacao && Number(autenticacao.id) === id) {
    return res.status(409).json({ message: "O usuário atualmente logado não pode ser excluído." });
  }

  const conexao = await pool.connect();
  try {
    await conexao.query("BEGIN");

    const atual = await conexao.query(
      "SELECT id, nome, perfil, status FROM usuarios WHERE id=$1 FOR UPDATE",
      [id],
    );

    if (atual.rowCount === 0) {
      await conexao.query("ROLLBACK");
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    if (atual.rows[0].perfil === "Gestor/Administrador" && atual.rows[0].status === "Ativo") {
      const gestores = await conexao.query(
        "SELECT COUNT(*)::integer AS total FROM usuarios WHERE perfil='Gestor/Administrador' AND status='Ativo'",
      );
      if (Number(gestores.rows[0].total) <= 1) {
        await conexao.query("ROLLBACK");
        return res.status(409).json({ message: "O sistema precisa manter pelo menos um Gestor ativo." });
      }
    }

    await conexao.query("DELETE FROM usuarios WHERE id=$1", [id]);
    await conexao.query("COMMIT");

    return res.json({ ok: true, id });
  } catch (error) {
    await conexao.query("ROLLBACK");
    const dbError = error as { code?: string };
    if (dbError.code === "23503") {
      return res.status(409).json({ message: "Não é possível excluir este usuário porque existem registros relacionados a ele no banco de dados. Inative o usuário para preservar o histórico." });
    }
    console.error("Falha ao excluir usuário:", error);
    return res.status(500).json({ message: "Não foi possível excluir o usuário." });
  } finally {
    conexao.release();
  }
});

app.patch("/api/usuarios/:id/status", async (req, res) => {
  const id = Number(req.params.id);
  const status = typeof req.body?.status === "string" ? req.body.status.trim() : "";
  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({ message: "ID de usuário inválido." });
  }
  if (status !== "Ativo" && status !== "Inativo") {
    return res.status(400).json({ message: "O status deve ser Ativo ou Inativo." });
  }

  const conexao = await pool.connect();
  try {
    await conexao.query("BEGIN");
    if (status === "Inativo") {
      const atual = await conexao.query(
        "SELECT perfil, status FROM usuarios WHERE id=$1 FOR UPDATE", [id],
      );
      if (atual.rowCount === 0) {
        await conexao.query("ROLLBACK");
        return res.status(404).json({ message: "Usuário não encontrado." });
      }
      if (atual.rows[0].perfil === "Gestor/Administrador" && atual.rows[0].status === "Ativo") {
        const gestores = await conexao.query(
          "SELECT COUNT(*)::integer AS total FROM usuarios WHERE perfil='Gestor/Administrador' AND status='Ativo'",
        );
        if (Number(gestores.rows[0].total) <= 1) {
          await conexao.query("ROLLBACK");
          return res.status(409).json({ message: "O sistema precisa manter pelo menos um Gestor ativo." });
        }
      }
    }
    const resultado = await conexao.query(
      `UPDATE usuarios SET status=$1, atualizado_em=CURRENT_TIMESTAMP
       WHERE id=$2
       RETURNING id, nome, login, email, telefone, perfil, status,
                 diretoria_sigla, diretoria_nome, gerencia_sigla, gerencia_nome,
                 divisao_nome, criado_em, atualizado_em, ultimo_acesso,
                 exigir_troca_senha`,
      [status, id],
    );
    await conexao.query("COMMIT");
    if (resultado.rowCount === 0) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }
    return res.json(usuarioPublico(resultado.rows[0] as UsuarioBanco));
  } catch (error) {
    await conexao.query("ROLLBACK");
    console.error("Falha ao atualizar status do usuário:", error);
    return res.status(500).json({ message: "Não foi possível atualizar o status do usuário." });
  } finally {
    conexao.release();
  }
});

app.post("/api/usuarios/:id/senha", async (req, res) => {
  const id = Number(req.params.id);
  const senha = typeof req.body?.senha === "string" ? req.body.senha : "";
  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({ message: "ID de usuário inválido." });
  }
  if (senha.length < 8) {
    return res.status(400).json({ message: "A senha deve possuir no mínimo 8 caracteres." });
  }

  try {
    const hash = await argon2.hash(senha, { type: argon2.argon2id });
    const resultado = await pool.query(
      `UPDATE usuarios
          SET senha_hash=$1, exigir_troca_senha=FALSE, atualizado_em=CURRENT_TIMESTAMP
        WHERE id=$2 RETURNING id`,
      [hash, id],
    );
    if (resultado.rowCount === 0) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }
    return res.json({ ok: true });
  } catch (error) {
    console.error("Falha ao alterar senha do usuário:", error);
    return res.status(500).json({ message: "Não foi possível alterar a senha." });
  }
});

// ============================================================
// VERIFICAR CONEXÃO COM O POSTGRESQL
// ============================================================

app.get("/api/health", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT current_database() AS database, current_user AS user",
    );

    res.json({
      status: "ok",
      service: "SGD backend",
      database: result.rows[0].database,
      user: result.rows[0].user,
    });
  } catch (error) {
    console.error("Falha ao consultar o PostgreSQL:", error);

    res.status(503).json({
      status: "error",
      message: "Não foi possível conectar ao banco de dados.",
    });
  }
});

// ============================================================
// CLIENTES
// ============================================================

// Listar clientes
app.get("/api/clientes", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id::integer AS id,
        nome,
        sigla,
        ativo,
        criado_em AS "criadoEm",
        atualizado_em AS "atualizadoEm"
      FROM clientes
      ORDER BY nome
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Falha ao consultar clientes:", error);

    res.status(500).json({
      message: "Não foi possível consultar os clientes.",
    });
  }
});

// Cadastrar cliente
app.post("/api/clientes", async (req, res) => {
  const { nome, sigla } = req.body ?? {};

  if (
    typeof nome !== "string" ||
    !nome.trim() ||
    typeof sigla !== "string" ||
    !sigla.trim()
  ) {
    res.status(400).json({
      message: "Informe o nome e a sigla do cliente.",
    });
    return;
  }

  try {
    const result = await pool.query(
      `
        INSERT INTO clientes (nome, sigla, ativo)
        VALUES ($1, $2, TRUE)
        RETURNING
          id::integer AS id,
          nome,
          sigla,
          ativo,
          criado_em AS "criadoEm",
          atualizado_em AS "atualizadoEm"
      `,
      [nome.trim(), sigla.trim().toUpperCase()],
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    const dbError = error as { code?: string };

    if (dbError.code === "23505") {
      res.status(409).json({
        message: "Já existe um cliente com essa sigla.",
      });
      return;
    }

    console.error("Falha ao cadastrar cliente:", error);

    res.status(500).json({
      message: "Não foi possível cadastrar o cliente.",
    });
  }
});

// Editar cliente
app.put("/api/clientes/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { nome, sigla } = req.body ?? {};

  if (!Number.isSafeInteger(id) || id <= 0) {
    res.status(400).json({
      message: "ID de cliente inválido.",
    });
    return;
  }

  if (
    typeof nome !== "string" ||
    !nome.trim() ||
    typeof sigla !== "string" ||
    !sigla.trim()
  ) {
    res.status(400).json({
      message: "Informe o nome e a sigla do cliente.",
    });
    return;
  }

  try {
    const result = await pool.query(
      `
        UPDATE clientes
        SET
          nome = $1,
          sigla = $2,
          atualizado_em = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING
          id::integer AS id,
          nome,
          sigla,
          ativo,
          criado_em AS "criadoEm",
          atualizado_em AS "atualizadoEm"
      `,
      [nome.trim(), sigla.trim().toUpperCase(), id],
    );

    if (result.rowCount === 0) {
      res.status(404).json({
        message: "Cliente não encontrado.",
      });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    const dbError = error as { code?: string };

    if (dbError.code === "23505") {
      res.status(409).json({
        message: "Já existe um cliente com essa sigla.",
      });
      return;
    }

    console.error("Falha ao editar cliente:", error);

    res.status(500).json({
      message: "Não foi possível editar o cliente.",
    });
  }
});

// Ativar ou inativar cliente
app.patch("/api/clientes/:id/status", async (req, res) => {
  const id = Number(req.params.id);
  const { ativo } = req.body ?? {};

  if (!Number.isSafeInteger(id) || id <= 0) {
    res.status(400).json({
      message: "ID de cliente inválido.",
    });
    return;
  }

  if (typeof ativo !== "boolean") {
    res.status(400).json({
      message: "Informe se o cliente está ativo ou inativo.",
    });
    return;
  }

  try {
    const result = await pool.query(
      `
        UPDATE clientes
        SET
          ativo = $1,
          atualizado_em = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING
          id::integer AS id,
          nome,
          sigla,
          ativo,
          criado_em AS "criadoEm",
          atualizado_em AS "atualizadoEm"
      `,
      [ativo, id],
    );

    if (result.rowCount === 0) {
      res.status(404).json({
        message: "Cliente não encontrado.",
      });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Falha ao atualizar status do cliente:", error);

    res.status(500).json({
      message: "Não foi possível atualizar o status do cliente.",
    });
  }
});

// ============================================================
// SISTEMAS
// ============================================================

// Listar sistemas
app.get("/api/sistemas", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id::integer AS id,
        nome,
        cliente_id::integer AS "clienteId",
        ativo,
        criado_em AS "criadoEm",
        atualizado_em AS "atualizadoEm"
      FROM sistemas
      ORDER BY nome
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Falha ao consultar sistemas:", error);

    res.status(500).json({
      message: "Não foi possível consultar os sistemas.",
    });
  }
});

// Cadastrar sistema
app.post("/api/sistemas", async (req, res) => {
  const { nome } = req.body ?? {};
  const valorCliente = req.body?.clienteId;

  const clienteId =
    valorCliente === undefined ||
    valorCliente === null ||
    valorCliente === ""
      ? null
      : Number(valorCliente);

  if (typeof nome !== "string" || !nome.trim()) {
    res.status(400).json({
      message: "Informe o nome do sistema.",
    });
    return;
  }

  if (
    clienteId !== null &&
    (!Number.isSafeInteger(clienteId) || clienteId <= 0)
  ) {
    res.status(400).json({
      message: "Cliente vinculado inválido.",
    });
    return;
  }

  try {
    const duplicado = await pool.query(
      `
        SELECT id
        FROM sistemas
        WHERE LOWER(nome) = LOWER($1)
          AND cliente_id IS NOT DISTINCT FROM $2
        LIMIT 1
      `,
      [nome.trim(), clienteId],
    );

    if (duplicado.rowCount) {
      res.status(409).json({
        message: "Este sistema já está cadastrado para o cliente selecionado.",
      });
      return;
    }

    const result = await pool.query(
      `
        INSERT INTO sistemas (nome, cliente_id, ativo)
        VALUES ($1, $2, TRUE)
        RETURNING
          id::integer AS id,
          nome,
          cliente_id::integer AS "clienteId",
          ativo,
          criado_em AS "criadoEm",
          atualizado_em AS "atualizadoEm"
      `,
      [nome.trim(), clienteId],
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    const dbError = error as { code?: string };

    if (dbError.code === "23505") {
      res.status(409).json({
        message: "Este sistema já está cadastrado.",
      });
      return;
    }

    if (dbError.code === "23503") {
      res.status(400).json({
        message: "O cliente selecionado não existe.",
      });
      return;
    }

    console.error("Falha ao cadastrar sistema:", error);

    res.status(500).json({
      message: "Não foi possível cadastrar o sistema.",
    });
  }
});

// Editar sistema
app.put("/api/sistemas/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { nome } = req.body ?? {};
  const valorCliente = req.body?.clienteId;

  const clienteId =
    valorCliente === undefined ||
    valorCliente === null ||
    valorCliente === ""
      ? null
      : Number(valorCliente);

  if (!Number.isSafeInteger(id) || id <= 0) {
    res.status(400).json({
      message: "ID de sistema inválido.",
    });
    return;
  }

  if (typeof nome !== "string" || !nome.trim()) {
    res.status(400).json({
      message: "Informe o nome do sistema.",
    });
    return;
  }

  if (
    clienteId !== null &&
    (!Number.isSafeInteger(clienteId) || clienteId <= 0)
  ) {
    res.status(400).json({
      message: "Cliente vinculado inválido.",
    });
    return;
  }

  try {
    const duplicado = await pool.query(
      `
        SELECT id
        FROM sistemas
        WHERE LOWER(nome) = LOWER($1)
          AND cliente_id IS NOT DISTINCT FROM $2
          AND id <> $3
        LIMIT 1
      `,
      [nome.trim(), clienteId, id],
    );

    if (duplicado.rowCount) {
      res.status(409).json({
        message: "Este sistema já está cadastrado para o cliente selecionado.",
      });
      return;
    }

    const result = await pool.query(
      `
        UPDATE sistemas
        SET
          nome = $1,
          cliente_id = $2,
          atualizado_em = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING
          id::integer AS id,
          nome,
          cliente_id::integer AS "clienteId",
          ativo,
          criado_em AS "criadoEm",
          atualizado_em AS "atualizadoEm"
      `,
      [nome.trim(), clienteId, id],
    );

    if (result.rowCount === 0) {
      res.status(404).json({
        message: "Sistema não encontrado.",
      });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    const dbError = error as { code?: string };

    if (dbError.code === "23505") {
      res.status(409).json({
        message: "Este sistema já está cadastrado.",
      });
      return;
    }

    if (dbError.code === "23503") {
      res.status(400).json({
        message: "O cliente selecionado não existe.",
      });
      return;
    }

    console.error("Falha ao editar sistema:", error);

    res.status(500).json({
      message: "Não foi possível editar o sistema.",
    });
  }
});

// Ativar ou inativar sistema
app.patch("/api/sistemas/:id/status", async (req, res) => {
  const id = Number(req.params.id);
  const { ativo } = req.body ?? {};

  if (!Number.isSafeInteger(id) || id <= 0) {
    res.status(400).json({
      message: "ID de sistema inválido.",
    });
    return;
  }

  if (typeof ativo !== "boolean") {
    res.status(400).json({
      message: "Informe se o sistema está ativo ou inativo.",
    });
    return;
  }

  try {
    const result = await pool.query(
      `
        UPDATE sistemas
        SET
          ativo = $1,
          atualizado_em = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING
          id::integer AS id,
          nome,
          cliente_id::integer AS "clienteId",
          ativo,
          criado_em AS "criadoEm",
          atualizado_em AS "atualizadoEm"
      `,
      [ativo, id],
    );

    if (result.rowCount === 0) {
      res.status(404).json({
        message: "Sistema não encontrado.",
      });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Falha ao atualizar status do sistema:", error);

    res.status(500).json({
      message: "Não foi possível atualizar o status do sistema.",
    });
  }
});

// ============================================================
// TIPOS DE DEMANDA
// ============================================================

// Listar tipos
app.get("/api/tipos", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id::integer AS id,
        nome,
        ativo,
        criado_em AS "criadoEm",
        atualizado_em AS "atualizadoEm"
      FROM tipos_demanda
      ORDER BY nome
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Falha ao consultar tipos de demanda:", error);

    res.status(500).json({
      message: "Não foi possível consultar os tipos de demanda.",
    });
  }
});

// Cadastrar tipo
app.post("/api/tipos", async (req, res) => {
  const { nome } = req.body ?? {};

  if (typeof nome !== "string" || !nome.trim()) {
    res.status(400).json({
      message: "Informe o nome do tipo de demanda.",
    });
    return;
  }

  try {
    const duplicado = await pool.query(
      `
        SELECT id
        FROM tipos_demanda
        WHERE LOWER(nome) = LOWER($1)
        LIMIT 1
      `,
      [nome.trim()],
    );

    if (duplicado.rowCount) {
      res.status(409).json({
        message: "Este tipo de demanda já está cadastrado.",
      });
      return;
    }

    const result = await pool.query(
      `
        INSERT INTO tipos_demanda (nome, ativo)
        VALUES ($1, TRUE)
        RETURNING
          id::integer AS id,
          nome,
          ativo,
          criado_em AS "criadoEm",
          atualizado_em AS "atualizadoEm"
      `,
      [nome.trim()],
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    const dbError = error as { code?: string };

    if (dbError.code === "23505") {
      res.status(409).json({
        message: "Este tipo de demanda já está cadastrado.",
      });
      return;
    }

    console.error("Falha ao cadastrar tipo de demanda:", error);

    res.status(500).json({
      message: "Não foi possível cadastrar o tipo de demanda.",
    });
  }
});

// Editar tipo
app.put("/api/tipos/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { nome } = req.body ?? {};

  if (!Number.isSafeInteger(id) || id <= 0) {
    res.status(400).json({
      message: "ID de tipo de demanda inválido.",
    });
    return;
  }

  if (typeof nome !== "string" || !nome.trim()) {
    res.status(400).json({
      message: "Informe o nome do tipo de demanda.",
    });
    return;
  }

  try {
    const duplicado = await pool.query(
      `
        SELECT id
        FROM tipos_demanda
        WHERE LOWER(nome) = LOWER($1)
          AND id <> $2
        LIMIT 1
      `,
      [nome.trim(), id],
    );

    if (duplicado.rowCount) {
      res.status(409).json({
        message: "Este tipo de demanda já está cadastrado.",
      });
      return;
    }

    const result = await pool.query(
      `
        UPDATE tipos_demanda
        SET
          nome = $1,
          atualizado_em = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING
          id::integer AS id,
          nome,
          ativo,
          criado_em AS "criadoEm",
          atualizado_em AS "atualizadoEm"
      `,
      [nome.trim(), id],
    );

    if (result.rowCount === 0) {
      res.status(404).json({
        message: "Tipo de demanda não encontrado.",
      });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    const dbError = error as { code?: string };

    if (dbError.code === "23505") {
      res.status(409).json({
        message: "Este tipo de demanda já está cadastrado.",
      });
      return;
    }

    console.error("Falha ao editar tipo de demanda:", error);

    res.status(500).json({
      message: "Não foi possível editar o tipo de demanda.",
    });
  }
});

// Ativar ou inativar tipo
app.patch("/api/tipos/:id/status", async (req, res) => {
  const id = Number(req.params.id);
  const { ativo } = req.body ?? {};

  if (!Number.isSafeInteger(id) || id <= 0) {
    res.status(400).json({
      message: "ID de tipo de demanda inválido.",
    });
    return;
  }

  if (typeof ativo !== "boolean") {
    res.status(400).json({
      message: "Informe se o tipo está ativo ou inativo.",
    });
    return;
  }

  try {
    const result = await pool.query(
      `
        UPDATE tipos_demanda
        SET
          ativo = $1,
          atualizado_em = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING
          id::integer AS id,
          nome,
          ativo,
          criado_em AS "criadoEm",
          atualizado_em AS "atualizadoEm"
      `,
      [ativo, id],
    );

    if (result.rowCount === 0) {
      res.status(404).json({
        message: "Tipo de demanda não encontrado.",
      });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Falha ao atualizar status do tipo:", error);

    res.status(500).json({
      message: "Não foi possível atualizar o status do tipo.",
    });
  }
});

// ============================================================
// DEMANDAS — PERSISTÊNCIA COMPLETA
// Inclui campos principais, comentários, anexos, pendências e histórico.
// Exige a migração SQL migracao_demandas_postgresql.sql.
// ============================================================

type RegistroJson = Record<string, unknown>;

function textoCampo(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim();
}

function numeroPositivoSeguro(valor: unknown): number | null {
  const numero = Number(valor);
  return Number.isSafeInteger(numero) && numero > 0 ? numero : null;
}

function timestampParaBanco(valor: unknown): string | null {
  const texto = textoCampo(valor);
  if (!texto) return null;

  const dataBR = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);
  if (dataBR) {
    const [, dia, mes, ano] = dataBR;
    const data = new Date(`${ano}-${mes}-${dia}T12:00:00.000Z`);
    return Number.isNaN(data.getTime()) ? null : data.toISOString();
  }

  const data = new Date(texto);
  return Number.isNaN(data.getTime()) ? null : data.toISOString();
}

function objetosJson(valor: unknown): RegistroJson[] {
  if (!Array.isArray(valor)) return [];
  return valor.filter(
    (item): item is RegistroJson =>
      typeof item === "object" && item !== null && !Array.isArray(item),
  );
}

// Os valores são mantidos idênticos aos apresentados pela interface.
const PRIORIDADES_ATENDIMENTO_OFICIAIS = new Set<string>([
  "P1 — Imediata",
  "P2 — Urgente",
  "P3 — Normal",
  "P4 — Planejada",
]);

// O histórico é a fonte de referência quando a cópia do campo principal
// chega defasada no PUT, mas o evento de alteração já está no mesmo payload.
function obterPrioridadeAtendimentoMaisRecente(historicoValor: unknown): string | null {
  const eventos = objetosJson(historicoValor)
    .filter((registro) => textoCampo(registro.tipo) === "prioridade_atendimento")
    .map((registro, indice) => {
      const prioridade = textoCampo(registro.valorNovo);
      const dataNormalizada = timestampParaBanco(registro.data);
      const instante = dataNormalizada ? Date.parse(dataNormalizada) : 0;
      const id = Number(registro.id);

      return {
        prioridade,
        instante: Number.isFinite(instante) ? instante : 0,
        id: Number.isFinite(id) ? id : 0,
        indice,
      };
    })
    .filter((evento) => PRIORIDADES_ATENDIMENTO_OFICIAIS.has(evento.prioridade))
    .sort((a, b) =>
      b.instante - a.instante || b.id - a.id || a.indice - b.indice,
    );

  return eventos[0]?.prioridade ?? null;
}

function erroValidacao(message: string) {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = 400;
  return error;
}

async function obterClienteIdPorNome(
  conexao: PoolClient,
  nome: string,
): Promise<number | null> {
  const resultado = await conexao.query(
    "SELECT id FROM clientes WHERE LOWER(BTRIM(nome)) = LOWER(BTRIM($1)) ORDER BY id LIMIT 1",
    [nome],
  );
  return resultado.rows.length ? Number(resultado.rows[0].id) : null;
}

async function obterSistemaIdPorNome(
  conexao: PoolClient,
  nome: string,
): Promise<number | null> {
  if (!nome) return null;
  const resultado = await conexao.query(
    "SELECT id FROM sistemas WHERE LOWER(BTRIM(nome)) = LOWER(BTRIM($1)) ORDER BY id LIMIT 1",
    [nome],
  );
  return resultado.rows.length ? Number(resultado.rows[0].id) : null;
}

async function obterTipoIdPorNome(
  conexao: PoolClient,
  nome: string,
): Promise<number | null> {
  const resultado = await conexao.query(
    "SELECT id FROM tipos_demanda WHERE LOWER(BTRIM(nome)) = LOWER(BTRIM($1)) ORDER BY id LIMIT 1",
    [nome],
  );
  return resultado.rows.length ? Number(resultado.rows[0].id) : null;
}

async function obterUsuarioIdPorNome(
  conexao: PoolClient,
  nome: string,
): Promise<number | null> {
  if (!nome) return null;
  const resultado = await conexao.query(
    "SELECT id FROM usuarios WHERE LOWER(BTRIM(nome)) = LOWER(BTRIM($1)) ORDER BY id LIMIT 1",
    [nome],
  );
  return resultado.rows.length ? Number(resultado.rows[0].id) : null;
}

async function gravarDemanda(
  conexao: PoolClient,
  id: number,
  demanda: RegistroJson,
): Promise<void> {
  const titulo = textoCampo(demanda.titulo);
  const descricao = textoCampo(demanda.descricao);
  const nomeCliente = textoCampo(demanda.cliente);
  const nomeSistema = textoCampo(demanda.sistema);
  const nomeTipo = textoCampo(demanda.tipo);
  const responsavel = textoCampo(demanda.responsavel);
  const criticidade =
    textoCampo(demanda.criticidade) || textoCampo(demanda.prioridade) || "Média";
  const prioridade = textoCampo(demanda.prioridade) || criticidade;
  const prioridadeAtendimentoInformada = textoCampo(demanda.prioridadeAtendimento);
  const prioridadeAtendimentoHistorica = obterPrioridadeAtendimentoMaisRecente(
    demanda.historico,
  );
  // Se o campo principal e o histórico divergirem, grava o último valor válido
  // registrado para Prioridade de Atendimento, evitando voltar ao valor antigo.
  const prioridadeAtendimento =
    prioridadeAtendimentoHistorica || prioridadeAtendimentoInformada || null;
  const prazo = textoCampo(demanda.prazo);
  const observacao = textoCampo(demanda.observacao);
  let status = textoCampo(demanda.status) || "Nova";

  if (status === "Em Processo" || status === "Em análise") status = "Em Atendimento";
  if (status === "Pendente") status = "Com Pendências";

  if (!titulo) throw erroValidacao(`A demanda ${id} está sem título.`);
  if (!descricao) throw erroValidacao(`A demanda ${id} está sem descrição.`);
  if (!nomeCliente) throw erroValidacao(`A demanda ${id} está sem cliente.`);
  if (!nomeTipo) throw erroValidacao(`A demanda ${id} está sem tipo de demanda.`);
  if (!prazo) throw erroValidacao(`A demanda ${id} está sem prazo.`);

  const clienteId = await obterClienteIdPorNome(conexao, nomeCliente);
  if (clienteId === null) {
    throw erroValidacao(
      `O cliente "${nomeCliente}" da demanda ${id} não existe no PostgreSQL.`,
    );
  }

  const tipoId = await obterTipoIdPorNome(conexao, nomeTipo);
  if (tipoId === null) {
    throw erroValidacao(
      `O tipo "${nomeTipo}" da demanda ${id} não existe no PostgreSQL.`,
    );
  }

  const sistemaId = await obterSistemaIdPorNome(conexao, nomeSistema);
  const responsavelId = await obterUsuarioIdPorNome(conexao, responsavel);
  const usuarioCriacao = textoCampo(demanda.usuarioCriacao);
  const usuarioConclusao = textoCampo(demanda.usuarioConclusao);
  const usuarioReabertura = textoCampo(demanda.usuarioReabertura);
  const usuarioCriacaoId = await obterUsuarioIdPorNome(conexao, usuarioCriacao);
  const usuarioConclusaoId = await obterUsuarioIdPorNome(conexao, usuarioConclusao);
  const usuarioReaberturaId = await obterUsuarioIdPorNome(conexao, usuarioReabertura);

  const dataAbertura = timestampParaBanco(demanda.dataAbertura);
  const dataConclusao = timestampParaBanco(demanda.dataConclusao);
  const dataReabertura = timestampParaBanco(demanda.dataReabertura);
  const diasInformados = Number(demanda.prazoDiasUteis);
  const prazoDiasUteis =
    Number.isSafeInteger(diasInformados) && diasInformados >= 0
      ? diasInformados
      : null;
  const prazoManual = demanda.prazoManual === true;

  await conexao.query(
    `
      INSERT INTO demandas (
        id, titulo, descricao, cliente_id, sistema_id, tipo_demanda_id,
        responsavel_id, responsavel_nome, criticidade, prioridade_atendimento,
        prioridade, prazo, observacao, status, data_abertura, data_conclusao,
        usuario_criacao_id, usuario_criacao_nome,
        usuario_conclusao_id, usuario_conclusao_nome,
        data_reabertura, usuario_reabertura_id, usuario_reabertura_nome,
        prazo_dias_uteis, prazo_manual, sistema_nome, atualizado_em
      )
      VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10,
        $11, $12, $13, $14, COALESCE($15::timestamptz, CURRENT_TIMESTAMP), $16::timestamptz,
        $17, $18, $19, $20,
        $21::timestamptz, $22, $23,
        $24, $25, $26, CURRENT_TIMESTAMP
      )
      ON CONFLICT (id) DO UPDATE SET
        titulo = EXCLUDED.titulo,
        descricao = EXCLUDED.descricao,
        cliente_id = EXCLUDED.cliente_id,
        sistema_id = EXCLUDED.sistema_id,
        tipo_demanda_id = EXCLUDED.tipo_demanda_id,
        responsavel_id = EXCLUDED.responsavel_id,
        responsavel_nome = EXCLUDED.responsavel_nome,
        criticidade = EXCLUDED.criticidade,
        prioridade_atendimento = EXCLUDED.prioridade_atendimento,
        prioridade = EXCLUDED.prioridade,
        prazo = EXCLUDED.prazo,
        observacao = EXCLUDED.observacao,
        status = EXCLUDED.status,
        data_abertura = EXCLUDED.data_abertura,
        data_conclusao = EXCLUDED.data_conclusao,
        usuario_criacao_id = EXCLUDED.usuario_criacao_id,
        usuario_criacao_nome = EXCLUDED.usuario_criacao_nome,
        usuario_conclusao_id = EXCLUDED.usuario_conclusao_id,
        usuario_conclusao_nome = EXCLUDED.usuario_conclusao_nome,
        data_reabertura = EXCLUDED.data_reabertura,
        usuario_reabertura_id = EXCLUDED.usuario_reabertura_id,
        usuario_reabertura_nome = EXCLUDED.usuario_reabertura_nome,
        prazo_dias_uteis = EXCLUDED.prazo_dias_uteis,
        prazo_manual = EXCLUDED.prazo_manual,
        sistema_nome = EXCLUDED.sistema_nome,
        atualizado_em = CURRENT_TIMESTAMP
    `,
    [
      id,
      titulo,
      descricao,
      clienteId,
      sistemaId,
      tipoId,
      responsavelId,
      responsavel,
      criticidade,
      prioridadeAtendimento,
      prioridade,
      prazo,
      observacao,
      status,
      dataAbertura,
      dataConclusao,
      usuarioCriacaoId,
      usuarioCriacao,
      usuarioConclusaoId,
      usuarioConclusao,
      dataReabertura,
      usuarioReaberturaId,
      usuarioReabertura,
      prazoDiasUteis,
      prazoManual,
      nomeSistema,
    ],
  );

  // A gravação é transacional: listas relacionadas são atualizadas junto com a demanda.
  await conexao.query("DELETE FROM comentarios WHERE demanda_id = $1", [id]);
  await conexao.query("DELETE FROM arquivos WHERE demanda_id = $1", [id]);
  await conexao.query("DELETE FROM periodos_pendencia WHERE demanda_id = $1", [id]);
  await conexao.query("DELETE FROM historico WHERE demanda_id = $1", [id]);

  for (const comentario of objetosJson(demanda.comentarios)) {
    const comentarioId = numeroPositivoSeguro(comentario.id);
    const texto = textoCampo(comentario.texto);
    if (!texto) continue;
    const usuarioNome = textoCampo(comentario.usuario) || "Usuário não identificado";
    const usuarioId = await obterUsuarioIdPorNome(conexao, usuarioNome);
    const data = timestampParaBanco(comentario.data);

    if (comentarioId !== null) {
      await conexao.query(
        `INSERT INTO comentarios (id, demanda_id, texto, usuario_id, usuario_nome, data)
         VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, CURRENT_TIMESTAMP))`,
        [comentarioId, id, texto, usuarioId, usuarioNome, data],
      );
    } else {
      await conexao.query(
        `INSERT INTO comentarios (demanda_id, texto, usuario_id, usuario_nome, data)
         VALUES ($1, $2, $3, $4, COALESCE($5::timestamptz, CURRENT_TIMESTAMP))`,
        [id, texto, usuarioId, usuarioNome, data],
      );
    }
  }

  for (const arquivo of objetosJson(demanda.arquivos)) {
    const arquivoId = numeroPositivoSeguro(arquivo.id);
    const nome = textoCampo(arquivo.nome) || "arquivo";
    const tamanhoInformado = Number(arquivo.tamanho);
    const tamanho =
      Number.isSafeInteger(tamanhoInformado) && tamanhoInformado >= 0
        ? tamanhoInformado
        : 0;
    const usuarioNome = textoCampo(arquivo.usuario) || "Usuário não identificado";
    const usuarioId = await obterUsuarioIdPorNome(conexao, usuarioNome);
    const data = timestampParaBanco(arquivo.data);
    const url = typeof arquivo.url === "string" ? arquivo.url : "";

    if (arquivoId !== null) {
      await conexao.query(
        `INSERT INTO arquivos (id, demanda_id, nome, tamanho, data, usuario_id, usuario_nome, url)
         VALUES ($1, $2, $3, $4, COALESCE($5::timestamptz, CURRENT_TIMESTAMP), $6, $7, $8)`,
        [arquivoId, id, nome, tamanho, data, usuarioId, usuarioNome, url],
      );
    } else {
      await conexao.query(
        `INSERT INTO arquivos (demanda_id, nome, tamanho, data, usuario_id, usuario_nome, url)
         VALUES ($1, $2, $3, COALESCE($4::timestamptz, CURRENT_TIMESTAMP), $5, $6, $7)`,
        [id, nome, tamanho, data, usuarioId, usuarioNome, url],
      );
    }
  }

  for (const periodo of objetosJson(demanda.periodosPendencia)) {
    const inicio = timestampParaBanco(periodo.inicio);
    if (!inicio) continue;
    const fim = timestampParaBanco(periodo.fim);
    const motivo = textoCampo(periodo.motivo) || "Pendência";
    await conexao.query(
      `INSERT INTO periodos_pendencia (demanda_id, inicio, fim, motivo)
       VALUES ($1, $2::timestamptz, $3::timestamptz, $4)`,
      [id, inicio, fim, motivo],
    );
  }

  for (const registro of objetosJson(demanda.historico)) {
    const registroId = numeroPositivoSeguro(registro.id);
    const tipo = textoCampo(registro.tipo) || "alteracao";
    const tituloHistorico = textoCampo(registro.titulo) || "Alteração registrada";
    const descricaoHistorico = textoCampo(registro.descricao) || tituloHistorico;
    const usuarioNome = textoCampo(registro.usuario) || "Usuário não identificado";
    const usuarioId = await obterUsuarioIdPorNome(conexao, usuarioNome);
    const data = timestampParaBanco(registro.data);
    const referenciaId = numeroPositivoSeguro(registro.referenciaId);
    const valorAnterior =
      registro.valorAnterior === undefined || registro.valorAnterior === null
        ? null
        : textoCampo(registro.valorAnterior);
    const valorNovo =
      registro.valorNovo === undefined || registro.valorNovo === null
        ? null
        : textoCampo(registro.valorNovo);
    const motivo =
      registro.motivo === undefined || registro.motivo === null
        ? null
        : textoCampo(registro.motivo);

    if (registroId !== null) {
      await conexao.query(
        `INSERT INTO historico (
           id, demanda_id, tipo, titulo, descricao, data, usuario_id, usuario_nome,
           referencia_id, valor_anterior, valor_novo, motivo
         )
         VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, CURRENT_TIMESTAMP), $7, $8, $9, $10, $11, $12)`,
        [
          registroId, id, tipo, tituloHistorico, descricaoHistorico, data,
          usuarioId, usuarioNome, referenciaId, valorAnterior, valorNovo, motivo,
        ],
      );
    } else {
      await conexao.query(
        `INSERT INTO historico (
           demanda_id, tipo, titulo, descricao, data, usuario_id, usuario_nome,
           referencia_id, valor_anterior, valor_novo, motivo
         )
         VALUES ($1, $2, $3, $4, COALESCE($5::timestamptz, CURRENT_TIMESTAMP), $6, $7, $8, $9, $10, $11)`,
        [
          id, tipo, tituloHistorico, descricaoHistorico, data,
          usuarioId, usuarioNome, referenciaId, valorAnterior, valorNovo, motivo,
        ],
      );
    }
  }
}

// Criar/atualizar uma demanda com todos os seus dados relacionados.
app.put("/api/demandas/:id", async (req, res) => {
  const id = numeroPositivoSeguro(req.params.id);
  if (id === null) {
    res.status(400).json({ message: "ID de demanda inválido." });
    return;
  }

  if (typeof req.body !== "object" || req.body === null || Array.isArray(req.body)) {
    res.status(400).json({ message: "Envie os dados da demanda em formato JSON." });
    return;
  }

  const body = req.body as RegistroJson;
  const idRecebido = body.id === undefined ? id : numeroPositivoSeguro(body.id);
  if (idRecebido === null || idRecebido !== id) {
    res.status(400).json({ message: "O ID da URL não corresponde ao ID da demanda." });
    return;
  }

  const conexao = await pool.connect();
  try {
    await conexao.query("BEGIN");
    await gravarDemanda(conexao, id, body);
    await conexao.query("COMMIT");
    res.json({ ok: true, id });
  } catch (error) {
    await conexao.query("ROLLBACK");
    console.error(`Falha ao salvar a demanda ${id}:`, error);
    const statusCode =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number((error as { statusCode?: unknown }).statusCode) || 500
        : 500;
    const detalheErro: {
      code?: unknown;
      detail?: unknown;
      constraint?: unknown;
      column?: unknown;
      table?: unknown;
    } = error && typeof error === "object"
      ? error as {
          code?: unknown;
          detail?: unknown;
          constraint?: unknown;
          column?: unknown;
          table?: unknown;
        }
      : {};
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível salvar a demanda.";
    // Devolve detalhes úteis do PostgreSQL para facilitar o diagnóstico local.
    // O frontend usa esses campos para mostrar a causa real, em vez de um alerta genérico.
    res.status(statusCode).json({
      message,
      code: typeof detalheErro.code === "string" ? detalheErro.code : undefined,
      detail: typeof detalheErro.detail === "string" ? detalheErro.detail : undefined,
      constraint: typeof detalheErro.constraint === "string" ? detalheErro.constraint : undefined,
      column: typeof detalheErro.column === "string" ? detalheErro.column : undefined,
      table: typeof detalheErro.table === "string" ? detalheErro.table : undefined,
    });
  } finally {
    conexao.release();
  }
});

// Excluir uma demanda e os respectivos dados dependentes em uma transação.
app.delete("/api/demandas/:id", async (req, res) => {
  const id = numeroPositivoSeguro(req.params.id);
  if (id === null) {
    res.status(400).json({ message: "ID de demanda inválido." });
    return;
  }

  const conexao = await pool.connect();
  try {
    await conexao.query("BEGIN");
    await conexao.query("DELETE FROM comentarios WHERE demanda_id = $1", [id]);
    await conexao.query("DELETE FROM arquivos WHERE demanda_id = $1", [id]);
    await conexao.query("DELETE FROM periodos_pendencia WHERE demanda_id = $1", [id]);
    await conexao.query("DELETE FROM historico WHERE demanda_id = $1", [id]);
    const resultado = await conexao.query("DELETE FROM demandas WHERE id = $1", [id]);
    await conexao.query("COMMIT");

    if (resultado.rowCount === 0) {
      res.status(404).json({ message: "Demanda não encontrada." });
      return;
    }

    res.json({ ok: true, id });
  } catch (error) {
    await conexao.query("ROLLBACK");
    console.error(`Falha ao excluir a demanda ${id}:`, error);
    res.status(500).json({ message: "Não foi possível excluir a demanda." });
  } finally {
    conexao.release();
  }
});

// ============================================================
// DEMANDAS — MANTER CONSULTA EXISTENTE
// ============================================================

app.get("/api/demandas", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        d.id,
        d.titulo,
        d.descricao,
        c.nome AS cliente,
        COALESCE(s.nome, NULLIF(d.sistema_nome, ''), '') AS sistema,
        td.nome AS tipo,
        COALESCE(NULLIF(d.responsavel_nome, ''), u.nome, '') AS responsavel,
        d.criticidade,
        d.prioridade_atendimento AS "prioridadeAtendimento",
        d.prioridade,
        d.prazo,
        d.observacao,
        d.status,
        d.data_abertura AS "dataAbertura",
        d.data_conclusao AS "dataConclusao",
        COALESCE(NULLIF(d.usuario_criacao_nome, ''), uc.nome) AS "usuarioCriacao",
        COALESCE(NULLIF(d.usuario_conclusao_nome, ''), ucon.nome) AS "usuarioConclusao",
        d.data_reabertura AS "dataReabertura",
        COALESCE(NULLIF(d.usuario_reabertura_nome, ''), ur.nome) AS "usuarioReabertura",
        d.prazo_dias_uteis AS "prazoDiasUteis",
        d.prazo_manual AS "prazoManual",

        COALESCE((
          SELECT json_agg(
            json_build_object(
              'inicio', p.inicio,
              'fim', p.fim,
              'motivo', p.motivo
            ) ORDER BY p.inicio
          )
          FROM periodos_pendencia p
          WHERE p.demanda_id = d.id
        ), '[]'::json) AS "periodosPendencia",

        COALESCE((
          SELECT json_agg(
            json_build_object(
              'id', cm.id,
              'texto', cm.texto,
              'usuario', cm.usuario_nome,
              'data', cm.data
            ) ORDER BY cm.data
          )
          FROM comentarios cm
          WHERE cm.demanda_id = d.id
        ), '[]'::json) AS comentarios,

        COALESCE((
          SELECT json_agg(
            json_build_object(
              'id', ar.id,
              'nome', ar.nome,
              'tamanho', ar.tamanho,
              'data', ar.data,
              'usuario', ar.usuario_nome,
              'url', ar.url
            ) ORDER BY ar.data
          )
          FROM arquivos ar
          WHERE ar.demanda_id = d.id
        ), '[]'::json) AS arquivos,

        COALESCE((
          SELECT json_agg(
            json_build_object(
              'id', h.id,
              'tipo', h.tipo,
              'titulo', h.titulo,
              'descricao', h.descricao,
              'data', h.data,
              'usuario', h.usuario_nome,
              'referenciaId', h.referencia_id,
              'valorAnterior', h.valor_anterior,
              'valorNovo', h.valor_novo,
              'motivo', h.motivo
            ) ORDER BY h.data
          )
          FROM historico h
          WHERE h.demanda_id = d.id
        ), '[]'::json) AS historico

      FROM demandas d
      LEFT JOIN clientes c ON c.id = d.cliente_id
      LEFT JOIN sistemas s ON s.id = d.sistema_id
      LEFT JOIN tipos_demanda td ON td.id = d.tipo_demanda_id
      LEFT JOIN usuarios u ON u.id = d.responsavel_id
      LEFT JOIN usuarios uc ON uc.id = d.usuario_criacao_id
      LEFT JOIN usuarios ucon ON ucon.id = d.usuario_conclusao_id
      LEFT JOIN usuarios ur ON ur.id = d.usuario_reabertura_id
      ORDER BY d.id DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Falha ao consultar demandas:", error);

    res.status(500).json({
      message: "Não foi possível consultar as demandas.",
    });
  }
});

// Rotas adicionais do backend: feriados, notificações e auditoria.
app.use("/api", criarRotasFeriados(pool));
app.use("/api", criarRotasOperacionais(pool));

// ============================================================
// INICIAR SERVIDOR
// ============================================================

async function reconciliarPrioridadesAtendimentoNoBanco(): Promise<void> {
  const prioridades = [...PRIORIDADES_ATENDIMENTO_OFICIAIS];
  const resultado = await pool.query(
    `
      WITH ultima_prioridade AS (
        SELECT DISTINCT ON (h.demanda_id)
          h.demanda_id,
          BTRIM(h.valor_novo) AS valor_novo
        FROM historico h
        WHERE h.tipo = 'prioridade_atendimento'
          AND BTRIM(COALESCE(h.valor_novo, '')) = ANY($1::text[])
        ORDER BY h.demanda_id, h.data DESC, h.id DESC
      )
      UPDATE demandas d
      SET
        prioridade_atendimento = u.valor_novo,
        atualizado_em = CURRENT_TIMESTAMP
      FROM ultima_prioridade u
      WHERE d.id = u.demanda_id
        AND d.prioridade_atendimento IS DISTINCT FROM u.valor_novo
      RETURNING d.id
    `,
    [prioridades],
  );

  const quantidadeCorrigida = resultado.rowCount ?? 0;
  if (quantidadeCorrigida > 0) {
    console.log(
      `Prioridades de Atendimento reconciliadas com o histórico: ${quantidadeCorrigida} demanda(s).`,
    );
  }
}

async function prepararPerfisUsuariosNoBanco(): Promise<void> {
  // Diretor(a) é único no sistema e não possui Gerência/Divisão específica.
  await pool.query(`
    ALTER TABLE usuarios
      ALTER COLUMN gerencia_sigla DROP NOT NULL,
      ALTER COLUMN gerencia_nome DROP NOT NULL,
      ALTER COLUMN divisao_nome DROP NOT NULL
  `);

  // Atualiza o conjunto permitido de perfis sem depender do nome fixo de uma constraint antiga.
  await pool.query(`
    DO $$
    DECLARE
      c RECORD;
    BEGIN
      FOR c IN
        SELECT conname
          FROM pg_constraint
         WHERE conrelid = 'usuarios'::regclass
           AND contype = 'c'
           AND pg_get_constraintdef(oid) ILIKE '%perfil%'
      LOOP
        EXECUTE format('ALTER TABLE usuarios DROP CONSTRAINT %I', c.conname);
      END LOOP;
    END $$;
  `);

  await pool.query(`
    ALTER TABLE usuarios
      ADD CONSTRAINT usuarios_perfil_check
      CHECK (perfil IN ('Gestor/Administrador', 'Diretor (a)', 'Analista', 'Desenvolvedor', 'Estagiário'))
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS ux_usuarios_unico_diretor
      ON usuarios (perfil)
      WHERE perfil = 'Diretor (a)'
  `);
}

async function iniciarServidor(): Promise<void> {
  await prepararPerfisUsuariosNoBanco();

  // Tabela de sessões aditiva. Tokens são armazenados como hash, nunca em texto puro.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessoes_autenticacao (
      id_hash TEXT PRIMARY KEY,
      usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      csrf_hash TEXT NOT NULL,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expira_em TIMESTAMPTZ NOT NULL
    )
  `);
  await pool.query("CREATE INDEX IF NOT EXISTS idx_sessoes_autenticacao_expira_em ON sessoes_autenticacao (expira_em)");
  await pool.query("DELETE FROM sessoes_autenticacao WHERE expira_em <= CURRENT_TIMESTAMP");

  // Migração aditiva: mantém todos os usuários existentes e registra se
  // a senha inicial ainda precisa ser trocada no primeiro acesso.
  await pool.query(
    "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS exigir_troca_senha BOOLEAN NOT NULL DEFAULT FALSE",
  );

  // Corrige divergências existentes, usando o último evento válido do histórico.
  // Se o banco estiver temporariamente indisponível, o backend ainda inicia e
  // continua informando a falha pelo endpoint /api/health.
  try {
    await reconciliarPrioridadesAtendimentoNoBanco();
  } catch (error) {
    console.error(
      "Não foi possível reconciliar as Prioridades de Atendimento com o histórico:",
      error,
    );
  }

  app.listen(port, () => {
    console.log(`SGD backend running at http://localhost:${port}`);
  });
}

void iniciarServidor();
