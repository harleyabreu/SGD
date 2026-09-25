import { useMemo } from 'react'
import type { Demanda, Usuario } from '../types'
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

function converterData(data: string): Date | null {
  if (!data) return null

  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(data)

  if (match) {
    const [, dia, mes, ano] = match
    const resultado = new Date(Number(ano), Number(mes) - 1, Number(dia))
    resultado.setHours(0, 0, 0, 0)
    return resultado
  }

  const resultado = new Date(data)

  if (Number.isNaN(resultado.getTime())) return null

  resultado.setHours(0, 0, 0, 0)
  return resultado
}

function estaAtrasada(demanda: Demanda): boolean {
  if (
    !demanda.prazo ||
    demanda.status === 'Concluída' ||
    demanda.status === 'Cancelada'
  ) {
    return false
  }

  const prazo = converterData(demanda.prazo)

  if (!prazo) return false

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  return prazo < hoje
}

function estaProxima(demanda: Demanda): boolean {
  if (
    !demanda.prazo ||
    demanda.status === 'Concluída' ||
    demanda.status === 'Cancelada'
  ) {
    return false
  }

  const prazo = converterData(demanda.prazo)

  if (!prazo) return false

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const limite = new Date(hoje)
  limite.setDate(limite.getDate() + 7)

  return prazo >= hoje && prazo <= limite
}

function formatarData(data: string): string {
  const valor = converterData(data)

  return valor
    ? valor.toLocaleDateString('pt-BR')
    : data || '—'
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
    () =>
      demandas.filter(
        (demanda) =>
          demanda.responsavel?.trim().toLowerCase() ===
          usuario.nome.trim().toLowerCase()
      ),
    [demandas, usuario.nome]
  )

  const indicadores = useMemo(
    () => ({
      atendimento: minhasDemandas.filter(
        (item) => item.status === 'Em Atendimento'
      ).length,
      pendencias: minhasDemandas.filter(
        (item) => item.status === 'Com Pendências'
      ).length,
      concluidas: minhasDemandas.filter(
        (item) => item.status === 'Concluída'
      ).length,
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

  const proximosPrazos = minhasDemandas
    .filter(estaProxima)
    .sort((a, b) => {
      const dataA = converterData(a.prazo)?.getTime() ?? Number.MAX_SAFE_INTEGER
      const dataB = converterData(b.prazo)?.getTime() ?? Number.MAX_SAFE_INTEGER
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
            <h2>Visão Do Analista</h2>
            <p>Acompanhe Rapidamente As Suas Demandas E Os Prazos Que Exigem Atenção.</p>
          </div>

          <button type="button" className="btn-principal analista-primary-button" onClick={onMinhasDemandas}>
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
            <small>Fora Do Prazo</small>
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
              <button type="button" className="btn-secundario analista-panel-action" onClick={onMinhasDemandas}>Ver Todas</button>
            </div>

            {emAtendimento.length === 0 ? (
              <div className="analista-empty">Nenhuma Demanda Em Atendimento.</div>
            ) : (
              <div className="analista-demand-list">
                {emAtendimento.map((demanda) => (
                  <button
                    type="button"
                    className="analista-demand-row"
                    key={demanda.id}
                    onClick={() => onAbrirDetalhe(demanda)}
                  >
                    <span>
                      <strong>{demanda.titulo}</strong>
                      <small>{demanda.cliente || '—'} · #{demanda.id}</small>
                    </span>
                    <span className="analista-row-date">
                      {formatarData(demanda.prazo)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="analista-panel analista-panel-pendencias">
            <div className="analista-panel-header">
              <div>
                <h3>Com Pendências</h3>
                <span>Demandas Que Precisam De Acompanhamento</span>
              </div>
              <button type="button" className="btn-secundario analista-panel-action" onClick={onMinhasDemandas}>Ver Todas</button>
            </div>

            {pendencias.length === 0 ? (
              <div className="analista-empty">Nenhuma Demanda Com Pendência.</div>
            ) : (
              <div className="analista-demand-list">
                {pendencias.map((demanda) => (
                  <button
                    type="button"
                    className="analista-demand-row"
                    key={demanda.id}
                    onClick={() => onAbrirDetalhe(demanda)}
                  >
                    <span>
                      <strong>{demanda.titulo}</strong>
                      <small>{demanda.cliente || '—'} · #{demanda.id}</small>
                    </span>
                    <span className="analista-status-pendencia">Pendência</span>
                  </button>
                ))}
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
              {proximosPrazos.map((demanda) => (
                <button
                  type="button"
                  className="analista-deadline-row"
                  key={demanda.id}
                  onClick={() => onAbrirDetalhe(demanda)}
                >
                  <span className="analista-deadline-title">
                    <strong>{demanda.titulo}</strong>
                    <small>{demanda.cliente || '—'}</small>
                  </span>
                  <span className={estaAtrasada(demanda) ? 'analista-date-danger' : 'analista-date-warning'}>
                    {formatarData(demanda.prazo)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

      </div>
    </MenuPrincipal>
  )
}
