// ============================================================
// GESTÃO DE DEMANDAS DE TI
// V2.6 — RELATÓRIOS
// V1.5 — PADRONIZAÇÃO MENUPRINCIPAL + TEXTO + RESUMO OPERACIONAL
// ============================================================

import { useMemo, useState, type CSSProperties } from 'react'
import type { Demanda } from '../types'
import { carregarDemandas } from '../services/storage'
import { estaAtrasada as estaAtrasadaSLA, PRIORIDADES_ATENDIMENTO } from '../sla'
import MenuPrincipal from '../components/MenuPrincipal'
import './Relatorios.css'

interface Props {
  onVoltar: () => void
  nomeUsuario: string
  perfilUsuario: string
  onDashboard: () => void
  onTodasDemandas: () => void
  onNovaDemanda: () => void
  onClientes: () => void
  onResponsaveis: () => void
  onFeriados: () => void
  onRelatorios: () => void
  onLogout: () => void
  onConfiguracoes?: () => void
}

function carregar(): Demanda[] {
  try {
    return carregarDemandas()
  } catch {
    return []
  }
}

const CRITICIDADES = ['Crítica', 'Alta', 'Média', 'Baixa'] as const

const FILTRO_SEM_CRITICIDADE = '__sem_criticidade__'
const FILTRO_CRITICIDADE_INVALIDA = '__criticidade_invalida__'
const FILTRO_SEM_PRIORIDADE_ATENDIMENTO = '__sem_prioridade_atendimento__'
const FILTRO_PRIORIDADE_ATENDIMENTO_INVALIDA = '__prioridade_atendimento_invalida__'

function obterCriticidade(demanda: Demanda): string {
  const valor = String(demanda.criticidade || demanda.prioridade || '').trim()
  // Compatibilidade com dados antigos, em que "Urgente" representava a criticidade.
  return valor === 'Urgente' ? 'Crítica' : valor
}

function obterPrioridadeAtendimento(demanda: Demanda): string {
  return String(demanda.prioridadeAtendimento || '').trim()
}

function criticidadeValida(valor: string): boolean {
  return (CRITICIDADES as readonly string[]).includes(valor)
}

function prioridadeAtendimentoValida(valor: string): boolean {
  return (PRIORIDADES_ATENDIMENTO as readonly string[]).includes(valor)
}

function converterDataRelatorio(valor?: string): Date | null {
  if (!valor) return null
  const texto = valor.trim()
  if (!texto) return null

  // Datas sem horário são construídas no fuso local para evitar voltar um dia.
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    const [ano, mes, dia] = texto.split('-').map(Number)
    const data = new Date(ano, mes - 1, dia)
    data.setHours(0, 0, 0, 0)
    return Number.isNaN(data.getTime()) ? null : data
  }

  const data = new Date(texto)
  if (Number.isNaN(data.getTime())) return null
  data.setHours(0, 0, 0, 0)
  return data
}

function formatarData(valor?: string) {
  const data = converterDataRelatorio(valor)
  return data ? data.toLocaleDateString('pt-BR') : (valor || '-')
}

