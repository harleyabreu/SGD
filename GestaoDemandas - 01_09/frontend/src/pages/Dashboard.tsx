import './Dashboard.css'

type DashboardProps = {
  onLogout?: () => void
  onTodasDemandas?: () => void
}

function Dashboard({ onLogout, onTodasDemandas }: DashboardProps) {
  return (
    <div className="dashboard">

      {/* CABEÇALHO */}
      <header className="dashboard-header">
        <div>
          <h1>Gestão de Demandas de TI</h1>
          <p>Dashboard do Gestor</p>
        </div>

        <div className="user-info">
          <span className="user-avatar">LG</span>
          <div>
            <strong>Lorenna Góes</strong>
            <small>Gestora</small>
          </div>

          {onLogout && (
            <button className="btn-logout" onClick={onLogout}>
              Sair
            </button>
          )}
        </div>
      </header>

      {/* MENU */}
      <nav className="dashboard-menu">
        <button className="menu-active">Dashboard</button>
        <button onClick={onTodasDemandas}>
          Todas as Demandas</button>
        <button>Nova Demanda</button>
        <button>Clientes</button>
        <button>Responsáveis</button>
        <button>Relatórios</button>
      </nav>

      {/* CONTEÚDO */}
      <main className="dashboard-content">

        <div className="page-title">
          <div>
            <h2>Visão Geral</h2>
            <p>Acompanhe o andamento das demandas de TI.</p>
          </div>
        </div>

        {/* CARDS */}
        <section className="summary-cards">

          <div className="summary-card">
            <span className="card-icon">📋</span>
            <div>
              <span className="card-label">Total de Demandas</span>
              <strong>0</strong>
            </div>
          </div>

          <div className="summary-card">
            <span className="card-icon">⚙️</span>
            <div>
              <span className="card-label">Em Atendimento</span>
              <strong>0</strong>
            </div>
          </div>

          <div className="summary-card">
            <span className="card-icon">🟠</span>
            <div>
              <span className="card-label">Com Pendências</span>
              <strong>0</strong>
            </div>
          </div>

          <div className="summary-card overdue">
            <span className="card-icon">🔴</span>
            <div>
              <span className="card-label">Atrasadas</span>
              <strong>0</strong>
            </div>
          </div>

        </section>

        {/* ÁREAS DO DASHBOARD */}
        <section className="dashboard-grid">

          <div className="dashboard-panel">
            <div className="panel-header">
              <h3>Demandas por Cliente</h3>
              <span>0 demandas</span>
            </div>

            <div className="empty-state">
              <div>📊</div>
              <p>Nenhuma demanda cadastrada.</p>
            </div>
          </div>

          <div className="dashboard-panel">
            <div className="panel-header">
              <h3>Demandas por Responsável</h3>
              <span>0 demandas</span>
            </div>

            <div className="empty-state">
              <div>👥</div>
              <p>Nenhuma demanda cadastrada.</p>
            </div>
          </div>

        </section>

        {/* PRIORIDADES */}
        <section className="dashboard-panel priority-panel">

          <div className="panel-header">
            <h3>Demandas por Prioridade</h3>
          </div>

          <div className="priority-list">

            <div className="priority-item">
              <span className="priority-dot critical"></span>
              <span>Crítica</span>
              <strong>0</strong>
            </div>

            <div className="priority-item">
              <span className="priority-dot high"></span>
              <span>Alta</span>
              <strong>0</strong>
            </div>

            <div className="priority-item">
              <span className="priority-dot medium"></span>
              <span>Média</span>
              <strong>0</strong>
            </div>

            <div className="priority-item">
              <span className="priority-dot low"></span>
              <span>Baixa</span>
              <strong>0</strong>
            </div>

          </div>

        </section>

      </main>

    </div>
  )
}

export default Dashboard