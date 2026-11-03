
const path = require("node:path");
const dotenv = require("dotenv");
const { Pool } = require("pg");

dotenv.config({ path: path.join(__dirname, ".env") });

async function consultarUsuarios() {
  const variaveis = [
    "DB_HOST",
    "DB_PORT",
    "DB_NAME",
    "DB_USER",
    "DB_PASSWORD",
  ];

  const ausentes = variaveis.filter(
    (nome) =>
      typeof process.env[nome] !== "string" ||
      process.env[nome].trim() === "",
  );

  if (ausentes.length > 0) {
    console.error("Variáveis ausentes no backend/.env:", ausentes.join(", "));
    process.exitCode = 1;
    return;
  }

  const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionTimeoutMillis: 5000,
  });

  try {
    const total = await pool.query(
      "SELECT COUNT(*)::integer AS total FROM public.usuarios",
    );

    const usuarios = await pool.query(`
      SELECT id, nome, login, status, perfil
      FROM public.usuarios
      ORDER BY id
    `);

    console.log("Banco consultado:", process.env.DB_NAME);
    console.log("Total de usuários:", total.rows[0].total);

    if (usuarios.rows.length === 0) {
      console.log("A tabela usuarios está vazia neste banco.");
    } else {
      console.log("Usuários cadastrados:");
      console.table(usuarios.rows);
    }

    const lorenna = usuarios.rows.find(
      (usuario) =>
        String(usuario.login).trim().toLowerCase() === "lorenna.goes",
    );

    console.log(
      "Usuário lorenna.goes:",
      lorenna ? "ENCONTRADO" : "NÃO ENCONTRADO NESTE BANCO",
    );
  } catch (error) {
    console.error("Erro ao consultar usuários:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

consultarUsuarios().catch((error) => {
  console.error("Erro inesperado:", error.message);
  process.exitCode = 1;
});
