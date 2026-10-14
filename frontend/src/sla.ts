// ============================================================
// VERSÃO 1.9.2
// Gestão de Demandas de TI
// Arquivo: sla.ts
// Componente: Motor central de SLA e calendário de dias úteis
//
// RESPONSABILIDADES:
// - Ler feriados cadastrados no sistema
// - Identificar dias úteis
// - Calcular prazos em dias úteis
// - Respeitar o início no próximo dia útil após a abertura
// - Considerar pausas em Com Pendências
// - Calcular prazo efetivo após períodos de pendência
// - Identificar atraso e proximidade do vencimento
// - Manter compatibilidade com as telas existentes
// - Suportar Criticidade e Prioridade de Atendimento
// - Ler os prazos configurados pelo Gestor
// ============================================================

import type { Demanda } from './types'

// ============================================================
// PRAZOS OFICIAIS DE CRITICIDADE
// ============================================================

export const PRAZOS_SLA: Record<string, number> = {
  'Crítica': 2,
  'Alta': 6,
  'Média': 10,
  'Baixa': 20,
}

// ============================================================
// PRIORIDADE DE ATENDIMENTO
// ============================================================

export const PRIORIDADES_ATENDIMENTO = [
  'P1 — Imediata',
  'P2 — Urgente',
  'P3 — Normal',
  'P4 — Planejada',
] as const

export type PrioridadeAtendimento =
  typeof PRIORIDADES_ATENDIMENTO[number]

export const PRAZOS_PRIORIDADE_SLA: Record<
  PrioridadeAtendimento,
  number
> = {
  'P1 — Imediata': 2,
  'P2 — Urgente': 6,
  'P3 — Normal': 10,
  'P4 — Planejada': 20,
}

// ============================================================
// CONFIGURAÇÕES DE SLA
// A configuração é lida de configuracoes_sistema.
// Os campos antigos de Criticidade são preservados.
// ============================================================

const CHAVE_CONFIGURACOES = 'configuracoes_sistema'

type ConfiguracaoSLA = {
  sla?: {
    critica?: number
    alta?: number
    media?: number
    baixa?: number
  }
  slaPrioridade?: {
    p1?: number
    p2?: number
    p3?: number
    p4?: number
  }
}

function carregarPrazosConfigurados(): Record<string, number> {
  const padrao: Record<string, number> = {
    ...PRAZOS_SLA,
    ...PRAZOS_PRIORIDADE_SLA,
  }

  try {
    const salvo = localStorage.getItem(CHAVE_CONFIGURACOES)

    if (!salvo) {
      return padrao
    }

    const configuracao = JSON.parse(salvo) as ConfiguracaoSLA
    const sla = configuracao.sla
    const slaPrioridade = configuracao.slaPrioridade

    const valores: Record<string, number> = {
      'Crítica': sla?.critica ?? padrao['Crítica'],
      'Alta': sla?.alta ?? padrao['Alta'],
      'Média': sla?.media ?? padrao['Média'],
      'Baixa': sla?.baixa ?? padrao['Baixa'],
      'P1 — Imediata':
        slaPrioridade?.p1 ?? padrao['P1 — Imediata'],
      'P2 — Urgente':
        slaPrioridade?.p2 ?? padrao['P2 — Urgente'],
      'P3 — Normal':
        slaPrioridade?.p3 ?? padrao['P3 — Normal'],
      'P4 — Planejada':
        slaPrioridade?.p4 ?? padrao['P4 — Planejada'],
    }

    return Object.fromEntries(
      Object.entries(valores).map(([chave, valor]) => [
        chave,
        Number.isFinite(Number(valor)) && Number(valor) > 0
          ? Math.min(365, Math.floor(Number(valor)))
          : padrao[chave],
      ])
    )
  } catch {
    return padrao
  }
}

// ============================================================
// DATA LOCAL
// ============================================================

export function dataLocalISO(
  data = new Date()
): string {
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')

  return `${ano}-${mes}-${dia}`
}

