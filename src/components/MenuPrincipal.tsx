import { useState, type ReactNode } from 'react'
import type { Usuario } from '../types'

/**
 * ============================================================
 * GESTÃO DE DEMANDAS DE TI
 * MENU PRINCIPAL — V1.0
 * ============================================================
 *
 * Componente único responsável por:
 * - Barra lateral
 * - Cabeçalho superior
 * - Identificação do sistema
 * - Usuário logado / perfil
 * - Notificações
 * - Botão Sair
 * - Navegação principal
 * - Dimensões, espaçamentos, fontes e cores do shell
 *
 * As telas devem apenas fornecer o conteúdo em {children}.
 * Assim, alterações futuras no Menu Principal refletem em todo
 * o sistema sem precisar editar cada tela individualmente.
 * ============================================================
 */

export type MenuItem =
  | 'dashboard'
  | 'minhas-demandas'
  | 'nova-demanda'
  | 'todas-demandas'
  | 'clientes'
  | 'responsaveis'
  | 'feriados'
  | 'relatorios'
  | 'configuracoes'

type Props = {
  usuarioAtual?: Usuario
  nomeUsuario?: string
  perfilUsuario?: string

  /** Conteúdo específico da tela. */
  children: ReactNode

  /** Item que ficará destacado na barra lateral. */
  ativo?: MenuItem

  /** Navegação dos itens do menu. */
  onDashboard?: () => void
  onMinhasDemandas?: () => void
  onNovaDemanda?: () => void
  onTodasDemandas?: () => void
  onClientes?: () => void
  onResponsaveis?: () => void
  onFeriados?: () => void
  onRelatorios?: () => void
  onConfiguracoes?: () => void
  onMinhaConta?: () => void

  /** Ação do botão Sair. */
  onSair: () => void

  /** Texto secundário exibido no cabeçalho. */
  subtitulo?: string

  /** Opcional: quantidade exibida no sino. */
  notificacoes?: number
  notificacoesConteudo?: ReactNode

  /** Ações opcionais exibidas na barra fixa inferior do shell. */
  rodapeAcoes?: ReactNode
}