export default function Relatorios({
  onVoltar,
  nomeUsuario,
  perfilUsuario,
  onDashboard,
  onTodasDemandas,
  onNovaDemanda,
  onClientes,
  onResponsaveis,
  onFeriados,
  onRelatorios,
  onLogout,
  onConfiguracoes,
}: Props) {
  const [demandas] = useState<Demanda[]>(carregar)
  const [periodo, setPeriodo] = useState('todos')
  const [status, setStatus] = useState('todos')
  const [criticidade, setCriticidade] = useState('todas')
  const [prioridadeAtendimento, setPrioridadeAtendimento] = useState('todas')

  const filtradas = useMemo(() => {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const limite = new Date(hoje)

    if (periodo === '7') limite.setDate(hoje.getDate() - 7)
    if (periodo === '30') limite.setDate(hoje.getDate() - 30)
    if (periodo === '90') limite.setDate(hoje.getDate() - 90)

    return demandas.filter((demanda) => {
      const data = converterDataRelatorio(demanda.dataAbertura)

      const dentroPeriodo =
        periodo === 'todos' ||
        (data !== null && data >= limite && data <= hoje)

      const dentroStatus =
        status === 'todos' ||
        demanda.status === status

      const criticidadeDemanda = obterCriticidade(demanda)
      const criticidadeEhValida = criticidadeValida(criticidadeDemanda)
      const dentroCriticidade =
        criticidade === 'todas' ||
        (criticidade === FILTRO_SEM_CRITICIDADE && !criticidadeDemanda) ||
        (criticidade === FILTRO_CRITICIDADE_INVALIDA && !!criticidadeDemanda && !criticidadeEhValida) ||
        (criticidadeEhValida && criticidadeDemanda === criticidade)

      const prioridadeDemanda = obterPrioridadeAtendimento(demanda)
      const prioridadeEhValida = prioridadeAtendimentoValida(prioridadeDemanda)
      const dentroPrioridadeAtendimento =
        prioridadeAtendimento === 'todas' ||
        (prioridadeAtendimento === FILTRO_SEM_PRIORIDADE_ATENDIMENTO && !prioridadeDemanda) ||
        (prioridadeAtendimento === FILTRO_PRIORIDADE_ATENDIMENTO_INVALIDA && !!prioridadeDemanda && !prioridadeEhValida) ||
        (prioridadeEhValida && prioridadeDemanda === prioridadeAtendimento)

      return dentroPeriodo && dentroStatus && dentroCriticidade && dentroPrioridadeAtendimento
    })
  }, [demandas, periodo, status, criticidade, prioridadeAtendimento])

  const concluidas = filtradas.filter(
    (item) => item.status === 'Concluída'
  ).length

  const pendencias = filtradas.filter(
    (item) => item.status === 'Com Pendências'
  ).length

  const atrasadas = filtradas.filter((item) => estaAtrasadaSLA(item)).length

  const canceladas = filtradas.filter(
    (item) => item.status === 'Cancelada'
  ).length

  const taxaConclusao = filtradas.length
    ? Math.round((concluidas / filtradas.length) * 100)
    : 0

  const porCriticidade = [
    ...CRITICIDADES.map((nome) => ({
      nome,
      total: filtradas.filter((item) => obterCriticidade(item) === nome).length,
    })),
    {
      nome: 'Não Definida',
      total: filtradas.filter((item) => !obterCriticidade(item)).length,
    },
    {
      nome: 'Valor Inválido',
      total: filtradas.filter((item) => {
        const valor = obterCriticidade(item)
        return !!valor && !criticidadeValida(valor)
      }).length,
    },
  ]

  const porPrioridadeAtendimento = [
    ...PRIORIDADES_ATENDIMENTO.map((nome) => ({
      nome,
      total: filtradas.filter((item) => obterPrioridadeAtendimento(item) === nome).length,
    })),
    {
      nome: 'Não Definida',
      total: filtradas.filter((item) => !obterPrioridadeAtendimento(item)).length,
    },
    {
      nome: 'Valor Inválido',
      total: filtradas.filter((item) => {
        const valor = obterPrioridadeAtendimento(item)
        return !!valor && !prioridadeAtendimentoValida(valor)
      }).length,
    },
  ]

  const porStatus = [
    'Nova',
    'Aguardando',
    'Em Atendimento',
    'Com Pendências',
    'Concluída',
    'Cancelada',
  ].map((nome) => ({
    nome,
    total: filtradas.filter(
      (item) => item.status === nome
    ).length,
  }))

  function exportarCSV() {
    const cabecalho = [
      'ID',
      'Título',
      'Cliente',
      'Sistema',
      'Analista',
      'Criticidade',
      'Prioridade de Atendimento',
      'Status',
      'Prazo',
      'Abertura',
    ]

    const linhas = filtradas.map((item) => [
      item.id,
      item.titulo,
      item.cliente,
      item.sistema || '',
      item.responsavel || '',
      obterCriticidade(item),
      obterPrioridadeAtendimento(item),
      item.status,
      item.prazo,
      item.dataAbertura || '',
    ])

    const protegerCampoCSV = (valor: unknown) => {
      const texto = String(valor ?? '')
      return /^[=+\-@]/.test(texto) ? `'${texto}` : texto
    }

    const escapar = (valor: unknown) =>
      `"${protegerCampoCSV(valor).replace(/"/g, '""')}"`

    const csv = [cabecalho, ...linhas]
      .map((linha) => linha.map(escapar).join(';'))
      .join('\n')

    const blob = new Blob(
      [`\ufeff${csv}`],
      { type: 'text/csv;charset=utf-8;' }
    )

    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = `relatorio-demandas-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`

    link.click()

    URL.revokeObjectURL(url)
  }

  return (
    <MenuPrincipal
      ativo="relatorios"
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
      subtitulo="Relatórios"
      rodapeAcoes={
        <>
          <button
            type="button"
            className="relatorios-footer-voltar"
            onClick={onVoltar}
          >
            ← Voltar ao Dashboard
          </button>

          <button
            type="button"
            className="relatorios-footer-exportar"
            onClick={exportarCSV}
          >
            ⇩ Exportar CSV
          </button>
        </>
      }
    >
      <div className="relatorios-page">
        <main className="relatorios-content">

          <div className="relatorios-heading">
            <h1>Relatórios</h1>

            <p>
              Visão Consolidada Das Demandas E Indicadores Operacionais.
            </p>
          </div>

          <section style={card}>

            <div style={barraTopo}>
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 18,
                  }}
                >
                  Filtros Do Relatório
                </h2>

                <p
                  style={{
                    margin: '5px 0 0',
                    color: '#728397',
                    fontSize: 13,
                  }}
                >
                  Refine Os Dados Antes De Consultar Ou Exportar.
                </p>
              </div>
            </div>

            <div className="relatorios-filtros-grid" style={filtros}>

              <label style={label}>
                Período

                <select
                  value={periodo}
                  onChange={(event) =>
                    setPeriodo(event.target.value)
                  }
                  style={campo}
                >
                  <option value="todos">
                    Todo O Período
                  </option>

                  <option value="7">
                    Últimos 7 Dias
                  </option>

                  <option value="30">
                    Últimos 30 Dias
                  </option>

                  <option value="90">
                    Últimos 90 Dias
                  </option>
                </select>
              </label>

              <label style={label}>
                Status

                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value)
                  }
                  style={campo}
                >
                  <option value="todos">
                    Todos
                  </option>

                  {porStatus.map((item) => (
                    <option
                      key={item.nome}
                      value={item.nome}
                    >
                      {item.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label style={label}>
                Criticidade

                <select
                  value={criticidade}
                  onChange={(event) =>
                    setCriticidade(event.target.value)
                  }
                  style={campo}
                >
                  <option value="todas">
                    Todas
                  </option>

                  {CRITICIDADES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                  <option value={FILTRO_SEM_CRITICIDADE}>Não Definida</option>
                  <option value={FILTRO_CRITICIDADE_INVALIDA}>Valor Inválido</option>
                </select>
              </label>

              <label style={label}>
                Prioridade de Atendimento
                <select
                  value={prioridadeAtendimento}
                  onChange={(event) => setPrioridadeAtendimento(event.target.value)}
                  style={campo}
                >
                  <option value="todas">Todas</option>
                  {PRIORIDADES_ATENDIMENTO.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                  <option value={FILTRO_SEM_PRIORIDADE_ATENDIMENTO}>Não Definida</option>
                  <option value={FILTRO_PRIORIDADE_ATENDIMENTO_INVALIDA}>Valor Inválido</option>
                </select>
              </label>

            </div>
          </section>

          <div style={resumoGrid}>

            <div style={cardResumo}>
              <strong>
                {filtradas.length}
              </strong>

              <span>
                Demandas No Período
              </span>
            </div>

            <div style={cardResumo}>
              <strong>
                {concluidas}
              </strong>

              <span>
                Concluídas
              </span>
            </div>

            <div style={cardResumo}>
              <strong>
                {taxaConclusao}%
              </strong>

              <span>
                Taxa De Conclusão
              </span>
            </div>

            <div style={cardResumo}>
              <strong>
                {atrasadas}
              </strong>

              <span>
                Atrasadas
              </span>
            </div>

          </div>

          <div className="relatorios-distribuicoes-principais" style={duasColunas}>

            <section style={card}>
              <h2 style={tituloSecao}>
                Por Status
              </h2>

              {porStatus.map((item) => (
                <div
                  key={item.nome}
                  style={linha}
                >
                  <span>
                    {item.nome}
                  </span>

                  <strong>
                    {item.total}
                  </strong>
                </div>
              ))}
            </section>

            <section style={card}>
              <h2 style={tituloSecao}>
                Por Criticidade
              </h2>

              {porCriticidade.map((item) => (
                <div
                  key={item.nome}
                  style={linha}
                >
                  <span>
                    {item.nome}
                  </span>

                  <strong>
                    {item.total}
                  </strong>
                </div>
              ))}
            </section>

          </div>

          <section style={card} className="relatorios-prioridade-atendimento">
            <h2 style={tituloSecao}>
              Por Prioridade de Atendimento
            </h2>
            <p className="relatorios-ajuda-classificacao">
              Distribuição por prioridade operacional de atendimento. Os valores não definidos ou inválidos ficam destacados para facilitar a auditoria dos dados.
            </p>
            <div className="relatorios-distribuicao-prioridade">
              {porPrioridadeAtendimento.map((item) => (
                <div key={item.nome} className="relatorios-prioridade-item">
                  <span>{item.nome}</span>
                  <strong>{item.total}</strong>
                </div>
              ))}
            </div>
          </section>

          <section style={card}>

            <h2 style={tituloSecao}>
              Resumo Operacional
            </h2>

            <div className="relatorios-resumo-operacional">

              <div className="relatorios-resumo-operacional-item">
                <strong>
                  {pendencias}
                </strong>

                <span>
                  Com Pendências
                </span>
              </div>

              <div className="relatorios-resumo-operacional-item">
                <strong>
                  {canceladas}
                </strong>

                <span>
                  Canceladas
                </span>
              </div>

              <div className="relatorios-resumo-operacional-item">
                <strong>
                  {
                    filtradas.filter(
                      (item) =>
                        item.status === 'Em Atendimento'
                    ).length
                  }
                </strong>

                <span>
                  Em Atendimento
                </span>
              </div>

              <div className="relatorios-resumo-operacional-item">
                <strong>
                  {
                    filtradas.filter(
                      (item) =>
                        item.status === 'Aguardando'
                    ).length
                  }
                </strong>

                <span>
                  Aguardando
                </span>
              </div>

            </div>
          </section>

          <section style={card}>

            <h2 style={tituloSecao}>
              Demandas Filtradas
            </h2>
            <p className="relatorios-ajuda-classificacao">
              Exibindo até 100 registros nesta tabela. A exportação CSV inclui todos os resultados dos filtros selecionados.
            </p>

            <div className="relatorios-table-wrap">

              <table style={tabela}>

                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Título</th>
                    <th>Cliente</th>
                    <th>Analista</th>
                    <th>Criticidade</th>
                    <th>Prioridade de Atendimento</th>
                    <th>Status</th>
                    <th>Prazo</th>
                  </tr>
                </thead>

                <tbody>

                  {filtradas
                    .slice(0, 100)
                    .map((item) => (
                      <tr key={item.id}>

                        <td>
                          DEM-
                          {String(item.id).padStart(5, '0')}
                        </td>

                        <td>
                          <strong>
                            {item.titulo}
                          </strong>
                        </td>

                        <td>
                          {item.cliente}
                        </td>

                        <td>
                          {item.responsavel ||
                            'Sem Analista'}
                        </td>

                        <td>
                          {obterCriticidade(item) || 'Não Definida'}
                        </td>

                        <td>
                          {obterPrioridadeAtendimento(item) || 'Não Definida'}
                        </td>

                        <td>
                          {item.status}
                        </td>

                        <td>
                          {formatarData(item.prazo)}
                        </td>

                      </tr>
                    ))}

                  {filtradas.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        style={{
                          padding: 28,
                          textAlign: 'center',
                          color: '#718096',
                        }}
                      >
                        Nenhuma Demanda Encontrada Para Os
                        Filtros Selecionados.
                      </td>
                    </tr>
                  )}

                </tbody>

              </table>

            </div>
          </section>

        </main>
      </div>
    </MenuPrincipal>
  )
}

const card: CSSProperties = {
  background: '#fff',
  border: '1px solid #dce5ef',
  borderRadius: 12,
  padding: 22,
  boxShadow: '0 4px 16px rgba(30,60,90,.06)',
  marginBottom: 18,
}

const cardResumo: CSSProperties = {
  ...card,
  marginBottom: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 5,
}

const resumoGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0,1fr))',
  gap: 16,
  margin: '18px 0',
}

const duasColunas: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 18,
}

const barraTopo: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 16,
}

const filtros: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: 14,
  marginTop: 20,
}

const label: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  fontWeight: 700,
  fontSize: 13,
}

const campo: CSSProperties = {
  border: '1px solid #ccd8e4',
  borderRadius: 7,
  padding: '10px 11px',
  fontSize: 14,
  background: '#fff',
}

const tituloSecao: CSSProperties = {
  margin: '0 0 15px',
  fontSize: 17,
}

const linha: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '11px 0',
  borderBottom: '1px solid #edf1f5',
  fontSize: 14,
}

const tabela: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 13,
}