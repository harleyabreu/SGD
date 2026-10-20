import express from "express";
import cors from "cors";
import "dotenv/config";
import { Pool } from "pg";

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

app.use(express.json());

// Verificar conexão com o PostgreSQL
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
    typeof sigla !== "string"
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
    res.status(400).json({ message: "ID de cliente inválido." });
    return;
  }

  if (
    typeof nome !== "string" ||
    !nome.trim() ||
    typeof sigla !== "string"
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
      res.status(404).json({ message: "Cliente não encontrado." });
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
    res.status(400).json({ message: "ID de cliente inválido." });
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
      res.status(404).json({ message: "Cliente não encontrado." });
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

// Listar demandas
app.get("/api/demandas", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        d.id,
        d.titulo,
        d.descricao,
        c.nome AS cliente,
        s.nome AS sistema,
        td.nome AS tipo,
        u.nome AS responsavel,
        d.criticidade,
        d.prioridade_atendimento AS "prioridadeAtendimento",
        d.prioridade,
        d.prazo,
        d.observacao,
        d.status,
        d.data_abertura AS "dataAbertura",
        d.data_conclusao AS "dataConclusao",
        uc.nome AS "usuarioCriacao",
        ucon.nome AS "usuarioConclusao",
        d.data_reabertura AS "dataReabertura",
        ur.nome AS "usuarioReabertura",
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

app.listen(port, () => {
  console.log(`SGD backend running at http://localhost:${port}`);
});