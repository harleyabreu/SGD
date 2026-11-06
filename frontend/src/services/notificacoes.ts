
// ============================================================
// GESTÃO DE DEMANDAS DE TI
// V2.3 — NOTIFICAÇÕES CENTRALIZADAS
// PERSISTÊNCIA PELO SERVIÇO STORAGE
// ============================================================

import type { Notificacao } from '../types'

import {
  carregarNotificacoes,
  salvarNotificacoes,
} from './storage'

type ConfiguracaoNotificacao =
  | 'atrasadas'
  | 'proximoVencimento'
  | 'atribuicao'
  | 'conclusao'
  | 'reabertura'
  | 'cancelamento'

const CONFIGURACOES_PADRAO: Record<
  ConfiguracaoNotificacao,
  boolean
> = {
  atrasadas: true,
  proximoVencimento: true,
  atribuicao: true,
  conclusao: true,
  reabertura: true,
  cancelamento: true,
}

function notificacaoHabilitada(
  campo: ConfiguracaoNotificacao
): boolean {
  try {
    const salvo = localStorage.getItem(
      'configuracoes_sistema'
    )

    if (!salvo) {
      return CONFIGURACOES_PADRAO[campo]
    }

    const dados = JSON.parse(salvo) as {
      notificacoes?: Partial<
        Record<ConfiguracaoNotificacao, boolean>
      >
    }

    return (
      dados.notificacoes?.[campo] ??
      CONFIGURACOES_PADRAO[campo]
    )
  } catch {
    return CONFIGURACOES_PADRAO[campo]
  }
}

function identificarConfiguracao(
  titulo: string
): ConfiguracaoNotificacao | null {
  const valor = String(titulo || '')
    .trim()
    .toLowerCase()

  if (
    valor === 'nova demanda atribuída' ||
    valor === 'demanda atribuída' ||
    valor === 'responsável alterado' ||
    valor === 'responsável definido'
  ) {
    return 'atribuicao'
  }

  if (valor === 'demanda concluída') {
    return 'conclusao'
  }

  if (valor === 'demanda reaberta') {
    return 'reabertura'
  }

  if (valor === 'demanda cancelada') {
    return 'cancelamento'
  }

  return null
}

// ============================================================
// CRIAR NOTIFICAÇÃO
// ============================================================

export function criarNotificacao(
  dados: Omit<
    Notificacao,
    'id' | 'data' | 'lida'
  >
): Notificacao | null {
  const configuracao = identificarConfiguracao(
    dados.titulo
  )

  if (
    configuracao &&
    !notificacaoHabilitada(configuracao)
  ) {
    return null
  }

  const nova: Notificacao = {
    ...dados,
    id: `${Date.now()}-${Math.floor(
      Math.random() * 10000
    )}`,
    data: new Date().toISOString(),
    lida: false,
  }

  salvarNotificacoes([
    nova,
    ...carregarNotificacoes(),
  ])

  // O próprio serviço storage realiza a sincronização
  // com o PostgreSQL. Não duplicar a chamada à API.

  return nova
}

// ============================================================
// MARCAR UMA NOTIFICAÇÃO COMO LIDA
// ============================================================

export function marcarNotificacaoComoLida(
  id: string
) {
  if (!id) return

  const atualizadas = carregarNotificacoes().map(
    (item) =>
      item.id === id
        ? {
            ...item,
            lida: true,
          }
        : item
  )

  salvarNotificacoes(atualizadas)
}

// ============================================================
// MARCAR TODAS COMO LIDAS
// ============================================================

export function marcarTodasComoLidas() {
  const atualizadas = carregarNotificacoes().map(
    (item) => ({
      ...item,
      lida: true,
    })
  )

  salvarNotificacoes(atualizadas)
}

// ============================================================
// CONSULTAR NOTIFICAÇÕES NÃO LIDAS
// ============================================================

export function notificacoesNaoLidas() {
  return carregarNotificacoes().filter(
    (item) => !item.lida
  )
}
