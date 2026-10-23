import { Router, type Request, type Response } from 'express'
import type { Pool } from 'pg'

type LinhaCliente = {
  id: number | string
  nome: string
  sigla: string
  ativo: boolean
  criadoEm: string
  atualizadoEm: string
}

type LinhaSistema = {
  id: number | string
  nome: string
  clienteId: number | string | null
  ativo: boolean
  criadoEm: string
  atualizadoEm: string
}

type LinhaTipo = {
  id: number | string
  nome: string
  ativo: boolean
  criadoEm: string
  atualizadoEm: string
}

function responderErro(
  resposta: Response,
  erro: unknown,
  cadastro: string,
): void {
  const codigo =
    erro && typeof erro === 'object' && 'code' in erro
      ? String((erro as { code?: unknown }).code ?? '')
      : ''

  if (codigo === '23505') {
    resposta.status(409).json({
      message: `Já existe um cadastro de ${cadastro} com esses dados.`,
    })
    return
  }

  if (codigo === '23503') {
    resposta.status(400).json({
      message: 'O órgão selecionado não existe no banco de dados.',
    })
    return
  }

  console.error(`Falha ao gravar ${cadastro} no PostgreSQL:`, erro)
  resposta.status(500).json({
    message: `Não foi possível gravar ${cadastro} no banco de dados.`,
  })
}

