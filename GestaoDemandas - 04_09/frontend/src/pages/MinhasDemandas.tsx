// ============================================================
// GESTÃO DE DEMANDAS DE TI
// V2.1 — MINHAS DEMANDAS
// ============================================================
// Tela exclusiva do Analista. Exibe somente demandas atribuídas
// ao usuário logado, com filtros e ações de execução.
// ============================================================

import { useMemo, useState } from 'react'
import type { Demanda, Usuario } from '../types'
import { estaAtrasada, estaProximaDoVencimento } from '../sla'
import './MinhasDemandas.css'

type Props = {
  usuario: Usuario
  demandas: Demanda[]
  onVoltar?: () => void
  onAbrirDetalhe: (demanda: Demanda) => void
  onAlterarStatus: (id: number, novoStatus: string, motivo?: string) => void
  onAdicionarComentario?: (id: number, texto: string) => void
}

const STATUS = ['Todos', 'Nova', 'Aguardando', 'Em Atendimento', 'Com Pendências', 'Concluída']
const PRIORIDADES = ['Todas', 'Crítica', 'Alta', 'Média', 'Baixa']

function formatarData(valor: string) {
  if (!valor) return '—'
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) {
    const partes = valor.slice(0, 10).split('-')
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : valor
  }
  return data.toLocaleDateString('pt-BR')
}

function classeStatus(status: string) {
  return status.toLowerCase().replaceAll(' ', '-').replaceAll('ã', 'a').replaceAll('ê', 'e')
}

