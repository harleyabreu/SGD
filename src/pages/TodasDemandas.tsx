// V 2.4 — PADRÃO VISUAL EXATO DA DASHBOARD — preserva integralmente a base V1.8; lista, filtros, Kanban, paginação e ações em massa.
// ============================================================
// V 1.8
// Gestão de Demandas de TI
// Arquivo: TodasDemandas.tsx
// Tela: Todas as Demandas / Lista / Kanban
//
// BASE PRESERVADA: V 1.6
//
// EVOLUÇÕES PRESERVADAS
// - V 1.0: Filtros funcionais, pesquisa ampliada, destaque de Crítica,
//   destaque de Atrasada, prazo vencido em vermelho, Kanban e lista aprimorados
// - V 1.1: Situação, período, ordenação, próximas do vencimento, resumo operacional
//   e status Aguardando
// - V 1.2: Drag and Drop no Kanban e alteração de status ao soltar
// - V 1.3: Paginação da Lista, quantidade por página e navegação entre páginas
// - V 1.5: Padronização do fluxo e remoção de Em Processo da interface
// - V 1.6: Consolidação global do fluxo em 5 status e compatibilidade com dados legados
//
// EVOLUÇÃO V 1.8
// - Preservação integral das funcionalidades da V 1.6
// - Seleção múltipla de demandas na Lista e no Kanban
// - Seleção individual por checkbox
// - Selecionar/desmarcar todas as demandas atualmente filtradas
// - Barra de ações em massa com contador de selecionadas
// - Alteração de status de várias demandas simultaneamente
// - Confirmação antes de executar alteração de status em massa
// - Limpeza automática da seleção após alteração em massa
// - Exportação das demandas filtradas para CSV
// - Exportação respeita os filtros e a ordenação atualmente aplicados
// - Tratamento de caracteres especiais para abertura correta no Excel/LibreOffice
// - Compatibilidade mantida com o fluxo oficial de 5 status
//
// CONTEMPLA NA APLICAÇÃO
// - Lista e Kanban
// - Pesquisa ampliada
// - Filtros por cliente, responsável, status, prioridade, situação e período
// - Ordenação dos resultados
// - Resumo operacional
// - Destaques de Crítica, Atrasada e prazo vencido
// - Drag and Drop no Kanban
// - Paginação na Lista
// - Acesso aos detalhes da demanda
// - Seleção múltipla e ações em massa
// - Exportação CSV dos resultados filtrados
// - Fluxo oficial: Nova, Aguardando, Em Atendimento, Com Pendências e Concluída
// - 'Em Processo' não existe na interface e dados legados são convertidos
// ============================================================

import { useMemo, useState } from 'react'
import type { DragEvent } from 'react'
import type { Demanda } from '../types'
import MenuPrincipal from '../components/MenuPrincipal'
import './TodasDemandas.css'

type Props = {
  demandas: Demanda[]
  onVoltar: () => void
  onNovaDemanda: () => void
  onAlterarStatus: (id: number, novoStatus: string) => void
  onAlterarStatusEmMassa?: (ids: number[], novoStatus: string) => void
  onAbrirDetalhe?: (demanda: Demanda) => void

  nomeUsuario: string
  perfilUsuario: string
  onDashboard: () => void
  onTodasDemandas: () => void
  onClientes: () => void
  onResponsaveis: () => void
  onFeriados: () => void
  onRelatorios: () => void
  onConfiguracoes?: () => void
  onLogout: () => void
}

// ============================================================
// STATUS DO SISTEMA
// ============================================================

const STATUS = [
  'Nova',
  'Aguardando',
  'Em Atendimento',
  'Com Pendências',
  'Concluída',
]

// ============================================================
// PRIORIDADES
// ============================================================

const PRIORIDADES = [
  'Crítica',
  'Alta',
  'Média',
  'Baixa',
]

// ============================================================
// FUNÇÃO PARA CONVERTER DATA
// Aceita:
// YYYY-MM-DD
// DD/MM/YYYY
// ============================================================

function converterData(data: string): Date | null {
  if (!data) {
    return null
  }

  const valor = data.trim()

  if (!valor) {
    return null
  }

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [ano, mes, dia] = valor
      .split('-')
      .map(Number)

    const resultado = new Date(
      ano,
      mes - 1,
      dia
    )

    resultado.setHours(0, 0, 0, 0)

    return resultado
  }

  // DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(valor)) {
    const [dia, mes, ano] = valor
      .split('/')
      .map(Number)

    const resultado = new Date(
      ano,
      mes - 1,
      dia
    )

    resultado.setHours(0, 0, 0, 0)

    return resultado
  }

  return null
}

// ============================================================
// COMPATIBILIDADE COM DADOS LEGADOS
// "Em Processo" foi descontinuado. Dados antigos são tratados
// como "Em Atendimento" para não perder demandas existentes.
// ============================================================

function normalizarStatus(status: string): string {
  return status === 'Em Processo' ? 'Em Atendimento' : status
}

// ============================================================
// VERIFICA SE A DEMANDA ESTÁ ATRASADA
// ============================================================

function estaAtrasada(demanda: Demanda): boolean {
  if (
    demanda.status === 'Concluída'
  ) {
    return false
  }

  if (!demanda.prazo) {
    return false
  }

  const prazo = converterData(
    demanda.prazo
  )

  if (!prazo) {
    return false
  }

  const hoje = new Date()

  hoje.setHours(
    0,
    0,
    0,
    0
  )

  return prazo < hoje
}

// ============================================================
// VERIFICA SE ESTÁ PRÓXIMA DO VENCIMENTO (7 DIAS)
// ============================================================

