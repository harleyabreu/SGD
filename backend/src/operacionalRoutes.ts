
import { Router, type Response } from "express";
import type { Pool } from "pg";

type UsuarioAutenticado = {
  id?: number;
  nome?: string;
  perfil?: string;
};

type NotificacaoEntrada = {
  id?: unknown;
  tipo?: unknown;
  titulo?: unknown;
  descricao?: unknown;
  data?: unknown;
  demandaId?: unknown;
  prioridade?: unknown;
  lida?: unknown;
};

type RegistroAuditoriaEntrada = {
  id?: unknown;
  entidade?: unknown;
  entidadeId?: unknown;
  acao?: unknown;
  descricao?: unknown;
  data?: unknown;
  valorAnterior?: unknown;
  valorNovo?: unknown;
  motivo?: unknown;
};

const ENTIDADES_AUDITAVEIS = new Set([
  "demanda",
  "usuario",
  "cliente",
  "sistema",
  "tipo",
  "feriado",
  "sessao",
]);

const MAX_NOTIFICACOES_POR_ENVIO = 5000;
const MAX_TEXTO_AUDITORIA = 10000;

function obterUsuarioAutenticado(res: Response): UsuarioAutenticado | null {
  const usuario = res.locals.sgdAuth as UsuarioAutenticado | undefined;
  const id = Number(usuario?.id);

  if (!usuario || !Number.isSafeInteger(id) || id <= 0) {
    res.status(401).json({
      message: "Sessão de usuário inválida ou expirada.",
    });
    return null;
  }

  return { ...usuario, id };
}

function converterData(valor: unknown): Date | null {
  if (valor === undefined || valor === null || valor === "") {
    return new Date();
  }

  if (typeof valor !== "string" && !(valor instanceof Date)) {
    return null;
  }

  const data = valor instanceof Date ? valor : new Date(valor);

  return Number.isNaN(data.getTime()) ? null : data;
}

function textoOpcional(valor: unknown, limite: number): string | null {
  if (valor === undefined || valor === null || valor === "") {
    return null;
  }

  if (typeof valor !== "string") {
    return null;
  }

  const texto = valor.trim();

  return texto ? texto.slice(0, limite) : null;
}

function notificacaoValida(valor: NotificacaoEntrada) {
  const id = typeof valor.id === "string" ? valor.id.trim() : "";
  const tipo = typeof valor.tipo === "string" ? valor.tipo.trim() : "";
  const titulo = typeof valor.titulo === "string" ? valor.titulo.trim() : "";
  const descricao = typeof valor.descricao === "string" ? valor.descricao.trim() : "";

  const data = converterData(valor.data);
  const lida = valor.lida === undefined ? false : valor.lida;

  const demandaId =
    valor.demandaId === undefined ||
    valor.demandaId === null ||
    valor.demandaId === ""
      ? null
      : Number(valor.demandaId);

  const prioridade = textoOpcional(valor.prioridade, 100);

  if (!id || id.length > 120) return null;
  if (!tipo || tipo.length > 40) return null;
  if (!titulo || titulo.length > 200) return null;
  if (!descricao || descricao.length > 5000) return null;
  if (!data) return null;
  if (typeof lida !== "boolean") return null;

  if (
    demandaId !== null &&
    (!Number.isSafeInteger(demandaId) || demandaId <= 0)
  ) {
    return null;
  }

  if (
    valor.prioridade !== undefined &&
    valor.prioridade !== null &&
    valor.prioridade !== "" &&
    prioridade === null
  ) {
    return null;
  }

  return {
    id,
    tipo,
    titulo,
    descricao,
    data,
    demandaId,
    prioridade,
    lida,
  };
}