function MinhasDemandas({ usuario, demandas, onVoltar, onAbrirDetalhe, onAlterarStatus, onAdicionarComentario }: Props) {
  const [pesquisa, setPesquisa] = useState('')
  const [status, setStatus] = useState('Todos')
  const [prioridade, setPrioridade] = useState('Todas')
  const [situacao, setSituacao] = useState('Todas')

  const minhas = useMemo(
    () => demandas.filter((item) => item.responsavel === usuario.nome),
    [demandas, usuario.nome]
  )

  const filtradas = useMemo(() => {
    const termo = pesquisa.trim().toLowerCase()
    return minhas.filter((item) => {
      const busca = !termo || `${item.id} ${item.titulo} ${item.cliente} ${item.sistema || ''} ${item.descricao}`.toLowerCase().includes(termo)
      const porStatus = status === 'Todos' || item.status === status
      const porPrioridade = prioridade === 'Todas' || item.prioridade === prioridade
      const porSituacao = situacao === 'Todas' ||
        (situacao === 'Atrasadas' && estaAtrasada(item)) ||
        (situacao === 'Próximas do vencimento' && estaProximaDoVencimento(item)) ||
        (situacao === 'Em aberto' && item.status !== 'Concluída' && item.status !== 'Cancelada')
      return busca && porStatus && porPrioridade && porSituacao
    })
  }, [minhas, pesquisa, status, prioridade, situacao])

  const indicadores = useMemo(() => ({
    total: minhas.length,
    abertas: minhas.filter((item) => item.status !== 'Concluída' && item.status !== 'Cancelada').length,
    atendimento: minhas.filter((item) => item.status === 'Em Atendimento').length,
    pendencias: minhas.filter((item) => item.status === 'Com Pendências').length,
    atrasadas: minhas.filter(estaAtrasada).length,
    concluidas: minhas.filter((item) => item.status === 'Concluída').length,
  }), [minhas])

  function iniciar(demanda: Demanda) {
    if (demanda.status === 'Concluída' || demanda.status === 'Cancelada') return
    onAlterarStatus(demanda.id, 'Em Atendimento')
  }

  function colocarPendencia(demanda: Demanda) {
    const motivo = window.prompt('Informe o motivo da pendência (obrigatório):')?.trim()
    if (!motivo) return
    onAlterarStatus(demanda.id, 'Com Pendências', motivo)
  }

  function concluir(demanda: Demanda) {
    const comentario = window.prompt('Informe o comentário de conclusão (obrigatório):')?.trim()
    if (!comentario) return
    onAdicionarComentario?.(demanda.id, comentario)
    onAlterarStatus(demanda.id, 'Concluída', comentario)
  }

  return (
    <div className="minhas-page">
      <header className="minhas-header">
        <div>
          <div className="minhas-breadcrumb">Área do Analista / Minhas Demandas</div>
          <h1>Minhas Demandas</h1>
          <p>Demandas atualmente atribuídas a <strong>{usuario.nome}</strong>.</p>
        </div>
        {onVoltar && <button type="button" className="minhas-btn-secondary" onClick={onVoltar}>Sair da tela</button>}
      </header>

      <main className="minhas-content">
        <section className="minhas-cards">
          <div><span>Total atribuídas</span><strong>{indicadores.total}</strong></div>
          <div><span>Em aberto</span><strong>{indicadores.abertas}</strong></div>
          <div><span>Em atendimento</span><strong>{indicadores.atendimento}</strong></div>
          <div><span>Com pendências</span><strong>{indicadores.pendencias}</strong></div>
          <div className="danger"><span>Atrasadas</span><strong>{indicadores.atrasadas}</strong></div>
          <div><span>Concluídas</span><strong>{indicadores.concluidas}</strong></div>
        </section>

        <section className="minhas-card">
          <div className="minhas-filtros">
            <input value={pesquisa} onChange={(e) => setPesquisa(e.target.value)} placeholder="Pesquisar por ID, título, órgão, sistema ou descrição..." />
            <select value={status} onChange={(e) => setStatus(e.target.value)}>{STATUS.map((item) => <option key={item}>{item}</option>)}</select>
            <select value={prioridade} onChange={(e) => setPrioridade(e.target.value)}>{PRIORIDADES.map((item) => <option key={item}>{item}</option>)}</select>
            <select value={situacao} onChange={(e) => setSituacao(e.target.value)}><option>Todas</option><option>Em aberto</option><option>Atrasadas</option><option>Próximas do vencimento</option></select>
          </div>
        </section>

        <section className="minhas-card">
          <div className="minhas-table-head"><div><h2>Demandas atribuídas</h2><span>{filtradas.length} registro(s) encontrado(s)</span></div></div>
          <div className="minhas-table-wrap">
            <table>
              <thead><tr><th>ID</th><th>Demanda</th><th>Órgão</th><th>Prioridade</th><th>Status</th><th>Prazo</th><th>SLA</th><th>Ações</th></tr></thead>
              <tbody>
                {filtradas.map((demanda) => {
                  const atrasada = estaAtrasada(demanda)
                  const proxima = !atrasada && estaProximaDoVencimento(demanda)
                  const encerrada = demanda.status === 'Concluída' || demanda.status === 'Cancelada'
                  return (
                    <tr key={demanda.id} className={atrasada ? 'linha-atrasada' : ''}>
                      <td><button className="link-id" type="button" onClick={() => onAbrirDetalhe(demanda)}>DEM-{String(demanda.id).padStart(5, '0')}</button></td>
                      <td><strong>{demanda.titulo}</strong><small>{demanda.sistema || 'Sistema não informado'}</small></td>
                      <td>{demanda.cliente}</td>
                      <td><span className={`prioridade prioridade-${demanda.prioridade.toLowerCase()}`}>{demanda.prioridade}</span></td>
                      <td><span className={`status status-${classeStatus(demanda.status)}`}>{demanda.status}</span></td>
                      <td className={atrasada ? 'prazo-atrasado' : ''}>{formatarData(demanda.prazo)}</td>
                      <td>{atrasada ? <span className="sla sla-danger">Atrasada</span> : proxima ? <span className="sla sla-warning">Próxima</span> : encerrada ? <span className="sla">Encerrada</span> : <span className="sla sla-ok">No prazo</span>}</td>
                      <td className="acoes">
                        <button type="button" onClick={() => onAbrirDetalhe(demanda)}>Detalhes</button>
                        {!encerrada && demanda.status !== 'Em Atendimento' && demanda.status !== 'Com Pendências' && <button type="button" onClick={() => iniciar(demanda)}>Iniciar</button>}
                        {!encerrada && demanda.status !== 'Com Pendências' && <button type="button" onClick={() => colocarPendencia(demanda)}>Pendência</button>}
                        {demanda.status === 'Com Pendências' && <button type="button" onClick={() => iniciar(demanda)}>Retomar</button>}
                        {!encerrada && <button className="acao-concluir" type="button" onClick={() => concluir(demanda)}>Concluir</button>}
                      </td>
                    </tr>
                  )
                })}
                {filtradas.length === 0 && <tr><td colSpan={8} className="minhas-empty">Nenhuma demanda atribuída corresponde aos filtros selecionados.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}

export default MinhasDemandas