function estaProximaDoVencimento(demanda: Demanda): boolean {
  if (
    demanda.status === 'Concluída' ||
    !demanda.prazo
  ) {
    return false
  }

  const prazo = converterData(demanda.prazo)

  if (!prazo) {
    return false
  }

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const limite = new Date(hoje)
  limite.setDate(limite.getDate() + 7)

  return prazo >= hoje && prazo <= limite
}

// ============================================================
// PESO DA PRIORIDADE PARA ORDENAÇÃO
// ============================================================

function pesoPrioridade(prioridade: string): number {
  switch (prioridade) {
    case 'Crítica':
      return 5
    case 'Alta':
      return 3
    case 'Média':
      return 2
    case 'Baixa':
      return 1
    default:
      return 0
  }
}

// ============================================================
// CLASSE DE PRIORIDADE
// ============================================================

function obterClassePrioridade(
  valor: string
) {
  switch (valor) {

    case 'Crítica':
      return 'prioridade critica'

    case 'Alta':
      return 'prioridade alta'

    case 'Média':
      return 'prioridade media'

    case 'Baixa':
      return 'prioridade baixa'

    default:
      return 'prioridade baixa'
  }
}

// ============================================================
// CLASSE DE STATUS
// ============================================================

function obterClasseStatus(
  valor: string
) {
  switch (valor) {

    case 'Nova':
      return 'status nova'

    case 'Aguardando':
      return 'status aguardando'

    case 'Em Atendimento':
      return 'status atendimento'

    case 'Com Pendências':
      return 'status pendencias'

    case 'Concluída':
      return 'status concluida'

    default:
      return 'status nova'
  }
}

// ============================================================
// CLASSE DA COLUNA KANBAN
// ============================================================

function obterClasseColuna(
  valor: string
) {
  switch (valor) {

    case 'Nova':
      return 'coluna coluna-nova'

    case 'Aguardando':
      return 'coluna coluna-aguardando'

    case 'Em Atendimento':
      return 'coluna coluna-atendimento'

    case 'Com Pendências':
      return 'coluna coluna-pendencias'

    case 'Concluída':
      return 'coluna coluna-concluida'

    default:
      return 'coluna'
  }
}

// ============================================================
// FORMATA DATA
// ============================================================

