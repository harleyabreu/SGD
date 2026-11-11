const path = require("node:path");
const readline = require("node:readline");
const dotenv = require("dotenv");
const argon2 = require("argon2");
const { Pool } = require("pg");

dotenv.config({ path: path.join(__dirname, ".env") });

const MINIMO_SENHA = 8;
const LOGIN_GESTOR_FIXO = "lorenna.queiroz";

const ESTRUTURA_INICIAL = {
  diretoriaSigla: "DDS",
  diretoriaNome: "Diretoria de Desenvolvimento de Sistemas",
  gerenciaSigla: "GNS",
  gerenciaNome: "Gerência de Negócios de Sistemas",
  divisaoNome: "Divisão de Sistemas Corporativos (DSC)",
};

function perguntar(mensagem, padrao = "") {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const sufixo = padrao ? ` [${padrao}]` : "";

  return new Promise((resolve) => {
    rl.question(`${mensagem}${sufixo}: `, (resposta) => {
      rl.close();
      resolve(resposta.trim() || padrao);
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

      rl.question(mensagem + " (a senha será exibida): ", (resposta) => {
        rl.close();
        resolve(resposta);
      });

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
      "Configurações ausentes no backend/.env: " + ausentes.join(", "),
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
    const contaExistente = await conexao.query(
      `SELECT id, nome, login, perfil, status
         FROM public.usuarios
        WHERE LOWER(login) = LOWER($1)
        LIMIT 1`,
      [LOGIN_GESTOR_FIXO],
    );

    if (contaExistente.rowCount > 0) {
      const conta = contaExistente.rows[0];

      console.log(
        "\nA conta oficial do SGD já existe. Nenhum dado foi alterado.",
      );

      console.table([conta]);

      if (
        conta.perfil !== "Gestor/Administrador" ||
        conta.status !== "Ativo"
      ) {
        console.warn(
          "Atenção: confira o perfil e o status dessa conta na Administração do SGD.",
        );
      }

      return;
    }

    const verificacao = await conexao.query(
      "SELECT COUNT(*)::integer AS total FROM public.usuarios",
    );

    if (Number(verificacao.rows[0].total) !== 0) {
      throw new Error(
        `A conta ${LOGIN_GESTOR_FIXO} não foi encontrada, mas já existem usuários cadastrados. ` +
          "Por segurança, nenhum registro foi criado ou alterado.",
      );
    }

    console.log("\nCADASTRO DO GESTOR OFICIAL DO SGD");
    console.log(`Login reservado: ${LOGIN_GESTOR_FIXO}`);
    console.log(
      "O usuário será criado somente se a tabela usuarios estiver vazia.",
    );
    console.log(
      "No primeiro acesso, o sistema exigirá a troca da senha.\n",
    );

    const nome = await perguntar(
      "Nome completo",
      "Lorenna Goes de Queiroz",
    );

    const email = await perguntar(
      "E-mail",
      "lorenna.queiroz@prodepa.pa.gov.br",
    );

    const telefone = await perguntar("Telefone (opcional)", "");

    if (!nome || !email) {
      throw new Error("Nome e e-mail são obrigatórios.");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Informe um endereço de e-mail válido.");
    }

    const senha = await perguntarSenhaOculta(
      "Crie a senha (mínimo 8 caracteres): ",
    );

    if (senha.length < MINIMO_SENHA) {
      throw new Error("A senha deve possuir no mínimo 8 caracteres.");
    }

    const confirmacao = await perguntarSenhaOculta("Confirme a senha: ");

    if (senha !== confirmacao) {
      throw new Error(
        "As senhas não conferem. Nenhum usuário foi criado.",
      );
    }

    const hash = await argon2.hash(senha, {
      type: argon2.argon2id,
    });

    await conexao.query("BEGIN");
    transacaoIniciada = true;

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
      `INSERT INTO public.usuarios (
         nome, login, email, telefone, senha_hash, perfil, status,
         diretoria_sigla, diretoria_nome, gerencia_sigla, gerencia_nome,
         divisao_nome, exigir_troca_senha, criado_em, atualizado_em
       ) VALUES ($1, $2, $3, $4, $5, 'Gestor/Administrador', 'Ativo',
                 $6, $7, $8, $9, $10, TRUE,
                 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, nome, login, email, perfil, status,
                 diretoria_sigla, gerencia_sigla, divisao_nome`,
      [
        nome,
        LOGIN_GESTOR_FIXO,
        email,
        telefone || null,
        hash,
        ESTRUTURA_INICIAL.diretoriaSigla,
        ESTRUTURA_INICIAL.diretoriaNome,
        ESTRUTURA_INICIAL.gerenciaSigla,
        ESTRUTURA_INICIAL.gerenciaNome,
        ESTRUTURA_INICIAL.divisaoNome,
      ],
    );

    await conexao.query("COMMIT");
    transacaoIniciada = false;

    console.log("\nGestor oficial criado com sucesso!");
    console.table(resultado.rows);

    console.log(
      "A senha não foi exibida nem armazenada em texto puro.",
    );

    console.log(
      "A troca de senha será solicitada no primeiro acesso.",
    );
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