// ============================================================
// CONVERTER DATA
// ============================================================

export function converterData(
  dataTexto: string
): Date | null {
  if (!dataTexto) {
    return null
  }

  const valor = dataTexto.trim()
  let data: Date | null = null

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(valor)) {
    const [dia, mes, ano] = valor.split('/').map(Number)

    data = new Date(
      ano,
      mes - 1,
      dia
    )
  } else if (/^\d{4}-\d{2}-\d{2}/.test(valor)) {
    const [ano, mes, dia] = valor
      .slice(0, 10)
      .split('-')
      .map(Number)

    data = new Date(
      ano,
      mes - 1,
      dia
    )
  }

  if (!data || Number.isNaN(data.getTime())) {
    return null
  }

  data.setHours(0, 0, 0, 0)

  return data
}

// ============================================================
// FERIADOS
// ============================================================

export function feriadosCadastrados(): string[] {
  try {
    const dados = JSON.parse(
      localStorage.getItem('feriados') || '[]'
    )

    if (!Array.isArray(dados)) {
      return []
    }

    return dados
      .filter((item) => {
        if (typeof item === 'string') {
          return true
        }

        return item?.ativo !== false
      })
      .map((item) => {
        const valor =
          typeof item === 'string'
            ? item
            : item && typeof item.data === 'string'
              ? item.data
              : ''

        if (/^\d{2}\/\d{2}\/\d{4}$/.test(valor)) {
          const [dia, mes, ano] = valor.split('/')
          return `${ano}-${mes}-${dia}`
        }

        if (/^\d{4}-\d{2}-\d{2}/.test(valor)) {
          return valor.slice(0, 10)
        }

        return ''
      })
      .filter(Boolean)
  } catch {
    return []
  }
}

// ============================================================
// DIA ÚTIL
// ============================================================

export function ehDiaUtil(
  data: Date
): boolean {
  const diaSemana = data.getDay()

  if (diaSemana === 0 || diaSemana === 6) {
    return false
  }

  return !feriadosCadastrados().includes(
    dataLocalISO(data)
  )
}

// ============================================================
// ADICIONAR DIAS ÚTEIS
// ============================================================

export function adicionarDiasUteis(
  dataInicial: Date,
  quantidade: number
): Date {
  const resultado = new Date(dataInicial)

  resultado.setHours(0, 0, 0, 0)

  let adicionados = 0

  while (adicionados < quantidade) {
    resultado.setDate(
      resultado.getDate() + 1
    )

    if (ehDiaUtil(resultado)) {
      adicionados += 1
    }
  }

  return resultado
}

// ============================================================
// CONTAR DIAS ÚTEIS
// ============================================================

export function contarDiasUteis(
  dataInicial: Date,
  dataFinal: Date
): number {
  const inicio = new Date(dataInicial)
  const fim = new Date(dataFinal)

  inicio.setHours(0, 0, 0, 0)
  fim.setHours(0, 0, 0, 0)

  if (fim <= inicio) {
    return 0
  }

  const cursor = new Date(inicio)
  let total = 0

  while (cursor < fim) {
    cursor.setDate(
      cursor.getDate() + 1
    )

    if (ehDiaUtil(cursor)) {
      total += 1
    }
  }

  return total
}

// ============================================================
// PRAZO POR CRITICIDADE
// ============================================================

export function diasPrazoPorCriticidade(
  criticidade: string
): number {
  const prazos = carregarPrazosConfigurados()

  return prazos[criticidade] ?? prazos['Média']
}

// ============================================================
// PRAZO POR PRIORIDADE DE ATENDIMENTO
// ============================================================

export function diasPrazoPorPrioridadeAtendimento(
  prioridade: string
): number {
  const prazos = carregarPrazosConfigurados()

  return prazos[prioridade] ?? prazos['P3 — Normal']
}

// ============================================================
// COMPATIBILIDADE COM AS TELAS EXISTENTES
// Esta função deve existir uma única vez neste arquivo.
// Aceita os valores antigos de Criticidade e as opções P1 a P4.
// ============================================================

