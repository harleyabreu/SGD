// V 2.1 — Dashboard do Gestor, indicadores, filtros, SLA central e notificações configuráveis.
// ============================================================
// V 1.8
// Gestão de Demandas de TI
// Arquivo: Dashboard.tsx
// Componente: Dashboard do Gestor
//
// BASE PRESERVADA: V 1.5
//
// EVOLUÇÕES PRESERVADAS
// - V 1.4: Central de Notificações e Alertas no cabeçalho, contador,
//   alertas operacionais, marcação de leitura e persistência
// - V 1.5: Padronização do fluxo e remoção de Em Processo da interface
//
// EVOLUÇÃO V 1.8
// - Preservação dos indicadores, filtros, alertas e quadros existentes
// - Fluxo oficial consolidado em 5 status
// - Nova
// - Aguardando
// - Em Atendimento
// - Com Pendências
// - Concluída
// - Indicadores e distribuição não exibem mais Em Processo
// - Dados legados são normalizados para Em Atendimento; prioridade Urgente é convertida para Crítica
// - Notificações e demais funcionalidades permanecem preservadas
// ============================================================

import { useMemo, useState } from 'react'
import { PERFIS_RESPONSAVEIS, type Usuario } from '../types'
import MenuPrincipal from '../components/MenuPrincipal'
import { carregarUsuarios } from '../services/storage'
import './Dashboard.css'
import {
  calcularTempoAtendimento,
  calcularTempoPosReabertura,
  estaAtrasada as estaAtrasadaSLA,
  estaProximaDoVencimento as estaProximaDoVencimentoSLA,
  formatarDiasUteis,
  obterPrazoEfetivo,
} from '../sla'

type Historico = {
  id: number
  tipo: string
  titulo: string
  descricao: string
  data: string
  usuario: string
  referenciaId?: number
}

type PeriodoPendencia = {
  inicio: string
  fim?: string
  motivo: string
}

type Demanda = {
  id: number
  titulo: string
  descricao: string
  cliente: string
  sistema?: string
  tipo?: string
  responsavel: string
  prioridade: string
  prazo: string
  observacao: string
  status: string
  dataAbertura?: string
  dataConclusao?: string
  usuarioCriacao?: string
  usuarioConclusao?: string
  dataReabertura?: string
  usuarioReabertura?: string
  prazoDiasUteis?: number
  prazoManual?: boolean
  periodosPendencia?: PeriodoPendencia[]
  historico?: Historico[]
}

type Notificacao = {
  id: string
  tipo: string
  titulo: string
  descricao: string
  data: string
  demandaId: number
  prioridade?: string
  lida: boolean
}

type DashboardProps = {
  usuarioAtual: Usuario
  onLogout?: () => void
  onTodasDemandas?: () => void
  onNovaDemanda?: () => void
  onClientes?: () => void
  onResponsaveis?: () => void
  onFeriados?: () => void
  onRelatorios?: () => void
  onConfiguracoes?: () => void
}

// ============================================================
// CARREGAMENTO DAS DEMANDAS
// ============================================================

function carregarDemandas(): Demanda[] {
  try {
    const salvas = localStorage.getItem('demandas')

    if (!salvas) {
      return []
    }

    const dados = JSON.parse(salvas)

    if (!Array.isArray(dados)) {
      return []
    }

    const normalizadas = dados.map((demanda) => ({
      ...demanda,
      status:
        demanda.status === 'Em Processo'
          ? 'Em Atendimento'
          : demanda.status,
      prioridade:
        demanda.prioridade === 'Urgente'
          ? 'Crítica'
          : demanda.prioridade,
    }))

    const houveMigracao = dados.some(
      (demanda) => demanda.status === 'Em Processo'
    )

    if (houveMigracao) {
      try {
        localStorage.setItem(
          'demandas',
          JSON.stringify(normalizadas)
        )
      } catch {
        // A tela continua funcionando mesmo sem persistir a migração.
      }
    }

    return normalizadas
  } catch {
    return []
  }
}

// ============================================================
// CONVERSÃO DE DATA
// ============================================================

function converterData(dataTexto: string): Date | null {
  if (!dataTexto) {
    return null
  }

  const partes = dataTexto.split('/')

  if (partes.length !== 3) {
    return null
  }

  const dia = Number(partes[0])
  const mes = Number(partes[1]) - 1
  const ano = Number(partes[2])

  if (
    Number.isNaN(dia) ||
    Number.isNaN(mes) ||
    Number.isNaN(ano)
  ) {
    return null
  }

  const data = new Date(ano, mes, dia)
  data.setHours(0, 0, 0, 0)

  return data
}

// ============================================================
// VERIFICA ATRASO
// ============================================================

function estaAtrasada(demanda: Demanda): boolean {
  return estaAtrasadaSLA(demanda)
}

// ============================================================
// PRÓXIMA DO VENCIMENTO
// ============================================================

function estaProximaDoVencimento(
  demanda: Demanda
): boolean {
  return estaProximaDoVencimentoSLA(
    demanda,
    2
  )
}

// ============================================================
// CONTAGEM POR CAMPO
// ============================================================

function contarPorCampo(
  demandas: Demanda[],
  campo: keyof Demanda
): Record<string, number> {
  return demandas.reduce(
    (resultado, demanda) => {
      const valor = String(
        demanda[campo] || 'Não informado'
      )

      resultado[valor] =
        (resultado[valor] || 0) + 1

      return resultado
    },
    {} as Record<string, number>
  )
}

// ============================================================
// CLASSE SEGURA
// ============================================================

