// ============================================================
// GESTÃO DE DEMANDAS DE TI
// V2.8 — RESPONSÁVEIS / ANALISTAS
// ============================================================

import { useMemo, useState, type CSSProperties } from 'react'
import type { Usuario } from '../types'
import { carregarUsuarios } from '../services/storage'
import MenuPrincipal from '../components/MenuPrincipal'
import './Responsaveis.css'

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

export default function Responsaveis({
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
  const [usuarios] = useState<Usuario[]>(carregarUsuarios)
  const [pesquisa, setPesquisa] = useState('')
  const [somenteAtivos, setSomenteAtivos] = useState(true)

  const analistas = useMemo(() => {
    const termo = pesquisa.trim().toLowerCase()

    return usuarios
      .filter((usuario) => usuario.perfil === 'Analista')
      .filter(
        (usuario) =>
          !somenteAtivos ||
          usuario.status === 'Ativo'
      )
      .filter(
        (usuario) =>
          !termo ||
          `${usuario.nome} ${usuario.login} ${usuario.email}`
            .toLowerCase()
            .includes(termo)
      )
  }, [usuarios, pesquisa, somenteAtivos])

  const ativos = usuarios.filter(
    (item) =>
      item.perfil === 'Analista' &&
      item.status === 'Ativo'
  ).length

  const total = usuarios.filter(
    (item) => item.perfil === 'Analista'
  ).length

  return (
    <MenuPrincipal
      ativo="responsaveis"
      usuarioAtual={undefined}
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
      subtitulo="Responsáveis"
      rodapeAcoes={
        <>
          <button
            type="button"
            onClick={onVoltar}
            style={botaoSecundario}
          >
            ← Voltar ao Dashboard
          </button>

          <button
            type="button"
            onClick={() => {
              if (onConfiguracoes) {
                onConfiguracoes()
                return
              }

              window.alert(
                'Para cadastrar ou editar um Analista, utilize o menu Administração.'
              )
            }}
            style={botaoPrimario}
          >
            ⚙ Configurações
          </button>
        </>
      }
    >
      <div className="responsaveis-page" style={paginaStyle}>

      <main className="responsaveis-content" style={conteudoStyle}>

        <div className="responsaveis-page-title" style={tituloPagina}>
          <h1 className="responsaveis-page-title-text" style={tituloStyle}>
            Responsáveis
          </h1>

          <p style={subtituloStyle}>
            Consulte os Analistas Cadastrados e Disponíveis para Atendimento.
          </p>
        </div>

        <div className="responsaveis-summary-grid" style={resumoGrid}>

          <div className="responsaveis-summary-card" style={cardResumo}>
            <strong style={numeroResumo}>
              {total}
            </strong>

            <span style={textoResumo}>
              Total de Analistas
            </span>
          </div>

          <div className="responsaveis-summary-card" style={cardResumo}>
            <strong style={numeroResumo}>
              {ativos}
            </strong>

            <span style={textoResumo}>
              Analistas Ativos
            </span>
          </div>

          <div className="responsaveis-summary-card" style={cardResumo}>
            <strong style={numeroResumo}>
              {total - ativos}
            </strong>

            <span style={textoResumo}>
              Analistas Inativos
            </span>
          </div>

        </div>

        <section className="responsaveis-main-card" style={card}>

          <div className="responsaveis-card-header" style={barraTopo}>
            <div className="responsaveis-section-title" style={cabecalhoAnalistas}>
              <h2 className="responsaveis-section-heading" style={tituloSecao}>
                Analistas
              </h2>

              <p className="responsaveis-section-description" style={textoSecao}>
                A distribuição das demandas utiliza
                somente Analistas Ativos.
              </p>
            </div>
          </div>

          <div className="responsaveis-filters" style={filtros}>
            <input
              value={pesquisa}
              onChange={(event) =>
                setPesquisa(event.target.value)
              }
              placeholder="Pesquisar Analista..."
              className="responsaveis-search" style={campoPesquisa}
            />

            <label className="responsaveis-checkbox" style={checkboxLabel}>
              <input
                type="checkbox"
                checked={somenteAtivos}
                onChange={(event) =>
                  setSomenteAtivos(
                    event.target.checked
                  )
                }
              />

              Somente Ativos
            </label>
          </div>

          <div className="responsaveis-table-wrap" style={tabelaContainer}>
            <table className="responsaveis-table" style={tabela}>
              <thead>
                <tr>
                  <th style={cabecalhoTabela}>Analista</th>
                  <th style={cabecalhoTabela}>Login</th>
                  <th style={cabecalhoTabela}>E-Mail</th>
                  <th style={{ ...cabecalhoTabela, textAlign: 'center' }}>Status</th>
                  <th style={{ ...cabecalhoTabela, textAlign: 'center' }}>Último Acesso</th>
                </tr>
              </thead>

              <tbody>
                {analistas.map((analista) => (
                  <tr className="responsaveis-table-row" key={analista.id}>

                    <td style={celulaPrincipal}>
                      <strong style={textoTabelaPrincipal}>
                        {analista.nome}
                      </strong>
                    </td>

                    <td style={textoTabela}>
                      {analista.login}
                    </td>

                    <td style={textoTabela}>
                      {analista.email || '-'}
                    </td>

                    <td>
                      <span
                        style={
                          analista.status === 'Ativo'
                            ? statusAtivo
                            : statusInativo
                        }
                      >
                        {analista.status}
                      </span>
                    </td>

                    <td style={textoTabela}>
                      {analista.ultimoAcesso
                        ? new Date(
                            analista.ultimoAcesso
                          ).toLocaleString('pt-BR')
                        : '-'}
                    </td>

                  </tr>
                ))}

                {analistas.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      style={tabelaVazia}
                    >
                      Nenhum Analista Encontrado.
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

// ============================================================
// ESTILOS
// ============================================================

const paginaStyle: CSSProperties = {
  minHeight: '100vh',
  background: '#f8fafc',
  color: '#0f172a',
  paddingBottom: 20,
  width: '100%',
  boxSizing: 'border-box',
  fontFamily:
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
}

const conteudoStyle: CSSProperties = {
  width: '100%',
  marginLeft: 0,
  marginRight: 0,
  padding: '2px 20px 30px',
  boxSizing: 'border-box',
  maxWidth: 'none',

}

const tituloPagina: CSSProperties = {
  marginBottom: 18,
}

const tituloStyle: CSSProperties = {
  margin: 0,
  fontSize: 24,
  lineHeight: 1.2,
  fontWeight: 700,
  color: '#0f172a',
  letterSpacing: '-.3px',
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',

}

const subtituloStyle: CSSProperties = {
  margin: '5px 0 0',
  color: '#64748b',
  fontSize: 13,
  lineHeight: 1.4,
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',

}

const card: CSSProperties = {
  background: '#ffffff',
  border: '1px solid #dbe5ef',
  borderRadius: 14,
  padding: 18,
  boxShadow: '0 3px 12px rgba(15,23,42,.045)',
  overflow: 'hidden',
}

const resumoGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0,1fr))',
  gap: 12,
  marginBottom: 16,

}

const cardResumo: CSSProperties = {
  ...card,
  display: 'flex',
  flexDirection: 'column',
  gap: 5,
  minHeight: 74,

}

const numeroResumo: CSSProperties = {
  fontSize: 24,
  lineHeight: 1.15,
  color: '#174f86',
  fontWeight: 700,

}

const barraTopo: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'stretch',
  gap: 16,
  paddingBottom: 14,
  borderBottom: '1px solid #eef2f7',
}

