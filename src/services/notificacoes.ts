// ============================================================
// GESTÃO DE DEMANDAS DE TI
// V2.2 — NOTIFICAÇÕES CENTRALIZADAS
// ============================================================
//
// RESPONSABILIDADES:
// - Criar e persistir notificações
// - Marcar notificações como lidas
// - Marcar todas como lidas
// - Consultar não lidas
// - Respeitar as configurações de notificações do sistema
// - Manter compatibilidade com o storage atual
//
// Observação:
// As notificações de atraso e próximo vencimento são calculadas
// pelo Dashboard a partir do SLA central. Este serviço permanece
// responsável pelas notificações persistidas geradas pelo fluxo
// da demanda.
//

import type { Notificacao } from '../types'
import {
  carregarNotificacoes,
  salvarNotificacoes,
} from './storage'

// ============================================================
// CONFIGURAÇÕES DE NOTIFICAÇÕES
// ============================================================

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

// ============================================================
// LEITURA SEGURA DAS CONFIGURAÇÕES
// ============================================================

function notificacaoHabilitada(
  campo: ConfiguracaoNotificacao
): boolean {
  try {
    const salvo =
      localStorage.getItem(
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

// ============================================================
// IDENTIFICAÇÃO DO TIPO CONFIGURÁVEL
// ============================================================

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

  if (
    valor === 'demanda concluída'
  ) {
    return 'conclusao'
  }

  if (
    valor === 'demanda reaberta'
  ) {
    return 'reabertura'
  }

  if (
    valor === 'demanda cancelada'
  ) {
    return 'cancelamento'
  }

  // A notificação de pendência não possui
  // chave própria nas Configurações atuais.
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
  const configuracao =
    identificarConfiguracao(dados.titulo)

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

  return nova
}

// ============================================================
// MARCAR UMA NOTIFICAÇÃO COMO LIDA
// ============================================================

export function marcarNotificacaoComoLida(
  id: string
) {
  if (!id) {
    return
  }

  salvarNotificacoes(
    carregarNotificacoes().map(
      (item) =>
        item.id === id
          ? {
              ...item,
              lida: true,
            }
          : item
    )
  )
}

// ============================================================
// MARCAR TODAS COMO LIDAS
// ============================================================

export function marcarTodasComoLidas() {
  salvarNotificacoes(
    carregarNotificacoes().map(
      (item) => ({
        ...item,
        lida: true,
      })
    )
  )
}

// ============================================================
// NÃO LIDAS
// ============================================================

export function notificacoesNaoLidas() {
  return carregarNotificacoes().filter(
    (item) => !item.lida
  )
}