function gerarClasse(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// ============================================================
// PLURALIZAÇÃO
// ============================================================

function pluralizar(
  quantidade: number,
  singular: string,
  plural: string
): string {
  return quantidade === 1
    ? `${quantidade} ${singular}`
    : `${quantidade} ${plural}`
}

// ============================================================
// NOTIFICAÇÕES E ALERTAS — V 1.4
// ============================================================

function formatarDataHoraNotificacao(dataTexto: string): string {
  if (!dataTexto) {
    return ''
  }

  const data = new Date(dataTexto)

  if (Number.isNaN(data.getTime())) {
    return dataTexto
  }

  return data.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function obterTimestampNotificacao(dataTexto: string): number {
  if (!dataTexto) {
    return 0
  }

  const timestampISO = new Date(dataTexto).getTime()

  if (!Number.isNaN(timestampISO)) {
    return timestampISO
  }

  const data = converterData(dataTexto)

  return data ? data.getTime() : 0
}

function criarIdNotificacao(
  tipo: string,
  demandaId: number,
  referencia: string
): string {
  return `${tipo}-${demandaId}-${referencia}`
}

function formatarPrazoEfetivo(demanda: Demanda): string {
  const prazo = obterPrazoEfetivo(demanda)

  if (!prazo) {
    return demanda.prazo || ''
  }

  const dia = String(prazo.getDate()).padStart(2, '0')
  const mes = String(prazo.getMonth() + 1).padStart(2, '0')
  const ano = prazo.getFullYear()

  return `${dia}/${mes}/${ano}`
}

function notificacaoDashboardHabilitada(campo: 'atrasadas' | 'proximoVencimento' | 'atribuicao' | 'conclusao' | 'reabertura' | 'cancelamento'): boolean {
  const padrao = {
    atrasadas: true,
    proximoVencimento: true,
    atribuicao: true,
    conclusao: true,
    reabertura: true,
    cancelamento: true,
  }

  try {
    const salvo = localStorage.getItem('configuracoes_sistema')
    if (!salvo) return true
    const dados = JSON.parse(salvo) as {
      notificacoes?: Partial<typeof padrao>
    }
    return dados.notificacoes?.[campo] ?? padrao[campo]
  } catch {
    return padrao[campo]
  }
}


function gerarNotificacoes(
  demandas: Demanda[]
): Notificacao[] {
  const notificacoes: Notificacao[] = []

  demandas.forEach((demanda) => {
    if (notificacaoDashboardHabilitada('atrasadas') && estaAtrasada(demanda)) {
      const prazoEfetivo = formatarPrazoEfetivo(demanda)

      notificacoes.push({
        id: criarIdNotificacao(
          'atrasada',
          demanda.id,
          prazoEfetivo
        ),
        tipo: 'atrasada',
        titulo: 'Demanda atrasada',
        descricao:
          `A demanda "${demanda.titulo}" ultrapassou o prazo efetivo de atendimento.`,
        data: prazoEfetivo,
        demandaId: demanda.id,
        prioridade: demanda.prioridade,
        lida: false,
      })
    }

    if (notificacaoDashboardHabilitada('proximoVencimento') && estaProximaDoVencimento(demanda)) {
      const prazoEfetivo = formatarPrazoEfetivo(demanda)

      notificacoes.push({
        id: criarIdNotificacao(
          'prazo',
          demanda.id,
          prazoEfetivo
        ),
        tipo: 'prazo',
        titulo: 'Prazo próximo do vencimento',
        descricao:
          `A demanda "${demanda.titulo}" está próxima do vencimento do prazo.`,
        data: prazoEfetivo,
        demandaId: demanda.id,
        prioridade: demanda.prioridade,
        lida: false,
      })
    }

    const historico = Array.isArray(demanda.historico)
      ? demanda.historico
      : []

    historico.forEach((item) => {
      if (!item || !item.id) {
        return
      }

      if (item.tipo === 'responsavel' && notificacaoDashboardHabilitada('atribuicao')) {
        notificacoes.push({
          id: criarIdNotificacao(
            'responsavel',
            demanda.id,
            String(item.id)
          ),
          tipo: 'responsavel',
          titulo:
            item.titulo === 'Responsável alterado'
              ? 'Responsável alterado'
              : 'Demanda atribuída',
          descricao:
            item.descricao ||
            `O responsável da demanda "${demanda.titulo}" foi alterado.`,
          data: item.data,
          demandaId: demanda.id,
          prioridade: demanda.prioridade,
          lida: false,
        })
      }

      if (item.tipo === 'status') {
        const descricao = String(
          item.descricao || ''
        ).toLowerCase()

        const titulo = String(
          item.titulo || ''
        ).toLowerCase()

        if (
          notificacaoDashboardHabilitada('conclusao') &&
          (titulo.includes('conclu') ||
          descricao.includes('conclu'))
        ) {
          notificacoes.push({
            id: criarIdNotificacao(
              'concluida',
              demanda.id,
              String(item.id)
            ),
            tipo: 'concluida',
            titulo: 'Demanda concluída',
            descricao:
              item.descricao ||
              `A demanda "${demanda.titulo}" foi concluída.`,
            data: item.data,
            demandaId: demanda.id,
            prioridade: demanda.prioridade,
            lida: false,
          })
        }

        if (
          notificacaoDashboardHabilitada('cancelamento') &&
          (descricao.includes('cancelad') ||
          titulo.includes('cancelad'))
        ) {
          notificacoes.push({
            id: criarIdNotificacao(
              'cancelada',
              demanda.id,
              String(item.id)
            ),
            tipo: 'cancelada',
            titulo: 'Demanda cancelada',
            descricao:
              item.descricao ||
              `A demanda "${demanda.titulo}" foi cancelada.`,
            data: item.data,
            demandaId: demanda.id,
            prioridade: demanda.prioridade,
            lida: false,
          })
        }

        const houveConclusaoAnterior =
          historico.some(
            (anterior) =>
              anterior.id !== item.id &&
              anterior.tipo === 'status' &&
              (
                String(anterior.titulo || '')
                  .toLowerCase()
                  .includes('conclu') ||
                String(anterior.descricao || '')
                  .toLowerCase()
                  .includes('conclu')
              ) &&
              new Date(anterior.data).getTime() <=
                new Date(item.data).getTime()
          )

        if (
          notificacaoDashboardHabilitada('reabertura') &&
          houveConclusaoAnterior &&
          !descricao.includes('conclu')
        ) {
          notificacoes.push({
            id: criarIdNotificacao(
              'reaberta',
              demanda.id,
              String(item.id)
            ),
            tipo: 'reaberta',
            titulo: 'Demanda reaberta',
            descricao:
              item.descricao ||
              `A demanda "${demanda.titulo}" foi reaberta.`,
            data: item.data,
            demandaId: demanda.id,
            prioridade: demanda.prioridade,
            lida: false,
          })
        }
      }
    })
  })

  return notificacoes.sort(
    (a, b) =>
      obterTimestampNotificacao(b.data) -
      obterTimestampNotificacao(a.data)
  )
}

function obterIconeNotificacao(
  tipo: string
): string {
  switch (tipo) {
    case 'atrasada':
      return '🔴'
    case 'prazo':
      return '🕐'
    case 'responsavel':
      return '👤'
    case 'concluida':
      return '🟢'
    case 'cancelada':
      return '⚫'
    case 'reaberta':
      return '🔄'
    default:
      return '🔔'
  }
}

function obterClasseNotificacao(
  tipo: string
): string {
  switch (tipo) {
    case 'atrasada':
      return 'notificacao-atrasada'
    case 'prazo':
      return 'notificacao-prazo'
    case 'responsavel':
      return 'notificacao-responsavel'
    case 'concluida':
      return 'notificacao-concluida'
    case 'cancelada':
      return 'notificacao-cancelada'
    case 'reaberta':
      return 'notificacao-reaberta'
    default:
      return 'notificacao-normal'
  }
}

// ============================================================
// DASHBOARD
// ============================================================

function Dashboard({
  usuarioAtual,
  onLogout,
  onTodasDemandas,
  onNovaDemanda,
  onClientes,
  onResponsaveis,
  onFeriados,
  onRelatorios,
  onConfiguracoes,
}: DashboardProps) {

  const demandas = carregarDemandas()

  // ==========================================================
  // FILTROS DO DASHBOARD
  // ==========================================================
  const [filtroPeriodo, setFiltroPeriodo] = useState('Todos')
  const [filtroCliente, setFiltroCliente] = useState('Todos')
  const [filtroResponsavel, setFiltroResponsavel] = useState('Todos')
  const [filtroPrioridade, setFiltroPrioridade] = useState('Todas')
  const [filtroStatus, setFiltroStatus] = useState('Todos')
  const [filtroSituacao, setFiltroSituacao] = useState('Todas')

  const prioridades = [
    'Crítica',
    'Alta',
    'Média',
    'Baixa',
  ]

  const statusOrdemBase = [
    'Nova',
    'Aguardando',
    'Em Atendimento',
    'Com Pendências',
    'Concluída',
    'Cancelada',
  ]

  const statusOrdem = statusOrdemBase

  const responsaveisCadastrados = carregarUsuarios()
    .filter((usuario) => PERFIS_RESPONSAVEIS.includes(usuario.perfil))
    .map((usuario) => usuario.nome)
    .filter(Boolean)

  const clientesDisponiveis = Array.from(
    new Set(
      demandas
        .map((demanda) => String(demanda.cliente || '').trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b))

  const responsaveisDisponiveis = Array.from(
    new Set([
      ...responsaveisCadastrados,
      ...demandas
        .map((demanda) => String(demanda.responsavel || '').trim())
        .filter(Boolean),
    ])
  ).sort((a, b) => a.localeCompare(b))

  function dataAberturaDaDemanda(demanda: Demanda): Date | null {
    if (!demanda.dataAbertura) {
      return null
    }

    const brasileira = converterData(demanda.dataAbertura)

    if (brasileira) {
      return brasileira
    }

    const iso = new Date(demanda.dataAbertura)

    return Number.isNaN(iso.getTime()) ? null : iso
  }

  function pertenceAoPeriodo(
    demanda: Demanda,
    periodo: string
  ): boolean {
    if (periodo === 'Todos') {
      return true
    }

    const dataAbertura = dataAberturaDaDemanda(demanda)

    if (!dataAbertura) {
      return false
    }

    dataAbertura.setHours(0, 0, 0, 0)

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    if (periodo === 'Hoje') {
      return dataAbertura.getTime() === hoje.getTime()
    }

    if (periodo === 'Últimos 7 Dias') {
      const limite = new Date(hoje)
      limite.setDate(limite.getDate() - 6)
      return dataAbertura >= limite && dataAbertura <= hoje
    }

    if (periodo === 'Últimos 30 Dias') {
      const limite = new Date(hoje)
      limite.setDate(limite.getDate() - 29)
      return dataAbertura >= limite && dataAbertura <= hoje
    }

    if (periodo === 'Este Mês') {
      return (
        dataAbertura.getMonth() === hoje.getMonth() &&
        dataAbertura.getFullYear() === hoje.getFullYear()
      )
    }

    return true
  }

  const demandasFiltradas = demandas.filter((demanda) => {
    const situacaoAtendida =
      filtroSituacao === 'Todas' ||
      (filtroSituacao === 'Abertas' &&
        demanda.status !== 'Concluída' &&
        demanda.status !== 'Cancelada') ||
      (filtroSituacao === 'Atrasadas' &&
        estaAtrasada(demanda)) ||
      (filtroSituacao === 'Concluídas' &&
        demanda.status === 'Concluída')

    return (
      pertenceAoPeriodo(demanda, filtroPeriodo) &&
      (filtroCliente === 'Todos' || demanda.cliente === filtroCliente) &&
      (filtroResponsavel === 'Todos' ||
        demanda.responsavel === filtroResponsavel) &&
      (filtroPrioridade === 'Todas' ||
        demanda.prioridade === filtroPrioridade) &&
      (filtroStatus === 'Todos' || demanda.status === filtroStatus) &&
      situacaoAtendida
    )
  })

  // ==========================================================
  // V 1.4 — CENTRAL DE NOTIFICAÇÕES
  // ==========================================================


  const [leituras, setLeituras] = useState<string[]>(
    () => {
      try {
        const salvas = localStorage.getItem(
          'notificacoes_lidas'
        )

        if (!salvas) {
          return []
        }

        const dados = JSON.parse(salvas)

        return Array.isArray(dados)
          ? dados
          : []
      } catch {
        return []
      }
    }
  )

  const notificacoes = useMemo(
    () => gerarNotificacoes(demandas),
    [demandas]
  )

  const notificacoesComLeitura = useMemo(
    () =>
      notificacoes.map((notificacao) => ({
        ...notificacao,
        lida: leituras.includes(
          notificacao.id
        ),
      })),
    [notificacoes, leituras]
  )

  const notificacoesNaoLidas =
    notificacoesComLeitura.filter(
      (notificacao) =>
        !notificacao.lida
    )

  function salvarLeituras(
    novasLeituras: string[]
  ) {
    setLeituras(novasLeituras)

    try {
      localStorage.setItem(
        'notificacoes_lidas',
        JSON.stringify(novasLeituras)
      )
    } catch {
      // O painel continua funcionando sem persistência.
    }
  }

  function marcarNotificacaoComoLida(
    id: string
  ) {
    if (leituras.includes(id)) {
      return
    }

    salvarLeituras([
      ...leituras,
      id,
    ])
  }

  function marcarTodasNotificacoesComoLidas() {
    salvarLeituras([
      ...new Set([
        ...leituras,
        ...notificacoes.map(
          (notificacao) =>
            notificacao.id
        ),
      ]),
    ])
  }


  // ==========================================================
  // INDICADORES PRINCIPAIS
  // ==========================================================

  const totalDemandas = demandasFiltradas.length

  const demandasAbertas = demandasFiltradas.filter(
    (demanda) =>
      demanda.status !== 'Concluída' &&
      demanda.status !== 'Cancelada'
  ).length

  const demandasAtrasadas = demandasFiltradas.filter(
    (demanda) => estaAtrasada(demanda)
  ).length

  const emAtendimento = demandasFiltradas.filter(
    (demanda) =>
      demanda.status === 'Em Atendimento'
  ).length

  const comPendencias = demandasFiltradas.filter(
    (demanda) =>
      demanda.status === 'Com Pendências'
  ).length

  const concluidas = demandasFiltradas.filter(
    (demanda) =>
      demanda.status === 'Concluída'
  ).length

  const aguardando = demandasFiltradas.filter(
    (demanda) =>
      demanda.status === 'Aguardando'
  ).length

  const novas = demandasFiltradas.filter(
    (demanda) =>
      demanda.status === 'Nova'
  ).length

  const canceladas = demandasFiltradas.filter(
    (demanda) =>
      demanda.status === 'Cancelada'
  ).length

  const proximasDoVencimento =
    demandasFiltradas.filter(
      (demanda) =>
        estaProximaDoVencimento(demanda)
    ).length

  // ==========================================================
  // URGENTES
  // ==========================================================

  const demandasCriticas = demandas
    .filter(
      (demanda) =>
        demanda.prioridade === 'Crítica' &&
        demanda.status !== 'Concluída' &&
        demanda.status !== 'Cancelada'
    )
    .sort((a, b) => {

      const aAtrasada = estaAtrasada(a)
      const bAtrasada = estaAtrasada(b)

      if (aAtrasada && !bAtrasada) {
        return -1
      }

      if (!aAtrasada && bAtrasada) {
        return 1
      }

      return a.titulo.localeCompare(
        b.titulo
      )
    })

  const criticas = demandasCriticas.length

  // ==========================================================
  // DISTRIBUIÇÕES
  // ==========================================================

  const porCliente = contarPorCampo(
    demandasFiltradas,
    'cliente'
  )

  const porResponsavel = contarPorCampo(
    demandasFiltradas,
    'responsavel'
  )

  const porPrioridade = contarPorCampo(
    demandasFiltradas,
    'prioridade'
  )

  const porStatus = contarPorCampo(demandasFiltradas, 'status')

  // ==========================================================
  // ORDENAÇÃO
  // ==========================================================

  const clientes = Object.entries(
    porCliente
  ).sort(
    (a, b) => b[1] - a[1]
  )

  const responsaveis = Object.entries(
    porResponsavel
  ).sort(
    (a, b) => b[1] - a[1]
  )

  // ==========================================================
  // DEMANDAS QUE EXIGEM ATENÇÃO
  // ==========================================================

  const demandasAtencao = demandasFiltradas
    .filter(
      (demanda) =>
        estaAtrasada(demanda) ||
        demanda.status === 'Com Pendências' ||
        demanda.prioridade === 'Crítica' ||
        estaProximaDoVencimento(demanda)
    )
    .sort((a, b) => {

      const aAtrasada = estaAtrasada(a)
      const bAtrasada = estaAtrasada(b)

      if (aAtrasada && !bAtrasada) {
        return -1
      }

      if (!aAtrasada && bAtrasada) {
        return 1
      }

      return a.titulo.localeCompare(
        b.titulo
      )
    })

  // ==========================================================
  // TMA E PRODUTIVIDADE DOS ANALISTAS
  // ==========================================================

  const demandasConcluidas = demandasFiltradas.filter(
    (demanda) => demanda.status === 'Concluída'
  )

  const conclusoesDentroDoPrazo = demandasConcluidas.filter((demanda) => {
    if (!demanda.dataConclusao) return false
    const conclusao = converterData(demanda.dataConclusao)
    if (!conclusao) return false
    return !estaAtrasadaSLA({ ...demanda, status: 'Em Atendimento' }, conclusao)
  })

  const conclusoesForaDoPrazo =
    Math.max(0, demandasConcluidas.length - conclusoesDentroDoPrazo.length)

  const eficienciaPrazo =
    demandasConcluidas.length > 0
      ? Math.round(
          (conclusoesDentroDoPrazo.length /
            demandasConcluidas.length) *
            100
        )
      : 0

  const pontosPrioridade: Record<string, number> = {
    'Crítica': 4,
    'Alta': 3,
    'Média': 2,
    'Baixa': 1,
  }

  const pontosComplexidade = demandasConcluidas.reduce(
    (total, demanda) =>
      total + (pontosPrioridade[demanda.prioridade] || 0),
    0
  )

  const tmaTotal =
    demandasConcluidas.length > 0
      ? Math.round(
          demandasConcluidas.reduce((total, demanda) => {
            const conclusao = demanda.dataConclusao
              ? converterData(demanda.dataConclusao)
              : new Date()
            return total + (conclusao
              ? calcularTempoAtendimento(demanda, conclusao)
              : 0)
          }, 0) / demandasConcluidas.length
        )
      : 0

  const tmaPosReaberturaDemandas = demandasConcluidas
    .map((demanda) => {
      if (!demanda.dataReabertura || !demanda.dataConclusao) return null
      const conclusao = converterData(demanda.dataConclusao)
      if (!conclusao) return null
      return calcularTempoPosReabertura(demanda, conclusao)
    })
    .filter((valor): valor is number => valor !== null)

  const tmaPosReabertura =
    tmaPosReaberturaDemandas.length > 0
      ? Math.round(
          tmaPosReaberturaDemandas.reduce((a, b) => a + b, 0) /
            tmaPosReaberturaDemandas.length
        )
      : 0

  const produtividadePorAnalista = Object.entries(
    demandasConcluidas.reduce<Record<string, {
      concluidas: number
      dentroPrazo: number
      pontos: number
      tma: number
    }>>((acumulado, demanda) => {
      const analista = demanda.responsavel?.trim() || 'Sem Analista'
      const atual = acumulado[analista] || {
        concluidas: 0,
        dentroPrazo: 0,
        pontos: 0,
        tma: 0,
      }

      const conclusao = demanda.dataConclusao
        ? converterData(demanda.dataConclusao)
        : null

      atual.concluidas += 1
      atual.pontos += pontosPrioridade[demanda.prioridade] || 0

      if (conclusao) {
        atual.tma += calcularTempoAtendimento(demanda, conclusao)
        if (!estaAtrasadaSLA({ ...demanda, status: 'Em Atendimento' }, conclusao)) {
          atual.dentroPrazo += 1
        }
      }

      acumulado[analista] = atual
      return acumulado
    }, {})
  ).map(([analista, dados]) => ({
    analista,
    ...dados,
    eficiencia: dados.concluidas > 0
      ? Math.round((dados.dentroPrazo / dados.concluidas) * 100)
      : 0,
    tmaMedio: dados.concluidas > 0
      ? Math.round(dados.tma / dados.concluidas)
      : 0,
  })).sort((a, b) => {
    if (b.eficiencia !== a.eficiencia) return b.eficiencia - a.eficiencia
    if (b.pontos !== a.pontos) return b.pontos - a.pontos
    return b.concluidas - a.concluidas
  })

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <MenuPrincipal
      usuarioAtual={usuarioAtual}
      ativo="dashboard"
      subtitulo="Dashboard Do Gestor"
      onDashboard={() => undefined}
      onNovaDemanda={onNovaDemanda}
      onTodasDemandas={onTodasDemandas}
      onClientes={onClientes}
      onResponsaveis={onResponsaveis}
      onFeriados={onFeriados}
      onRelatorios={onRelatorios}
      onConfiguracoes={onConfiguracoes}
      onSair={onLogout || (() => undefined)}
      notificacoes={notificacoesNaoLidas.length}
      notificacoesConteudo={
        <>
                <div className="notificacoes-cabecalho">

                  <div>
                    <strong>
                      Notificações
                    </strong>

                    <small>
                      {
                        notificacoesNaoLidas.length
                      } Não Lidas
                    </small>
                  </div>

                  {notificacoesNaoLidas.length > 0 && (
                    <button
                      type="button"
                      className="notificacoes-marcar-todas btn-secundario btn-dashboard-compacto"
                      onClick={
                        marcarTodasNotificacoesComoLidas
                      }
                    >
                      Marcar Todas Como Lidas
                    </button>
                  )}

                </div>

                <div className="notificacoes-lista">

                  {notificacoesComLeitura.length === 0 ? (

                    <div className="notificacoes-vazia">

                      <span>
                        ✓
                      </span>

                      <strong>
                        Nenhuma Notificação.
                      </strong>

                      <small>
                        Não Existem Alertas Ou Ocorrências
                        Pendentes No Momento.
                      </small>

                    </div>

                  ) : (

                    notificacoesComLeitura
                      .slice(0, 12)
                      .map((notificacao) => (

                        <button
                          type="button"
                          key={notificacao.id}
                          className={`
                            notificacao-item
                            ${
                              notificacao.lida
                                ? 'notificacao-lida'
                                : 'notificacao-nao-lida'
                            }
                            ${obterClasseNotificacao(
                              notificacao.tipo
                            )}
                          `}
                          onClick={() =>
                            marcarNotificacaoComoLida(
                              notificacao.id
                            )
                          }
                        >

                          <span className="notificacao-icone">
                            {
                              obterIconeNotificacao(
                                notificacao.tipo
                              )
                            }
                          </span>

                          <span className="notificacao-conteudo">

                            <strong>
                              {notificacao.titulo}
                            </strong>

                            <span>
                              {notificacao.descricao}
                            </span>

                            <small>
                              Demanda #
                              {notificacao.demandaId}
                              {' • '}
                              {formatarDataHoraNotificacao(
                                notificacao.data
                              )}
                            </small>

                          </span>

                          {!notificacao.lida && (
                            <span
                              className="notificacao-ponto"
                              aria-label="Não lida"
                            />
                          )}

                        </button>

                      ))

                  )}

                </div>

                {notificacoesComLeitura.length > 12 && (
                  <div className="notificacoes-rodape">
                    Exibindo As 12 Notificações Mais Recentes.
                  </div>
                )}

                <div className="notificacoes-canal">
                  <span>
                    Canal Do Protótipo: Dentro Do Sistema
                  </span>
                </div>

        </>
      }
      rodapeAcoes={
        <>
          <div className="dashboard-footer-brand">
            <strong>Gestão De Demandas De TI</strong>
            <span>Dashboard Do Gestor</span>
          </div>
          <div className="dashboard-footer-org">PRODEPA</div>
        </>
      }
    >
      <main className="dashboard-content">

        {/* ====================================================
            TÍTULO
        ==================================================== */}

        <div className="page-title">

          <div>

            <h2>
              Visão Geral
            </h2>

            <p>
              Acompanhe O Andamento Das Demandas De TI.
            </p>

          </div>

          <div className="dashboard-update">

            <span className="update-dot" />

            <span>
              Dados Atualizados
            </span>

          </div>

        </div>

        {/* ====================================================
            FILTROS
        ==================================================== */}

        <section className="dashboard-filters">

          <div className="filter-title">

            <strong>
              Filtros Do Dashboard
            </strong>

            <small>
              Utilize Os Filtros Para Analisar
              As Demandas.
            </small>

          </div>

          <div className="filter-grid">

            <div className="filter-field">

              <label>
                Período
              </label>

              <select value={filtroPeriodo} onChange={(event) => setFiltroPeriodo(event.target.value)}>

                <option value="Todos">
                  Todos
                </option>

                <option>
                  Hoje
                </option>

                <option>
                  Últimos 7 Dias
                </option>

                <option>
                  Últimos 30 Dias
                </option>

                <option>
                  Este Mês
                </option>

              </select>

            </div>

            <div className="filter-field">

              <label>
                Cliente
              </label>

              <select value={filtroCliente} onChange={(event) => setFiltroCliente(event.target.value)}>

                <option value="Todos">
                  Todos Os Clientes
                </option>

                {clientesDisponiveis.map(
                  (cliente) => (
                    <option
                      key={cliente}
                      value={cliente}
                    >
                      {cliente}
                    </option>
                  )
                )}

              </select>

            </div>

            <div className="filter-field">

              <label>
                Responsável
              </label>

              <select value={filtroResponsavel} onChange={(event) => setFiltroResponsavel(event.target.value)}>

                <option value="Todos">
                  Todos Os Responsáveis
                </option>

                {responsaveisDisponiveis.map(
                  (responsavel) => (
                    <option
                      key={responsavel}
                      value={responsavel}
                    >
                      {responsavel}
                    </option>
                  )
                )}

              </select>

            </div>

            <div className="filter-field">

              <label>
                Criticidade
              </label>

              <select value={filtroPrioridade} onChange={(event) => setFiltroPrioridade(event.target.value)}>

                <option value="Todas">
                  Todas
                </option>

                {prioridades.map(
                  (prioridade) => (
                    <option
                      key={prioridade}
                      value={prioridade}
                    >
                      {prioridade}
                    </option>
                  )
                )}

              </select>

            </div>

            <div className="filter-field">

              <label>
                Status
              </label>

              <select value={filtroStatus} onChange={(event) => setFiltroStatus(event.target.value)}>

                <option value="Todos">
                  Todos
                </option>

                {statusOrdem.map(
                  (status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {status}
                    </option>
                  )
                )}

              </select>

            </div>

            <div className="filter-field">

              <label>
                Situação
              </label>

              <select value={filtroSituacao} onChange={(event) => setFiltroSituacao(event.target.value)}>

                <option value="Todas">
                  Todas
                </option>

                <option>
                  Abertas
                </option>

                <option>
                  Atrasadas
                </option>

                <option>
                  Concluídas
                </option>

              </select>

            </div>

          </div>

        </section>

        {/* ====================================================
            CARDS PRINCIPAIS
        ==================================================== */}

        <section className="summary-cards">

          {/* ABERTAS */}

          <div className="
            summary-card
            card-abertas
          ">

            <span className="card-icon">
              📋
            </span>

            <div>

              <span className="card-label">
                Demandas Abertas
              </span>

              <strong>
                {demandasAbertas}
              </strong>

              <small>
                Total: {totalDemandas}
              </small>

            </div>

          </div>

          {/* ATRASADAS */}

          <div className="
            summary-card
            card-atrasadas
          ">

            <span className="card-icon">
              🔴
            </span>

            <div>

              <span className="card-label">
                Demandas Atrasadas
              </span>

              <strong>
                {demandasAtrasadas}
              </strong>

              <small>
                Exigem Atenção
              </small>

            </div>

          </div>

          {/* AGUARDANDO */}

          <div className="
            summary-card
            card-aguardando
          ">

            <span className="card-icon">
              🟣
            </span>

            <div>

              <span className="card-label">
                Aguardando
              </span>

              <strong>
                {aguardando}
              </strong>

              <small>
                Aguardando Definição
              </small>

            </div>

          </div>

          {/* EM ATENDIMENTO */}

          <div className="
            summary-card
            card-atendimento
          ">

            <span className="card-icon">
              🔵
            </span>

            <div>

              <span className="card-label">
                Em Atendimento
              </span>

              <strong>
                {emAtendimento}
              </strong>

              <small>
                Em Execução
              </small>

            </div>

          </div>

          {/* PENDÊNCIAS */}

          <div className="
            summary-card
            card-pendencias
          ">

            <span className="card-icon">
              🟠
            </span>

            <div>

              <span className="card-label">
                Com Pendências
              </span>

              <strong>
                {comPendencias}
              </strong>

              <small>
                Aguardando Resolução
              </small>

            </div>

          </div>

          {/* URGENTES */}

          <div className="
            summary-card
            overdue
          ">

            <span className="card-icon">
              🚨
            </span>

            <div>

              <span className="card-label">
                Demandas Críticas
              </span>

              <strong>
                {criticas}
              </strong>

              <small>
                Criticidade Máxima
              </small>

            </div>

          </div>

          {/* CONCLUÍDAS — ÚLTIMA CAIXA */}

          <div className="
            summary-card
            card-concluidas
          ">

            <span className="card-icon">
              🟢
            </span>

            <div>

              <span className="card-label">
                Concluídas
              </span>

              <strong>
                {concluidas}
              </strong>

              <small>
                Demandas Finalizadas
              </small>

            </div>

          </div>

        </section>

        {/* ====================================================
            RESUMO OPERACIONAL
        ==================================================== */}

        <section className="operational-summary">

          <div className="operational-item">

            <span className="operational-number">
              {novas}
            </span>

            <span className="operational-label">
              Novas
            </span>

          </div>

          <div className="operational-item">

            <span className="operational-number">
              {emAtendimento}
            </span>

            <span className="operational-label">
              Em Execução
            </span>

          </div>

          <div className="operational-item">

            <span className="operational-number">
              {comPendencias}
            </span>

            <span className="operational-label">
              Com Pendências
            </span>

          </div>

          <div className="operational-item">

            <span className="operational-number">
              {proximasDoVencimento}
            </span>

            <span className="operational-label">
              Próximas Do Vencimento
            </span>

          </div>

          <div className="operational-item">

            <span className="operational-number">
              {canceladas}
            </span>

            <span className="operational-label">
              Canceladas
            </span>

          </div>

        </section>

        {/* ====================================================
            NOVO QUADRO — DEMANDAS CRÍTICAS
        ==================================================== */}

        <section className="dashboard-panel critical-demands-panel">

          <div className="panel-header">

            <div>
              <h3>
                🚨 Demandas Críticas
              </h3>

              <small>
                Demandas Com Criticidade Máxima Que Exigem
                Acompanhamento Do Gestor.
              </small>
            </div>

            <span className={
              `critical-demands-counter ${
                criticas > 0 ? 'has-critical' : 'no-critical'
              }`
            }>
              {pluralizar(
                criticas,
                'Demanda Crítica',
                'Demandas Críticas'
              )}
            </span>

          </div>

          {demandasCriticas.length === 0 ? (

            <div className="attention-empty">
              <span>✓</span>

              <div>
                <strong>
                  Nenhuma Demanda Crítica.
                </strong>

                <small>
                  Não Existem Demandas Com Criticidade
                  Máxima No Momento.
                </small>
              </div>
            </div>

          ) : (

            <div className="critical-demands-list">

              {demandasCriticas
                .slice(0, 8)
                .map((demanda) => {

                  const atrasada = estaAtrasada(demanda)

                  return (
                    <div
                      key={demanda.id}
                      className={
                        `critical-demand-card ${
                          atrasada ? 'is-overdue' : ''
                        }`
                      }
                    >

                      <div className="critical-demand-title">
                        <div className="critical-demand-title-line">
                          <strong>
                            {demanda.titulo}
                          </strong>

                          {atrasada && (
                            <span className="critical-overdue-badge">
                              ATRASADA
                            </span>
                          )}
                        </div>

                        <small>
                          #{demanda.id}
                        </small>
                      </div>

                      <div className="critical-demand-field">
                        <small>Cliente</small>
                        <strong>{demanda.cliente}</strong>
                      </div>

                      <div className="critical-demand-field">
                        <small>Responsável</small>
                        <strong>{demanda.responsavel}</strong>
                      </div>

                      <div className="critical-demand-field">
                        <small>Prazo</small>
                        <strong className={atrasada ? 'is-overdue-text' : ''}>
                          {formatarPrazoEfetivo(demanda) || '-'}
                        </strong>
                      </div>

                      <div className="critical-demand-field">
                        <small>Status</small>
                        <span className={
                          `critical-status-badge status-${gerarClasse(demanda.status)}`
                        }>
                          {demanda.status}
                        </span>
                      </div>

                    </div>
                  )
                })}

              {demandasCriticas.length > 8 && (

                <div className="critical-demands-more">
                  <small>
                    Exibindo As Primeiras 8 Demandas Críticas.
                  </small>

                  {onTodasDemandas && (
                    <button
                      type="button"
                      onClick={onTodasDemandas}
                      className="btn-secundario btn-dashboard-link"
                    >
                      Ver Todas As Demandas →
                    </button>
                  )}
                </div>

              )}

            </div>

          )}

        </section>

        {/* ====================================================
            STATUS
        ==================================================== */}

        <section
          className="
            dashboard-panel
            status-panel
          "
        >

          <div className="panel-header">

            <div>

              <h3>
                Status das Demandas
              </h3>

              <small>
                Distribuição atual
              </small>

            </div>

            <span>
              {pluralizar(
                totalDemandas,
                'demanda',
                'demandas'
              )}
            </span>

          </div>

          <div className="status-list">

            {statusOrdem.map(
              (status) => {

                const quantidade =
                  porStatus[status] || 0

                const percentual =
                  totalDemandas > 0
                    ? Math.round(
                        (quantidade /
                          totalDemandas) *
                          100
                      )
                    : 0

                return (

                  <div
                    className={`
                      status-item
                      status-${gerarClasse(status)}
                    `}
                    key={status}
                  >

                    <div className="status-name">

                      <span>
                        {status}
                      </span>

                      <strong>
                        {quantidade}
                      </strong>

                    </div>

                    <div className="status-progress">

                      <div
                        className="
                          status-progress-bar
                        "
                        style={{
                          width:
                            `${percentual}%`,
                        }}
                      />

                    </div>

                    <small>
                      {percentual}%
                    </small>

                  </div>

                )
              }
            )}

          </div>

        </section>

        {/* ====================================================
            CLIENTE / RESPONSÁVEL
        ==================================================== */}

        <section className="dashboard-grid">

          {/* CLIENTES */}

          <div className="dashboard-panel">

            <div className="panel-header">

              <div>

                <h3>
                  Demandas Por Cliente
                </h3>

                <small>
                  Distribuição Por Cliente
                </small>

              </div>

              <span>
                {clientes.length}
              </span>

            </div>

            {clientes.length === 0 ? (

              <div className="empty-state">

                <div>
                  📊
                </div>

                <p>
                  Nenhuma Demanda Cadastrada.
                </p>

              </div>

            ) : (

              <div className="ranking-list">

                {clientes.map(
                  (
                    [cliente, quantidade],
                    index
                  ) => (

                    <div
                      className="ranking-item"
                      key={cliente}
                    >

                      <div className="
                        ranking-position
                      ">
                        {index + 1}
                      </div>

                      <span>
                        {cliente}
                      </span>

                      <strong>
                        {quantidade}
                      </strong>

                    </div>

                  )
                )}

              </div>

            )}

          </div>

          {/* RESPONSÁVEIS */}

          <div className="dashboard-panel">

            <div className="panel-header">

              <div>

                <h3>
                  Demandas Por Analista
                </h3>

                <small>
                  Distribuição Por Analista
                </small>

              </div>

              <span>
                {responsaveis.length}
              </span>

            </div>

            {responsaveis.length === 0 ? (

              <div className="empty-state">

                <div>
                  👥
                </div>

                <p>
                  Nenhuma Demanda Cadastrada.
                </p>

              </div>

            ) : (

              <div className="ranking-list">

                {responsaveis.map(
                  (
                    [responsavel, quantidade],
                    index
                  ) => (

                    <div
                      className="ranking-item"
                      key={responsavel}
                    >

                      <div className="
                        ranking-position
                      ">
                        {index + 1}
                      </div>

                      <span>
                        {responsavel}
                      </span>

                      <strong>
                        {quantidade}
                      </strong>

                    </div>

                  )
                )}

              </div>

            )}

          </div>

        </section>

        {/* ====================================================
            CRITICIDADES
        ==================================================== */}

        <section
          className="
            dashboard-panel
            priority-panel
          "
        >

          <div className="panel-header">

            <div>

              <h3>
                Demandas Por Criticidade
              </h3>

              <small>
                Distribuição Por Criticidade
              </small>

            </div>

            <span>
              {totalDemandas}
            </span>

          </div>

          <div className="priority-list">

            {prioridades.map(
              (prioridade) => {

                const quantidade =
                  porPrioridade[
                    prioridade
                  ] || 0

                const classe =
                  gerarClasse(
                    prioridade
                  )

                const percentual =
                  totalDemandas > 0
                    ? Math.round(
                        (quantidade /
                          totalDemandas) *
                          100
                      )
                    : 0

                return (

                  <div
                    className="
                      priority-item
                    "
                    key={prioridade}
                  >

                    <div className="priority-info">

                      <span
                        className={`
                          priority-dot
                          ${classe}
                        `}
                      />

                      <span>
                        {prioridade}
                      </span>

                      <strong>
                        {quantidade}
                      </strong>

                    </div>

                    <div className="
                      priority-progress
                    ">

                      <div
                        className={`
                          priority-progress-bar
                          ${classe}
                        `}
                        style={{
                          width:
                            `${percentual}%`,
                        }}
                      />

                    </div>

                    <small>
                      {percentual}%
                    </small>

                  </div>

                )
              }
            )}

          </div>

        </section>


        {/* ====================================================
            TMA E PRODUTIVIDADE
        ==================================================== */}

        <section className="dashboard-panel dashboard-performance-panel">

          <div className="panel-header">
            <div>
              <h3>Tempo E Produtividade</h3>
              <small>Indicadores Gerenciais Conforme As Regras Do SLA</small>
            </div>
            <span>{demandasConcluidas.length}</span>
          </div>

          <div className="performance-summary">
            <div className="performance-card performance-card-tma">
              <strong>{formatarDiasUteis(tmaTotal)}</strong>
              <span>TMA Médio</span>
            </div>
            <div className="performance-card performance-card-on-time">
              <strong>{conclusoesDentroDoPrazo.length}</strong>
              <span>Concluídas No Prazo</span>
            </div>
            <div className="performance-card performance-card-late">
              <strong>{conclusoesForaDoPrazo}</strong>
              <span>Concluídas Fora Do Prazo</span>
            </div>
            <div className="performance-card performance-card-efficiency">
              <strong>{eficienciaPrazo}%</strong>
              <span>Eficiência No Prazo</span>
            </div>
            <div className="performance-card performance-card-points">
              <strong>{pontosComplexidade}</strong>
              <span>Pontos De Volume/Complexidade</span>
            </div>
            <div className="performance-card performance-card-reopen">
              <strong>{tmaPosReabertura ? formatarDiasUteis(tmaPosReabertura) : '—'}</strong>
              <span>TMA Após Reabertura</span>
            </div>
          </div>

          <div className="performance-ranking">
            <div className="performance-ranking-header">
              <strong>Produtividade Dos Analistas</strong>
              <small>Eficiência + Volume/Complexidade</small>
            </div>

            {produtividadePorAnalista.length === 0 ? (
              <div className="empty-state">
                <div>📊</div>
                <p>Nenhuma Demanda Concluída Para Calcular Produtividade.</p>
              </div>
            ) : (
              <div className="performance-table">
                <div className="performance-table-row performance-table-head">
                  <span>#</span>
                  <span>Analista</span>
                  <span>Concluídas</span>
                  <span>No Prazo</span>
                  <span>Eficiência</span>
                  <span>Pontos</span>
                  <span>TMA</span>
                </div>
                {produtividadePorAnalista.map((item, index) => (
                  <div className="performance-table-row" key={item.analista}>
                    <span>{index + 1}</span>
                    <strong>{item.analista}</strong>
                    <span>{item.concluidas}</span>
                    <span>{item.dentroPrazo}</span>
                    <span>{item.eficiencia}%</span>
                    <span>{item.pontos}</span>
                    <span>{formatarDiasUteis(item.tmaMedio)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="performance-note">
            O Ranking É Um Indicador Gerencial E Não Deve Ser Interpretado Isoladamente Como Avaliação Automática De Desempenho.
          </p>

        </section>

        {/* ====================================================
            DEMANDAS QUE EXIGEM ATENÇÃO
        ==================================================== */}

        <section
          className="
            dashboard-panel
            attention-panel
          "
        >

          <div className="panel-header">

            <div>

              <h3>
                Demandas Que Exigem Atenção
              </h3>

              <small>
                Atrasadas, Pendentes,
                Críticas Ou Próximas Do Vencimento
              </small>

            </div>

            <span className="
              attention-counter
            ">
              {demandasAtencao.length}
            </span>

          </div>

          {demandasAtencao.length === 0 ? (

            <div className="attention-empty">

              <span>
                ✓
              </span>

              <div>

                <strong>
                  Nenhuma Demanda Exige Atenção.
                </strong>

                <small>
                  Não Existem Demandas Atrasadas
                  Ou Com Situação Crítica No Momento.
                </small>

              </div>

            </div>

          ) : (

            <div className="attention-list">

              {demandasAtencao
                .slice(0, 8)
                .map((demanda) => {

                  const atrasada =
                    estaAtrasada(demanda)

                  const proxima =
                    estaProximaDoVencimento(
                      demanda
                    )

                  let classe =
                    'attention-normal'

                  let texto =
                    'Atenção'

                  if (atrasada) {

                    classe =
                      'attention-atrasada'

                    texto =
                      'Atrasada'

                  } else if (
                    demanda.status ===
                    'Com Pendências'
                  ) {

                    classe =
                      'attention-pendencia'

                    texto =
                      'Com Pendências'

                  } else if (
                    demanda.prioridade ===
                      'Crítica'
                  ) {

                    classe =
                      'attention-crítica'

                    texto =
                      demanda.prioridade

                  } else if (proxima) {

                    classe =
                      'attention-prazo'

                    texto =
                      'Próxima Do Vencimento'

                  }

                  return (

                    <div
                      className={`
                        attention-item
                        ${classe}
                      `}
                      key={demanda.id}
                    >

                      <div className="
                        attention-main
                      ">

                        <strong>
                          {demanda.titulo}
                        </strong>

                        <small>
                          #{demanda.id}
                        </small>

                      </div>

                      <div className="
                        attention-details
                      ">

                        <span>
                          {demanda.cliente}
                        </span>

                        <span>
                          {demanda.responsavel}
                        </span>

                        <span>
                          Prazo: {demanda.prazo}
                        </span>

                      </div>

                      <span className="
                        attention-badge
                      ">
                        {texto}
                      </span>

                    </div>

                  )

                })}

            </div>

          )}

        </section>

        {/* ====================================================
            RESUMO FINAL
        ==================================================== */}

        <section className="
          dashboard-footer-summary
        ">

          <div>

            <strong>
              {totalDemandas}
            </strong>

            <span>
              Total De Demandas
            </span>

          </div>

          <div>

            <strong>
              {demandasAbertas}
            </strong>

            <span>
              Em Aberto
            </span>

          </div>

          <div>

            <strong className="
              footer-danger
            ">
              {demandasAtrasadas}
            </strong>

            <span>
              Atrasadas
            </span>

          </div>

          <div>

            <strong className="
              footer-success
            ">
              {concluidas}
            </strong>

            <span>
              Concluídas
            </span>

          </div>

          <div>

            <strong className="
              footer-danger
            ">
              {criticas}
            </strong>

            <span>
              Críticas
            </span>

          </div>

        </section>

      </main>
    </MenuPrincipal>
  )

}

export default Dashboard