const cabecalhoAnalistas: CSSProperties = {
  borderLeft: '4px solid #2563eb',
  paddingLeft: 12,
}

const textoResumo: CSSProperties = {
  fontSize: 13,
  lineHeight: 1.35,
  color: '#475569',
  fontWeight: 400,
}

const celulaPrincipal: CSSProperties = {
  fontSize: 12,
  color: '#0f172a',
  padding: '10px 12px',
  borderBottom: '1px solid #f1f5f9',
  verticalAlign: 'middle',
}

const textoTabelaPrincipal: CSSProperties = {
  fontSize: 12,
  lineHeight: 1.35,
  color: '#0f172a',
  fontWeight: 700,
}

const textoTabela: CSSProperties = {
  fontSize: 12,
  lineHeight: 1.35,
  color: '#334155',
  fontWeight: 400,
  padding: '10px 12px',
  borderBottom: '1px solid #f1f5f9',
  verticalAlign: 'middle',
}

const tituloSecao: CSSProperties = {
  margin: 0,
  fontSize: 17,
  lineHeight: 1.3,
  color: '#0f172a',
  fontWeight: 700,

}

const textoSecao: CSSProperties = {
  margin: '5px 0 0',
  color: '#64748b',
  fontSize: 12,
  lineHeight: 1.4,

}

const filtros: CSSProperties = {
  display: 'flex',
  gap: 14,
  marginTop: 14,
  alignItems: 'center',
  width: '100%',
  padding: '0 1px',
  boxSizing: 'border-box',
}

const campoPesquisa: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  height: 40,
  minHeight: 40,
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  padding: '10px 11px',
  fontSize: 12,
  fontFamily: 'inherit',
  color: '#0f172a',
  background: '#ffffff',

}

const checkboxLabel: CSSProperties = {
  display: 'flex',
  gap: 7,
  alignItems: 'center',
  whiteSpace: 'nowrap',
  fontSize: 12,
  fontWeight: 700,
  color: '#475569',

}

const tabelaContainer: CSSProperties = {
  overflowX: 'auto',
  marginTop: 14,
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  background: '#ffffff',
}

const tabela: CSSProperties = {
  width: '100%',
  borderCollapse: 'separate',
  borderSpacing: 0,
  fontSize: 12,
  background: '#ffffff',
}

const cabecalhoTabela: CSSProperties = {
  background: '#f8fafc',
  color: '#475569',
  fontSize: 11,
  fontWeight: 700,
  padding: '10px 12px',
  textAlign: 'left',
  borderBottom: '1px solid #e2e8f0',
  whiteSpace: 'nowrap',
}

const tabelaVazia: CSSProperties = {
  padding: 28,
  textAlign: 'center',
  color: '#64748b',
  fontSize: 12,
  lineHeight: 1.4,
}

const statusAtivo: CSSProperties = {
  display: 'inline-block',
  padding: '4px 9px',
  borderRadius: 999,
  background: '#f0fdf4',
  color: '#15803d',
  fontWeight: 700,
  fontSize: 11,

}

const statusInativo: CSSProperties = {
  display: 'inline-block',
  padding: '4px 9px',
  borderRadius: 999,
  background: '#f1f5f9',
  color: '#64748b',
  fontWeight: 700,
  fontSize: 11,

}


const botaoPrimario: CSSProperties = {
  border: '1px solid #2563eb',
  borderRadius: 8,
  background: '#2563eb',
  color: '#ffffff',
  padding: '0 14px',
  minHeight: 40,
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  whiteSpace: 'nowrap',

}

const botaoSecundario: CSSProperties = {
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  background: '#ffffff',
  color: '#475569',
  padding: '0 14px',
  minHeight: 40,
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  whiteSpace: 'nowrap',

}