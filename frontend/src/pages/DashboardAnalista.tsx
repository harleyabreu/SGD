import { useMemo } from 'react'
import type { Demanda, Usuario } from '../types'
import {
  estaAtrasada as estaAtrasadaSLA,
  estaProximaDoVencimento as estaProximaDoVencimentoSLA,
  obterPrazoEfetivo,
} from '../sla'
import MenuPrincipal from '../components/MenuPrincipal'
import './DashboardAnalista.css'

type Props = {
  usuario: Usuario
  demandas: Demanda[]
  onDashboard: () => void
  onMinhasDemandas: () => void
  onConfiguracoes: () => void
  onAbrirDetalhe: (demanda: Demanda) => void
  onSair: () => void
}

const PRIORIDADES_ATENDIMENTO = [
  'P1 — Imediata',
  'P2 — Urgente',
  'P3 — Normal',
  'P4 — Planejada',
] as const

function converterData(data?: string): Date | null {
  if (!data) return null
  const valor = data.trim()
  if (!valor) return null

  const brasileira = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor)
  if (brasileira) {
    const [, dia, mes, ano] = brasileira
    const resultado = new Date(Number(ano), Number(mes) - 1, Number(dia))
    resultado.setHours(0, 0, 0, 0)
    return resultado
  }

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor)
  if (iso) {
    const [, ano, mes, dia] = iso
    const resultado = new Date(Number(ano), Number(mes) - 1, Number(dia))
    resultado.setHours(0, 0, 0, 0)
    return resultado
  }

  const resultado = new Date(valor)
  if (Number.isNaN(resultado.getTime())) return null
  resultado.setHours(0, 0, 0, 0)
  return resultado
}

function obterPrazoDaDemanda(demanda: Demanda): Date | null {
  return obterPrazoEfetivo(demanda) || converterData(demanda.prazo)
}

function estaAtrasada(demanda: Demanda): boolean {
  return estaAtrasadaSLA(demanda)
}

function estaProxima(demanda: Demanda): boolean {
  return estaProximaDoVencimentoSLA(demanda, 7)
}

function formatarPrazo(demanda: Demanda): string {
  const prazo = obterPrazoDaDemanda(demanda)
  return prazo ? prazo.toLocaleDateString('pt-BR') : demanda.prazo || '—'
}

function obterCriticidade(demanda: Demanda): string {
  const valor = String(demanda.criticidade || demanda.prioridade || '').trim()
  if (valor === 'Urgente') return 'Crítica'
  return valor || 'Não Definida'
}

function obterClasseCriticidade(valor: string): string {
  switch (valor) {
    case 'Crítica': return 'analista-criticality-critical'
    case 'Alta': return 'analista-criticality-high'
    case 'Média': return 'analista-criticality-medium'
    case 'Baixa': return 'analista-criticality-low'
    default: return 'analista-criticality-unknown'
  }
}

function obterPrioridadeAtendimento(demanda: Demanda): string {
  // A prioridade é obrigatória no cadastro. O traço é apenas uma proteção
  // visual para eventuais registros legados sem valor, não uma opção do sistema.
  return String(demanda.prioridadeAtendimento || '').trim() || '—'
}

function obterClassePrioridadeAtendimento(valor: string): string {
  switch (valor) {
    case 'P1 — Imediata': return 'analista-priority-p1'
    case 'P2 — Urgente': return 'analista-priority-p2'
    case 'P3 — Normal': return 'analista-priority-p3'
    case 'P4 — Planejada': return 'analista-priority-p4'
    default: return 'analista-priority-unknown'
  }
}