function registroAuditoriaValido(valor: RegistroAuditoriaEntrada) {
  const id = Number(valor.id);

  const entidade =
    typeof valor.entidade === "string" ? valor.entidade.trim() : "";

  const acao =
    typeof valor.acao === "string" ? valor.acao.trim() : "";

  const descricao =
    typeof valor.descricao === "string" ? valor.descricao.trim() : "";

  const data = converterData(valor.data);

  const entidadeId =
    valor.entidadeId === undefined ||
    valor.entidadeId === null ||
    valor.entidadeId === ""
      ? null
      : Number(valor.entidadeId);

  if (!Number.isSafeInteger(id) || id <= 0) return null;
  if (!ENTIDADES_AUDITAVEIS.has(entidade)) return null;

  if (
    entidadeId !== null &&
    (!Number.isSafeInteger(entidadeId) || entidadeId <= 0)
  ) {
    return null;
  }

  if (!acao || acao.length > 100) return null;
  if (!descricao || descricao.length > MAX_TEXTO_AUDITORIA) return null;
  if (!data) return null;

  const valorAnterior = textoOpcional(
    valor.valorAnterior,
    MAX_TEXTO_AUDITORIA,
  );

  const valorNovo = textoOpcional(
    valor.valorNovo,
    MAX_TEXTO_AUDITORIA,
  );

  const motivo = textoOpcional(
    valor.motivo,
    MAX_TEXTO_AUDITORIA,
  );

  if (
    valor.valorAnterior !== undefined &&
    valor.valorAnterior !== null &&
    valor.valorAnterior !== "" &&
    valorAnterior === null
  ) return null;

  if (
    valor.valorNovo !== undefined &&
    valor.valorNovo !== null &&
    valor.valorNovo !== "" &&
    valorNovo === null
  ) return null;

  if (
    valor.motivo !== undefined &&
    valor.motivo !== null &&
    valor.motivo !== "" &&
    motivo === null
  ) return null;

  return {
    id,
    entidade,
    entidadeId,
    acao,
    descricao,
    data,
    valorAnterior,
    valorNovo,
    motivo,
  };
}

async function listarNotificacoes(pool: Pool, usuarioId: number) {
  const resultado = await pool.query(
    `SELECT
       id,
       tipo,
       titulo,
       descricao,
       data,
       demanda_id AS "demandaId",
       prioridade,
       lida
     FROM notificacoes_usuario
     WHERE usuario_id = $1
     ORDER BY data DESC, id DESC
     LIMIT 5000`,
    [usuarioId],
  );

  return resultado.rows.map((row) => ({
    id: String(row.id),
    tipo: String(row.tipo),
    titulo: String(row.titulo),
    descricao: String(row.descricao),

    data:
      row.data instanceof Date
        ? row.data.toISOString()
        : String(row.data),

    demandaId:
      row.demandaId === null || row.demandaId === undefined
        ? undefined
        : Number(row.demandaId),

    prioridade:
      row.prioridade === null || row.prioridade === undefined
        ? undefined
        : String(row.prioridade),

    lida: Boolean(row.lida),
  }));
}

