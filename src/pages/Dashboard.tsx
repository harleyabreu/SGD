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
import type { Usuario } from '../types'
import MenuPrincipal from '../components/MenuPrincipal'
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

  const totalDemandas = demandas.length

  const demandasAbertas = demandas.filter(
    (demanda) =>
      demanda.status !== 'Concluída' &&
      demanda.status !== 'Cancelada'
  ).length

  const demandasAtrasadas = demandas.filter(
    (demanda) => estaAtrasada(demanda)
  ).length

  const emAtendimento = demandas.filter(
    (demanda) =>
      demanda.status === 'Em Atendimento'
  ).length

  const comPendencias = demandas.filter(
    (demanda) =>
      demanda.status === 'Com Pendências'
  ).length

  const concluidas = demandas.filter(
    (demanda) =>
      demanda.status === 'Concluída'
  ).length

  const aguardando = demandas.filter(
    (demanda) =>
      demanda.status === 'Aguardando'
  ).length

  const novas = demandas.filter(
    (demanda) =>
      demanda.status === 'Nova'
  ).length

  const canceladas = demandas.filter(
    (demanda) =>
      demanda.status === 'Cancelada'
  ).length

  const proximasDoVencimento =
    demandas.filter(
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
    demandas,
    'cliente'
  )

  const porResponsavel = contarPorCampo(
    demandas,
    'responsavel'
  )

  const porPrioridade = contarPorCampo(
    demandas,
    'prioridade'
  )

  const porStatus = contarPorCampo(demandas, 'status')

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

  // Somente estes status fazem parte da interface oficial.
  const statusOrdem = statusOrdemBase

  // ==========================================================
  // DEMANDAS QUE EXIGEM ATENÇÃO
  // ==========================================================

  const demandasAtencao = demandas
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

  const demandasConcluidas = demandas.filter(
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
      subtitulo="Dashboard do Gestor"
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
                      } não lidas
                    </small>
                  </div>

                  {notificacoesNaoLidas.length > 0 && (
                    <button
                      type="button"
                      className="notificacoes-marcar-todas"
                      onClick={
                        marcarTodasNotificacoesComoLidas
                      }
                    >
                      Marcar todas como lidas
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
                        Nenhuma notificação.
                      </strong>

                      <small>
                        Não existem alertas ou ocorrências
                        pendentes no momento.
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
                    Exibindo as 12 notificações mais recentes.
                  </div>
                )}

                <div className="notificacoes-canal">
                  <span>
                    Canal do protótipo: dentro do sistema
                  </span>
                </div>

        </>
      }
      rodapeAcoes={
        <>
          <div>
            <strong style={{ color: '#0f172a', fontSize: 12 }}>Gestão de Demandas de TI</strong>
            <span style={{ marginLeft: 8, color: '#64748b', fontSize: 11 }}>Dashboard do Gestor</span>
          </div>
          <div style={{ color: '#64748b', fontSize: 11 }}>PRODEPA</div>
        </>
      }
    >
      <main className="dashboard-content">

        {/* ====================================================
            TÍTULO
        ==================================================== */}

        <div className="page-title">

          <div>

            <h2
              style={{
                margin: 0,
                fontSize: 29,
                lineHeight: 1.2,
                fontWeight: 700,
                color: '#173b68',
              }}
            >
              Visão Geral
            </h2>

            <p
              style={{
                margin: '0',
                color: '#718096',
                fontSize: 15,
                lineHeight: 1.3,
              }}
            >
              Acompanhe o andamento das demandas de TI.
            </p>

          </div>

          <div className="dashboard-update">

            <span className="update-dot" />

            <span>
              Dados atualizados
            </span>

          </div>

        </div>

        {/* ====================================================
            FILTROS
        ==================================================== */}

        <section className="dashboard-filters">

          <div className="filter-title">

            <strong>
              Filtros do Dashboard
            </strong>

            <small>
              Utilize os filtros para analisar
              as demandas.
            </small>

          </div>

          <div className="filter-grid">

            <div className="filter-field">

              <label>
                Período
              </label>

              <select defaultValue="Todos">

                <option value="Todos">
                  Todos
                </option>

                <option>
                  Hoje
                </option>

                <option>
                  Últimos 7 dias
                </option>

                <option>
                  Últimos 30 dias
                </option>

                <option>
                  Este mês
                </option>

              </select>

            </div>

            <div className="filter-field">

              <label>
                Cliente
              </label>

              <select defaultValue="Todos">

                <option value="Todos">
                  Todos os clientes
                </option>

                {clientes.map(
                  ([cliente]) => (
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

              <select defaultValue="Todos">

                <option value="Todos">
                  Todos os responsáveis
                </option>

                {responsaveis.map(
                  ([responsavel]) => (
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
                Prioridade
              </label>

              <select defaultValue="Todas">

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

              <select defaultValue="Todos">

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

              <select defaultValue="Todas">

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
                Exigem atenção
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
                Em execução
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
                Aguardando resolução
              </small>

            </div>

          </div>

          {/* CONCLUÍDAS */}

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
                Demandas finalizadas
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
                Aguardando definição
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
                Prioridade máxima
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
              Em execução
            </span>

          </div>

          <div className="operational-item">

            <span className="operational-number">
              {comPendencias}
            </span>

            <span className="operational-label">
              Com pendências
            </span>

          </div>

          <div className="operational-item">

            <span className="operational-number">
              {proximasDoVencimento}
            </span>

            <span className="operational-label">
              Próximas do vencimento
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
            NOVO QUADRO — DEMANDAS URGENTES
        ==================================================== */}

        <section
          className="dashboard-panel"
          style={{
            marginBottom: '24px',
            borderLeft: '4px solid #dc2626',
          }}
        >

          <div className="panel-header">

            <div>

              <h3>
                🚨 Demandas Críticas
              </h3>

              <small>
                Demandas com prioridade máxima que exigem
                acompanhamento do gestor.
              </small>

            </div>

            <span
              style={{
                fontWeight: 700,
                color:
                  criticas > 0
                    ? '#dc2626'
                    : '#16a34a',
              }}
            >
              {pluralizar(
                criticas,
                'demanda crítica',
                'demandas criticas'
              )}
            </span>

          </div>

          {demandasCriticas.length === 0 ? (

            <div className="attention-empty">

              <span>
                ✓
              </span>

              <div>

                <strong>
                  Nenhuma demanda crítica.
                </strong>

                <small>
                  Não existem demandas com prioridade
                  máxima no momento.
                </small>

              </div>

            </div>

          ) : (

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                paddingTop: '12px',
              }}
            >

              {demandasCriticas
                .slice(0, 8)
                .map((demanda) => {

                  const atrasada =
                    estaAtrasada(demanda)

                  return (

                    <div
                      key={demanda.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns:
                          'minmax(220px, 2fr) 1fr 1fr 120px 130px',
                        gap: '16px',
                        alignItems: 'center',
                        padding: '14px 16px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        background:
                          atrasada
                            ? '#fff5f5'
                            : '#fff',
                      }}
                    >

                      {/* TÍTULO */}

                      <div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '4px',
                          }}
                        >

                          <strong>
                            {demanda.titulo}
                          </strong>

                          {atrasada && (
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                color: '#dc2626',
                                background: '#fee2e2',
                                padding: '3px 7px',
                                borderRadius: '999px',
                              }}
                            >
                              ATRASADA
                            </span>
                          )}

                        </div>

                        <small
                          style={{
                            color: '#64748b',
                          }}
                        >
                          #{demanda.id}
                        </small>

                      </div>

                      {/* CLIENTE */}

                      <div>

                        <small
                          style={{
                            display: 'block',
                            color: '#64748b',
                            marginBottom: '3px',
                          }}
                        >
                          Cliente
                        </small>

                        <strong>
                          {demanda.cliente}
                        </strong>

                      </div>

                      {/* RESPONSÁVEL */}

                      <div>

                        <small
                          style={{
                            display: 'block',
                            color: '#64748b',
                            marginBottom: '3px',
                          }}
                        >
                          Responsável
                        </small>

                        <strong>
                          {demanda.responsavel}
                        </strong>

                      </div>

                      {/* PRAZO */}

                      <div>

                        <small
                          style={{
                            display: 'block',
                            color: '#64748b',
                            marginBottom: '3px',
                          }}
                        >
                          Prazo
                        </small>

                        <strong
                          style={{
                            color:
                              atrasada
                                ? '#dc2626'
                                : '#1e293b',
                          }}
                        >
                          {formatarPrazoEfetivo(demanda) || '-'}
                        </strong>

                      </div>

                      {/* STATUS */}

                      <div>

                        <small
                          style={{
                            display: 'block',
                            color: '#64748b',
                            marginBottom: '5px',
                          }}
                        >
                          Status
                        </small>

                        <span
                          style={{
                            display: 'inline-block',
                            fontSize: '12px',
                            fontWeight: 600,
                            padding: '5px 9px',
                            borderRadius: '999px',
                            background:
                              demanda.status ===
                              'Concluída'
                                ? '#dcfce7'
                                : demanda.status ===
                                  'Com Pendências'
                                ? '#ffedd5'
                                : '#dbeafe',
                            color:
                              demanda.status ===
                              'Concluída'
                                ? '#166534'
                                : demanda.status ===
                                  'Com Pendências'
                                ? '#c2410c'
                                : '#1d4ed8',
                          }}
                        >
                          {demanda.status}
                        </span>

                      </div>

                    </div>

                  )
                })}

              {demandasCriticas.length > 8 && (

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '10px',
                  }}
                >

                  <small
                    style={{
                      color: '#64748b',
                    }}
                  >
                    Exibindo as primeiras 8 demandas
                    criticas.
                  </small>

                  {onTodasDemandas && (

                    <button
                      onClick={onTodasDemandas}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#1d4ed8',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Ver todas as demandas →
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
                  Demandas por Cliente
                </h3>

                <small>
                  Distribuição por cliente
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
                  Nenhuma demanda cadastrada.
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
                  Demandas por Analista
                </h3>

                <small>
                  Distribuição por analista
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
                  Nenhuma demanda cadastrada.
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
            PRIORIDADES
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
                Demandas por Prioridade
              </h3>

              <small>
                Distribuição por criticidade
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
              <h3>Tempo e Produtividade</h3>
              <small>Indicadores gerenciais conforme as regras do SLA</small>
            </div>
            <span>{demandasConcluidas.length}</span>
          </div>

          <div className="performance-summary">
            <div className="performance-card">
              <strong>{formatarDiasUteis(tmaTotal)}</strong>
              <span>TMA médio</span>
            </div>
            <div className="performance-card">
              <strong>{conclusoesDentroDoPrazo.length}</strong>
              <span>Concluídas no prazo</span>
            </div>
            <div className="performance-card">
              <strong>{conclusoesForaDoPrazo}</strong>
              <span>Concluídas fora do prazo</span>
            </div>
            <div className="performance-card">
              <strong>{eficienciaPrazo}%</strong>
              <span>Eficiência no prazo</span>
            </div>
            <div className="performance-card">
              <strong>{pontosComplexidade}</strong>
              <span>Pontos de volume/complexidade</span>
            </div>
            <div className="performance-card">
              <strong>{tmaPosReabertura ? formatarDiasUteis(tmaPosReabertura) : '—'}</strong>
              <span>TMA após reabertura</span>
            </div>
          </div>

          <div className="performance-ranking">
            <div className="performance-ranking-header">
              <strong>Produtividade dos Analistas</strong>
              <small>Eficiência + volume/complexidade</small>
            </div>

            {produtividadePorAnalista.length === 0 ? (
              <div className="empty-state">
                <div>📊</div>
                <p>Nenhuma demanda concluída para calcular produtividade.</p>
              </div>
            ) : (
              <div className="performance-table">
                <div className="performance-table-row performance-table-head">
                  <span>#</span>
                  <span>Analista</span>
                  <span>Concluídas</span>
                  <span>No prazo</span>
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
            O ranking é um indicador gerencial e não deve ser interpretado isoladamente como avaliação automática de desempenho.
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
                Demandas que Exigem Atenção
              </h3>

              <small>
                Atrasadas, pendentes,
                criticas ou próximas do vencimento
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
                  Nenhuma demanda exige atenção.
                </strong>

                <small>
                  Não existem demandas atrasadas
                  ou com situação crítica no momento.
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
                      'Crítica' ||
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
                      'Próxima do vencimento'

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
              Total de demandas
            </span>

          </div>

          <div>

            <strong>
              {demandasAbertas}
            </strong>

            <span>
              Em aberto
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