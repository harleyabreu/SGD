
import { Router, type Response } from "express";
import type { Pool } from "pg";
import { criarRotasOperacionais } from "./operacionalRoutes.js";

type FeriadoBanco = {
  id: number | string;
  data: string | Date;
  descricao: string;
  ativo: boolean;
  criado_em: string | Date;
  atualizado_em: string | Date;
};

type FeriadoEntrada = {
  data?: unknown;
  descricao?: unknown;
  ativo?: unknown;
};

type ConfiguracoesSistema = {
  sla: { critica: number; alta: number; media: number; baixa: number };
  slaPrioridade: { p1: number; p2: number; p3: number; p4: number };
  notificacoes: {
    atrasadas: boolean;
    proximoVencimento: boolean;
    atribuicao: boolean;
    conclusao: boolean;
    reabertura: boolean;
    cancelamento: boolean;
  };
  interface: { itensPorPagina: number; visualizacaoPadrao: "lista" | "kanban" };
};

type ObjetoJSON = Record<string, unknown>;

const CONFIGURACOES_PADRAO: ConfiguracoesSistema = {
  sla: { critica: 2, alta: 6, media: 10, baixa: 20 },
  slaPrioridade: { p1: 2, p2: 6, p3: 10, p4: 20 },
  notificacoes: {
    atrasadas: true,
    proximoVencimento: true,
    atribuicao: true,
    conclusao: true,
    reabertura: true,
    cancelamento: true,
  },
  interface: { itensPorPagina: 10, visualizacaoPadrao: "lista" },
};

function dataISOValida(valor: unknown): valor is string {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return false;
  }

  const [ano, mes, dia] = valor.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));

  return (
    data.getUTCFullYear() === ano &&
    data.getUTCMonth() === mes - 1 &&
    data.getUTCDate() === dia
  );
}

function feriadoPublico(row: FeriadoBanco) {
  const data =
    row.data instanceof Date
      ? row.data.toISOString().slice(0, 10)
      : String(row.data).slice(0, 10);

  return {
    id: Number(row.id),
    data,
    descricao: row.descricao,
    ativo: Boolean(row.ativo),
    criadoEm:
      row.criado_em instanceof Date
        ? row.criado_em.toISOString()
        : String(row.criado_em),
    atualizadoEm:
      row.atualizado_em instanceof Date
        ? row.atualizado_em.toISOString()
        : String(row.atualizado_em),
  };
}

const SELECT_FERIADOS = `
  SELECT
    id,
    data,
    descricao,
    ativo,
    criado_em,
    atualizado_em
  FROM feriados
`;

function exigirGestor(res: Response): boolean {
  const autenticacao = res.locals.sgdAuth as
    | { perfil?: string }
    | undefined;

  if (
    String(autenticacao?.perfil ?? "")
      .trim()
      .toLowerCase() !== "gestor/administrador"
  ) {
    res.status(403).json({
      message: "Somente o perfil Gestor pode cadastrar ou alterar feriados.",
    });
    return false;
  }

  return true;
}