function idDaRota(requisicao: Request): number | null {
  const id = Number(requisicao.params.id)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

function formatarCliente(linha: LinhaCliente): LinhaCliente {
  return { ...linha, id: Number(linha.id) }
}

function formatarSistema(linha: LinhaSistema): LinhaSistema {
  return {
    ...linha,
    id: Number(linha.id),
    clienteId: linha.clienteId == null ? null : Number(linha.clienteId),
  }
}

function formatarTipo(linha: LinhaTipo): LinhaTipo {
  return { ...linha, id: Number(linha.id) }
}

/**
 * Rotas de escrita dos cadastros administrativos.
 * As rotas GET /clientes, /sistemas e /tipos já existentes no server.ts
 * continuam sendo responsáveis pelas consultas.
 */
export function criarRotasCadastros(pool: Pool) {
  const router = Router()

  // ----------------------------------------------------------
  // CLIENTES / ÓRGÃOS
  // ----------------------------------------------------------

  router.post('/clientes', async (req, res) => {
    const nome = String(req.body?.nome ?? '').trim()
    const sigla = String(req.body?.sigla ?? '').trim().toUpperCase()

    if (!nome || !sigla) {
      res.status(400).json({ message: 'Informe o nome e a sigla do órgão.' })
      return
    }

    try {
      const resultado = await pool.query<LinhaCliente>(
        `
          INSERT INTO clientes (nome, sigla, ativo)
          VALUES ($1, $2, TRUE)
          RETURNING
            id, nome, sigla, ativo,
            criado_em AS "criadoEm",
            atualizado_em AS "atualizadoEm"
        `,
        [nome, sigla],
      )

      res.status(201).json(formatarCliente(resultado.rows[0]))
    } catch (erro) {
      responderErro(res, erro, 'órgão/cliente')
    }
  })

  router.put('/clientes/:id', async (req, res) => {
    const id = idDaRota(req)
    const nome = String(req.body?.nome ?? '').trim()
    const sigla = String(req.body?.sigla ?? '').trim().toUpperCase()

    if (!id) {
      res.status(400).json({ message: 'ID do órgão inválido.' })
      return
    }
    if (!nome || !sigla) {
      res.status(400).json({ message: 'Informe o nome e a sigla do órgão.' })
      return
    }

    try {
      const resultado = await pool.query<LinhaCliente>(
        `
          UPDATE clientes
          SET nome = $1, sigla = $2, atualizado_em = CURRENT_TIMESTAMP
          WHERE id = $3
          RETURNING
            id, nome, sigla, ativo,
            criado_em AS "criadoEm",
            atualizado_em AS "atualizadoEm"
        `,
        [nome, sigla, id],
      )

      if (!resultado.rows.length) {
        res.status(404).json({ message: 'Órgão não encontrado.' })
        return
      }
      res.json(formatarCliente(resultado.rows[0]))
    } catch (erro) {
      responderErro(res, erro, 'órgão/cliente')
    }
  })

  router.patch('/clientes/:id', async (req, res) => {
    const id = idDaRota(req)
    const ativo = req.body?.ativo

    if (!id) {
      res.status(400).json({ message: 'ID do órgão inválido.' })
      return
    }
    if (typeof ativo !== 'boolean') {
      res.status(400).json({ message: 'Informe o status ativo como verdadeiro ou falso.' })
      return
    }

    try {
      const resultado = await pool.query<LinhaCliente>(
        `
          UPDATE clientes
          SET ativo = $1, atualizado_em = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING
            id, nome, sigla, ativo,
            criado_em AS "criadoEm",
            atualizado_em AS "atualizadoEm"
        `,
        [ativo, id],
      )

      if (!resultado.rows.length) {
        res.status(404).json({ message: 'Órgão não encontrado.' })
        return
      }
      res.json(formatarCliente(resultado.rows[0]))
    } catch (erro) {
      responderErro(res, erro, 'órgão/cliente')
    }
  })

  // ----------------------------------------------------------
  // SISTEMAS
  // ----------------------------------------------------------

  router.post('/sistemas', async (req, res) => {
    const nome = String(req.body?.nome ?? '').trim()
    const clienteBruto = req.body?.clienteId
    const clienteId =
      clienteBruto === undefined || clienteBruto === null || clienteBruto === ''
        ? null
        : Number(clienteBruto)

    if (!nome) {
      res.status(400).json({ message: 'Informe o nome do sistema.' })
      return
    }
    if (clienteId !== null && (!Number.isSafeInteger(clienteId) || clienteId < 1)) {
      res.status(400).json({ message: 'Órgão selecionado inválido.' })
      return
    }

    try {
      const resultado = await pool.query<LinhaSistema>(
        `
          INSERT INTO sistemas (nome, cliente_id, ativo)
          VALUES ($1, $2, TRUE)
          RETURNING
            id, nome, cliente_id AS "clienteId", ativo,
            criado_em AS "criadoEm",
            atualizado_em AS "atualizadoEm"
        `,
        [nome, clienteId],
      )

      res.status(201).json(formatarSistema(resultado.rows[0]))
    } catch (erro) {
      responderErro(res, erro, 'sistema')
    }
  })

  router.put('/sistemas/:id', async (req, res) => {
    const id = idDaRota(req)
    const nome = String(req.body?.nome ?? '').trim()
    const clienteBruto = req.body?.clienteId
    const clienteId =
      clienteBruto === undefined || clienteBruto === null || clienteBruto === ''
        ? null
        : Number(clienteBruto)

    if (!id) {
      res.status(400).json({ message: 'ID do sistema inválido.' })
      return
    }
    if (!nome) {
      res.status(400).json({ message: 'Informe o nome do sistema.' })
      return
    }
    if (clienteId !== null && (!Number.isSafeInteger(clienteId) || clienteId < 1)) {
      res.status(400).json({ message: 'Órgão selecionado inválido.' })
      return
    }

    try {
      const resultado = await pool.query<LinhaSistema>(
        `
          UPDATE sistemas
          SET nome = $1, cliente_id = $2, atualizado_em = CURRENT_TIMESTAMP
          WHERE id = $3
          RETURNING
            id, nome, cliente_id AS "clienteId", ativo,
            criado_em AS "criadoEm",
            atualizado_em AS "atualizadoEm"
        `,
        [nome, clienteId, id],
      )

      if (!resultado.rows.length) {
        res.status(404).json({ message: 'Sistema não encontrado.' })
        return
      }
      res.json(formatarSistema(resultado.rows[0]))
    } catch (erro) {
      responderErro(res, erro, 'sistema')
    }
  })

  router.patch('/sistemas/:id', async (req, res) => {
    const id = idDaRota(req)
    const ativo = req.body?.ativo

    if (!id) {
      res.status(400).json({ message: 'ID do sistema inválido.' })
      return
    }
    if (typeof ativo !== 'boolean') {
      res.status(400).json({ message: 'Informe o status ativo como verdadeiro ou falso.' })
      return
    }

    try {
      const resultado = await pool.query<LinhaSistema>(
        `
          UPDATE sistemas
          SET ativo = $1, atualizado_em = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING
            id, nome, cliente_id AS "clienteId", ativo,
            criado_em AS "criadoEm",
            atualizado_em AS "atualizadoEm"
        `,
        [ativo, id],
      )

      if (!resultado.rows.length) {
        res.status(404).json({ message: 'Sistema não encontrado.' })
        return
      }
      res.json(formatarSistema(resultado.rows[0]))
    } catch (erro) {
      responderErro(res, erro, 'sistema')
    }
  })

  // ----------------------------------------------------------
  // TIPOS DE DEMANDA
  // ----------------------------------------------------------

  router.post('/tipos', async (req, res) => {
    const nome = String(req.body?.nome ?? '').trim()

    if (!nome) {
      res.status(400).json({ message: 'Informe o nome do tipo de demanda.' })
      return
    }

    try {
      const resultado = await pool.query<LinhaTipo>(
        `
          INSERT INTO tipos_demanda (nome, ativo)
          VALUES ($1, TRUE)
          RETURNING
            id, nome, ativo,
            criado_em AS "criadoEm",
            atualizado_em AS "atualizadoEm"
        `,
        [nome],
      )

      res.status(201).json(formatarTipo(resultado.rows[0]))
    } catch (erro) {
      responderErro(res, erro, 'tipo de demanda')
    }
  })

  router.put('/tipos/:id', async (req, res) => {
    const id = idDaRota(req)
    const nome = String(req.body?.nome ?? '').trim()

    if (!id) {
      res.status(400).json({ message: 'ID do tipo inválido.' })
      return
    }
    if (!nome) {
      res.status(400).json({ message: 'Informe o nome do tipo de demanda.' })
      return
    }

    try {
      const resultado = await pool.query<LinhaTipo>(
        `
          UPDATE tipos_demanda
          SET nome = $1, atualizado_em = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING
            id, nome, ativo,
            criado_em AS "criadoEm",
            atualizado_em AS "atualizadoEm"
        `,
        [nome, id],
      )

      if (!resultado.rows.length) {
        res.status(404).json({ message: 'Tipo de demanda não encontrado.' })
        return
      }
      res.json(formatarTipo(resultado.rows[0]))
    } catch (erro) {
      responderErro(res, erro, 'tipo de demanda')
    }
  })

  router.patch('/tipos/:id', async (req, res) => {
    const id = idDaRota(req)
    const ativo = req.body?.ativo

    if (!id) {
      res.status(400).json({ message: 'ID do tipo inválido.' })
      return
    }
    if (typeof ativo !== 'boolean') {
      res.status(400).json({ message: 'Informe o status ativo como verdadeiro ou falso.' })
      return
    }

    try {
      const resultado = await pool.query<LinhaTipo>(
        `
          UPDATE tipos_demanda
          SET ativo = $1, atualizado_em = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING
            id, nome, ativo,
            criado_em AS "criadoEm",
            atualizado_em AS "atualizadoEm"
        `,
        [ativo, id],
      )

      if (!resultado.rows.length) {
        res.status(404).json({ message: 'Tipo de demanda não encontrado.' })
        return
      }
      res.json(formatarTipo(resultado.rows[0]))
    } catch (erro) {
      responderErro(res, erro, 'tipo de demanda')
    }
  })

  return router
}