export default function DashboardAnalista({
  usuario,
  demandas,
  onDashboard,
  onMinhasDemandas,
  onConfiguracoes,
  onAbrirDetalhe,
  onSair,
}: Props) {
  const minhasDemandas = useMemo(
    () => demandas.filter(
      (demanda) =>
        demanda.responsavel?.trim().toLowerCase() ===
        usuario.nome.trim().toLowerCase()
    ),
    [demandas, usuario.nome]
  )

  const indicadores = useMemo(
    () => ({
      atendimento: minhasDemandas.filter((item) => item.status === 'Em Atendimento').length,
      pendencias: minhasDemandas.filter((item) => item.status === 'Com Pendências').length,
      concluidas: minhasDemandas.filter((item) => item.status === 'Concluída').length,
      atrasadas: minhasDemandas.filter(estaAtrasada).length,
      proximas: minhasDemandas.filter(estaProxima).length,
      total: minhasDemandas.length,
    }),
    [minhasDemandas]
  )

  const emAtendimento = minhasDemandas
    .filter((item) => item.status === 'Em Atendimento')
    .slice(0, 5)

  const pendencias = minhasDemandas
    .filter((item) => item.status === 'Com Pendências')
    .slice(0, 5)

  const tituloVisao = usuario.perfil === 'Desenvolvedor'
    ? 'Visão Do Desenvolvedor'
    : usuario.perfil === 'Estagiário'
      ? 'Visão Do Estagiário'
      : 'Visão Do Analista'

  const proximosPrazos = minhasDemandas
    .filter(estaProxima)
    .sort((a, b) => {
      const dataA = obterPrazoDaDemanda(a)?.getTime() ?? Number.MAX_SAFE_INTEGER
      const dataB = obterPrazoDaDemanda(b)?.getTime() ?? Number.MAX_SAFE_INTEGER
      return dataA - dataB
    })
    .slice(0, 5)

  return (
    <MenuPrincipal
      usuarioAtual={usuario}
      ativo="dashboard"
      subtitulo="Meu Dashboard"
      onDashboard={onDashboard}
      onMinhasDemandas={onMinhasDemandas}
      onConfiguracoes={onConfiguracoes}
      onSair={onSair}
    >
      <div className="analista-dashboard">
        <section className="analista-dashboard-header">
          <div>
            <h2>{tituloVisao}</h2>
            <p>Acompanhe Rapidamente As Suas Demandas E Os Prazos Que Exigem Atenção.</p>
          </div>
          <button
            type="button"
            className="btn-principal analista-primary-button"
            onClick={onMinhasDemandas}
          >
            Ver Minhas Demandas
          </button>
        </section>

        <section className="analista-indicators" aria-label="Resumo Das Minhas Demandas">
          <div className="analista-indicator indicator-blue">
            <span>Em Atendimento</span>
            <strong>{indicadores.atendimento}</strong>
            <small>Em Execução</small>
          </div>
          <div className="analista-indicator indicator-orange">
            <span>Com Pendências</span>
            <strong>{indicadores.pendencias}</strong>
            <small>Exigem Atenção</small>
          </div>
          <div className="analista-indicator indicator-green">
            <span>Concluídas</span>
            <strong>{indicadores.concluidas}</strong>
            <small>Finalizadas</small>
          </div>
          <div className="analista-indicator indicator-red">
            <span>Atrasadas</span>
            <strong>{indicadores.atrasadas}</strong>
            <small>Fora Do Prazo Efetivo</small>
          </div>
          <div className="analista-indicator indicator-purple">
            <span>Próximas</span>
            <strong>{indicadores.proximas}</strong>
            <small>Até 7 Dias</small>
          </div>
          <div className="analista-indicator indicator-slate">
            <span>Total</span>
            <strong>{indicadores.total}</strong>
            <small>Atribuídas A Você</small>
          </div>
        </section>

        <section className="analista-grid">
          <div className="analista-panel analista-panel-atendimento">
            <div className="analista-panel-header">
              <div>
                <h3>Em Atendimento</h3>
                <span>Demandas Atualmente Em Execução</span>
              </div>
              <button type="button" className="btn-secundario analista-panel-action" onClick={onMinhasDemandas}>
                Ver Todas
              </button>
            </div>

            {emAtendimento.length === 0 ? (
              <div className="analista-empty">Nenhuma Demanda Em Atendimento.</div>
            ) : (
              <div className="analista-demand-list">
                {emAtendimento.map((demanda) => {
                  const criticidade = obterCriticidade(demanda)
                  const prioridadeAtendimento = obterPrioridadeAtendimento(demanda)
                  return (
                    <button
                      type="button"
                      className="analista-demand-row"
                      key={demanda.id}
                      onClick={() => onAbrirDetalhe(demanda)}
                    >
                      <span>
                        <strong>{demanda.titulo}</strong>
                        <small>{demanda.cliente || '—'} · #{demanda.id}</small>
                        <span className="analista-demand-classification">
                          <span className={obterClasseCriticidade(criticidade)}>Criticidade: {criticidade}</span>
                          <span className={obterClassePrioridadeAtendimento(prioridadeAtendimento)}>
                            Prioridade De Atendimento: {prioridadeAtendimento}
                          </span>
                        </span>
                      </span>
                      <span className="analista-row-date">{formatarPrazo(demanda)}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="analista-panel analista-panel-pendencias">
            <div className="analista-panel-header">
              <div>
                <h3>Com Pendências</h3>
                <span>Demandas Que Precisam De Acompanhamento</span>
              </div>
              <button type="button" className="btn-secundario analista-panel-action" onClick={onMinhasDemandas}>
                Ver Todas
              </button>
            </div>

            {pendencias.length === 0 ? (
              <div className="analista-empty">Nenhuma Demanda Com Pendência.</div>
            ) : (
              <div className="analista-demand-list">
                {pendencias.map((demanda) => {
                  const criticidade = obterCriticidade(demanda)
                  const prioridadeAtendimento = obterPrioridadeAtendimento(demanda)
                  return (
                    <button
                      type="button"
                      className="analista-demand-row"
                      key={demanda.id}
                      onClick={() => onAbrirDetalhe(demanda)}
                    >
                      <span>
                        <strong>{demanda.titulo}</strong>
                        <small>{demanda.cliente || '—'} · #{demanda.id}</small>
                        <span className="analista-demand-classification">
                          <span className={obterClasseCriticidade(criticidade)}>Criticidade: {criticidade}</span>
                          <span className={obterClassePrioridadeAtendimento(prioridadeAtendimento)}>
                            Prioridade De Atendimento: {prioridadeAtendimento}
                          </span>
                        </span>
                      </span>
                      <span className="analista-status-pendencia">Pendência</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        <section className="analista-panel analista-deadlines analista-panel-prazos">
          <div className="analista-panel-header">
            <div>
              <h3>Próximos Prazos</h3>
              <span>Demandas Com Vencimento Nos Próximos 7 Dias</span>
            </div>
          </div>

          {proximosPrazos.length === 0 ? (
            <div className="analista-empty">Nenhum Prazo Próximo.</div>
          ) : (
            <div className="analista-deadline-list">
              {proximosPrazos.map((demanda) => {
                const criticidade = obterCriticidade(demanda)
                const prioridadeAtendimento = obterPrioridadeAtendimento(demanda)
                return (
                  <button
                    type="button"
                    className="analista-deadline-row"
                    key={demanda.id}
                    onClick={() => onAbrirDetalhe(demanda)}
                  >
                    <span className="analista-deadline-title">
                      <strong>{demanda.titulo}</strong>
                      <small>{demanda.cliente || '—'}</small>
                      <span className="analista-demand-classification">
                        <span className={obterClasseCriticidade(criticidade)}>Criticidade: {criticidade}</span>
                        <span className={obterClassePrioridadeAtendimento(prioridadeAtendimento)}>
                          Prioridade De Atendimento: {prioridadeAtendimento}
                        </span>
                      </span>
                    </span>
                    <span className={estaAtrasada(demanda) ? 'analista-date-danger' : 'analista-date-warning'}>
                      {formatarPrazo(demanda)}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        <section className="analista-panel analista-priority-audit-panel">
          <div className="analista-panel-header">
            <div>
              <h3>Resumo Por Prioridade De Atendimento</h3>
              <span>Distribuição Das Demandas Atribuídas A Você</span>
            </div>
          </div>
          <div className="analista-priority-summary">
            {PRIORIDADES_ATENDIMENTO.map((prioridade) => (
              <div key={prioridade} className="analista-priority-summary-item">
                <span className={obterClassePrioridadeAtendimento(prioridade)}>{prioridade}</span>
                <strong>
                  {minhasDemandas.filter(
                    (demanda) => String(demanda.prioridadeAtendimento || '').trim() === prioridade
                  ).length}
                </strong>
              </div>
            ))}
          </div>
        </section>
      </div>
    </MenuPrincipal>
  )
}
