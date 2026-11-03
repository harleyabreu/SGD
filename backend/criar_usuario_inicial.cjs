
const path = require("node:path");
const readline = require("node:readline");
const dotenv = require("dotenv");
const argon2 = require("argon2");
const { Pool } = require("pg");

dotenv.config({ path: path.join(__dirname, ".env") });

const MINIMO_SENHA = 8;
const LOGIN_PRESERVADO = "lorenna.goes";

function perguntar(mensagem) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(mensagem, (resposta) => {
      rl.close();
      resolve(resposta.trim());
    });
  });
}

function perguntarSenhaOculta(mensagem) {
  return new Promise((resolve, reject) => {
    const entrada = process.stdin;

    if (!entrada.isTTY || typeof entrada.setRawMode !== "function") {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.question(
        mensagem + " (a senha será exibida): ",
        (resposta) => {
          rl.close();
          resolve(resposta);
        },
      );
      return;
    }

    let senha = "";
    let finalizado = false;

    process.stdout.write(mensagem);

    const limpar = () => {
      if (finalizado) return;
      finalizado = true;
      entrada.removeListener("data", aoDigitar);
      entrada.setRawMode(false);
      entrada.pause();
      process.stdout.write("\n");
    };

    const aoDigitar = (bloco) => {
      for (const caractere of bloco.toString()) {
        if (finalizado) return;

        if (caractere === "\u0003") {
          limpar();
          reject(new Error("Operação cancelada."));
          return;
        }

        if (caractere === "\r" || caractere === "\n") {
          limpar();
          resolve(senha);
          return;
        }

        if (caractere === "\u0008" || caractere === "\u007f") {
          const caracteres = Array.from(senha);

          if (caracteres.length > 0) {
            caracteres.pop();
            senha = caracteres.join("");
            process.stdout.write("\b \b");
          }

          continue;
        }

        if (caractere >= " ") {
          senha += caractere;
          process.stdout.write("*");
        }
      }
    };

    entrada.setEncoding("utf8");
    entrada.setRawMode(true);
    entrada.resume();
    entrada.on("data", aoDigitar);
  });
}

async function criarUsuarioInicial() {
  const obrigatorias = [
    "DB_HOST",
    "DB_PORT",
    "DB_NAME",
    "DB_USER",
    "DB_PASSWORD",
  ];

  const ausentes = obrigatorias.filter(
    (nome) =>
      typeof process.env[nome] !== "string" ||
      process.env[nome].trim() === "",
  );

  if (ausentes.length > 0) {
    throw new Error(
      "Configurações ausentes no backend/.env: " +
        ausentes.join(", "),
    );
  }

  const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionTimeoutMillis: 5000,
  });

  const conexao = await pool.connect();
  let transacaoIniciada = false;

  try {
    const verificacao = await conexao.query(
      "SELECT COUNT(*)::integer AS total FROM public.usuarios",
    );

    if (Number(verificacao.rows[0].total) !== 0) {
      throw new Error(
        "O cadastro inicial foi bloqueado: já existem usuários. " +
          "Nenhum registro foi alterado.",
      );
    }

    console.log("\nCADASTRO DO GESTOR INICIAL DO SGD");
    console.log("A conta lorenna.goes será preservada para a etapa final.");
    console.log("Este cadastro será feito somente se a tabela estiver vazia.\n");

    const nome = await perguntar("Nome completo: ");
    const login = await perguntar("Novo login (diferente de lorenna.goes): ");
    const email = await perguntar("E-mail: ");
    const telefone = await perguntar("Telefone (opcional): ");

    if (!nome || !login || !email) {
      throw new Error("Nome, login e e-mail são obrigatórios.");
    }

    if (login.toLowerCase() === LOGIN_PRESERVADO) {
      throw new Error(
        "Esse login está reservado para a etapa final. Escolha outro.",
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Informe um endereço de e-mail válido.");
    }

    const senha = await perguntarSenhaOculta("Crie a senha (mínimo 8 caracteres): ");

    if (senha.length < MINIMO_SENHA) {
      throw new Error("A senha deve possuir no mínimo 8 caracteres.");
    }

    const confirmacao = await perguntarSenhaOculta("Confirme a senha: ");

    if (senha !== confirmacao) {
      throw new Error("As senhas não conferem. Nenhum usuário foi criado.");
    }

    console.log("\nValidando e criando o usuário...");

    const hash = await argon2.hash(senha, {
      type: argon2.argon2id,
    });

    await conexao.query("BEGIN");
    transacaoIniciada = true;

    // Bloqueia inserções concorrentes durante o cadastro inicial.
    await conexao.query(
      "LOCK TABLE public.usuarios IN EXCLUSIVE MODE",
    );

    const novaContagem = await conexao.query(
      "SELECT COUNT(*)::integer AS total FROM public.usuarios",
    );

    if (Number(novaContagem.rows[0].total) !== 0) {
      throw new Error(
        "Outro usuário foi criado durante a operação. Nenhuma alteração foi confirmada.",
      );
    }

    const resultado = await conexao.query(
      `INSERT INTO public.usuarios
        (nome, login, email, telefone, senha_hash, perfil, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, nome, login, email, perfil, status`,
      [
        nome.trim(),
        login.trim(),
        email.trim(),
        telefone.trim() || null,
        hash,
        "Gestor/Administrador",
        "Ativo",
      ],
    );

    await conexao.query("COMMIT");
    transacaoIniciada = false;

    console.log("\nUsuário inicial criado com sucesso!");
    console.table(resultado.rows);
    console.log("A senha não foi exibida nem armazenada em texto puro.");
    console.log("A conta lorenna.goes não foi alterada.");
  } catch (erro) {
    if (transacaoIniciada) {
      await conexao.query("ROLLBACK");
    }

    throw erro;
  } finally {
    conexao.release();
    await pool.end();
  }
}

criarUsuarioInicial().catch((erro) => {
  console.error("\nNão foi possível concluir o cadastro:");
  console.error(erro.message);
  process.exitCode = 1;
});
