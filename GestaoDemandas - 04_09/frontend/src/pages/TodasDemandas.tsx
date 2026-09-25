// V 1.9 CORRIGIDA — preserva integralmente a base V1.8; lista, filtros, Kanban, paginação e ações em massa.
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

type Props = {
  demandas: Demanda[]
  onVoltar: () => void
  onNovaDemanda: () => void
  onAlterarStatus: (id: number, novoStatus: string) => void
  onAlterarStatusEmMassa?: (ids: number[], novoStatus: string) => void
  onAbrirDetalhe?: (demanda: Demanda) => void
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
  onVoltar,
  onNovaDemanda,
  onAlterarStatus,
  onAlterarStatusEmMassa,
  onAbrirDetalhe,
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

    const atrasada =
      estaAtrasada(demanda)

    const prioridadeCritica =
      demanda.prioridade ===
      'Crítica'

    return (

      <div
        className={`
          demanda-card
          ${atrasada ? 'demanda-atrasada' : ''}
          ${prioridadeCritica ? 'demanda-critica' : ''}
          ${demandasSelecionadas.includes(demanda.id) ? 'demanda-selecionada' : ''}
        `}
        key={demanda.id}
      >

        {/* ==================================================
            CABEÇALHO DO CARD
        ================================================== */}

        <div className="card-topo">

          <label className="selecao-demanda">
            <input
              type="checkbox"
              checked={demandasSelecionadas.includes(demanda.id)}
              onChange={() => alternarSelecao(demanda.id)}
              aria-label={`Selecionar demanda ${demanda.id}`}
            />
            <span />
          </label>

          <div>

            <div className="numero-demanda">
              #{demanda.id}
            </div>

            <h3>
              {demanda.titulo}
            </h3>

          </div>

          <div className="card-badges">

            {atrasada && (

              <span className="badge-atrasada">
                ATRASADA
              </span>

            )}

            <span
              className={obterClasseStatus(
                demanda.status
              )}
            >
              {demanda.status}
            </span>

          </div>

        </div>

        <div className="linha-divisoria" />

        {/* ==================================================
            DESCRIÇÃO
        ================================================== */}

        <div className="descricao">

          <span className="campo-label">
            DESCRIÇÃO
          </span>

          <p>
            {demanda.descricao ||
              'Sem descrição informada.'}
          </p>

        </div>

        {/* ==================================================
            INFORMAÇÕES
        ================================================== */}

        <div className="informacoes">

          <div>

            <span className="campo-label">
              CLIENTE
            </span>

            <strong>
              {demanda.cliente}
            </strong>

          </div>

          <div>

            <span className="campo-label">
              RESPONSÁVEL
            </span>

            <strong>
              {demanda.responsavel}
            </strong>

          </div>

          <div>

            <span className="campo-label">
              PRIORIDADE
            </span>

            <strong
              className={
                obterClassePrioridade(
                  demanda.prioridade
                )
              }
            >
              {demanda.prioridade}
            </strong>

          </div>

          <div>

            <span className="campo-label">
              PRAZO
            </span>

            <strong
              className={
                atrasada
                  ? 'prazo-atrasado'
                  : ''
              }
            >
              {formatarData(
                demanda.prazo
              )}
            </strong>

          </div>

        </div>

        {/* ==================================================
            OBSERVAÇÃO
        ================================================== */}

        {demanda.observacao && (

          <div className="observacao">

            <span className="campo-label">
              OBSERVAÇÕES
            </span>

            <p>
              {demanda.observacao}
            </p>

          </div>

        )}

        {/* ==================================================
            AÇÃO
        ================================================== */}

        {onAbrirDetalhe && (

          <div className="abrir-detalhe-lista">

            <button
              onClick={() =>
                onAbrirDetalhe(
                  demanda
                )
              }
            >
              Clique para visualizar
              os detalhes →
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

    <>

      <style>{`

        /* ====================================================
           BASE
        ==================================================== */

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
          background: #f4f7fb;
          color: #173b68;
        }

        .pagina {
          min-height: 100vh;
          padding:
            30px
            24px
            60px;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
        }

        /* ====================================================
           VOLTAR
        ==================================================== */

        .voltar {
          border: none;
          background: transparent;
          color: #174a80;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          padding: 0;
          margin-bottom: 18px;
        }

        .voltar:hover {
          text-decoration: underline;
        }

        /* ====================================================
           CABEÇALHO
        ==================================================== */

        .cabecalho {
          display: flex;
          justify-content:
            space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 26px;
        }

        .cabecalho h1 {
          margin:
            0
            0
            5px;
          font-size: 29px;
          color: #173b68;
        }

        .cabecalho p {
          margin: 0;
          color: #718096;
          font-size: 15px;
        }

        /* ====================================================
           BOTÃO PRINCIPAL
        ==================================================== */

        .btn-principal {
          background: #174a80;
          color: white;
          border: none;
          border-radius: 7px;
          padding:
            12px
            20px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          box-shadow:
            0
            2px
            5px
            rgba(0,0,0,.12);
          transition: .15s;
        }

        .btn-principal:hover {
          background: #123d6b;
          transform:
            translateY(-1px);
        }

        /* ====================================================
           FILTROS
        ==================================================== */

        .filtros {
          background: white;
          border:
            1px
            solid
            #e0e6ee;
          border-radius: 10px;
          padding: 20px;
          box-shadow:
            0
            2px
            8px
            rgba(
              25,
              55,
              90,
              .06
            );
          margin-bottom: 14px;
        }

        .filtros-grid {
          display: grid;
          grid-template-columns:
            2fr
            1fr
            1fr
            1fr;
          gap: 14px;
        }

        .campo {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .campo label {
          font-size: 12px;
          font-weight: 700;
          color: #344e6c;
        }

        .campo input,
        .campo select {
          width: 100%;
          height: 40px;
          border:
            1px
            solid
            #ccd6e2;
          border-radius: 6px;
          background: white;
          padding:
            0
            11px;
          color: #263f5d;
          font-size: 13px;
          outline: none;
        }

        .campo input::placeholder {
          color: #9aa7b5;
        }

        .campo input:focus,
        .campo select:focus {
          border-color:
            #174a80;
          box-shadow:
            0
            0
            0
            2px
            rgba(
              23,
              74,
              128,
              .08
            );
        }

        /* ====================================================
           AÇÕES
        ==================================================== */

        .acoes {
          display: flex;
          justify-content:
            space-between;
          align-items: center;
          margin-bottom: 15px;
          gap: 15px;
        }

        .acoes-esquerda {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .btn-secundario {
          height: 38px;
          padding:
            0
            15px;
          border:
            1px
            solid
            #cbd5e1;
          border-radius: 6px;
          background: white;
          color: #294967;
          font-weight: 600;
          cursor: pointer;
          transition: .15s;
        }

        .btn-secundario:hover {
          background: #f7f9fc;
          border-color:
            #b7c5d4;
        }

        .filtro-aplicado {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #15803d;
          font-size: 12px;
          font-weight: 600;
        }

        .filtro-aplicado::before {
          content: '';
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #16a34a;
        }

        /* ====================================================
           VISUALIZAÇÃO
        ==================================================== */

        .visualizacao {
          display: flex;
          border:
            1px
            solid
            #ccd6e2;
          border-radius: 7px;
          overflow: hidden;
          background: white;
        }

        .visualizacao button {
          border: none;
          background: white;
          padding:
            9px
            14px;
          cursor: pointer;
          color: #52677f;
          font-weight: 600;
          font-size: 13px;
          transition: .15s;
        }

        .visualizacao button:hover {
          background: #f4f7fa;
        }

        .visualizacao button.ativo {
          background: #174a80;
          color: white;
        }

        /* ====================================================
           PAINEL
        ==================================================== */

        .painel {
          background: white;
          border:
            1px
            solid
            #e0e6ee;
          border-radius: 10px;
          box-shadow:
            0
            2px
            8px
            rgba(
              25,
              55,
              90,
              .06
            );
          overflow: hidden;
        }

        .painel-cabecalho {
          display: flex;
          justify-content:
            space-between;
          align-items: center;
          padding:
            17px
            20px;
          border-bottom:
            1px
            solid
            #e5eaf0;
        }

        .painel-cabecalho h2 {
          margin: 0;
          font-size: 16px;
          color: #193b62;
        }

        .contador {
          color: #718096;
          font-size: 13px;
          font-weight: 600;
        }

        /* ====================================================
           LISTA
        ==================================================== */

        .lista {
          padding: 14px;
        }

        .demanda-card {
          position: relative;
          border:
            1px
            solid
            #dbe3ec;
          border-radius: 9px;
          background: white;
          padding: 18px;
          margin-bottom: 12px;
          transition: .15s;
        }

        .demanda-card:hover {
          border-color:
            #b8c9dc;
          box-shadow:
            0
            3px
            10px
            rgba(
              25,
              55,
              90,
              .07
            );
        }

        .demanda-atrasada {
          border-left:
            4px
            solid
            #dc2626;
          background:
            #fffafa;
        }

        .demanda-crítica {
          border-right:
            4px
            solid
            #dc2626;
        }

        .card-topo {
          display: flex;
          justify-content:
            space-between;
          align-items:
            flex-start;
          gap: 15px;
        }

        .card-topo h3 {
          margin:
            5px
            0
            0;
          color: #173b68;
          font-size: 18px;
        }

        .numero-demanda {
          color: #8291a3;
          font-size: 11px;
          font-weight: 600;
        }

        .card-badges {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .badge-atrasada {
          display: inline-flex;
          align-items: center;
          padding:
            5px
            9px;
          border-radius: 20px;
          background: #fee2e2;
          color: #b91c1c;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .3px;
        }

        .linha-divisoria {
          height: 1px;
          background: #e7edf3;
          margin:
            15px
            0;
        }

        .campo-label {
          display: block;
          color: #718096;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .5px;
          margin-bottom: 5px;
        }

        .descricao p {
          margin: 0;
          color: #334e68;
          font-size: 14px;
          line-height: 1.5;
        }

        .informacoes {
          display: grid;
          grid-template-columns:
            1.2fr
            1.2fr
            .8fr
            .8fr;
          gap: 15px;
          border-top:
            1px
            solid
            #edf1f5;
          border-bottom:
            1px
            solid
            #edf1f5;
          padding:
            15px
            0;
          margin-top: 15px;
        }

        .informacoes strong {
          color: #244666;
          font-size: 13px;
        }

        /* ====================================================
           PRIORIDADES
        ==================================================== */

        .prioridade {
          font-weight: 700;
        }

        .prioridade.critica {
          color: #b42318;
        }

        .prioridade.crítica {
          color: #dc2626;
          font-weight: 800;
        }

        .prioridade.alta {
          color: #d97706;
        }

        .prioridade.media {
          color: #ca8a04;
        }

        .prioridade.baixa {
          color: #15803d;
        }

        .prazo-atrasado {
          color: #dc2626 !important;
          font-weight: 800 !important;
        }

        /* ====================================================
           OBSERVAÇÃO
        ==================================================== */

        .observacao {
          margin-top: 14px;
          padding:
            11px
            13px;
          background: #f6f8fa;
          border-radius: 6px;
        }

        .observacao p {
          margin: 0;
          color: #455b72;
          font-size: 13px;
        }

        /* ====================================================
           ABRIR DETALHES
        ==================================================== */

        .abrir-detalhe-lista {
          display: flex;
          justify-content:
            flex-end;
          margin-top: 10px;
        }

        .abrir-detalhe-lista button {
          border: none;
          background: transparent;
          color: #174a80;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .abrir-detalhe-lista button:hover {
          text-decoration: underline;
        }

        /* ====================================================
           STATUS
        ==================================================== */

        .status {
          display: inline-flex;
          align-items: center;
          padding:
            5px
            11px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
        }

        .status.nova {
          background: #dcfce7;
          color: #15803d;
        }

        .status.atendimento {
          background: #eeeafe;
          color: #6546b8;
        }

        .status.pendencias {
          background: #fff0d9;
          color: #c46b00;
        }

        .status.concluida {
          background: #e7f7ee;
          color: #15803d;
        }


        .status.aguardando {
          background: #f3e8ff;
          color: #7c3aed;
        }

        /* ====================================================
           V 1.7 — SELEÇÃO E AÇÕES EM MASSA
        ==================================================== */

        .ferramentas-resultados {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 11px 14px;
          margin-bottom: 12px;
          border: 1px solid #dce5ef;
          border-radius: 8px;
          background: #ffffff;
        }

        .selecionar-todos {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #35536f;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }

        .selecionar-todos input,
        .selecao-demanda input,
        .selecao-kanban input {
          width: 16px;
          height: 16px;
          accent-color: #174a80;
          cursor: pointer;
        }

        .btn-exportar {
          height: 34px;
          padding: 0 13px;
          border: 1px solid #b8c9dc;
          border-radius: 6px;
          background: #ffffff;
          color: #174a80;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .btn-exportar:hover:not(:disabled) {
          background: #f2f7fc;
          border-color: #174a80;
        }

        .btn-exportar:disabled {
          opacity: .5;
          cursor: not-allowed;
        }

        .acoes-massa {
          display: flex;
          align-items: center;
          gap: 7px;
          flex-wrap: wrap;
          padding: 6px 9px;
          border: 1px solid #c8d8e8;
          border-radius: 7px;
          background: #f7fbff;
        }

        .acoes-massa-contador {
          color: #174a80;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }

        .acoes-massa select {
          height: 32px;
          border: 1px solid #c5d2df;
          border-radius: 5px;
          background: #ffffff;
          color: #294967;
          padding: 0 8px;
          font-size: 12px;
        }

        .btn-massa-aplicar,
        .btn-massa-limpar {
          height: 32px;
          padding: 0 10px;
          border-radius: 5px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .btn-massa-aplicar {
          border: 1px solid #174a80;
          background: #174a80;
          color: #ffffff;
        }

        .btn-massa-aplicar:disabled {
          opacity: .5;
          cursor: not-allowed;
        }

        .btn-massa-limpar {
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #52677f;
        }

        .selecao-demanda {
          display: inline-flex;
          align-items: center;
          flex: 0 0 auto;
          padding-top: 2px;
        }

        .demanda-selecionada {
          box-shadow: 0 0 0 2px rgba(23, 74, 128, .16);
          border-color: #174a80;
        }

        .selecao-kanban {
          position: absolute;
          top: 10px;
          right: 10px;
          z-index: 3;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 25px;
          height: 25px;
          border-radius: 5px;
          background: rgba(255, 255, 255, .92);
        }

        .kanban-card-selecionado {
          box-shadow: 0 0 0 2px rgba(23, 74, 128, .18);
          border-color: #174a80;
        }

        /* ====================================================
           VAZIO
        ==================================================== */

        .vazio {
          text-align: center;
          padding:
            65px
            20px;
          color: #718096;
        }

        .vazio-icone {
          font-size: 42px;
          margin-bottom: 12px;
        }

        .vazio h3 {
          margin:
            0
            0
            7px;
          color: #294967;
        }

        .vazio p {
          margin:
            0
            0
            18px;
          font-size: 14px;
        }

        /* ====================================================
           KANBAN
        ==================================================== */

        .kanban {
          padding: 14px;
          overflow-x: auto;
        }

        .kanban-grid {
          display: grid;
          grid-template-columns:
            repeat(
              5,
              minmax(
                245px,
                1fr
              )
            );
          gap: 12px;
          min-width: 1080px;
        }

        .coluna {
          border: 1px solid;
          border-radius: 9px;
          min-height: 480px;
          overflow: hidden;
          transition: .15s;
        }

        /* ====================================================
           NOVA — VERDE
        ==================================================== */

        .coluna-nova {
          background: #effaf2;
          border-color: #b8dfc3;
        }

        .coluna-nova .coluna-header {
          background: #dcf3e2;
          border-bottom-color: #b8dfc3;
        }

        .coluna-nova
        .coluna-header
        strong {
          color: #15803d;
        }

        .coluna-nova
        .quantidade {
          background: #c9e8d1;
          color: #15803d;
        }


        /* ====================================================
           AGUARDANDO — ROXO
        ==================================================== */

        .coluna-aguardando {
          background: #faf5ff;
          border-color: #ddd6fe;
        }

        .coluna-aguardando .coluna-header {
          background: #f3e8ff;
          border-bottom-color: #ddd6fe;
        }

        .coluna-aguardando .coluna-header strong {
          color: #7c3aed;
        }

        .coluna-aguardando .quantidade {
          background: #e9d5ff;
          color: #7c3aed;
        }

        /* ====================================================
           EM ATENDIMENTO — ROXO
        ==================================================== */

        .coluna-atendimento {
          background: #f2efff;
          border-color: #d0c6ef;
        }

        .coluna-atendimento
        .coluna-header {
          background: #e5defc;
          border-bottom-color: #d0c6ef;
        }

        .coluna-atendimento
        .coluna-header
        strong {
          color: #6546b8;
        }

        .coluna-atendimento
        .quantidade {
          background: #d8cef5;
          color: #6546b8;
        }


        /* ====================================================
           COM PENDÊNCIAS — LARANJA
        ==================================================== */

        .coluna-pendencias {
          background: #fff7e9;
          border-color: #efd4a5;
        }

        .coluna-pendencias
        .coluna-header {
          background: #ffedcf;
          border-bottom-color: #efd4a5;
        }

        .coluna-pendencias
        .coluna-header
        strong {
          color: #c46b00;
        }

        .coluna-pendencias
        .quantidade {
          background: #f7dcae;
          color: #c46b00;
        }

        /* ====================================================
           CONCLUÍDA — AZUL
        ==================================================== */

        .coluna-concluida {
          background: #eef5fb;
          border-color: #bfd5e8;
        }

        .coluna-concluida
        .coluna-header {
          background: #dcebf7;
          border-bottom-color: #bfd5e8;
        }

        .coluna-concluida
        .coluna-header
        strong {
          color: #21609b;
        }

        .coluna-concluida
        .quantidade {
          background: #c9dfee;
          color: #21609b;
        }

        /* ====================================================
           CABEÇALHO DA COLUNA
        ==================================================== */

        .coluna-header {
          display: flex;
          justify-content:
            space-between;
          align-items: center;
          padding:
            13px
            14px;
        }

        .coluna-header strong {
          font-size: 13px;
        }

        .quantidade {
          min-width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          font-size: 11px;
          font-weight: 700;
        }

        .coluna-conteudo {
          padding: 10px;
        }

        /* ====================================================
           CARD KANBAN
        ==================================================== */

        .kanban-card {
          position: relative;
          background: white;
          border:
            1px
            solid
            #d9e2ec;
          border-radius: 8px;
          padding: 13px;
          margin-bottom: 10px;
          box-shadow:
            0
            1px
            3px
            rgba(
              0,
              0,
              0,
              .05
            );
          transition: .15s;
        }

        /* =====================================================
           V 1.2 — DRAG AND DROP
           ===================================================== */

        .kanban-card {
          cursor: grab;
          user-select: none;
        }

        .kanban-card:active {
          cursor: grabbing;
        }

        .kanban-card-arrastando {
          opacity: .55;
          transform: scale(.98);
        }

        .kanban-coluna-destino {
          outline: 2px dashed #1769aa;
          outline-offset: -3px;
          background: #eef6ff !important;
        }

        .kanban-instrucao {
          margin: 0 0 12px;
          padding: 9px 12px;
          border: 1px solid #d9e5f2;
          border-radius: 6px;
          background: #f7fbff;
          color: #5f7892;
          font-size: 12px;
        }

        .kanban-card:hover {
          box-shadow:
            0
            3px
            9px
            rgba(
              0,
              0,
              0,
              .08
            );
          transform:
            translateY(-1px);
        }

        .kanban-card.kanban-atrasada {
          border-left:
            4px
            solid
            #dc2626;
          background:
            #fffafa;
        }

        .kanban-card.kanban-crítica {
          border-top:
            3px
            solid
            #dc2626;
        }

        .kanban-card-topo {
          display: flex;
          justify-content:
            space-between;
          align-items:
            flex-start;
          gap: 8px;
        }

        .kanban-id {
          font-size: 10px;
          color: #8795a5;
        }

        .kanban-alerta {
          font-size: 9px;
          font-weight: 800;
          color: #b91c1c;
          background: #fee2e2;
          border-radius: 10px;
          padding:
            3px
            6px;
        }

        .kanban-card h3 {
          margin:
            7px
            0
            5px;
          font-size: 14px;
          color: #173b68;
          line-height: 1.3;
        }

        .kanban-descricao {
          font-size: 12px;
          color: #52677f;
          margin:
            9px
            0;
          line-height: 1.4;
        }

        .kanban-info {
          border-top:
            1px
            solid
            #edf1f5;
          padding-top: 9px;
          margin-top: 9px;
        }

        .kanban-info div {
          margin-bottom: 7px;
        }

        .kanban-info span {
          display: block;
          font-size: 9px;
          color: #8492a2;
          font-weight: 700;
          text-transform: uppercase;
        }

        .kanban-info strong {
          font-size: 11px;
          color: #334e68;
        }

        .kanban-prazo-atrasado {
          color: #dc2626 !important;
          font-weight: 800 !important;
        }

        /* ====================================================
           BOTÃO DETALHES KANBAN
        ==================================================== */

        .abrir-detalhe-kanban {
          width: 100%;
          margin-top: 8px;
          height: 32px;
          border:
            1px
            solid
            #d3dce6;
          border-radius: 5px;
          background: white;
          color: #174a80;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .abrir-detalhe-kanban:hover {
          background: #f5f8fb;
          border-color:
            #b9c8d8;
        }

        /* ====================================================
           SELECT DE STATUS
        ==================================================== */

        .mover-status {
          width: 100%;
          margin-top: 8px;
          height: 32px;
          border:
            1px
            solid
            #ccd6e2;
          border-radius: 5px;
          background: white;
          color: #334e68;
          font-size: 11px;
          cursor: pointer;
          padding:
            0
            7px;
        }

        .mover-status:focus {
          outline: none;
          border-color: #174a80;
        }

        /* ====================================================
           SEM DEMANDAS
        ==================================================== */

        .sem-demandas {
          text-align: center;
          color: #8a99aa;
          font-size: 12px;
          padding:
            50px
            10px;
        }

        /* ====================================================
           RESUMO DO FILTRO
        ==================================================== */

        .resultado-filtro {
          display: flex;
          align-items: center;
          justify-content:
            space-between;
          gap: 15px;
          margin-bottom: 12px;
          padding:
            10px
            14px;
          background: #f7fafc;
          border:
            1px
            solid
            #e4eaf0;
          border-radius: 7px;
          color: #52677f;
          font-size: 12px;
        }

        .resultado-filtro strong {
          color: #173b68;
        }


        /* ====================================================
           RESUMO OPERACIONAL
        ==================================================== */

        .resumo-operacional {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 10px;
          margin-bottom: 14px;
        }

        .resumo-item {
          background: #ffffff;
          border: 1px solid #e0e6ee;
          border-radius: 8px;
          padding: 12px 14px;
          box-shadow: 0 2px 6px rgba(25, 55, 90, .04);
        }

        .resumo-item strong {
          display: block;
          color: #173b68;
          font-size: 18px;
          margin-bottom: 3px;
        }

        .resumo-item span {
          color: #718096;
          font-size: 11px;
        }

        .resumo-item.alerta strong {
          color: #dc2626;
        }

        .resumo-item.aviso strong {
          color: #d97706;
        }

        .resumo-item.sucesso strong {
          color: #15803d;
        }

        /* ====================================================
           RESPONSIVO
        ==================================================== */

        @media (max-width: 900px) {

          .resumo-operacional {
            grid-template-columns: repeat(2, 1fr);
          }

          .filtros-grid {
            grid-template-columns:
              1fr
              1fr;
          }

          .informacoes {
            grid-template-columns:
              1fr
              1fr;
          }

        }

        @media (max-width: 600px) {

          .resumo-operacional {
            grid-template-columns: 1fr;
          }

          .pagina {
            padding:
              20px
              12px
              40px;
          }

          .cabecalho {
            align-items:
              flex-start;
            flex-direction:
              column;
          }

          .cabecalho h1 {
            font-size: 24px;
          }

          .filtros-grid {
            grid-template-columns:
              1fr;
          }

          .acoes {
            flex-direction:
              column;
            align-items:
              stretch;
          }

          .acoes-esquerda {
            width: 100%;
          }

          .acoes-esquerda
          button {
            flex: 1;
          }

          .visualizacao {
            width: 100%;
          }

          .visualizacao
          button {
            flex: 1;
          }

          .informacoes {
            grid-template-columns:
              1fr;
          }

          .card-topo {
            flex-direction:
              column;
          }

          .card-badges {
            justify-content:
              flex-start;
          }

          .resultado-filtro {
            flex-direction:
              column;
            align-items:
              flex-start;
          }

        }

      `}</style>

      {/* ======================================================
          PÁGINA
      ====================================================== */}

      <div className="pagina">

        <div className="container">

          {/* ==================================================
              VOLTAR
          ================================================== */}

          <button
            className="voltar"
            onClick={onVoltar}
          >
            ← Voltar para o Dashboard
          </button>

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
              RESUMO DO RESULTADO
          ================================================== */}

          <div
            className="
              resultado-filtro
            "
          >

            <span>

              Exibindo{' '}

              <strong>
                {demandasFiltradas.length}
              </strong>{' '}

              {demandasFiltradas.length === 1
                ? 'demanda'
                : 'demandas'}

              {' '}de{' '}

              <strong>
                {demandasNormalizadas.length}
              </strong>

            </span>

            <span>

              {visualizacao === 'lista'
                ? 'Visualização em lista'
                : 'Visualização em Kanban'}

            </span>

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
                  ? 'Demandas cadastradas'
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

    </>
  )
}