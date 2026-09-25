// ============================================================
// GESTÃO DE DEMANDAS DE TI
// V2.1 — CONFIGURAÇÕES — LAYOUT VISUAL
// ============================================================
// SOMENTE AJUSTES VISUAIS NESTA VERSÃO.
// Toda a lógica de configuração, persistência e navegação foi preservada.
// ============================================================

import { useState, type CSSProperties } from 'react'
import type { Usuario } from '../types'
import MenuPrincipal from '../components/MenuPrincipal'
import './Configuracoes.css'

interface Props {
  usuarioAtual: Usuario
  onVoltar: () => void
  onDashboard: () => void
  onTodasDemandas: () => void
  onNovaDemanda: () => void
  onClientes: () => void
  onResponsaveis: () => void
  onFeriados: () => void
  onRelatorios: () => void
  onConfiguracoes: () => void
  onAdministracao: () => void
  onLogout: () => void
}

type ConfiguracoesSistema = {
  sla: {
    critica: number
    alta: number
    media: number
    baixa: number
  }
  notificacoes: {
    atrasadas: boolean
    proximoVencimento: boolean
    atribuicao: boolean
    conclusao: boolean
    reabertura: boolean
    cancelamento: boolean
  }
  interface: {
    itensPorPagina: number
    visualizacaoPadrao: 'lista' | 'kanban'
  }
}

const CHAVE_CONFIGURACOES = 'configuracoes_sistema'

const CONFIGURACOES_PADRAO: ConfiguracoesSistema = {
  sla: {
    critica: 2,
    alta: 6,
    media: 10,
    baixa: 20,
  },
  notificacoes: {
    atrasadas: true,
    proximoVencimento: true,
    atribuicao: true,
    conclusao: true,
    reabertura: true,
    cancelamento: true,
  },
  interface: {
    itensPorPagina: 10,
    visualizacaoPadrao: 'lista',
  },
}

const STATUS = [
  'Nova',
  'Aguardando',
  'Em Atendimento',
  'Com Pendências',
  'Concluída',
  'Cancelada',
]

function carregarConfiguracoes(): ConfiguracoesSistema {
  try {
    const salvo = localStorage.getItem(CHAVE_CONFIGURACOES)
    if (!salvo) return CONFIGURACOES_PADRAO

    const dados = JSON.parse(salvo) as Partial<ConfiguracoesSistema>

    return {
      sla: {
        ...CONFIGURACOES_PADRAO.sla,
        ...(dados.sla || {}),
      },
      notificacoes: {
        ...CONFIGURACOES_PADRAO.notificacoes,
        ...(dados.notificacoes || {}),
      },
      interface: {
        ...CONFIGURACOES_PADRAO.interface,
        ...(dados.interface || {}),
        itensPorPagina:
          dados.interface?.itensPorPagina === 20 ||
          dados.interface?.itensPorPagina === 30 ||
          dados.interface?.itensPorPagina === 50
            ? dados.interface.itensPorPagina
            : 10,
        visualizacaoPadrao:
          dados.interface?.visualizacaoPadrao === 'kanban'
            ? 'kanban'
            : 'lista',
      },
    }
  } catch {
    return CONFIGURACOES_PADRAO
  }
}

function salvarConfiguracoes(configuracoes: ConfiguracoesSistema) {
  try {
    localStorage.setItem(CHAVE_CONFIGURACOES, JSON.stringify(configuracoes))
    return true
  } catch {
    return false
  }
}

const cardBase: CSSProperties = {
  position: 'relative',
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 14,
  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.035)',
  overflow: 'hidden',
}

const sectionHeader: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  marginBottom: 18,
}

const sectionIcon = (background: string, color: string): CSSProperties => ({
  width: 38,
  height: 38,
  minWidth: 38,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 10,
  background,
  color,
  fontSize: 18,
  fontWeight: 700,
  boxShadow: `inset 0 0 0 1px ${color}18`,
})

const labelStyle: CSSProperties = {
  display: 'block',
  marginBottom: 7,
  color: '#64748b',
  fontSize: 10,
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '.45px',
}

const inputStyle: CSSProperties = {
  width: '100%',
  height: 40,
  padding: '0 11px',
  border: '1px solid #cbd5e1',
  borderRadius: 9,
  background: '#ffffff',
  color: '#0f172a',
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontSize: 13,
  outline: 'none',
}