function ehObjetoJSON(valor: unknown): valor is ObjetoJSON {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function lerObjeto(valor: unknown, nome: string): ObjetoJSON {
  if (valor === undefined) return {};

  if (!ehObjetoJSON(valor)) {
    throw new Error(`A seção "${nome}" possui formato inválido.`);
  }

  return valor;
}

function lerPrazo(
  objeto: ObjetoJSON,
  campo: string,
  padrao: number,
  secao: string,
): number {
  const valor = objeto[campo];

  if (valor === undefined) return padrao;

  const numero = Number(valor);

  if (!Number.isSafeInteger(numero) || numero < 1 || numero > 365) {
    throw new Error(
      `O prazo "${campo}" em "${secao}" deve ser um número inteiro entre 1 e 365 dias úteis.`,
    );
  }

  return numero;
}

function lerBooleano(objeto: ObjetoJSON, campo: string, padrao: boolean): boolean {
  const valor = objeto[campo];

  if (valor === undefined) return padrao;

  if (typeof valor !== "boolean") {
    throw new Error(`A opção de notificação "${campo}" deve ser verdadeira ou falsa.`);
  }

  return valor;
}

function normalizarConfiguracoes(entrada: unknown): ConfiguracoesSistema {
  if (!ehObjetoJSON(entrada)) {
    throw new Error("Envie um objeto válido com as configurações do sistema.");
  }

  const sla = lerObjeto(entrada.sla, "sla");
  const slaPrioridade = lerObjeto(entrada.slaPrioridade, "slaPrioridade");
  const notificacoes = lerObjeto(entrada.notificacoes, "notificacoes");
  const interfaceConfig = lerObjeto(entrada.interface, "interface");

  const itensPorPaginaEntrada = interfaceConfig.itensPorPagina;

  const itensPorPagina = itensPorPaginaEntrada === undefined
    ? CONFIGURACOES_PADRAO.interface.itensPorPagina
    : Number(itensPorPaginaEntrada);

  if (![10, 20, 30, 50].includes(itensPorPagina)) {
    throw new Error("A quantidade de itens por página deve ser 10, 20, 30 ou 50.");
  }

  const visualizacaoPadrao = interfaceConfig.visualizacaoPadrao === undefined
    ? CONFIGURACOES_PADRAO.interface.visualizacaoPadrao
    : interfaceConfig.visualizacaoPadrao;

  if (visualizacaoPadrao !== "lista" && visualizacaoPadrao !== "kanban") {
    throw new Error("A visualização padrão deve ser lista ou kanban.");
  }

  return {
    sla: {
      critica: lerPrazo(sla, "critica", CONFIGURACOES_PADRAO.sla.critica, "sla"),
      alta: lerPrazo(sla, "alta", CONFIGURACOES_PADRAO.sla.alta, "sla"),
      media: lerPrazo(sla, "media", CONFIGURACOES_PADRAO.sla.media, "sla"),
      baixa: lerPrazo(sla, "baixa", CONFIGURACOES_PADRAO.sla.baixa, "sla"),
    },

    slaPrioridade: {
      p1: lerPrazo(slaPrioridade, "p1", CONFIGURACOES_PADRAO.slaPrioridade.p1, "slaPrioridade"),
      p2: lerPrazo(slaPrioridade, "p2", CONFIGURACOES_PADRAO.slaPrioridade.p2, "slaPrioridade"),
      p3: lerPrazo(slaPrioridade, "p3", CONFIGURACOES_PADRAO.slaPrioridade.p3, "slaPrioridade"),
      p4: lerPrazo(slaPrioridade, "p4", CONFIGURACOES_PADRAO.slaPrioridade.p4, "slaPrioridade"),
    },

    notificacoes: {
      atrasadas: lerBooleano(notificacoes, "atrasadas", CONFIGURACOES_PADRAO.notificacoes.atrasadas),
      proximoVencimento: lerBooleano(notificacoes, "proximoVencimento", CONFIGURACOES_PADRAO.notificacoes.proximoVencimento),
      atribuicao: lerBooleano(notificacoes, "atribuicao", CONFIGURACOES_PADRAO.notificacoes.atribuicao),
      conclusao: lerBooleano(notificacoes, "conclusao", CONFIGURACOES_PADRAO.notificacoes.conclusao),
      reabertura: lerBooleano(notificacoes, "reabertura", CONFIGURACOES_PADRAO.notificacoes.reabertura),
      cancelamento: lerBooleano(notificacoes, "cancelamento", CONFIGURACOES_PADRAO.notificacoes.cancelamento),
    },

    interface: {
      itensPorPagina,
      visualizacaoPadrao,
    },
  };
}

export function criarRotasFeriados(pool: Pool) {
  const router = Router();

  // Rotas de notificações e auditoria, integradas ao mesmo ponto de montagem
  // já utilizado pelo servidor para feriados e configurações.
  router.use(criarRotasOperacionais(pool));

  // A tabela é preparada na primeira chamada à API e aguardada antes
  // de qualquer consulta ou gravação de feriados.
  let tabelaPronta: Promise<unknown> | null = null;

  router.use(async (_req, res, next) => {
    try {
      if (!tabelaPronta) {
        tabelaPronta = pool.query(`
          CREATE TABLE IF NOT EXISTS feriados (
            id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
            data DATE NOT NULL UNIQUE,
            descricao VARCHAR(120) NOT NULL,
            ativo BOOLEAN NOT NULL DEFAULT TRUE,
            criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `);
      }

      await tabelaPronta;
      return next();
    } catch (error) {
      tabelaPronta = null;

      console.error("Falha ao preparar a tabela de feriados:", error);

      return res.status(503).json({
        message: "Não foi possível preparar a tabela de feriados no PostgreSQL.",
      });
    }
  });

  // Consultar feriados. Qualquer usuário autenticado pode consultar.
  router.get("/feriados", async (_req, res) => {
    try {
      const resultado = await pool.query(
        `${SELECT_FERIADOS} ORDER BY data, id`,
      );

      return res.json(
        resultado.rows.map((row) => feriadoPublico(row as FeriadoBanco)),
      );
    } catch (error) {
      console.error("Falha ao consultar feriados:", error);

      return res.status(500).json({
        message: "Não foi possível consultar os feriados.",
      });
    }
  });

  // Importação única dos feriados que estavam no localStorage.
  router.post("/feriados/migrar", async (req, res) => {
    if (!exigirGestor(res)) return;

    const itens = req.body;

    if (!Array.isArray(itens) || itens.length === 0 || itens.length > 5000) {
      return res.status(400).json({
        message: "Não há feriados válidos para migrar.",
      });
    }

    const normalizados: Array<{
      data: string;
      descricao: string;
      ativo: boolean;
    }> = [];

    const datasRecebidas = new Set<string>();

    for (const item of itens as FeriadoEntrada[]) {
      const data =
        typeof item?.data === "string"
          ? item.data.slice(0, 10)
          : "";

      const descricao =
        typeof item?.descricao === "string"
          ? item.descricao.trim()
          : "";

      const ativo = item?.ativo !== false;

      if (!dataISOValida(data) || !descricao || descricao.length > 120) {
        return res.status(400).json({
          message: "Existe um feriado antigo com data ou descrição inválida. Revise os dados antes da migração.",
        });
      }

      if (datasRecebidas.has(data)) continue;

      datasRecebidas.add(data);
      normalizados.push({ data, descricao, ativo });
    }

    const conexao = await pool.connect();

    try {
      await conexao.query("BEGIN");
      await conexao.query("LOCK TABLE feriados IN EXCLUSIVE MODE");

      const existentes = await conexao.query(
        "SELECT COUNT(*)::integer AS total FROM feriados",
      );

      if (Number(existentes.rows[0].total) > 0) {
        const atuais = await conexao.query(
          `${SELECT_FERIADOS} ORDER BY data, id`,
        );

        await conexao.query("COMMIT");

        return res.json({
          migrado: false,
          feriados: atuais.rows.map((row) => feriadoPublico(row as FeriadoBanco)),
        });
      }

      for (const item of normalizados) {
        await conexao.query(
          `INSERT INTO feriados (data, descricao, ativo)
           VALUES ($1::date, $2, $3)
           ON CONFLICT (data) DO NOTHING`,
          [item.data, item.descricao, item.ativo],
        );
      }

      const resultado = await conexao.query(
        `${SELECT_FERIADOS} ORDER BY data, id`,
      );

      await conexao.query("COMMIT");

      return res.json({
        migrado: true,
        feriados: resultado.rows.map((row) => feriadoPublico(row as FeriadoBanco)),
      });
    } catch (error) {
      await conexao.query("ROLLBACK");

      console.error("Falha ao migrar feriados antigos:", error);

      return res.status(500).json({
        message: "Não foi possível migrar os feriados antigos para o PostgreSQL.",
      });
    } finally {
      conexao.release();
    }
  });

  // Cadastrar feriado. Datas anteriores ao dia atual não são aceitas.
  router.post("/feriados", async (req, res) => {
    if (!exigirGestor(res)) return;

    const body = (req.body ?? {}) as FeriadoEntrada;

    const data = typeof body.data === "string" ? body.data.trim() : "";

    const descricao =
      typeof body.descricao === "string"
        ? body.descricao.trim()
        : "";

    const ativo = body.ativo === undefined ? true : body.ativo;

    if (!dataISOValida(data)) {
      return res.status(400).json({
        message: "Informe uma data válida no formato AAAA-MM-DD.",
      });
    }

    if (!descricao || descricao.length > 120) {
      return res.status(400).json({
        message: "Informe uma descrição de até 120 caracteres.",
      });
    }

    if (typeof ativo !== "boolean") {
      return res.status(400).json({
        message: "O status do feriado é inválido.",
      });
    }

    try {
      const dataPermitida = await pool.query(
        "SELECT $1::date >= CURRENT_DATE AS permitida",
        [data],
      );

      if (!dataPermitida.rows[0]?.permitida) {
        return res.status(400).json({
          message: "Não é permitido cadastrar feriados com datas passadas.",
        });
      }

      const resultado = await pool.query(
        `INSERT INTO feriados (data, descricao, ativo)
         VALUES ($1::date, $2, $3)
         RETURNING id, data, descricao, ativo, criado_em, atualizado_em`,
        [data, descricao, ativo],
      );

      return res.status(201).json(
        feriadoPublico(resultado.rows[0] as FeriadoBanco),
      );
    } catch (error) {
      const dbError = error as { code?: string };

      if (dbError.code === "23505") {
        return res.status(409).json({
          message: "Já existe um feriado cadastrado para esta data.",
        });
      }

      console.error("Falha ao cadastrar feriado:", error);

      return res.status(500).json({
        message: "Não foi possível cadastrar o feriado.",
      });
    }
  });

  // Editar feriado. Um registro histórico pode ter sua descrição atualizada,
  // mas sua data não pode ser alterada para outra data passada.
  router.put("/feriados/:id", async (req, res) => {
    if (!exigirGestor(res)) return;

    const id = Number(req.params.id);

    const body = (req.body ?? {}) as FeriadoEntrada;

    const data = typeof body.data === "string" ? body.data.trim() : "";

    const descricao =
      typeof body.descricao === "string"
        ? body.descricao.trim()
        : "";

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "ID de feriado inválido.",
      });
    }

    if (!dataISOValida(data)) {
      return res.status(400).json({
        message: "Informe uma data válida no formato AAAA-MM-DD.",
      });
    }

    if (!descricao || descricao.length > 120) {
      return res.status(400).json({
        message: "Informe uma descrição de até 120 caracteres.",
      });
    }

    try {
      const resultado = await pool.query(
        `UPDATE feriados
            SET data = $1::date,
                descricao = $2,
                atualizado_em = CURRENT_TIMESTAMP
          WHERE id = $3
            AND (data = $1::date OR $1::date >= CURRENT_DATE)
          RETURNING id, data, descricao, ativo, criado_em, atualizado_em`,
        [data, descricao, id],
      );

      if (resultado.rowCount === 0) {
        const existente = await pool.query(
          "SELECT id FROM feriados WHERE id = $1",
          [id],
        );

        if (existente.rowCount === 0) {
          return res.status(404).json({
            message: "Feriado não encontrado.",
          });
        }

        return res.status(400).json({
          message: "Não é permitido alterar a data de um feriado para uma data passada.",
        });
      }

      return res.json(
        feriadoPublico(resultado.rows[0] as FeriadoBanco),
      );
    } catch (error) {
      const dbError = error as { code?: string };

      if (dbError.code === "23505") {
        return res.status(409).json({
          message: "Já existe um feriado cadastrado para esta data.",
        });
      }

      console.error("Falha ao editar feriado:", error);

      return res.status(500).json({
        message: "Não foi possível editar o feriado.",
      });
    }
  });

  // Ativar ou inativar feriado.
  router.patch("/feriados/:id/status", async (req, res) => {
    if (!exigirGestor(res)) return;

    const id = Number(req.params.id);
    const ativo = req.body?.ativo;

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "ID de feriado inválido.",
      });
    }

    if (typeof ativo !== "boolean") {
      return res.status(400).json({
        message: "Informe se o feriado está ativo ou inativo.",
      });
    }

    try {
      const resultado = await pool.query(
        `UPDATE feriados
            SET ativo = $1,
                atualizado_em = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING id, data, descricao, ativo, criado_em, atualizado_em`,
        [ativo, id],
      );

      if (resultado.rowCount === 0) {
        return res.status(404).json({
          message: "Feriado não encontrado.",
        });
      }

      return res.json(
        feriadoPublico(resultado.rows[0] as FeriadoBanco),
      );
    } catch (error) {
      console.error("Falha ao atualizar status do feriado:", error);

      return res.status(500).json({
        message: "Não foi possível atualizar o status do feriado.",
      });
    }
  });

  // ============================================================
  // CONFIGURAÇÕES GLOBAIS DE SLA E NOTIFICAÇÕES
  // ============================================================

  let tabelaConfiguracoesPronta: Promise<unknown> | null = null;

  router.use("/configuracoes", async (_req, res, next) => {
    try {
      if (!tabelaConfiguracoesPronta) {
        tabelaConfiguracoesPronta = pool.query(`
          CREATE TABLE IF NOT EXISTS configuracoes_sistema (
            id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
            dados JSONB NOT NULL CHECK (jsonb_typeof(dados) = 'object'),
            atualizado_por BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
            atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `);
      }

      await tabelaConfiguracoesPronta;

      return next();
    } catch (error) {
      tabelaConfiguracoesPronta = null;

      console.error("Falha ao preparar a tabela de configurações:", error);

      return res.status(503).json({
        message: "Não foi possível preparar a tabela de configurações no PostgreSQL.",
      });
    }
  });

  router.get("/configuracoes", async (_req, res) => {
    try {
      const resultado = await pool.query(
        "SELECT dados FROM configuracoes_sistema WHERE id = 1",
      );

      if (resultado.rowCount === 0) {
        return res.json(null);
      }

      return res.json(resultado.rows[0].dados);
    } catch (error) {
      console.error("Falha ao consultar configurações do SGD:", error);

      return res.status(500).json({
        message: "Não foi possível consultar as configurações do sistema.",
      });
    }
  });

  router.put("/configuracoes", async (req, res) => {
    const autenticacao = res.locals.sgdAuth as
      | { id?: number; perfil?: string }
      | undefined;

    if (
      !autenticacao ||
      String(autenticacao.perfil ?? "")
        .trim()
        .toLowerCase() !== "gestor/administrador"
    ) {
      return res.status(403).json({
        message: "Somente o perfil Gestor pode alterar as configurações do sistema.",
      });
    }

    const usuarioId = Number(autenticacao.id);

    if (!Number.isSafeInteger(usuarioId) || usuarioId <= 0) {
      return res.status(401).json({
        message: "Sessão de usuário inválida.",
      });
    }

    let configuracoes: ConfiguracoesSistema;

    try {
      configuracoes = normalizarConfiguracoes(req.body);
    } catch (error) {
      return res.status(400).json({
        message:
          error instanceof Error
            ? error.message
            : "As configurações enviadas são inválidas.",
      });
    }

    try {
      const resultado = await pool.query(
        `INSERT INTO configuracoes_sistema (
           id,
           dados,
           atualizado_por,
           atualizado_em
         )
         VALUES (1, $1::jsonb, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO UPDATE SET
           dados = EXCLUDED.dados,
           atualizado_por = EXCLUDED.atualizado_por,
           atualizado_em = CURRENT_TIMESTAMP
         RETURNING dados`,
        [JSON.stringify(configuracoes), usuarioId],
      );

      return res.json(resultado.rows[0].dados);
    } catch (error) {
      console.error("Falha ao salvar configurações do SGD:", error);

      return res.status(500).json({
        message: "Não foi possível salvar as configurações no PostgreSQL.",
      });
    }
  });

  return router;
}
