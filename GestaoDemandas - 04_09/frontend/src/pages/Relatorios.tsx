// ============================================================
// GESTÃO DE DEMANDAS DE TI
// V2.5 — RELATÓRIOS
// ============================================================

import { useMemo, useState, type CSSProperties } from 'react'
import type { Demanda } from '../types'
import { carregarDemandas } from '../services/storage'

interface Props {
  onVoltar: () => void
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

export default function Relatorios({ onVoltar }: Props) {
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
    <div style={{ minHeight: '100vh', background: '#f4f7fb', color: '#17324d' }}>
      <header style={{ background: '#fff', borderBottom: '1px solid #dce5ef', padding: '24px 32px' }}>
        <button type="button" onClick={onVoltar} style={botaoSecundario}>← Voltar ao Dashboard</button>
        <div style={{ marginTop: 18 }}>
          <h1 style={{ margin: 0, fontSize: 28 }}>Relatórios</h1>
          <p style={{ margin: '7px 0 0', color: '#66788a' }}>Visão consolidada das demandas e indicadores operacionais.</p>
        </div>
      </header>

      <main style={{ maxWidth: 1250, margin: '0 auto', padding: 28 }}>
        <section style={card}>
          <div style={barraTopo}>
            <div><h2 style={{ margin: 0, fontSize: 18 }}>Filtros do relatório</h2><p style={{ margin: '5px 0 0', color: '#728397', fontSize: 13 }}>Refine os dados antes de consultar ou exportar.</p></div>
            <button type="button" onClick={exportarCSV} style={botaoPrimario}>⇩ Exportar CSV</button>
          </div>
          <div style={filtros}>
            <label style={label}>Período<select value={periodo} onChange={(event) => setPeriodo(event.target.value)} style={campo}><option value="todos">Todo o período</option><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option></select></label>
            <label style={label}>Status<select value={status} onChange={(event) => setStatus(event.target.value)} style={campo}><option value="todos">Todos</option>{porStatus.map((item) => <option key={item.nome} value={item.nome}>{item.nome}</option>)}</select></label>
            <label style={label}>Prioridade<select value={prioridade} onChange={(event) => setPrioridade(event.target.value)} style={campo}><option value="todas">Todas</option>{['Crítica', 'Alta', 'Média', 'Baixa'].map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          </div>
        </section>

        <div style={resumoGrid}>
          <div style={cardResumo}><strong>{filtradas.length}</strong><span>Demandas no período</span></div>
          <div style={cardResumo}><strong>{concluidas}</strong><span>Concluídas</span></div>
          <div style={cardResumo}><strong>{taxaConclusao}%</strong><span>Taxa de conclusão</span></div>
          <div style={cardResumo}><strong>{atrasadas}</strong><span>Atrasadas</span></div>
        </div>

        <div style={duasColunas}>
          <section style={card}><h2 style={tituloSecao}>Por status</h2>{porStatus.map((item) => <div key={item.nome} style={linha}><span>{item.nome}</span><strong>{item.total}</strong></div>)}</section>
          <section style={card}><h2 style={tituloSecao}>Por prioridade</h2>{porPrioridade.map((item) => <div key={item.nome} style={linha}><span>{item.nome}</span><strong>{item.total}</strong></div>)}</section>
        </div>

        <section style={card}>
          <h2 style={tituloSecao}>Resumo operacional</h2>
          <div style={resumoOperacional}>
            <div><strong>{pendencias}</strong><span>Com Pendências</span></div>
            <div><strong>{canceladas}</strong><span>Canceladas</span></div>
            <div><strong>{filtradas.filter((item) => item.status === 'Em Atendimento').length}</strong><span>Em Atendimento</span></div>
            <div><strong>{filtradas.filter((item) => item.status === 'Aguardando').length}</strong><span>Aguardando</span></div>
          </div>
        </section>

        <section style={card}>
          <h2 style={tituloSecao}>Demandas filtradas</h2>
          <div style={{ overflowX: 'auto' }}><table style={tabela}><thead><tr><th>ID</th><th>Título</th><th>Cliente</th><th>Analista</th><th>Prioridade</th><th>Status</th><th>Prazo</th></tr></thead><tbody>{filtradas.slice(0, 100).map((item) => <tr key={item.id}><td>DEM-{String(item.id).padStart(5, '0')}</td><td><strong>{item.titulo}</strong></td><td>{item.cliente}</td><td>{item.responsavel || 'Sem Analista'}</td><td>{item.prioridade}</td><td>{item.status}</td><td>{formatarData(item.prazo)}</td></tr>)}{filtradas.length === 0 && <tr><td colSpan={7} style={{ padding: 28, textAlign: 'center', color: '#718096' }}>Nenhuma demanda encontrada para os filtros selecionados.</td></tr>}</tbody></table></div>
        </section>
      </main>
    </div>
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
const botaoPrimario: CSSProperties = { border: 0, borderRadius: 8, background: '#174f86', color: '#fff', padding: '10px 15px', fontWeight: 700, cursor: 'pointer' }
const botaoSecundario: CSSProperties = { border: '1px solid #c8d5e2', borderRadius: 8, background: '#fff', color: '#174f86', padding: '9px 13px', fontWeight: 700, cursor: 'pointer' }
const tituloSecao: CSSProperties = { margin: '0 0 15px', fontSize: 17 }
const linha: CSSProperties = { display: 'flex', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid #edf1f5', fontSize: 14 }
const resumoOperacional: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }
const tabela: CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 13 }
