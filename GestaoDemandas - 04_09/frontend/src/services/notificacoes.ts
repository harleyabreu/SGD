// ============================================================
// GESTÃO DE DEMANDAS DE TI
// V2.1 — NOTIFICAÇÕES
// ============================================================

import type { Notificacao } from '../types'
import { carregarNotificacoes, salvarNotificacoes } from './storage'

export function criarNotificacao(
  dados: Omit<Notificacao, 'id' | 'data' | 'lida'>
) {
  const nova: Notificacao = {
    ...dados,
    id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    data: new Date().toISOString(),
    lida: false,
  }

  salvarNotificacoes([nova, ...carregarNotificacoes()])
  return nova
}

export function marcarNotificacaoComoLida(id: string) {
  salvarNotificacoes(
    carregarNotificacoes().map((item) =>
      item.id === id ? { ...item, lida: true } : item
    )
  )
}

export function marcarTodasComoLidas() {
  salvarNotificacoes(
    carregarNotificacoes().map((item) => ({ ...item, lida: true }))
  )
}

export function notificacoesNaoLidas() {
  return carregarNotificacoes().filter((item) => !item.lida)
}