export function diasPrazoPorPrioridade(
  prioridade: string
): number {
  if (
    PRIORIDADES_ATENDIMENTO.includes(
      prioridade as PrioridadeAtendimento
    )
  ) {
    return diasPrazoPorPrioridadeAtendimento(prioridade)
  }

  return diasPrazoPorCriticidade(prioridade)
}

// ============================================================
// CÁLCULO COMBINADO DO SLA
// Aplica o menor prazo entre Criticidade e Prioridade.
// ============================================================

export function diasSLACombinado(
  criticidade: string,
  prioridadeAtendimento: string
): number {
  return Math.min(
    diasPrazoPorCriticidade(criticidade),
    diasPrazoPorPrioridadeAtendimento(prioridadeAtendimento)
  )
}

// ============================================================
// CALCULAR PRAZO LEGADO
// Mantém compatibilidade com as telas existentes.
// ============================================================

export function calcularPrazo(
  prioridade: string,
  dataAbertura = new Date()
): string {
  return dataLocalISO(
    adicionarDiasUteis(
      dataAbertura,
      diasPrazoPorPrioridade(prioridade)
    )
  )
}

// ============================================================
// CALCULAR PRAZO COM CRITICIDADE E PRIORIDADE
// ============================================================

export function calcularPrazoCombinado(
  criticidade: string,
  prioridadeAtendimento: string,
  dataAbertura = new Date()
): string {
  return dataLocalISO(
    adicionarDiasUteis(
      dataAbertura,
      diasSLACombinado(
        criticidade,
        prioridadeAtendimento
      )
    )
  )
}

// ============================================================
// NORMALIZAR INTERVALO
// ============================================================

function normalizarIntervalo(
  inicioTexto: string,
  fimTexto?: string
): {
  inicio: Date
  fim: Date
} | null {
  const inicio = converterData(inicioTexto)

  if (!inicio) {
    return null
  }

  const fim = fimTexto
    ? converterData(fimTexto)
    : new Date()

  if (!fim) {
    return null
  }

  fim.setHours(0, 0, 0, 0)

  if (fim < inicio) {
    return null
  }

  return {
    inicio,
    fim,
  }
}

// ============================================================
// DIAS EM PENDÊNCIA
// ============================================================

export function diasPendencia(
  demanda: Demanda,
  agora = new Date()
): number {
  return (
    demanda.periodosPendencia || []
  ).reduce(
    (total, periodo) => {
      const intervalo = normalizarIntervalo(
        periodo.inicio,
        periodo.fim
      )

      if (!intervalo) {
        return total
      }

      const fim = periodo.fim
        ? intervalo.fim
        : agora

      return (
        total +
        contarDiasUteis(
          intervalo.inicio,
          fim
        )
      )
    },
    0
  )
}

// ============================================================
// PRAZO BASE
// ============================================================

export function obterPrazoBase(
  demanda: Demanda
): Date | null {
  if (!demanda.prazo) {
    return null
  }

  return converterData(demanda.prazo)
}

// ============================================================
// PRAZO EFETIVO
// ============================================================

export function obterPrazoEfetivo(
  demanda: Demanda,
  agora = new Date()
): Date | null {
  const prazoBase = obterPrazoBase(demanda)

  if (!prazoBase) {
    return null
  }

  const pausas = diasPendencia(
    demanda,
    agora
  )

  return adicionarDiasUteis(
    prazoBase,
    pausas
  )
}

// ============================================================
// ATRASADA
// ============================================================

export function estaAtrasada(
  demanda: Demanda,
  agora = new Date()
): boolean {
  if (
    demanda.status === 'Concluída' ||
    demanda.status === 'Cancelada'
  ) {
    return false
  }

  const prazo = obterPrazoEfetivo(
    demanda,
    agora
  )

  if (!prazo) {
    return false
  }

  const hoje = new Date(agora)

  hoje.setHours(0, 0, 0, 0)

  return hoje > prazo
}

