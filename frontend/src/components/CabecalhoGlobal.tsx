// ============================================================
// GESTÃO DE DEMANDAS DE TI
// V3.1 — CABEÇALHO GLOBAL / NAVEGAÇÃO GLOBAL
// ============================================================
// Arquivo: src/components/CabecalhoGlobal.tsx
//
// PADRÃO VISUAL OFICIAL
// - A referência visual oficial é a Dashboard aprovada.
// - Todas as telas devem utilizar este mesmo componente.
// - Sidebar, cabeçalho, cores, espaçamentos e tipografia são
//   centralizados aqui.
// - O perfil exibido para o usuário é SEMPRE "Gestor(a)".
// - A palavra "Administrador" não é exibida na interface.
//
// Não altera regras de negócio ou callbacks das páginas.
// ============================================================

type Props = {
  paginaAtiva:
    | 'dashboard'
    | 'todas-demandas'
    | 'nova-demanda'
    | 'clientes'
    | 'responsaveis'
    | 'feriados'
    | 'relatorios'

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
}

function iniciais(nome: string): string {
  const partes = nome
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (partes.length === 0) {
    return 'US'
  }

  if (partes.length === 1) {
    return partes[0]
      .slice(0, 2)
      .toUpperCase()
  }

  return `${partes[0][0]}${partes[partes.length - 1][0]}`
    .toUpperCase()
}

/*
 * REGRA VISUAL DO PROJETO:
 * a interface não exibe "Administrador".
 * O perfil visual do usuário permanece "Gestor(a)".
 *
 * Mantemos o parâmetro perfilUsuario para não quebrar os contratos
 * existentes das páginas e para permitir futura evolução do acesso.
 */
function perfilExibicao(
  _perfilUsuario: string
): string {
  return 'Gestor(a)'
}

const menu = (
  onDashboard: () => void,
  onTodasDemandas: () => void,
  onNovaDemanda: () => void,
  onClientes: () => void,
  onResponsaveis: () => void,
  onFeriados: () => void,
  onRelatorios: () => void,
) => [
  {
    id: 'dashboard' as const,
    texto: 'Dashboard',
    acao: onDashboard,
  },
  {
    id: 'todas-demandas' as const,
    texto: 'Todas as Demandas',
    acao: onTodasDemandas,
  },
  {
    id: 'nova-demanda' as const,
    texto: 'Nova Demanda',
    acao: onNovaDemanda,
  },
  {
    id: 'clientes' as const,
    texto: 'Clientes',
    acao: onClientes,
  },
  {
    id: 'responsaveis' as const,
    texto: 'Responsáveis',
    acao: onResponsaveis,
  },
  {
    id: 'feriados' as const,
    texto: 'Feriados',
    acao: onFeriados,
  },
  {
    id: 'relatorios' as const,
    texto: 'Relatórios',
    acao: onRelatorios,
  },
]