const ESTILOS = `
  .gd-menu-shell,
  .gd-menu-shell * {
    box-sizing: border-box;
  }

  .gd-menu-shell {
    --gd-primary: #2563eb;
    --gd-primary-dark: #1d4ed8;
    --gd-sidebar: 240px;
    --gd-header: 72px;
    --gd-bg: #f8fafc;
    --gd-border: #e2e8f0;
    --gd-text: #0f172a;
    --gd-text-secondary: #475569;
    --gd-text-muted: #64748b;

    width: 100%;
    min-height: 100vh;
    margin: 0;
    padding: 0;
    background: var(--gd-bg);
    color: var(--gd-text);
    font-family:
      Inter,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      sans-serif;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }

  .gd-menu-shell button {
    font: inherit;
  }

  /* ============================================================
     SIDEBAR
     ============================================================ */

  .gd-sidebar {
    position: fixed;
    z-index: 1100;
    top: 0;
    left: 0;
    bottom: 0;

    width: var(--gd-sidebar);
    height: 100vh;

    display: flex;
    flex-direction: column;

    padding: var(--gd-header) 12px 18px;

    overflow-y: auto;
    overflow-x: hidden;

    background: #102a43;
    color: #ffffff;

    box-shadow: 4px 0 18px rgba(15, 23, 42, 0.08);
  }

  .gd-sidebar-brand {
    position: absolute;
    top: 0;
    left: 0;

    width: 100%;
    height: var(--gd-header);

    display: flex;
    align-items: center;

    padding: 0 18px;
    gap: 10px;

    background: #0b2239;
    color: #ffffff;
  }

  .gd-sidebar-brand-icon {
    width: 28px;
    height: 28px;
    flex: 0 0 auto;

    display: flex;
    align-items: center;
    justify-content: center;

    color: #ffffff;
    font-size: 16px;
  }

  .gd-sidebar-brand strong {
    display: block;
    max-width: 170px;

    color: #ffffff;
    font-size: 14px;
    line-height: 1.2;
    font-weight: 700;
    letter-spacing: -0.2px;
  }

  .gd-sidebar-nav {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-top: 4px;
  }

  .gd-nav-section {
    margin: 14px 10px 5px;

    color: #8fa6bd;
    font-size: 9px;
    line-height: 1.2;
    font-weight: 700;
    letter-spacing: 0.08em;
  }

  .gd-nav-button {
    position: relative;

    width: 100%;
    min-height: 36px;

    display: flex;
    align-items: center;
    gap: 10px;

    padding: 0 11px;

    border: 0;
    border-radius: 8px;

    background: transparent;
    color: #d9e5f0;

    font-family: inherit;
    font-size: 11px;
    line-height: 1;
    font-weight: 600;

    text-align: left;
    cursor: pointer;

    transition:
      background 0.15s ease,
      color 0.15s ease;
  }

  .gd-nav-button:hover {
    background: rgba(255, 255, 255, 0.07);
    color: #ffffff;
  }

  .gd-nav-button.active {
    background: var(--gd-primary);
    color: #ffffff;
    box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
  }

  .gd-nav-icon {
    width: 18px;
    min-width: 18px;

    display: inline-flex;
    align-items: center;
    justify-content: center;

    color: inherit;
    font-size: 14px;
    line-height: 1;
    font-weight: 700;
  }

  .gd-sidebar-footer {
    margin-top: auto;
    padding: 16px 8px 2px;

    display: flex;
    flex-direction: column;
    gap: 2px;

    color: #7f98b1;
    font-size: 8px;
    line-height: 1.2;
  }

  .gd-sidebar-footer strong {
    margin-bottom: 2px;
    color: #ffffff;
    font-size: 10px;
    font-weight: 700;
  }

  /* ============================================================
     ÁREA PRINCIPAL / HEADER
     ============================================================ */

  .gd-main {
    width: calc(100% - var(--gd-sidebar));
    min-height: 100vh;
    margin-left: var(--gd-sidebar);
    background: var(--gd-bg);
  }

  .gd-topbar {
    position: sticky;
    top: 0;
    z-index: 900;

    width: 100%;
    height: var(--gd-header);

    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;

    padding: 0 24px;

    background: #ffffff;
    border-bottom: 1px solid var(--gd-border);
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.02);
  }

  .gd-topbar-left {
    display: flex;
    align-items: center;
    min-width: 0;
    gap: 12px;
  }

  .gd-menu-toggle {
    width: 32px;
    height: 32px;

    display: flex;
    align-items: center;
    justify-content: center;

    padding: 0;
    border: 0;
    border-radius: 7px;

    background: transparent;
    color: #64748b;

    font-size: 16px;
    cursor: pointer;
  }

  .gd-menu-toggle:hover {
    background: #f1f5f9;
    color: var(--gd-primary);
  }

  .gd-system-title {
    margin: 0;
    color: #0f172a;

    font-size: 16px;
    line-height: 1.2;
    font-weight: 700;
    letter-spacing: -0.2px;
  }

  .gd-system-subtitle {
    margin: 3px 0 0;
    color: #64748b;
    font-size: 10px;
    line-height: 1.2;
  }

  .gd-topbar-right {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
  }

  .gd-notification {
    position: relative;

    width: 34px;
    height: 34px;

    display: flex;
    align-items: center;
    justify-content: center;

    padding: 0;

    border: 1px solid #e2e8f0;
    border-radius: 50%;

    background: #ffffff;
    color: #475569;

    font-size: 15px;
    cursor: pointer;
  }

  .gd-notification:hover {
    background: #f8fafc;
    color: var(--gd-primary);
  }

  .gd-notification-badge {
    position: absolute;
    top: -3px;
    right: -2px;

    min-width: 15px;
    height: 15px;

    display: flex;
    align-items: center;
    justify-content: center;

    padding: 0 3px;

    border: 2px solid #ffffff;
    border-radius: 999px;

    background: #dc2626;
    color: #ffffff;

    font-size: 8px;
    line-height: 1;
    font-weight: 700;
  }

  .gd-notification-panel {
    position: absolute;
    top: calc(100% + 10px);
    right: 0;
    width: 390px;
    max-width: calc(100vw - 28px);
    max-height: 520px;
    overflow: auto;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    box-shadow: 0 18px 45px rgba(15, 23, 42, 0.14);
    z-index: 1300;
  }

  .gd-notification-panel .notificacoes-cabecalho {
    padding: 15px 16px;
    border-bottom: 1px solid #e2e8f0;
  }

  .gd-notification-panel .notificacoes-lista {
    max-height: 470px;
    overflow-y: auto;
  }

  .gd-user {
    display: flex;
    align-items: center;
    gap: 9px;
  }

  .gd-user-avatar {
    width: 34px;
    height: 34px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 50%;

    background: var(--gd-primary);
    color: #ffffff;

    font-size: 11px;
    font-weight: 700;
  }

  .gd-user-data {
    display: flex;
    flex-direction: column;
    min-width: 100px;
  }

  .gd-user-data strong {
    color: #0f172a;
    font-size: 11px;
    line-height: 1.2;
    font-weight: 700;
  }

  .gd-user-data small {
    margin-top: 2px;
    color: #64748b;
    font-size: 9px;
    line-height: 1.2;
  }

  .gd-logout {
    height: 34px;
    padding: 0 12px;

    border: 1px solid #cbd5e1;
    border-radius: 8px;

    background: #ffffff;
    color: #475569;

    font-family: inherit;
    font-size: 10px;
    font-weight: 700;

    cursor: pointer;
  }

  .gd-logout:hover {
    background: #f8fafc;
    border-color: #94a3b8;
  }

  /* ============================================================
     ÁREA DE CONTEÚDO
     ============================================================ */

  .gd-page-content {
    width: 100%;
    min-height: calc(100vh - var(--gd-header));
    padding: 22px 20px 42px;
  }

  /* ============================================================
     RODAPÉ FIXO DO SHELL
     O rodapé pertence ao Menu Principal e acompanha o eixo
     estrutural da área principal, assim como o cabeçalho.
     ============================================================ */

  .gd-shell-footer {
    position: fixed;
    left: var(--gd-sidebar);
    right: 0;
    bottom: 0;
    z-index: 1000;

    min-height: 68px;
    width: auto;
    padding: 12px 28px;

    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;

    box-sizing: border-box;
    background: #ffffff;
    border-top: 1px solid var(--gd-border);
    box-shadow: 0 -2px 8px rgba(15, 23, 42, 0.05);
  }

  .gd-shell-footer button {
    height: 40px;
    min-height: 40px;
    padding: 0 16px;
    border-radius: 8px;
    font-family: inherit;
    font-size: 12px;
    font-weight: 700;
    box-sizing: border-box;
  }

  .gd-shell-footer .btn-secundario {
    border: 1px solid #cbd5e1;
    background: #ffffff;
    color: #475569;
  }

  .gd-shell-footer .btn-secundario:hover {
    background: #f8fafc;
    border-color: #94a3b8;
  }

  .gd-shell-footer .btn-principal {
    border: 1px solid #2563eb;
    background: #2563eb;
    color: #ffffff;
    box-shadow: 0 2px 6px rgba(37, 99, 235, 0.16);
  }

  .gd-shell-footer .btn-principal:hover {
    background: #1d4ed8;
  }

  @media (max-width: 900px) {
    .gd-shell-footer {
      padding: 12px 24px;
    }
  }

  @media (max-width: 700px) {
    .gd-shell-footer {
      min-height: 62px;
      padding: 10px 16px;
    }

    .gd-shell-footer button {
      height: 38px;
      min-height: 38px;
      padding: 0 12px;
    }
  }

  @media (max-width: 480px) {
    .gd-shell-footer {
      gap: 8px;
      padding: 9px 10px;
    }

    .gd-shell-footer button {
      flex: 1 1 0;
      min-width: 0;
      padding: 0 8px;
    }
  }

  /* ============================================================
     RESPONSIVIDADE
     ============================================================ */

  @media (max-width: 1100px) {
    .gd-user-data {
      display: none;
    }
  }

  @media (max-width: 900px) {
    .gd-menu-shell {
      --gd-sidebar: 68px;
    }

    .gd-sidebar {
      padding-left: 8px;
      padding-right: 8px;
    }

    .gd-sidebar-brand {
      justify-content: center;
      padding: 0;
    }

    .gd-sidebar-brand > div:last-child {
      display: none;
    }

    .gd-nav-button {
      justify-content: center;
      padding: 0;
    }

    .gd-nav-button > span:last-child {
      display: none;
    }

    .gd-nav-section {
      display: none;
    }

    .gd-sidebar-footer {
      align-items: center;
      padding-left: 0;
      padding-right: 0;
    }

    .gd-sidebar-footer span {
      display: none;
    }

    .gd-topbar {
      padding: 0 14px;
    }

    .gd-system-subtitle {
      display: none;
    }

    .gd-page-content {
      padding-left: 14px;
      padding-right: 14px;
    }
  }

  @media (max-width: 620px) {
    .gd-topbar {
      gap: 8px;
    }

    .gd-topbar-left {
      gap: 6px;
    }

    .gd-system-title {
      font-size: 14px;
    }

    .gd-topbar-right {
      gap: 6px;
    }

    .gd-notification {
      display: none;
    }

    .gd-logout {
      padding: 0 9px;
    }
  }
`