// ============================================================
// DIAS ATÉ O PRAZO
// ============================================================

export function diasUteisAtePrazo(
  demanda: Demanda,
  agora = new Date()
): number | null {
  const prazo = obterPrazoEfetivo(
    demanda,
    agora
  )

  if (!prazo) {
    return null
  }

  const hoje = new Date(agora)

  hoje.setHours(0, 0, 0, 0)

  if (hoje >= prazo) {
    return 0
  }

  return contarDiasUteis(
    hoje,
    prazo
  )
}

// ============================================================
// PRÓXIMA DO VENCIMENTO
// ============================================================

export function estaProximaDoVencimento(
  demanda: Demanda,
  limiteDiasUteis = 2,
  agora = new Date()
): boolean {
  if (
    demanda.status === 'Concluída' ||
    demanda.status === 'Cancelada'
  ) {
    return false
  }

  const dias = diasUteisAtePrazo(
    demanda,
    agora
  )

  return (
    dias !== null &&
    dias >= 0 &&
    dias <= limiteDiasUteis
  )
}

// ============================================================
// TMA E PRODUTIVIDADE
// ============================================================

/**
 * Calcula dias úteis decorridos entre a abertura e uma data final,
 * sem contabilizar o dia da abertura e descontando períodos de pendência.
 */
export function calcularTempoAtendimento(
  demanda: Demanda,
  dataFinal = new Date(),
  dataInicialOverride?: string
): number {
  const inicioTexto =
    dataInicialOverride ||
    demanda.dataAbertura ||
    ''

  const inicio = converterData(inicioTexto)

  if (!inicio) {
    return 0
  }

  const fim = new Date(dataFinal)

  fim.setHours(0, 0, 0, 0)

  if (fim <= inicio) {
    return 0
  }

  const total = contarDiasUteis(inicio, fim)

  const pendencias = (
    demanda.periodosPendencia || []
  ).reduce(
    (totalPendencia, periodo) => {
      const pInicio = converterData(periodo.inicio)

      if (!pInicio) {
        return totalPendencia
      }

      const pFim = periodo.fim
        ? converterData(periodo.fim)
        : fim

      if (!pFim) {
        return totalPendencia
      }

      const limiteFim = pFim < fim
        ? pFim
        : fim

      if (limiteFim <= pInicio) {
        return totalPendencia
      }

      return (
        totalPendencia +
        contarDiasUteis(
          pInicio,
          limiteFim
        )
      )
    },
    0
  )

  return Math.max(
    0,
    total - pendencias
  )
}

// ============================================================
// TEMPO APÓS REABERTURA
// ============================================================

export function calcularTempoPosReabertura(
  demanda: Demanda,
  dataFinal = new Date()
): number | null {
  if (!demanda.dataReabertura) {
    return null
  }

  return calcularTempoAtendimento(
    demanda,
    dataFinal,
    demanda.dataReabertura
  )
}

// ============================================================
// FORMATAR DIAS ÚTEIS
// ============================================================

export function formatarDiasUteis(
  dias: number
): string {
  if (dias === 1) {
    return '1 dia útil'
  }

  return `${dias} dias úteis`
}

// ============================================================
// SITUAÇÃO DO SLA
// ============================================================

export function situacaoSLA(
  demanda: Demanda,
  agora = new Date()
):
  | 'No prazo'
  | 'Próxima do vencimento'
  | 'Atrasada'
  | 'Pausada'
  | 'Concluída'
  | 'Cancelada' {
  if (demanda.status === 'Concluída') {
    return 'Concluída'
  }

  if (demanda.status === 'Cancelada') {
    return 'Cancelada'
  }

  if (demanda.status === 'Com Pendências') {
    return 'Pausada'
  }

  if (estaAtrasada(demanda, agora)) {
    return 'Atrasada'
  }

  if (
    estaProximaDoVencimento(
      demanda,
      2,
      agora
    )
  ) {
    return 'Próxima do vencimento'
  }

  return 'No prazo'
}