export function criarRotasOperacionais(pool: Pool) {
  const router = Router();

  let notificacoesTabelaPronta: Promise<unknown> | null = null;
  let auditoriaTabelaPronta: Promise<unknown> | null = null;

  // ============================================================
  // TABELA DE NOTIFICAÇÕES
  // ============================================================

  router.use("/notificacoes", async (_req, res, next) => {
    try {
      if (!notificacoesTabelaPronta) {
        notificacoesTabelaPronta = pool.query(`
          CREATE TABLE IF NOT EXISTS notificacoes_usuario (
            usuario_id BIGINT NOT NULL
              REFERENCES usuarios(id) ON DELETE CASCADE,

            id TEXT NOT NULL,
            tipo VARCHAR(40) NOT NULL,
            titulo VARCHAR(200) NOT NULL,
            descricao TEXT NOT NULL,
            data TIMESTAMPTZ NOT NULL,
            demanda_id BIGINT,
            prioridade VARCHAR(100),
            lida BOOLEAN NOT NULL DEFAULT FALSE,

            criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

            PRIMARY KEY (usuario_id, id)
          )
        `).then(() =>
          pool.query(`
            CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario_data
            ON notificacoes_usuario (usuario_id, data DESC)
          `)
        );
      }

      await notificacoesTabelaPronta;

      return next();
    } catch (error) {
      notificacoesTabelaPronta = null;

      console.error(
        "Falha ao preparar a tabela de notificações:",
        error,
      );

      return res.status(503).json({
        message:
          "Não foi possível preparar a tabela de notificações no PostgreSQL.",
      });
    }
  });

  // ============================================================
  // CONSULTAR NOTIFICAÇÕES DO USUÁRIO AUTENTICADO
  // ============================================================

  router.get("/notificacoes", async (_req, res) => {
    const usuario = obterUsuarioAutenticado(res);

    if (!usuario) return;

    try {
      return res.json(
        await listarNotificacoes(pool, usuario.id!),
      );
    } catch (error) {
      console.error("Falha ao consultar notificações:", error);

      return res.status(500).json({
        message: "Não foi possível consultar as notificações.",
      });
    }
  });

  // ============================================================
  // GRAVAR / ATUALIZAR NOTIFICAÇÕES
  // ============================================================

  router.put("/notificacoes", async (req, res) => {
    const usuario = obterUsuarioAutenticado(res);

    if (!usuario) return;

    if (
      !Array.isArray(req.body) ||
      req.body.length > MAX_NOTIFICACOES_POR_ENVIO
    ) {
      return res.status(400).json({
        message: "Envie uma lista válida de até 5.000 notificações.",
      });
    }

    const porId = new Map<
      string,
      NonNullable<ReturnType<typeof notificacaoValida>>
    >();

    for (const item of req.body as NotificacaoEntrada[]) {
      const normalizada = notificacaoValida(item ?? {});

      if (!normalizada) {
        return res.status(400).json({
          message:
            "Existe uma notificação com dados inválidos. Nenhum registro foi gravado.",
        });
      }

      porId.set(normalizada.id, normalizada);
    }

    const itens = [...porId.values()].map((item) => ({
      id: item.id,
      tipo: item.tipo,
      titulo: item.titulo,
      descricao: item.descricao,
      data: item.data.toISOString(),
      demanda_id: item.demandaId,
      prioridade: item.prioridade,
      lida: item.lida,
    }));

    try {
      await pool.query(
        `INSERT INTO notificacoes_usuario (
           usuario_id,
           id,
           tipo,
           titulo,
           descricao,
           data,
           demanda_id,
           prioridade,
           lida
         )
         SELECT
           $1,
           item.id,
           item.tipo,
           item.titulo,
           item.descricao,
           item.data,
           item.demanda_id,
           item.prioridade,
           item.lida
         FROM jsonb_to_recordset($2::jsonb) AS item(
           id TEXT,
           tipo VARCHAR(40),
           titulo VARCHAR(200),
           descricao TEXT,
           data TIMESTAMPTZ,
           demanda_id BIGINT,
           prioridade VARCHAR(100),
           lida BOOLEAN
         )
         ON CONFLICT (usuario_id, id) DO UPDATE SET
           tipo = EXCLUDED.tipo,
           titulo = EXCLUDED.titulo,
           descricao = EXCLUDED.descricao,
           data = EXCLUDED.data,
           demanda_id = EXCLUDED.demanda_id,
           prioridade = EXCLUDED.prioridade,
           lida = EXCLUDED.lida,
           atualizado_em = CURRENT_TIMESTAMP`,
        [
          usuario.id,
          JSON.stringify(itens),
        ],
      );

      return res.json(
        await listarNotificacoes(pool, usuario.id!),
      );
    } catch (error) {
      console.error("Falha ao salvar notificações:", error);

      return res.status(500).json({
        message:
          "Não foi possível salvar as notificações no PostgreSQL.",
      });
    }
  });

  // ============================================================
  // TABELA DE AUDITORIA
  // ============================================================

  router.use("/auditoria", async (_req, res, next) => {
    try {
      if (!auditoriaTabelaPronta) {
        auditoriaTabelaPronta = pool.query(`
          CREATE TABLE IF NOT EXISTS auditoria_registros (
            usuario_id BIGINT NOT NULL
              REFERENCES usuarios(id) ON DELETE RESTRICT,

            id BIGINT NOT NULL,

            entidade VARCHAR(30) NOT NULL CHECK (
              entidade IN (
                'demanda',
                'usuario',
                'cliente',
                'sistema',
                'tipo',
                'feriado',
                'sessao'
              )
            ),

            entidade_id BIGINT,
            acao VARCHAR(100) NOT NULL,
            descricao TEXT NOT NULL,
            usuario_nome TEXT NOT NULL,
            data TIMESTAMPTZ NOT NULL,
            valor_anterior TEXT,
            valor_novo TEXT,
            motivo TEXT,

            criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

            PRIMARY KEY (usuario_id, id)
          )
        `).then(() =>
          pool.query(`
            CREATE INDEX IF NOT EXISTS idx_auditoria_registros_data
            ON auditoria_registros (data DESC, id DESC)
          `)
        );
      }

      await auditoriaTabelaPronta;

      return next();
    } catch (error) {
      auditoriaTabelaPronta = null;

      console.error("Falha ao preparar a tabela de auditoria:", error);

      return res.status(503).json({
        message:
          "Não foi possível preparar a tabela de auditoria no PostgreSQL.",
      });
    }
  });

  // ============================================================
  // REGISTRAR AUDITORIA
  // SOMENTE INCLUSÃO. NÃO EXISTEM ROTAS DE EDIÇÃO OU EXCLUSÃO.
  // ============================================================

  router.post("/auditoria", async (req, res) => {
    const usuario = obterUsuarioAutenticado(res);

    if (!usuario) return;

    const entrada = registroAuditoriaValido(
      (req.body ?? {}) as RegistroAuditoriaEntrada,
    );

    if (!entrada) {
      return res.status(400).json({
        message:
          "O registro de auditoria enviado possui dados inválidos.",
      });
    }

    try {
      const resultado = await pool.query(
        `INSERT INTO auditoria_registros (
           usuario_id,
           id,
           entidade,
           entidade_id,
           acao,
           descricao,
           usuario_nome,
           data,
           valor_anterior,
           valor_novo,
           motivo
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (usuario_id, id) DO NOTHING
         RETURNING id`,
        [
          usuario.id,
          entrada.id,
          entrada.entidade,
          entrada.entidadeId,
          entrada.acao,
          entrada.descricao,
          String(usuario.nome ?? "Usuário autenticado"),
          entrada.data,
          entrada.valorAnterior,
          entrada.valorNovo,
          entrada.motivo,
        ],
      );

      return res.status(resultado.rowCount ? 201 : 200).json({
        ok: true,
        id: entrada.id,
        gravado: Boolean(resultado.rowCount),
      });
    } catch (error) {
      console.error(
        "Falha ao gravar registro de auditoria:",
        error,
      );

      return res.status(500).json({
        message:
          "Não foi possível gravar o registro de auditoria no PostgreSQL.",
      });
    }
  });

  // ============================================================
  // CONSULTAR AUDITORIA COMPLETA
  // GESTOR E DIRETOR (ABRANGÊNCIA GLOBAL DA DDS)
  // ============================================================

  router.get("/auditoria", async (_req, res) => {
    const usuario = obterUsuarioAutenticado(res);

    if (!usuario) return;

    const perfil = String(usuario.perfil ?? "")
      .trim()
      .toLowerCase();

    const podeConsultarAuditoria =
      perfil === "gestor/administrador" || perfil === "diretor (a)";

    if (!podeConsultarAuditoria) {
      return res.status(403).json({
        message:
          "Somente os perfis Gestor e Diretor (a) podem consultar a auditoria completa.",
      });
    }

    try {
      const resultado = await pool.query(
        `SELECT
           id,
           entidade,
           entidade_id AS "entidadeId",
           acao,
           descricao,
           usuario_nome AS usuario,
           data,
           valor_anterior AS "valorAnterior",
           valor_novo AS "valorNovo",
           motivo
         FROM auditoria_registros
         ORDER BY data DESC, id DESC
         LIMIT 5000`,
      );

      return res.json(
        resultado.rows.map((row) => ({
          ...row,
          id: Number(row.id),

          entidadeId:
            row.entidadeId === null ||
            row.entidadeId === undefined
              ? undefined
              : Number(row.entidadeId),

          data:
            row.data instanceof Date
              ? row.data.toISOString()
              : String(row.data),
        })),
      );
    } catch (error) {
      console.error("Falha ao consultar auditoria:", error);

      return res.status(500).json({
        message:
          "Não foi possível consultar a auditoria no PostgreSQL.",
      });
    }
  });

  return router;
}