const statusColors: Record<string, { bg: string; color: string; border: string; dot: string }> = {
  Nova: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', dot: '#2563eb' },
  Aguardando: { bg: '#f8fafc', color: '#475569', border: '#cbd5e1', dot: '#64748b' },
  'Em Atendimento': { bg: '#ecfeff', color: '#0e7490', border: '#a5f3fc', dot: '#0891b2' },
  'Com Pendências': { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa', dot: '#f97316' },
  Concluída: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', dot: '#16a34a' },
  Cancelada: { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', dot: '#dc2626' },
}

export default function Configuracoes({
  usuarioAtual,
  onVoltar,
  onDashboard,
  onTodasDemandas,
  onNovaDemanda,
  onClientes,
  onResponsaveis,
  onFeriados,
  onRelatorios,
  onConfiguracoes,
  onAdministracao,
  onLogout,
}: Props) {
  const [configuracoes, setConfiguracoes] = useState<ConfiguracoesSistema>(carregarConfiguracoes)
  const [mensagem, setMensagem] = useState('')

  function mostrarMensagem(texto: string) {
    setMensagem(texto)
    window.setTimeout(() => setMensagem(''), 2800)
  }

  function alterarSLA(campo: keyof ConfiguracoesSistema['sla'], valor: string) {
    const numero = Number(valor)
    setConfiguracoes((atual) => ({
      ...atual,
      sla: {
        ...atual.sla,
        [campo]: Number.isFinite(numero) && numero > 0 ? Math.min(365, Math.floor(numero)) : 1,
      },
    }))
  }

  function alterarNotificacao(campo: keyof ConfiguracoesSistema['notificacoes']) {
    setConfiguracoes((atual) => ({
      ...atual,
      notificacoes: {
        ...atual.notificacoes,
        [campo]: !atual.notificacoes[campo],
      },
    }))
  }

  function salvar() {
    const sucesso = salvarConfiguracoes(configuracoes)
    mostrarMensagem(
      sucesso
        ? 'Configurações salvas com sucesso.'
        : 'Não foi possível salvar as configurações neste navegador.'
    )
  }

  function restaurarPadroes() {
    const confirmacao = window.confirm(
      'Deseja restaurar as configurações padrão? Os valores atuais desta tela serão substituídos.'
    )

    if (!confirmacao) return

    const padrao: ConfiguracoesSistema = {
      sla: { ...CONFIGURACOES_PADRAO.sla },
      notificacoes: { ...CONFIGURACOES_PADRAO.notificacoes },
      interface: { ...CONFIGURACOES_PADRAO.interface },
    }

    setConfiguracoes(padrao)
    salvarConfiguracoes(padrao)
    mostrarMensagem('Configurações padrão restauradas.')
  }

  return (
    <MenuPrincipal
      usuarioAtual={usuarioAtual}
      ativo="configuracoes"
      subtitulo="Configurações"
      onDashboard={onDashboard}
      onTodasDemandas={onTodasDemandas}
      onNovaDemanda={onNovaDemanda}
      onClientes={onClientes}
      onResponsaveis={onResponsaveis}
      onFeriados={onFeriados}
      onRelatorios={onRelatorios}
      onConfiguracoes={onConfiguracoes}
      onSair={onLogout}
      rodapeAcoes={
        <>
          <button className="configuracoes-btn-secondary" type="button" onClick={onVoltar} style={{ height: 40, padding: '0 15px', border: '1px solid #cbd5e1', borderRadius: 9, background: '#ffffff', color: '#334155', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            ← Voltar ao Dashboard
          </button>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
            <button className="configuracoes-btn-secondary configuracoes-btn-reset" type="button" onClick={restaurarPadroes} style={{ height: 40, padding: '0 15px', border: '1px solid #cbd5e1', borderRadius: 9, background: '#ffffff', color: '#334155', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              ↻ Restaurar Padrões
            </button>
            <button className="configuracoes-btn-primary" type="button" onClick={salvar} style={{ height: 40, padding: '0 17px', border: 0, borderRadius: 9, background: '#2563eb', color: '#ffffff', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 3px 8px rgba(37, 99, 235, .20)' }}>
              ✓ Salvar Configurações
            </button>
          </div>
        </>
      }
    >
      <main className="configuracoes-page" style={{ width: '100%', minHeight: 'calc(100vh - 72px)', padding: '4px 20px 98px', boxSizing: 'border-box', background: '#f8fafc', color: '#0f172a', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <header className="configuracoes-page-header" style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 4, height: 27, borderRadius: 4, background: '#2563eb' }} />
            <h1 className="configuracoes-page-title" style={{ margin: 0, color: '#0f172a', fontSize: 25, lineHeight: 1.2, fontWeight: 750, letterSpacing: '-.45px' }}>Configurações</h1>
          </div>
          <p className="configuracoes-page-subtitle" style={{ margin: '0 0 0 14px', color: '#64748b', fontSize: 13, lineHeight: 1.4 }}>Parâmetros gerais e preferências do sistema.</p>
        </header>

        {mensagem && (
          <div className="configuracoes-message" role="status" style={{ marginBottom: 14, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 9, border: '1px solid #bbf7d0', borderRadius: 10, background: '#f0fdf4', color: '#166534', fontSize: 12, fontWeight: 600 }}>
            <span className="configuracoes-message-icon" style={{ width: 23, height: 23, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', fontWeight: 800 }}>✓</span>
            {mensagem}
          </div>
        )}

        {/* ADMINISTRAÇÃO */}
        <section className="configuracoes-card configuracoes-admin-card" style={{ ...cardBase, marginBottom: 14, borderColor: '#bfdbfe', background: 'linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)' }}>
          <div className="configuracoes-admin-accent" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: '#2563eb' }} />
          <div style={{ padding: '15px 18px 15px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13, minWidth: 0 }}>
              <div className="configuracoes-section-icon" style={sectionIcon('#eff6ff', '#2563eb')}>⚙</div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h2 className="configuracoes-section-heading" style={{ margin: 0, color: '#0f172a', fontSize: 15, fontWeight: 750 }}>Administração do Sistema</h2>
                  <span style={{ padding: '3px 7px', borderRadius: 999, background: '#dbeafe', color: '#1d4ed8', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.35px' }}>Gestão</span>
                </div>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 12, lineHeight: 1.4 }}>Analistas, Órgãos, Sistemas, Tipos de Demanda e Auditoria.</p>
              </div>
            </div>

            <button className="configuracoes-btn-admin" type="button" onClick={onAdministracao} style={{ flexShrink: 0, height: 39, padding: '0 16px', border: 0, borderRadius: 9, background: '#2563eb', color: '#ffffff', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 3px 8px rgba(37, 99, 235, .18)' }}>
              ⚙ Abrir Administração
            </button>
          </div>
        </section>

        {/* IDENTIFICAÇÃO */}
        <section className="configuracoes-card configuracoes-identificacao-card" style={{ ...cardBase, padding: 18, marginBottom: 14 }}>
          <div style={sectionHeader}>
            <div className="configuracoes-section-icon" style={sectionIcon('#eff6ff', '#2563eb')}>▣</div>
            <div>
              <h2 className="configuracoes-section-heading" style={{ margin: 0, fontSize: 15, fontWeight: 750 }}>Identificação do Sistema</h2>
              <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: 12 }}>Informações da aplicação atualmente em uso.</p>
            </div>
          </div>
          <div className="config-identificacao" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
            {[
              ['Sistema', 'Gestão de Demandas de TI', '▣', '#eff6ff', '#2563eb'],
              ['Organização', 'PRODEPA', '◆', '#f0fdf4', '#16a34a'],
              ['Usuário Atual', usuarioAtual.nome, '●', '#f5f3ff', '#7c3aed'],
            ].map(([label, valor, icone, , cor]) => (
              <div key={label} style={{ minHeight: 68, padding: '11px 12px', border: '1px solid #e2e8f0', borderRadius: 10, background: '#fafcff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
                  <span style={{ color: cor, fontSize: 11 }}>{icone}</span>
                  <span style={{ ...labelStyle, margin: 0 }}>{label}</span>
                </div>
                <strong style={{ color: '#0f172a', fontSize: 13, fontWeight: 700 }}>{valor}</strong>
              </div>
            ))}
          </div>
        </section>

        {/* SLA */}
        <section className="configuracoes-card configuracoes-sla-card" style={{ ...cardBase, padding: 18, marginBottom: 14 }}>
          <div style={sectionHeader}>
            <div className="configuracoes-section-icon" style={sectionIcon('#fff7ed', '#ea580c')}>◷</div>
            <div>
              <h2 className="configuracoes-section-heading" style={{ margin: 0, fontSize: 15, fontWeight: 750 }}>Regras de SLA</h2>
              <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: 12 }}>Defina a quantidade de dias úteis para cada prioridade.</p>
            </div>
          </div>

          <div className="config-sla-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
            {([
              ['Crítica', 'critica', '#fef2f2', '#dc2626'],
              ['Alta', 'alta', '#fff7ed', '#ea580c'],
              ['Média', 'media', '#eff6ff', '#2563eb'],
              ['Baixa', 'baixa', '#f8fafc', '#64748b'],
            ] as const).map(([nome, campo, fundo, cor]) => (
              <label key={campo} style={{ padding: 10, border: '1px solid #e2e8f0', borderRadius: 10, background: '#ffffff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: cor }} />
                  <span style={{ ...labelStyle, margin: 0, color: cor }}>{nome}</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <input type="number" min={1} max={365} value={configuracoes.sla[campo]} onChange={(e) => alterarSLA(campo, e.target.value)} style={{ ...inputStyle, paddingRight: 76, background: fundo, borderColor: `${cor}35` }} />
                  <span style={{ position: 'absolute', right: 10, top: 11, color: '#64748b', fontSize: 10, pointerEvents: 'none' }}>dias úteis</span>
                </div>
              </label>
            ))}
          </div>

          <div style={{ marginTop: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 9, border: '1px solid #dbeafe', borderRadius: 9, background: '#eff6ff', color: '#1e40af', fontSize: 11, lineHeight: 1.5 }}>
            <span style={{ width: 24, height: 24, minWidth: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, background: '#dbeafe', color: '#2563eb', fontWeight: 800 }}>i</span>
            <span>Os valores padrão são <strong>2 / 6 / 10 / 20 dias úteis</strong>. Finais de semana e feriados cadastrados continuam sendo desconsiderados pelo cálculo atual.</span>
          </div>
        </section>

        {/* NOTIFICAÇÕES */}
        <section className="configuracoes-card configuracoes-notificacoes-card" style={{ ...cardBase, padding: 18, marginBottom: 14 }}>
          <div style={sectionHeader}>
            <div className="configuracoes-section-icon" style={sectionIcon('#fefce8', '#ca8a04')}>🔔</div>
            <div>
              <h2 className="configuracoes-section-heading" style={{ margin: 0, fontSize: 15, fontWeight: 750 }}>Notificações</h2>
              <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: 12 }}>Controle quais eventos devem ficar habilitados nas preferências.</p>
            </div>
            <span className="configuracoes-notification-count" style={{ marginLeft: 'auto', padding: '5px 9px', borderRadius: 999, background: '#f0fdf4', color: '#15803d', fontSize: 10, fontWeight: 800 }}>
              {Object.values(configuracoes.notificacoes).filter(Boolean).length}/6 ativas
            </span>
          </div>

          <div className="config-notificacoes-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 9 }}>
            {([
              ['atrasadas', 'Demandas atrasadas', 'Eventos relacionados a demandas fora do prazo.', '⚠'],
              ['proximoVencimento', 'Próximas do vencimento', 'Alertas para demandas que se aproximam do prazo.', '◷'],
              ['atribuicao', 'Atribuição ou redistribuição', 'Alterações no responsável pelo atendimento.', '♙'],
              ['conclusao', 'Conclusão de demanda', 'Avisos quando uma demanda é concluída.', '✓'],
              ['reabertura', 'Reabertura de demanda', 'Avisos quando uma demanda volta ao atendimento.', '↻'],
              ['cancelamento', 'Cancelamento de demanda', 'Avisos sobre cancelamentos registrados.', '×'],
            ] as const).map(([campo, texto, descricao, icone]) => {
              const ativo = configuracoes.notificacoes[campo]
              return (
                <label key={campo} style={{ minHeight: 61, padding: '9px 11px', display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${ativo ? '#dbeafe' : '#e2e8f0'}`, borderRadius: 10, background: ativo ? '#f8fbff' : '#fafafa', cursor: 'pointer', transition: 'all .15s ease' }}>
                  <span style={{ width: 30, height: 30, minWidth: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: ativo ? '#eff6ff' : '#f1f5f9', color: ativo ? '#2563eb' : '#94a3b8', fontSize: 14, fontWeight: 800 }}>{icone}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ display: 'block', color: '#334155', fontSize: 11, fontWeight: 700 }}>{texto}</strong>
                    <small style={{ display: 'block', marginTop: 2, color: '#94a3b8', fontSize: 10, lineHeight: 1.25 }}>{descricao}</small>
                  </span>
                  <span style={{ position: 'relative', width: 38, height: 21, minWidth: 38, borderRadius: 999, background: ativo ? '#2563eb' : '#cbd5e1', transition: 'background .15s ease' }}>
                    <input type="checkbox" checked={ativo} onChange={() => alterarNotificacao(campo)} style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', margin: 0, cursor: 'pointer', zIndex: 2 }} />
                    <span style={{ position: 'absolute', top: 3, left: ativo ? 20 : 3, width: 15, height: 15, borderRadius: '50%', background: '#ffffff', boxShadow: '0 1px 3px rgba(15,23,42,.22)', transition: 'left .15s ease' }} />
                  </span>
                </label>
              )
            })}
          </div>
        </section>

        {/* PREFERÊNCIAS */}
        <section className="configuracoes-card configuracoes-interface-card" style={{ ...cardBase, padding: 18, marginBottom: 14 }}>
          <div style={sectionHeader}>
            <div className="configuracoes-section-icon" style={sectionIcon('#f5f3ff', '#7c3aed')}>▤</div>
            <div>
              <h2 className="configuracoes-section-heading" style={{ margin: 0, fontSize: 15, fontWeight: 750 }}>Preferências de Interface</h2>
              <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: 12 }}>Defina a quantidade inicial de itens e a visualização padrão da tela Todas as Demandas.</p>
            </div>
          </div>

          <div className="config-interface-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={{ padding: 11, border: '1px solid #e2e8f0', borderRadius: 10, background: '#fafcff' }}>
              <span style={labelStyle}>Itens por página</span>
              <select value={configuracoes.interface.itensPorPagina} onChange={(e) => setConfiguracoes((atual) => ({ ...atual, interface: { ...atual.interface, itensPorPagina: Number(e.target.value) } }))} style={inputStyle}>
                <option value={10}>10 itens</option>
                <option value={20}>20 itens</option>
                <option value={30}>30 itens</option>
                <option value={50}>50 itens</option>
              </select>
            </label>
            <label style={{ padding: 11, border: '1px solid #e2e8f0', borderRadius: 10, background: '#fafcff' }}>
              <span style={labelStyle}>Visualização padrão</span>
              <select value={configuracoes.interface.visualizacaoPadrao} onChange={(e) => setConfiguracoes((atual) => ({ ...atual, interface: { ...atual.interface, visualizacaoPadrao: e.target.value as 'lista' | 'kanban' } }))} style={inputStyle}>
                <option value="lista">☷ Lista</option>
                <option value="kanban">▦ Kanban</option>
              </select>
            </label>
          </div>
        </section>

        {/* FLUXO */}
        <section className="configuracoes-card configuracoes-fluxo-card" style={{ ...cardBase, padding: 18 }}>
          <div style={sectionHeader}>
            <div className="configuracoes-section-icon" style={sectionIcon('#ecfeff', '#0891b2')}>↔</div>
            <div>
              <h2 className="configuracoes-section-heading" style={{ margin: 0, fontSize: 15, fontWeight: 750 }}>Fluxo das Demandas</h2>
              <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: 12 }}>Status oficiais disponíveis no ciclo de vida da demanda.</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {STATUS.map((status) => {
              const estilo = statusColors[status]
              return (
                <span className="configuracoes-status-chip" key={status} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, minHeight: 33, padding: '0 11px', border: `1px solid ${estilo.border}`, borderRadius: 999, background: estilo.bg, color: estilo.color, fontSize: 11, fontWeight: 700 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: estilo.dot }} />
                  {status}
                </span>
              )
            })}
          </div>
        </section>

        <style>{`
          .config-identificacao > div:hover,
          .config-sla-grid > label:hover,
          .config-interface-grid > label:hover {
            border-color: #bfdbfe !important;
            box-shadow: 0 2px 8px rgba(37, 99, 235, .05);
          }

          input[type="number"]:focus,
          select:focus {
            border-color: #60a5fa !important;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, .10) !important;
          }

          @media (max-width: 900px) {
            .config-identificacao,
            .config-sla-grid,
            .config-notificacoes-grid,
            .config-interface-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            }
          }

          @media (max-width: 700px) {
            .config-identificacao,
            .config-sla-grid,
            .config-notificacoes-grid,
            .config-interface-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </main>
    </MenuPrincipal>
  )
}