export default function CabecalhoGlobal({
  paginaAtiva,
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
}: Props) {
  const perfil =
    perfilExibicao(perfilUsuario)

  const itensMenu = menu(
    onDashboard,
    onTodasDemandas,
    onNovaDemanda,
    onClientes,
    onResponsaveis,
    onFeriados,
    onRelatorios,
  )

  return (
    <>
      <style>{`

        /* ======================================================
           DESIGN SYSTEM GLOBAL — PADRÃO DASHBOARD
           ====================================================== */

        .gd-global-root {
          font-family: var(--gd-font-family);
        }

        /* ======================================================
           SIDEBAR
           ====================================================== */

        .gd-global-sidebar {
          position: fixed;

          top: 0;
          left: 0;
          bottom: 0;

          z-index: 1300;

          width: 240px;
          height: 100vh;

          display: flex;
          flex-direction: column;

          padding: 28px 10px 16px;

          box-sizing: border-box;

          background: var(--gd-sidebar);

          color: var(--gd-text-white);

          border-right: 0;

          box-shadow:
            4px 0 18px
            rgba(15, 23, 42, 0.08);

          font-family: var(--gd-font-family);
        }

        .gd-global-sidebar-title {
          padding: 10px 8px 26px;

          color: var(--gd-text-white);

          font-size: 14px;

          line-height: 1.2;

          font-weight: 700;

          white-space: nowrap;
        }

        .gd-global-sidebar-menu {
          display: flex;

          flex-direction: column;

          gap: 3px;
        }

        .gd-global-sidebar-button {
          position: relative;

          width: 100%;

          min-height: 38px;

          display: flex;

          align-items: center;

          padding:
            0 12px 0 38px;

          border: 0;

          border-radius: var(--gd-radius-md);

          background: transparent;

          color: #dbe7f3;

          font-family: inherit;

          font-size: 12px;

          font-weight: 600;

          text-align: left;

          cursor: pointer;

          transition:
            background .16s ease,
            color .16s ease,
            transform .16s ease;
        }

        .gd-global-sidebar-button:hover {
          background: rgba(255,255,255,.07);

          color: var(--gd-text-white);
        }

        .gd-global-sidebar-button.gd-global-active {
          background: var(--gd-primary);

          color: var(--gd-text-white);

          box-shadow:
            0 4px 12px
            rgba(37, 99, 235, 0.25);
        }

        .gd-global-sidebar-icon {
          position: absolute;

          left: 12px;

          width: 17px;

          display: inline-flex;

          align-items: center;

          justify-content: center;

          color: currentColor;

          font-size: 14px;

          line-height: 1;
        }

        /* ======================================================
           CABEÇALHO
           ====================================================== */

        .gd-global-header {
          position: relative;

          z-index: 1200;

          min-height: 68px;

          margin-left: 240px;

          padding: 12px 28px;

          box-sizing: border-box;

          display: flex;

          align-items: center;

          justify-content: space-between;

          gap: 20px;

          background: var(--gd-surface);

          border-bottom: 1px solid var(--gd-border);

          box-shadow:
            0 1px 2px
            rgba(15, 23, 42, 0.04);

          font-family: var(--gd-font-family);
        }

        .gd-global-brand {
          min-width: 0;

          display: flex;

          flex-direction: column;

          gap: 3px;
        }

        .gd-global-brand h1 {
          margin: 0;

          color: var(--gd-text);

          font-family: inherit;

          font-size: 20px;

          line-height: 1.2;

          font-weight: 700;

          letter-spacing: -0.3px;
        }

        .gd-global-brand p {
          margin: 0;

          color: var(--gd-text-muted);

          font-family: inherit;

          font-size: 12px;

          line-height: 1.2;
        }

        .gd-global-user {
          flex-shrink: 0;

          display: flex;

          align-items: center;

          gap: 10px;
        }

        .gd-global-avatar {
          width: 38px;
          height: 38px;

          flex:
            0 0 38px;

          display: inline-flex;

          align-items: center;

          justify-content: center;

          border-radius: 50%;

          background: var(--gd-primary);

          color: var(--gd-text-white);

          font-family: inherit;

          font-size: 12px;

          font-weight: 700;
        }

        .gd-global-user-data {
          min-width: 105px;

          display: flex;

          flex-direction: column;

          gap: 2px;
        }

        .gd-global-user-data strong {
          overflow: hidden;

          color: var(--gd-text);

          font-family: inherit;

          font-size: 13px;

          line-height: 1.2;

          font-weight: 600;

          white-space: nowrap;

          text-overflow: ellipsis;
        }

        .gd-global-user-data small {
          color: var(--gd-text-muted);

          font-family: inherit;

          font-size: 11px;

          line-height: 1.2;
        }

        .gd-global-notification,
        .gd-global-logout {
          box-sizing: border-box;

          border: 1px solid var(--gd-border-strong);

          background: var(--gd-surface);

          color: var(--gd-text-secondary);

          font-family: inherit;

          cursor: pointer;

          transition:
            background .16s ease,
            border-color .16s ease,
            color .16s ease,
            transform .16s ease;
        }

        .gd-global-notification {
          width: 36px;
          height: 36px;

          padding: 0;

          display: inline-flex;

          align-items: center;

          justify-content: center;

          border-radius: 50%;

          font-size: 16px;
        }

        .gd-global-logout {
          min-height: 36px;

          padding: 0 13px;

          border-radius: var(--gd-radius-md);

          font-size: 12px;

          font-weight: 600;
        }

        .gd-global-notification:hover,
        .gd-global-logout:hover {
          background: var(--gd-primary-light);

          border-color: #bfdbfe;

          color: var(--gd-primary-dark);
        }

        /* ======================================================
           RESPONSIVIDADE
           ====================================================== */

        @media (max-width: 900px) {

          .gd-global-sidebar {
            width: 220px;
          }

          .gd-global-header {
            margin-left: 220px;
          }

        }

        @media (max-width: 700px) {

          .gd-global-sidebar {
            width: 68px;

            padding-left: 8px;
            padding-right: 8px;
          }

          .gd-global-sidebar-title,
          .gd-global-sidebar-button > span:last-child {
            display: none;
          }

          .gd-global-sidebar-button {
            justify-content: center;

            padding-left: 0;
            padding-right: 0;
          }

          .gd-global-sidebar-icon {
            position: static;

            width: 100%;

            font-size: 16px;
          }

          .gd-global-header {
            margin-left: 68px;

            padding-left: 14px;
            padding-right: 14px;
          }

          .gd-global-user-data {
            display: none;
          }

        }

      `}</style>

      <div className="gd-global-root">

        {/* ====================================================
            SIDEBAR
        ==================================================== */}

        <aside
          className="gd-global-sidebar"
          aria-label="Navegação principal"
        >

          <div className="gd-global-sidebar-title">
            Gestão de Demandas de TI
          </div>

          <nav className="gd-global-sidebar-menu">

            {itensMenu.map(
              (item) => (

                <button
                  key={item.id}
                  type="button"
                  className={
                    paginaAtiva === item.id
                      ? 'gd-global-sidebar-button gd-global-active'
                      : 'gd-global-sidebar-button'
                  }
                  onClick={item.acao}
                  aria-current={
                    paginaAtiva === item.id
                      ? 'page'
                      : undefined
                  }
                >

                  <span
                    className="gd-global-sidebar-icon"
                    aria-hidden="true"
                  >
                    {
                      item.id === 'dashboard'
                        ? '⌂'
                        : item.id === 'todas-demandas'
                          ? '☷'
                          : item.id === 'nova-demanda'
                            ? '+'
                            : item.id === 'clientes'
                              ? '♙'
                              : item.id === 'responsaveis'
                                ? '♟'
                                : item.id === 'feriados'
                                  ? '▦'
                                  : '▤'
                    }
                  </span>

                  <span>
                    {item.texto}
                  </span>

                </button>

              )
            )}

          </nav>

        </aside>

        {/* ====================================================
            CABEÇALHO
        ==================================================== */}

        <header className="gd-global-header">

          <div className="gd-global-brand">

            <h1>
              Gestão de Demandas de TI
            </h1>

            <p>
              Dashboard do Gestor
            </p>

          </div>

          <div className="gd-global-user">

            <span
              className="gd-global-avatar"
              aria-hidden="true"
            >
              {iniciais(nomeUsuario)}
            </span>

            <div className="gd-global-user-data">

              <strong>
                {nomeUsuario}
              </strong>

              <small>
                {perfil}
              </small>

            </div>

            <button
              type="button"
              className="gd-global-notification"
              onClick={onDashboard}
              title="Ver notificações no Dashboard"
              aria-label="Ver notificações no Dashboard"
            >
              🔔
            </button>

            <button
              type="button"
              className="gd-global-logout"
              onClick={onLogout}
            >
              Sair
            </button>

          </div>

        </header>

      </div>
    </>
  )
}