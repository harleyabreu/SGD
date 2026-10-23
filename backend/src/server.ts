import express from "express";
import cors from "cors";
import "dotenv/config";
import { Pool, type PoolClient } from "pg";

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

app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
  }),
);

app.use(express.json({ limit: "100mb" }));

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

async function iniciarServidor(): Promise<void> {
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
