// ============================================================
// GESTÃO DE DEMANDAS DE TI
// V2.6 — RELATÓRIOS
// V1.5 — PADRONIZAÇÃO MENUPRINCIPAL + TEXTO + RESUMO OPERACIONAL
// ============================================================

import { useMemo, useState, type CSSProperties } from 'react'
import type { Demanda } from '../types'
import { carregarDemandas } from '../services/storage'
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

function formatarData(valor?: string) {
  if (!valor) return '-'
  const data = new Date(valor)
  return Number.isNaN(data.getTime()) ? valor : data.toLocaleDateString('pt-BR')
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
  const [prioridade, setPrioridade] = useState('todas')

  const filtradas = useMemo(() => {
    const hoje = new Date()
    const limite = new Date(hoje)
    if (periodo === '7') limite.setDate(hoje.getDate() - 7)
    if (periodo === '30') limite.setDate(hoje.getDate() - 30)
    if (periodo === '90') limite.setDate(hoje.getDate() - 90)

    return demandas.filter((demanda) => {
      const data = new Date(demanda.dataAbertura || '')
      const dentroPeriodo = periodo === 'todos' || (!Number.isNaN(data.getTime()) && data >= limite)
      const dentroStatus = status === 'todos' || demanda.status === status
      const dentroPrioridade = prioridade === 'todas' || demanda.prioridade === prioridade
      return dentroPeriodo && dentroStatus && dentroPrioridade
    })
  }, [demandas, periodo, status, prioridade])

  const concluidas = filtradas.filter((item) => item.status === 'Concluída').length
  const pendencias = filtradas.filter((item) => item.status === 'Com Pendências').length
  const atrasadas = filtradas.filter((item) => item.status !== 'Concluída' && item.status !== 'Cancelada' && item.prazo && item.prazo < new Date().toISOString().slice(0, 10)).length
  const canceladas = filtradas.filter((item) => item.status === 'Cancelada').length
  const taxaConclusao = filtradas.length ? Math.round((concluidas / filtradas.length) * 100) : 0

  const porPrioridade = ['Crítica', 'Alta', 'Média', 'Baixa'].map((nome) => ({ nome, total: filtradas.filter((item) => item.prioridade === nome).length }))
  const porStatus = ['Nova', 'Aguardando', 'Em Atendimento', 'Com Pendências', 'Concluída', 'Cancelada'].map((nome) => ({ nome, total: filtradas.filter((item) => item.status === nome).length }))

  function exportarCSV() {
    const cabecalho = ['ID', 'Título', 'Cliente', 'Sistema', 'Analista', 'Prioridade', 'Status', 'Prazo', 'Abertura']
    const linhas = filtradas.map((item) => [
      item.id,
      item.titulo,
      item.cliente,
      item.sistema || '',
      item.responsavel || '',
      item.prioridade,
      item.status,
      item.prazo,
      item.dataAbertura || '',
    ])
    const escapar = (valor: unknown) => `"${String(valor ?? '').replace(/"/g, '""')}"`
    const csv = [cabecalho, ...linhas].map((linha) => linha.map(escapar).join(';')).join('\n')
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `relatorio-demandas-${new Date().toISOString().slice(0, 10)}.csv`
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
            ← Voltar Ao Dashboard
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
            <p>Visão Consolidada Das Demandas E Indicadores Operacionais.</p>
          </div>

          <section style={card}>
            <div style={barraTopo}>
              <div><h2 style={{ margin: 0, fontSize: 18 }}>Filtros Do Relatório</h2><p style={{ margin: '5px 0 0', color: '#728397', fontSize: 13 }}>Refine Os Dados Antes De Consultar Ou Exportar.</p></div>
            </div>
            <div style={filtros}>
              <label style={label}>Período<select value={periodo} onChange={(event) => setPeriodo(event.target.value)} style={campo}><option value="todos">Todo O Período</option><option value="7">Últimos 7 Dias</option><option value="30">Últimos 30 Dias</option><option value="90">Últimos 90 Dias</option></select></label>
              <label style={label}>Status<select value={status} onChange={(event) => setStatus(event.target.value)} style={campo}><option value="todos">Todos</option>{porStatus.map((item) => <option key={item.nome} value={item.nome}>{item.nome}</option>)}</select></label>
              <label style={label}>Prioridade<select value={prioridade} onChange={(event) => setPrioridade(event.target.value)} style={campo}><option value="todas">Todas</option>{['Crítica', 'Alta', 'Média', 'Baixa'].map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            </div>
          </section>

          <div style={resumoGrid}>
            <div style={cardResumo}><strong>{filtradas.length}</strong><span>Demandas No Período</span></div>
            <div style={cardResumo}><strong>{concluidas}</strong><span>Concluídas</span></div>
            <div style={cardResumo}><strong>{taxaConclusao}%</strong><span>Taxa De Conclusão</span></div>
            <div style={cardResumo}><strong>{atrasadas}</strong><span>Atrasadas</span></div>
          </div>

          <div style={duasColunas}>
            <section style={card}><h2 style={tituloSecao}>Por Status</h2>{porStatus.map((item) => <div key={item.nome} style={linha}><span>{item.nome}</span><strong>{item.total}</strong></div>)}</section>
            <section style={card}><h2 style={tituloSecao}>Por Prioridade</h2>{porPrioridade.map((item) => <div key={item.nome} style={linha}><span>{item.nome}</span><strong>{item.total}</strong></div>)}</section>
          </div>

          <section style={card}>
            <h2 style={tituloSecao}>Resumo Operacional</h2>
            <div className="relatorios-resumo-operacional">
              <div className="relatorios-resumo-operacional-item"><strong>{pendencias}</strong><span>Com Pendências</span></div>
              <div className="relatorios-resumo-operacional-item"><strong>{canceladas}</strong><span>Canceladas</span></div>
              <div className="relatorios-resumo-operacional-item"><strong>{filtradas.filter((item) => item.status === 'Em Atendimento').length}</strong><span>Em Atendimento</span></div>
              <div className="relatorios-resumo-operacional-item"><strong>{filtradas.filter((item) => item.status === 'Aguardando').length}</strong><span>Aguardando</span></div>
            </div>
          </section>

          <section style={card}>
            <h2 style={tituloSecao}>Demandas Filtradas</h2>
            <div className="relatorios-table-wrap"><table style={tabela}><thead><tr><th>ID</th><th>Título</th><th>Cliente</th><th>Analista</th><th>Prioridade</th><th>Status</th><th>Prazo</th></tr></thead><tbody>{filtradas.slice(0, 100).map((item) => <tr key={item.id}><td>DEM-{String(item.id).padStart(5, '0')}</td><td><strong>{item.titulo}</strong></td><td>{item.cliente}</td><td>{item.responsavel || 'Sem Analista'}</td><td>{item.prioridade}</td><td>{item.status}</td><td>{formatarData(item.prazo)}</td></tr>)}{filtradas.length === 0 && <tr><td colSpan={7} style={{ padding: 28, textAlign: 'center', color: '#718096' }}>Nenhuma Demanda Encontrada Para Os Filtros Selecionados.</td></tr>}</tbody></table></div>
          </section>
        </main>
      </div>
    </MenuPrincipal>
  )
}

const card: CSSProperties = { background: '#fff', border: '1px solid #dce5ef', borderRadius: 12, padding: 22, boxShadow: '0 4px 16px rgba(30,60,90,.06)', marginBottom: 18 }
const cardResumo: CSSProperties = { ...card, marginBottom: 0, display: 'flex', flexDirection: 'column', gap: 5 }
const resumoGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 16, margin: '18px 0' }
const duasColunas: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }
const barraTopo: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }
const filtros: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 20 }
const label: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontWeight: 700, fontSize: 13 }
const campo: CSSProperties = { border: '1px solid #ccd8e4', borderRadius: 7, padding: '10px 11px', fontSize: 14, background: '#fff' }
const tituloSecao: CSSProperties = { margin: '0 0 15px', fontSize: 17 }
const linha: CSSProperties = { display: 'flex', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid #edf1f5', fontSize: 14 }
const tabela: CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 13 }