function iniciaisDoUsuario(nome: string) {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte.charAt(0))
    .join('')
    .toUpperCase()
}

function perfilExibicao(usuario: Usuario) {
  return usuario.perfil === 'Gestor/Administrador'
    ? 'Gestor'
    : usuario.perfil
}

type BotaoMenuProps = {
  id: MenuItem
  icone: string
  children: ReactNode
  ativo?: MenuItem
  onClick?: () => void
}

function BotaoMenu({
  id,
  icone,
  children,
  ativo,
  onClick,
}: BotaoMenuProps) {
  return (
    <button
      type="button"
      className={`gd-nav-button ${ativo === id ? 'active' : ''}`}
      onClick={onClick}
      aria-current={ativo === id ? 'page' : undefined}
    >
      <span className="gd-nav-icon" aria-hidden="true">
        {icone}
      </span>
      <span>{children}</span>
    </button>
  )
}

export default function MenuPrincipal({
  usuarioAtual,
  nomeUsuario,
  perfilUsuario,
  children,
  ativo = 'dashboard',
  onDashboard,
  onMinhasDemandas,
  onNovaDemanda,
  onTodasDemandas,
  onClientes,
  onResponsaveis,
  onFeriados,
  onRelatorios,
  onConfiguracoes,
  onMinhaConta,
  onSair,
  subtitulo = 'Sistema de Gestão de Demandas',
  notificacoes = 0,
  notificacoesConteudo,
  rodapeAcoes,
}: Props) {
  const [notificacoesAbertas, setNotificacoesAbertas] = useState(false)
  const nomeExibicao = usuarioAtual?.nome || nomeUsuario || 'Usuário'
  const perfil = usuarioAtual ? perfilExibicao(usuarioAtual) : (perfilUsuario || 'Usuário')
  const iniciais = iniciaisDoUsuario(nomeExibicao)

  return (
    <div className="gd-menu-shell">
      <style>{ESTILOS}</style>

      <aside className="gd-sidebar">
        <div className="gd-sidebar-brand">
          <div className="gd-sidebar-brand-icon" aria-hidden="true">
            ⚙
          </div>

          <div>
            <strong>Gestão de Demandas</strong>
          </div>
        </div>

        <nav
          className="gd-sidebar-nav"
          aria-label="Menu principal"
        >
          <BotaoMenu
            id="dashboard"
            icone="⌂"
            ativo={ativo}
            onClick={onDashboard}
          >
            Dashboard
          </BotaoMenu>

          {onMinhasDemandas && (
            <BotaoMenu
              id="minhas-demandas"
              icone="☷"
              ativo={ativo}
              onClick={onMinhasDemandas}
            >
              Minhas Demandas
            </BotaoMenu>
          )}

          <div className="gd-nav-section">DEMANDAS</div>

          <BotaoMenu
            id="nova-demanda"
            icone="+"
            ativo={ativo}
            onClick={onNovaDemanda}
          >
            Nova Demanda
          </BotaoMenu>

          <BotaoMenu
            id="todas-demandas"
            icone="☷"
            ativo={ativo}
            onClick={onTodasDemandas}
          >
            Todas as Demandas
          </BotaoMenu>

          <div className="gd-nav-section">GESTÃO</div>

          <BotaoMenu
            id="clientes"
            icone="▦"
            ativo={ativo}
            onClick={onClientes}
          >
            Clientes
          </BotaoMenu>

          <BotaoMenu
            id="responsaveis"
            icone="♟"
            ativo={ativo}
            onClick={onResponsaveis}
          >
            Responsáveis
          </BotaoMenu>

          <BotaoMenu
            id="feriados"
            icone="□"
            ativo={ativo}
            onClick={onFeriados}
          >
            Feriados
          </BotaoMenu>

          <div className="gd-nav-section">RELATÓRIOS</div>

          <BotaoMenu
            id="relatorios"
            icone="▥"
            ativo={ativo}
            onClick={onRelatorios}
          >
            Relatórios
          </BotaoMenu>

          <div className="gd-nav-section">ADMINISTRAÇÃO</div>

          <BotaoMenu
            id="configuracoes"
            icone="⚙"
            ativo={ativo}
            onClick={onConfiguracoes}
          >
            Configurações
          </BotaoMenu>
        </nav>

        <div className="gd-sidebar-footer">
          <strong>PRODEPA</strong>
          <span>Tecnologia que aproxima</span>
          <span>o Pará do futuro</span>
        </div>
      </aside>

      <div className="gd-main">
        <header className="gd-topbar">
          <div className="gd-topbar-left">
            <button
              type="button"
              className="gd-menu-toggle"
              aria-label="Menu principal"
            >
              ☰
            </button>

            <div>
              <h1 className="gd-system-title">
                Gestão de Demandas de TI
              </h1>

              <p className="gd-system-subtitle">
                {subtitulo}
              </p>
            </div>
          </div>

          <div className="gd-topbar-right">
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className="gd-notification"
                aria-label="Notificações"
                aria-expanded={notificacoesAbertas}
                onClick={() => setNotificacoesAbertas((aberta) => !aberta)}
              >
                🔔

                {notificacoes > 0 && (
                  <span className="gd-notification-badge">
                    {notificacoes > 99 ? '99+' : notificacoes}
                  </span>
                )}
              </button>

              {notificacoesAbertas && notificacoesConteudo && (
                <div
                  className="gd-notification-panel"
                  role="dialog"
                  aria-label="Central de notificações"
                >
                  {notificacoesConteudo}
                </div>
              )}
            </div>

            {onMinhaConta ? (
              <button
                type="button"
                className="gd-user"
                onClick={onMinhaConta}
                aria-label="Abrir Minha Conta"
                style={{
                  border: 0,
                  margin: 0,
                  padding: 0,
                  background: 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span
                  className="gd-user-avatar"
                  aria-hidden="true"
                >
                  {iniciais || 'US'}
                </span>

                <div className="gd-user-data">
                  <strong>{nomeExibicao}</strong>
                  <small>{perfil}</small>
                </div>
              </button>
            ) : (
              <div className="gd-user">
                <span
                  className="gd-user-avatar"
                  aria-hidden="true"
                >
                  {iniciais || 'US'}
                </span>

                <div className="gd-user-data">
                  <strong>{nomeExibicao}</strong>
                  <small>{perfil}</small>
                </div>
              </div>
            )}

            <button
              type="button"
              className="gd-logout"
              onClick={onSair}
            >
              Sair
            </button>
          </div>
        </header>

        <main className="gd-page-content">
          {children}
        </main>
      </div>

      {rodapeAcoes && (
        <div className="gd-shell-footer">
          {rodapeAcoes}
        </div>
      )}
    </div>
  )
}//