function formatarData(
  data: string
) {
  if (!data) {
    return '-'
  }

  const partes = data.split('-')

  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`
  }

  return data
}

// ============================================================
// COMPONENTE
// ============================================================

export default function TodasDemandas({
  demandas,
  onNovaDemanda,
  onAlterarStatus,
  onAlterarStatusEmMassa,
  onAbrirDetalhe,
  nomeUsuario,
  perfilUsuario,
  onDashboard,
  onTodasDemandas,
  onClientes,
  onResponsaveis,
  onFeriados,
  onRelatorios,
  onConfiguracoes,
  onLogout,
}: Props) {

  const demandasNormalizadas = useMemo(
    () => demandas.map((demanda) => ({
      ...demanda,
      status: normalizarStatus(demanda.status),
      prioridade: demanda.prioridade === 'Crítica' ? 'Crítica' : demanda.prioridade,
    })),
    [demandas]
  )

  // ==========================================================
  // ESTADOS
  // ==========================================================

  const [
    visualizacao,
    setVisualizacao
  ] = useState<
    'lista' | 'kanban'
  >('lista')

  const [
    pesquisa,
    setPesquisa
  ] = useState('')

  const [
    cliente,
    setCliente
  ] = useState('')

  const [
    responsavel,
    setResponsavel
  ] = useState('')

  const [
    status,
    setStatus
  ] = useState('')

  const [
    prioridade,
    setPrioridade
  ] = useState('')

  const [
    situacao,
    setSituacao
  ] = useState('')

  const [
    periodo,
    setPeriodo
  ] = useState('')

  const [
    ordenacao,
    setOrdenacao
  ] = useState('mais-recentes')

  const [
    filtroAplicado,
    setFiltroAplicado
  ] = useState(false)

  // ==========================================================
  // V 1.2 — DRAG AND DROP DO KANBAN
  // ==========================================================

  const [demandaArrastada, setDemandaArrastada] =
    useState<number | null>(null)

  const [colunaDestino, setColunaDestino] =
    useState<string | null>(null)

  // ==========================================================
  // V 1.3 — PAGINAÇÃO DA LISTA
  // ==========================================================

  const [paginaAtual, setPaginaAtual] =
    useState(1)

  const [itensPorPagina, setItensPorPagina] =
    useState(10)

  // ==========================================================
  // V 1.7 — SELEÇÃO MÚLTIPLA E AÇÕES EM MASSA
  // ==========================================================

  const [demandasSelecionadas, setDemandasSelecionadas] =
    useState<number[]>([])

  const [statusEmMassa, setStatusEmMassa] =
    useState('')

  // ==========================================================
  // LISTAS PARA FILTROS
  // ==========================================================

  const clientes = useMemo(() => {

    return [
      ...new Set(
        demandas
          .map(
            (d) => d.cliente
          )
          .filter(Boolean)
      ),
    ].sort()

  }, [demandas])

  const responsaveis = useMemo(() => {

    return [
      ...new Set(
        demandas
          .map(
            (d) => d.responsavel
          )
          .filter(Boolean)
      ),
    ].sort()

  }, [demandas])

  // ==========================================================
  // FILTRAGEM
  // ==========================================================

  const demandasFiltradas = useMemo(() => {

    const filtradas = demandasNormalizadas.filter(
      (demanda) => {

        const texto =
          pesquisa
            .toLowerCase()
            .trim()

        const correspondePesquisa =
          !texto ||
          demanda.titulo
            .toLowerCase()
            .includes(texto) ||
          demanda.descricao
            .toLowerCase()
            .includes(texto) ||
          demanda.id
            .toString()
            .includes(texto) ||
          demanda.cliente
            .toLowerCase()
            .includes(texto) ||
          demanda.responsavel
            .toLowerCase()
            .includes(texto)

        const correspondeCliente =
          !cliente ||
          demanda.cliente === cliente

        const correspondeResponsavel =
          !responsavel ||
          demanda.responsavel === responsavel

        const correspondeStatus =
          !status ||
          demanda.status === status

        const correspondePrioridade =
          !prioridade ||
          demanda.prioridade === prioridade

        const correspondeSituacao = (() => {
          if (!situacao) {
            return true
          }

          if (situacao === 'abertas') {
            return demanda.status !== 'Concluída'
          }

          if (situacao === 'atrasadas') {
            return estaAtrasada(demanda)
          }

          if (situacao === 'proximas') {
            return estaProximaDoVencimento(demanda)
          }

          if (situacao === 'criticas') {
            return demanda.prioridade === 'Crítica'
          }

          if (situacao === 'concluidas') {
            return demanda.status === 'Concluída'
          }

          return true
        })()

        const correspondePeriodo = (() => {
          if (!periodo || periodo === 'todos') {
            return true
          }

          const prazo = converterData(demanda.prazo)

          if (!prazo) {
            return false
          }

          const hoje = new Date()
          hoje.setHours(0, 0, 0, 0)

          const limite = new Date(hoje)

          if (periodo === '7-dias') {
            limite.setDate(limite.getDate() + 7)
          } else if (periodo === '30-dias') {
            limite.setDate(limite.getDate() + 30)
          } else if (periodo === 'mes-atual') {
            return (
              prazo.getMonth() === hoje.getMonth() &&
              prazo.getFullYear() === hoje.getFullYear()
            )
          } else {
            return true
          }

          return prazo >= hoje && prazo <= limite
        })()

        return (
          correspondePesquisa &&
          correspondeCliente &&
          correspondeResponsavel &&
          correspondeStatus &&
          correspondePrioridade &&
          correspondeSituacao &&
          correspondePeriodo
        )
      }
    )

    return [...filtradas].sort((a, b) => {
      if (ordenacao === 'prazo-proximo') {
        const dataA = converterData(a.prazo)?.getTime() ?? Number.MAX_SAFE_INTEGER
        const dataB = converterData(b.prazo)?.getTime() ?? Number.MAX_SAFE_INTEGER
        return dataA - dataB
      }

      if (ordenacao === 'prazo-distante') {
        const dataA = converterData(a.prazo)?.getTime() ?? 0
        const dataB = converterData(b.prazo)?.getTime() ?? 0
        return dataB - dataA
      }

      if (ordenacao === 'prioridade') {
        return pesoPrioridade(b.prioridade) - pesoPrioridade(a.prioridade)
      }

      if (ordenacao === 'titulo') {
        return a.titulo.localeCompare(b.titulo, 'pt-BR')
      }

      return Number(b.id) - Number(a.id)
    })

  }, [
    demandasNormalizadas,
    pesquisa,
    cliente,
    responsavel,
    status,
    prioridade,
    situacao,
    periodo,
    ordenacao,
  ])

  const resumoOperacional = useMemo(() => {
    return {
      total: demandasFiltradas.length,
      atrasadas: demandasFiltradas.filter(estaAtrasada).length,
      criticas: demandasFiltradas.filter(
        (demanda) => demanda.prioridade === 'Crítica'
      ).length,
      proximas: demandasFiltradas.filter(estaProximaDoVencimento).length,
      concluidas: demandasFiltradas.filter(
        (demanda) => demanda.status === 'Concluída'
      ).length,
    }
  }, [demandasFiltradas])

  // ==========================================================
  // V 1.3 — CÁLCULO DA PAGINAÇÃO
  // ==========================================================

  const totalPaginas = Math.max(
    1,
    Math.ceil(
      demandasFiltradas.length / itensPorPagina
    )
  )

  const paginaSegura = Math.min(
    paginaAtual,
    totalPaginas
  )

  const indiceInicial =
    (paginaSegura - 1) * itensPorPagina

  const indiceFinal =
    indiceInicial + itensPorPagina

  const demandasPaginadas = useMemo(() => {
    return demandasFiltradas.slice(
      indiceInicial,
      indiceFinal
    )
  }, [
    demandasFiltradas,
    indiceInicial,
    indiceFinal,
  ])

  const inicioExibicao =
    demandasFiltradas.length === 0
      ? 0
      : indiceInicial + 1

  const fimExibicao = Math.min(
    indiceFinal,
    demandasFiltradas.length
  )

  // ==========================================================
  // LIMPAR FILTROS
  // ==========================================================

  // ==========================================================
  // V 1.2 — EVENTOS DO DRAG AND DROP
  // ==========================================================

  function iniciarArraste(
    event: DragEvent<HTMLDivElement>,
    demanda: Demanda
  ) {
    setDemandaArrastada(demanda.id)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData(
      'text/plain',
      String(demanda.id)
    )
  }

  function finalizarArraste() {
    setDemandaArrastada(null)
    setColunaDestino(null)
  }

  function entrarNaColuna(
    event: DragEvent<HTMLDivElement>,
    statusDestino: string
  ) {
    event.preventDefault()

    if (demandaArrastada === null) {
      return
    }

    event.dataTransfer.dropEffect = 'move'
    setColunaDestino(statusDestino)
  }

  function sairDaColuna(
    event: DragEvent<HTMLDivElement>,
    statusDestino: string
  ) {
    const currentTarget = event.currentTarget
    const relatedTarget = event.relatedTarget as Node | null

    if (relatedTarget && currentTarget.contains(relatedTarget)) {
      return
    }

    if (colunaDestino === statusDestino) {
      setColunaDestino(null)
    }
  }

  function soltarNaColuna(
    event: DragEvent<HTMLDivElement>,
    statusDestino: string
  ) {
    event.preventDefault()

    const idTransferido = Number(
      event.dataTransfer.getData('text/plain')
    )

    const id = demandaArrastada ?? idTransferido

    if (!id || !Number.isFinite(id)) {
      finalizarArraste()
      return
    }

    const demanda = demandasNormalizadas.find(
      (item) => item.id === id
    )

    if (demanda && demanda.status !== statusDestino) {
      onAlterarStatus(id, statusDestino)
    }

    finalizarArraste()
  }

  function limparFiltros() {

    setPesquisa('')
    setCliente('')
    setResponsavel('')
    setStatus('')
    setPrioridade('')
    setSituacao('')
    setPeriodo('')
    setOrdenacao('mais-recentes')
    setFiltroAplicado(false)
    setPaginaAtual(1)
  }

  // ==========================================================
  // APLICAR FILTROS
  // ==========================================================

  function aplicarFiltros() {

    setFiltroAplicado(true)
    setPaginaAtual(1)
  }

  function alterarItensPorPagina(valor: number) {
    setItensPorPagina(valor)
    setPaginaAtual(1)
  }

  function irParaPagina(pagina: number) {
    const paginaDestino = Math.min(
      Math.max(1, pagina),
      totalPaginas
    )

    setPaginaAtual(paginaDestino)
  }

  // ==========================================================
  // V 1.7 — CONTROLE DA SELEÇÃO
  // ==========================================================

  function alternarSelecao(id: number) {
    setDemandasSelecionadas((atuais) =>
      atuais.includes(id)
        ? atuais.filter((item) => item !== id)
        : [...atuais, id]
    )
  }

  function selecionarTodasFiltradas() {
    const ids = demandasFiltradas.map((demanda) => demanda.id)
    setDemandasSelecionadas((atuais) => {
      const todasSelecionadas = ids.length > 0 && ids.every((id) => atuais.includes(id))

      if (todasSelecionadas) {
        return atuais.filter((id) => !ids.includes(id))
      }

      return Array.from(new Set([...atuais, ...ids]))
    })
  }

  function limparSelecao() {
    setDemandasSelecionadas([])
    setStatusEmMassa('')
  }

  function executarAlteracaoEmMassa() {
    if (!statusEmMassa || demandasSelecionadas.length === 0) {
      return
    }

    const selecionadasValidas = demandasSelecionadas.filter((id) =>
      demandasNormalizadas.some((demanda) => demanda.id === id)
    )

    if (selecionadasValidas.length === 0) {
      limparSelecao()
      return
    }

    const confirmacao = window.confirm(
      `Deseja alterar o status de ${selecionadasValidas.length} ${
        selecionadasValidas.length === 1 ? 'demanda' : 'demandas'
      } para "${statusEmMassa}"?`
    )

    if (!confirmacao) {
      return
    }

    if (onAlterarStatusEmMassa) {
      onAlterarStatusEmMassa(selecionadasValidas, statusEmMassa)
    } else {
      selecionadasValidas.forEach((id) => {
        onAlterarStatus(id, statusEmMassa)
      })
    }

    limparSelecao()
  }

  // ==========================================================
  // V 1.7 — EXPORTAÇÃO CSV
  // ==========================================================

  function protegerCampoCSV(valor: string) {
    const texto = String(valor ?? '')

    if (/^[=+\-@]/.test(texto)) {
      return `'${texto}`
    }

    return texto
  }

  function escaparCSV(valor: string) {
    const texto = protegerCampoCSV(valor)
    return `"${texto.replace(/"/g, '""')}"`
  }

  function exportarCSV() {
    if (demandasFiltradas.length === 0) {
      window.alert('Não há demandas para exportar com os filtros atuais.')
      return
    }

    const cabecalho = [
      'Código',
      'Título',
      'Descrição',
      'Cliente',
      'Responsável',
      'Prioridade',
      'Prazo',
      'Situação',
      'Status',
      'Observações',
    ]

    const linhas = demandasFiltradas.map((demanda) => [
      demanda.id,
      demanda.titulo,
      demanda.descricao,
      demanda.cliente,
      demanda.responsavel,
      demanda.prioridade,
      formatarData(demanda.prazo),
      estaAtrasada(demanda)
        ? 'Atrasada'
        : estaProximaDoVencimento(demanda)
          ? 'Próxima do vencimento'
          : demanda.status === 'Concluída'
            ? 'Concluída'
            : 'No prazo',
      demanda.status,
      demanda.observacao || '',
    ])

    const conteudo = [
      cabecalho.map(escaparCSV).join(';'),
      ...linhas.map((linha) =>
        linha.map((valor) => escaparCSV(String(valor))).join(';')
      ),
    ].join('\r\n')

    const blob = new Blob([`\uFEFF${conteudo}`], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const dataArquivo = new Date().toISOString().slice(0, 10)

    link.href = url
    link.download = `demandas_${dataArquivo}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // ==========================================================
  // RENDERIZAÇÃO DO CARD DA LISTA
  // ==========================================================

  function renderCard(
    demanda: Demanda
  ) {
    const atrasada = estaAtrasada(demanda)
    const prioridadeCritica = demanda.prioridade === 'Crítica'

    return (
      <div
        className={`demanda-card ${atrasada ? 'demanda-atrasada' : ''} ${prioridadeCritica ? 'demanda-critica' : ''} ${demandasSelecionadas.includes(demanda.id) ? 'demanda-selecionada' : ''}`}
        key={demanda.id}
      >
        <div className="demanda-coluna-selecao">
          <label className="selecao-demanda">
            <input
              type="checkbox"
              checked={demandasSelecionadas.includes(demanda.id)}
              onChange={() => alternarSelecao(demanda.id)}
              aria-label={`Selecionar demanda ${demanda.id}`}
            />
          </label>
        </div>

        <div className="demanda-coluna-titulo">
          <span className="numero-demanda">#{demanda.id}</span>
          <h3>{demanda.titulo}</h3>
        </div>

        <div className="demanda-coluna">
          <span className="campo-label">CLIENTE</span>
          <strong>{demanda.cliente || '—'}</strong>
        </div>

        <div className="demanda-coluna">
          <span className="campo-label">RESPONSÁVEL</span>
          <strong>{demanda.responsavel || '—'}</strong>
        </div>

        <div className="demanda-coluna">
          <span className="campo-label">PRIORIDADE</span>
          <strong className={obterClassePrioridade(demanda.prioridade)}>
            {demanda.prioridade}
          </strong>
        </div>

        <div className="demanda-coluna">
          <span className="campo-label">STATUS</span>
          <span className={obterClasseStatus(demanda.status)}>
            {demanda.status}
          </span>
          {atrasada && <span className="badge-atrasada">ATRASADA</span>}
        </div>

        <div className="demanda-coluna">
          <span className="campo-label">PRAZO</span>
          <strong className={atrasada ? 'prazo-atrasado' : ''}>
            {formatarData(demanda.prazo)}
          </strong>
        </div>

        {onAbrirDetalhe && (
          <div className="demanda-coluna-acoes">
            <button
              type="button"
              onClick={() => onAbrirDetalhe(demanda)}
            >
              ◉&nbsp; Ver detalhes
            </button>
          </div>
        )}
      </div>
    )
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <MenuPrincipal
      ativo="todas-demandas"
      nomeUsuario={nomeUsuario}
      perfilUsuario={perfilUsuario}
      onDashboard={onDashboard}
      onTodasDemandas={onTodasDemandas}
      onNovaDemanda={onNovaDemanda}
      onClientes={onClientes}
      onResponsaveis={onResponsaveis}
      onFeriados={onFeriados}
      onRelatorios={onRelatorios}
      onConfiguracoes={onConfiguracoes}
      onSair={onLogout}
      subtitulo="Todas as Demandas"
    >

      {/* ======================================================
          PÁGINA
      ====================================================== */}

      <div className="pagina">

        <div className="container">

          {/* ==================================================
              VOLTAR
          ================================================== */}


          {/* ==================================================
              CABEÇALHO
          ================================================== */}

          <div className="cabecalho">

            <div>

              <h1>
                Todas as Demandas
              </h1>

              <p>
                Gerencie e acompanhe todas
                as demandas de TI.
              </p>

            </div>

            <button
              className="btn-principal"
              onClick={onNovaDemanda}
            >
              + Nova Demanda
            </button>

          </div>

          {/* ==================================================
              FILTROS
          ================================================== */}

          <div className="filtros">

            <div className="filtros-titulo">
              <strong>Filtros de Pesquisa</strong>
              <span>Utilize os filtros para encontrar as demandas desejadas.</span>
            </div>

            <div className="filtros-grid">

              {/* PESQUISA */}

              <div className="campo">

                <label>
                  Pesquisar
                </label>

                <input
                  type="text"
                  placeholder="
                    Pesquisar por título,
                    descrição, código,
                    cliente ou responsável...
                  "
                  value={pesquisa}
                  onChange={(e) =>
                    setPesquisa(
                      e.target.value
                    )
                  }
                  onKeyDown={(e) => {

                    if (
                      e.key === 'Enter'
                    ) {
                      aplicarFiltros()
                    }

                  }}
                />

              </div>

              {/* CLIENTE */}

              <div className="campo">

                <label>
                  Cliente
                </label>

                <select
                  value={cliente}
                  onChange={(e) =>
                    setCliente(
                      e.target.value
                    )
                  }
                >

                  <option value="">
                    Todos os clientes
                  </option>

                  {clientes.map(
                    (item) => (

                      <option
                        key={item}
                        value={item}
                      >
                        {item}
                      </option>

                    )
                  )}

                </select>

              </div>

              {/* RESPONSÁVEL */}

              <div className="campo">

                <label>
                  Responsável
                </label>

                <select
                  value={responsavel}
                  onChange={(e) =>
                    setResponsavel(
                      e.target.value
                    )
                  }
                >

                  <option value="">
                    Todos os responsáveis
                  </option>

                  {responsaveis.map(
                    (item) => (

                      <option
                        key={item}
                        value={item}
                      >
                        {item}
                      </option>

                    )
                  )}

                </select>

              </div>

              {/* STATUS */}

              <div className="campo">

                <label>
                  Status
                </label>

                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(
                      e.target.value
                    )
                  }
                >

                  <option value="">
                    Todos os status
                  </option>

                  {STATUS.map(
                    (item) => (

                      <option
                        key={item}
                        value={item}
                      >
                        {item}
                      </option>

                    )
                  )}

                </select>

              </div>

              {/* PRIORIDADE */}

              <div className="campo">

                <label>
                  Prioridade
                </label>

                <select
                  value={prioridade}
                  onChange={(e) =>
                    setPrioridade(
                      e.target.value
                    )
                  }
                >

                  <option value="">
                    Todas
                  </option>

                  {PRIORIDADES.map(
                    (item) => (

                      <option
                        key={item}
                        value={item}
                      >
                        {item}
                      </option>

                    )
                  )}

                </select>

              </div>

              {/* SITUAÇÃO */}

              <div className="campo">

                <label>
                  Situação
                </label>

                <select
                  value={situacao}
                  onChange={(e) =>
                    setSituacao(e.target.value)
                  }
                >
                  <option value="">Todas</option>
                  <option value="abertas">Abertas</option>
                  <option value="atrasadas">Atrasadas</option>
                  <option value="proximas">Próximas do vencimento</option>
                  <option value="críticas">Críticas</option>
                  <option value="concluidas">Concluídas</option>
                </select>

              </div>

              {/* PERÍODO */}

              <div className="campo">

                <label>
                  Período do prazo
                </label>

                <select
                  value={periodo}
                  onChange={(e) =>
                    setPeriodo(e.target.value)
                  }
                >
                  <option value="">Todos</option>
                  <option value="7-dias">Próximos 7 dias</option>
                  <option value="30-dias">Próximos 30 dias</option>
                  <option value="mes-atual">Mês atual</option>
                </select>

              </div>

              {/* ORDENAÇÃO */}

              <div className="campo">

                <label>
                  Ordenar por
                </label>

                <select
                  value={ordenacao}
                  onChange={(e) =>
                    setOrdenacao(e.target.value)
                  }
                >
                  <option value="mais-recentes">Mais recentes</option>
                  <option value="prazo-proximo">Prazo mais próximo</option>
                  <option value="prazo-distante">Prazo mais distante</option>
                  <option value="prioridade">Maior prioridade</option>
                  <option value="titulo">Título A-Z</option>
                </select>

              </div>

            </div>

          </div>

          {/* ==================================================
              AÇÕES
          ================================================== */}

          <div className="acoes">

            <div className="acoes-esquerda">

              <button
                className="btn-principal"
                onClick={
                  aplicarFiltros
                }
              >
                🔎 Aplicar filtros
              </button>

              <button
                className="btn-secundario"
                onClick={
                  limparFiltros
                }
              >
                Limpar filtros
              </button>

              {filtroAplicado && (

                <span
                  className="
                    filtro-aplicado
                  "
                >
                  Filtros aplicados
                </span>

              )}

            </div>

            {/* ==================================================
                V 1.7 — AÇÕES EM MASSA
            ================================================== */}

            {demandasSelecionadas.length > 0 && (
              <div className="acoes-massa">
                <span className="acoes-massa-contador">
                  {demandasSelecionadas.length}{' '}
                  {demandasSelecionadas.length === 1 ? 'selecionada' : 'selecionadas'}
                </span>

                <select
                  value={statusEmMassa}
                  onChange={(event) => setStatusEmMassa(event.target.value)}
                  aria-label="Novo status para ações em massa"
                >
                  <option value="">Alterar status para...</option>
                  {STATUS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="btn-massa-aplicar"
                  disabled={!statusEmMassa}
                  onClick={executarAlteracaoEmMassa}
                >
                  Aplicar
                </button>

                <button
                  type="button"
                  className="btn-massa-limpar"
                  onClick={limparSelecao}
                >
                  Limpar seleção
                </button>
              </div>
            )}

            {/* ==================================================
                LISTA / KANBAN
            ================================================== */}

            <div className="visualizacao">

              <button
                className={
                  visualizacao === 'lista'
                    ? 'ativo'
                    : ''
                }
                onClick={() =>
                  setVisualizacao(
                    'lista'
                  )
                }
              >
                ☷ Visualizar Lista
              </button>

              <button
                className={
                  visualizacao === 'kanban'
                    ? 'ativo'
                    : ''
                }
                onClick={() =>
                  setVisualizacao(
                    'kanban'
                  )
                }
              >
                ▦ Visualizar Kanban
              </button>

            </div>

          </div>

          {/* ==================================================
              RESUMO OPERACIONAL
          ================================================== */}

          <div className="resumo-operacional">

            <div className="resumo-item">
              <strong>{resumoOperacional.total}</strong>
              <span>Demandas exibidas</span>
            </div>

            <div className="resumo-item alerta">
              <strong>{resumoOperacional.atrasadas}</strong>
              <span>Atrasadas</span>
            </div>

            <div className="resumo-item alerta">
              <strong>{resumoOperacional.criticas}</strong>
              <span>Críticas</span>
            </div>

            <div className="resumo-item aviso">
              <strong>{resumoOperacional.proximas}</strong>
              <span>Próximas do vencimento</span>
            </div>

            <div className="resumo-item sucesso">
              <strong>{resumoOperacional.concluidas}</strong>
              <span>Concluídas</span>
            </div>

          </div>

          {/* ==================================================
              V 1.7 — FERRAMENTAS DOS RESULTADOS
          ================================================== */}

          <div className="ferramentas-resultados">
            <label className="selecionar-todos">
              <input
                type="checkbox"
                checked={
                  demandasFiltradas.length > 0 &&
                  demandasFiltradas.every((demanda) =>
                    demandasSelecionadas.includes(demanda.id)
                  )
                }
                onChange={selecionarTodasFiltradas}
                disabled={demandasFiltradas.length === 0}
              />
              <span>Selecionar todas as demandas filtradas</span>
            </label>

            <button
              type="button"
              className="btn-exportar"
              onClick={exportarCSV}
              disabled={demandasFiltradas.length === 0}
              title="Exportar os resultados atuais para CSV"
            >
              ⇩ Exportar CSV
            </button>
          </div>

          {/* ==================================================
              PAINEL
          ================================================== */}

          <div className="painel">

            {/* =================================================
                CABEÇALHO DO PAINEL
            ================================================= */}

            <div
              className="
                painel-cabecalho
              "
            >

              <h2>

                {visualizacao === 'lista'
                  ? 'Demandas Cadastradas'
                  : 'Kanban de Demandas'}

              </h2>

              <span
                className="contador"
              >

                {demandasFiltradas.length}{' '}

                {demandasFiltradas.length === 1
                  ? 'demanda'
                  : 'demandas'}

              </span>

            </div>

            {/* =================================================
                LISTA
            ================================================= */}

            {visualizacao ===
              'lista' && (

              <>

              {demandasFiltradas.length > 0 && (
                <div className="lista-cabecalho" aria-hidden="true">
                  <span></span>
                  <span># / Título</span>
                  <span>Cliente</span>
                  <span>Responsável</span>
                  <span>Prioridade</span>
                  <span>Status</span>
                  <span>Prazo</span>
                  <span>Ações</span>
                </div>
              )}

              <div className="lista">

                {demandasFiltradas.length === 0 ? (

                  <div className="vazio">

                    <div
                      className="
                        vazio-icone
                      "
                    >
                      📋
                    </div>

                    <h3>
                      Nenhuma demanda
                      encontrada
                    </h3>

                    <p>
                      Não encontramos demandas
                      com os filtros selecionados.
                    </p>

                    <button
                      className="
                        btn-secundario
                      "
                      onClick={
                        limparFiltros
                      }
                    >
                      Limpar filtros
                    </button>

                  </div>

                ) : (

                  demandasPaginadas.map(
                    renderCard
                  )

                )}

              </div>

              {demandasFiltradas.length > 0 && (
                <div
                  className="paginacao"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    padding: '16px 0 4px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      color: '#52627a',
                      fontSize: '13px',
                    }}
                  >
                    <span>Itens por página:</span>
                    <select
                      value={itensPorPagina}
                      onChange={(event) =>
                        alterarItensPorPagina(
                          Number(event.target.value)
                        )
                      }
                      style={{
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '6px 28px 6px 8px',
                        background: '#fff',
                        color: '#173f70',
                        fontWeight: 600,
                      }}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                    <span>
                      Exibindo {inicioExibicao}–{fimExibicao} de{' '}
                      {demandasFiltradas.length}
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <button
                      type="button"
                      className="btn-secundario"
                      disabled={paginaSegura === 1}
                      onClick={() =>
                        irParaPagina(paginaSegura - 1)
                      }
                      style={{
                        opacity: paginaSegura === 1 ? 0.5 : 1,
                        cursor: paginaSegura === 1 ? 'not-allowed' : 'pointer',
                      }}
                    >
                      ← Anterior
                    </button>

                    {Array.from(
                      { length: totalPaginas },
                      (_, indice) => indice + 1
                    )
                      .filter((pagina) => {
                        if (totalPaginas <= 7) return true
                        return (
                          pagina === 1 ||
                          pagina === totalPaginas ||
                          Math.abs(pagina - paginaSegura) <= 1
                        )
                      })
                      .map((pagina, indice, paginasVisiveis) => {
                        const paginaAnterior =
                          paginasVisiveis[indice - 1]
                        const precisaReticencias =
                          paginaAnterior !== undefined &&
                          pagina - paginaAnterior > 1

                        return (
                          <span key={pagina}>
                            {precisaReticencias && (
                              <span
                                style={{
                                  margin: '0 3px',
                                  color: '#64748b',
                                }}
                              >
                                ...
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                irParaPagina(pagina)
                              }
                              style={{
                                minWidth: '34px',
                                height: '34px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                background:
                                  pagina === paginaSegura
                                    ? '#1f5a96'
                                    : '#fff',
                                color:
                                  pagina === paginaSegura
                                    ? '#fff'
                                    : '#173f70',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              {pagina}
                            </button>
                          </span>
                        )
                      })}

                    <button
                      type="button"
                      className="btn-secundario"
                      disabled={paginaSegura === totalPaginas}
                      onClick={() =>
                        irParaPagina(paginaSegura + 1)
                      }
                      style={{
                        opacity: paginaSegura === totalPaginas ? 0.5 : 1,
                        cursor: paginaSegura === totalPaginas ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Próxima →
                    </button>
                  </div>
                </div>
              )}

              </>

            )}

            {/* =================================================
                KANBAN
            ================================================= */}

            {visualizacao ===
              'kanban' && (

              <div className="kanban">

                <div className="kanban-instrucao">
                  ↔ Arraste uma demanda para outra coluna para alterar o status.
                </div>

                <div
                  className="
                    kanban-grid
                  "
                >

                  {STATUS.map(
                    (statusColuna) => {

                      const demandasColuna =
                        demandasFiltradas.filter(
                          (d) =>
                            d.status ===
                            statusColuna
                        )

                      return (

                        <div
                          className={`
                            ${obterClasseColuna(
                              statusColuna
                            )}
                            ${
                              colunaDestino === statusColuna
                                ? 'kanban-coluna-destino'
                                : ''
                            }
                          `}
                          key={statusColuna}
                          onDragOver={(event) =>
                            entrarNaColuna(
                              event,
                              statusColuna
                            )
                          }
                          onDragLeave={(event) =>
                            sairDaColuna(
                              event,
                              statusColuna
                            )
                          }
                          onDrop={(event) =>
                            soltarNaColuna(
                              event,
                              statusColuna
                            )
                          }
                        >

                          {/* ==================================
                              CABEÇALHO
                          ================================== */}

                          <div
                            className="
                              coluna-header
                            "
                          >

                            <strong>
                              {statusColuna}
                            </strong>

                            <span
                              className="
                                quantidade
                              "
                            >
                              {
                                demandasColuna.length
                              }
                            </span>

                          </div>

                          {/* ==================================
                              CONTEÚDO
                          ================================== */}

                          <div
                            className="
                              coluna-conteudo
                            "
                          >

                            {demandasColuna.length === 0 ? (

                              <div
                                className="
                                  sem-demandas
                                "
                              >
                                Nenhuma demanda
                              </div>

                            ) : (

                              demandasColuna.map(
                                (demanda) => {

                                  const atrasada =
                                    estaAtrasada(
                                      demanda
                                    )

                                  const crítica =
                                    demanda.prioridade ===
                                    'Crítica'

                                  return (

                                    <div
                                      className={`
                                        kanban-card
                                        ${
                                          atrasada
                                            ? 'kanban-atrasada'
                                            : ''
                                        }
                                        ${
                                          crítica
                                            ? 'kanban-crítica'
                                            : ''
                                        }
                                        ${
                                          demandaArrastada === demanda.id
                                            ? 'kanban-card-arrastando'
                                            : ''
                                        }
                                        ${
                                          demandasSelecionadas.includes(demanda.id)
                                            ? 'kanban-card-selecionado'
                                            : ''
                                        }
                                      `}
                                      key={
                                        demanda.id
                                      }
                                      draggable
                                      onDragStart={(event) =>
                                        iniciarArraste(
                                          event,
                                          demanda
                                        )
                                      }
                                      onDragEnd={
                                        finalizarArraste
                                      }
                                    >

                                      <label className="selecao-kanban">
                                        <input
                                          type="checkbox"
                                          checked={demandasSelecionadas.includes(demanda.id)}
                                          onChange={() => alternarSelecao(demanda.id)}
                                          onClick={(event) => event.stopPropagation()}
                                          aria-label={`Selecionar demanda ${demanda.id}`}
                                        />
                                        <span />
                                      </label>

                                      {/* ======================
                                          TOPO
                                      ====================== */}

                                      <div
                                        className="
                                          kanban-card-topo
                                        "
                                      >

                                        <div
                                          className="
                                            kanban-id
                                          "
                                        >
                                          #{demanda.id}
                                        </div>

                                        {atrasada && (

                                          <span
                                            className="
                                              kanban-alerta
                                            "
                                          >
                                            ATRASADA
                                          </span>

                                        )}

                                      </div>

                                      {/* ======================
                                          TÍTULO
                                      ====================== */}

                                      <h3>
                                        {demanda.titulo}
                                      </h3>

                                      {/* ======================
                                          PRIORIDADE
                                      ====================== */}

                                      <span
                                        className={
                                          obterClassePrioridade(
                                            demanda.prioridade
                                          )
                                        }
                                      >
                                        {demanda.prioridade}
                                      </span>

                                      {/* ======================
                                          DESCRIÇÃO
                                      ====================== */}

                                      <div
                                        className="
                                          kanban-descricao
                                        "
                                      >

                                        {demanda.descricao ||
                                          'Sem descrição informada.'}

                                      </div>

                                      {/* ======================
                                          INFORMAÇÕES
                                      ====================== */}

                                      <div
                                        className="
                                          kanban-info
                                        "
                                      >

                                        <div>

                                          <span>
                                            Cliente
                                          </span>

                                          <strong>
                                            {
                                              demanda.cliente
                                            }
                                          </strong>

                                        </div>

                                        <div>

                                          <span>
                                            Responsável
                                          </span>

                                          <strong>
                                            {
                                              demanda.responsavel
                                            }
                                          </strong>

                                        </div>

                                        <div>

                                          <span>
                                            Prazo
                                          </span>

                                          <strong
                                            className={
                                              atrasada
                                                ? 'kanban-prazo-atrasado'
                                                : ''
                                            }
                                          >
                                            {
                                              formatarData(
                                                demanda.prazo
                                              )
                                            }
                                          </strong>

                                        </div>

                                      </div>

                                      {/* ======================
                                          DETALHES
                                      ====================== */}

                                      {onAbrirDetalhe && (

                                        <button
                                          className="
                                            abrir-detalhe-kanban
                                          "
                                          onClick={() =>
                                            onAbrirDetalhe(
                                              demanda
                                            )
                                          }
                                        >
                                          Abrir detalhes
                                        </button>

                                      )}

                                      {/* ======================
                                          MOVER STATUS
                                      ====================== */}

                                      <select
                                        className="
                                          mover-status
                                        "
                                        value={
                                          demanda.status
                                        }
                                        onChange={(
                                          e
                                        ) =>
                                          onAlterarStatus(
                                            demanda.id,
                                            e.target.value
                                          )
                                        }
                                      >

                                        {STATUS.map(
                                          (item) => (

                                            <option
                                              key={
                                                item
                                              }
                                              value={
                                                item
                                              }
                                            >
                                              Mover para:{' '}
                                              {item}
                                            </option>

                                          )
                                        )}

                                      </select>

                                    </div>

                                  )
                                }
                              )

                            )}

                          </div>

                        </div>

                      )
                    }
                  )}

                </div>

              </div>

            )}

          </div>

        </div>

      </div>

    </MenuPrincipal>
  )
}