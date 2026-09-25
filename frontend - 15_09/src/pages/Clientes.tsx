// ============================================================
// GESTÃO DE DEMANDAS DE TI
// V2.8 — CLIENTES
// ============================================================

import { useMemo, useState, type CSSProperties } from 'react'

import type { Cliente } from '../types'

import {
  carregarClientes,
  salvarClientes,
} from '../services/storage'

import MenuPrincipal from '../components/MenuPrincipal'

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

function agoraISO() {
  return new Date().toISOString()
}

function proximoId(lista: Cliente[]) {
  return (
    lista.reduce(
      (maior, item) =>
        Math.max(maior, item.id),
      0
    ) + 1
  )
}

export default function Clientes({
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
  const [clientes, setClientes] =
    useState<Cliente[]>(carregarClientes)

  const [pesquisa, setPesquisa] =
    useState('')

  const [mostrarFormulario, setMostrarFormulario] =
    useState(false)

  const [editando, setEditando] =
    useState<Cliente | null>(null)

  const [nome, setNome] =
    useState('')

  const [sigla, setSigla] =
    useState('')

  const [mensagem, setMensagem] =
    useState('')

  const filtrados = useMemo(() => {
    const termo =
      pesquisa
        .trim()
        .toLowerCase()

    if (!termo) {
      return clientes
    }

    return clientes.filter((cliente) =>
      `${cliente.nome} ${cliente.sigla || ''}`
        .toLowerCase()
        .includes(termo)
    )
  }, [clientes, pesquisa])

  function abrirNovo() {
    setEditando(null)
    setNome('')
    setSigla('')
    setMensagem('')
    setMostrarFormulario(true)
  }

  function abrirEdicao(cliente: Cliente) {
    setEditando(cliente)
    setNome(cliente.nome)
    setSigla(cliente.sigla || '')
    setMensagem('')
    setMostrarFormulario(true)
  }

  function cancelarFormulario() {
    setMostrarFormulario(false)
    setEditando(null)
    setNome('')
    setSigla('')
    setMensagem('')
  }

  function salvar() {
    const nomeLimpo =
      nome.trim()

    const siglaLimpa =
      sigla.trim().toUpperCase()

    if (!nomeLimpo) {
      setMensagem(
        'Informe o nome do cliente.'
      )
      return
    }

    const duplicado =
      clientes.some(
        (cliente) =>
          cliente.id !== editando?.id &&
          cliente.nome
            .trim()
            .toLowerCase() ===
            nomeLimpo.toLowerCase()
      )

    if (duplicado) {
      setMensagem(
        'Já existe um cliente com esse nome.'
      )
      return
    }

    const agora =
      agoraISO()

    const atualizados =
      editando
        ? clientes.map(
            (cliente) =>
              cliente.id === editando.id
                ? {
                    ...cliente,
                    nome: nomeLimpo,
                    sigla: siglaLimpa,
                    atualizadoEm: agora,
                  }
                : cliente
          )
        : [
            ...clientes,
            {
              id: proximoId(clientes),
              nome: nomeLimpo,
              sigla: siglaLimpa,
              ativo: true,
              criadoEm: agora,
            },
          ]

    setClientes(atualizados)

    salvarClientes(atualizados)

    setMostrarFormulario(false)
    setEditando(null)
    setNome('')
    setSigla('')
    setMensagem('')
  }

  function alternarStatus(
    cliente: Cliente
  ) {
    const atualizados =
      clientes.map(
        (item) =>
          item.id === cliente.id
            ? {
                ...item,
                ativo: !item.ativo,
                atualizadoEm: agoraISO(),
              }
            : item
      )

    setClientes(atualizados)

    salvarClientes(atualizados)
  }

  const ativos =
    clientes.filter(
      (item) => item.ativo
    ).length

  const inativos =
    clientes.length - ativos



  return (
    <MenuPrincipal
      ativo="clientes"
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
      subtitulo="Clientes"
      rodapeAcoes={
        <>
          <button
            type="button"
            onClick={onVoltar}
            style={botaoSecundario}
          >
            ← Voltar ao Dashboard
          </button>

          <div style={acoesDireita}>
            {!mostrarFormulario && (
              <button
                type="button"
                onClick={abrirNovo}
                style={botaoPrimario}
              >
                + Novo Cliente
              </button>
            )}

            {mostrarFormulario && (
              <>
                <button
                  type="button"
                  onClick={cancelarFormulario}
                  style={botaoSecundario}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={salvar}
                  style={botaoPrimario}
                >
                  Salvar Cliente
                </button>
              </>
            )}
          </div>
        </>
      }
    >
      <div style={conteudoStyle}>
        <section style={tituloPaginaStyle}>
          <div>
            <h1 style={tituloPaginaTextoStyle}>
              Clientes
            </h1>

            <p style={descricaoPaginaStyle}>
              Cadastro e consulta dos órgãos/clientes
              atendidos pelo sistema.
            </p>
          </div>
        </section>

        <div style={resumoGrid}>
          <div style={cardResumo}>
            <strong style={numeroResumo}>
              {clientes.length}
            </strong>

            <span>
              Total de clientes
            </span>
          </div>

          <div style={cardResumo}>
            <strong style={numeroResumo}>
              {ativos}
            </strong>

            <span>
              Clientes ativos
            </span>
          </div>

          <div style={cardResumo}>
            <strong style={numeroResumo}>
              {inativos}
            </strong>

            <span>
              Clientes inativos
            </span>
          </div>
        </div>

        <section style={card}>
          <div style={barraTopo}>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 17,
                  fontWeight: 700,
                  color: '#173f67',
                  fontFamily: 'inherit',
                }}
              >
                Clientes cadastrados
              </h2>

              <p
                style={{
                  margin: '5px 0 0',
                  color: '#64748b',
                  fontSize: 13,
                }}
              >
                Gerencie os clientes utilizados
                no cadastro das demandas.
              </p>
            </div>
          </div>

          <input
            value={pesquisa}
            onChange={(event) =>
              setPesquisa(
                event.target.value
              )
            }
            placeholder="Pesquisar por cliente ou sigla..."
            style={campoPesquisa}
          />

          {mostrarFormulario && (
            <div style={formulario}>
              <h3
                style={{
                  marginTop: 0,
                  marginBottom: 18,
                  fontSize: 17,
                  fontWeight: 700,
                  color: '#173f67',
                  fontFamily: 'inherit',
                }}
              >
                {editando
                  ? 'Editar cliente'
                  : 'Novo cliente'}
              </h3>

              <div style={formGrid}>
                <label style={label}>
                  Nome *

                  <input
                    value={nome}
                    onChange={(event) =>
                      setNome(
                        event.target.value
                      )
                    }
                    style={campo}
                    autoFocus
                  />
                </label>

                <label style={label}>
                  Sigla

                  <input
                    value={sigla}
                    onChange={(event) =>
                      setSigla(
                        event.target.value
                      )
                    }
                    style={campo}
                    maxLength={20}
                  />
                </label>
              </div>

              {mensagem && (
                <div style={mensagemErro}>
                  {mensagem}
                </div>
              )}
            </div>
          )}

          <div
            style={{
              overflowX: 'auto',
              marginTop: 20,
            }}
          >
            <table style={tabela}>
              <thead>
                <tr>
                  <th style={thStyle}>
                    Cliente
                  </th>

                  <th style={thStyle}>
                    Sigla
                  </th>

                  <th style={thStyle}>
                    Status
                  </th>

                  <th style={thStyle}>
                    Cadastro
                  </th>

                  <th
                    style={{
                      ...thStyle,
                      textAlign: 'right',
                    }}
                  >
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody>
                {filtrados.map(
                  (cliente) => (
                    <tr key={cliente.id}>
                      <td style={tdStyle}>
                        <strong>
                          {cliente.nome}
                        </strong>
                      </td>

                      <td style={tdStyle}>
                        {cliente.sigla || '-'}
                      </td>

                      <td style={tdStyle}>
                        <span
                          style={
                            cliente.ativo
                              ? statusAtivo
                              : statusInativo
                          }
                        >
                          {cliente.ativo
                            ? 'Ativo'
                            : 'Inativo'}
                        </span>
                      </td>

                      <td style={tdStyle}>
                        {cliente.criadoEm
                          ? new Date(
                              cliente.criadoEm
                            ).toLocaleDateString(
                              'pt-BR'
                            )
                          : '-'}
                      </td>

                      <td
                        style={{
                          ...tdStyle,
                          textAlign: 'right',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            abrirEdicao(
                              cliente
                            )
                          }
                          style={botaoAcao}
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            alternarStatus(
                              cliente
                            )
                          }
                          style={botaoAcao}
                        >
                          {cliente.ativo
                            ? 'Inativar'
                            : 'Ativar'}
                        </button>
                      </td>
                    </tr>
                  )
                )}

                {filtrados.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        padding: 28,
                        textAlign: 'center',
                        color: '#718096',
                      }}
                    >
                      Nenhum cliente
                      encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </MenuPrincipal>
  )
}

const conteudoStyle: CSSProperties = {
  width: '100%',
  marginLeft: 0,
  marginRight: 0,
  padding: '2px 20px 92px',
  boxSizing: 'border-box',
  maxWidth: 'none',
}

const tituloPaginaStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-end',
  marginBottom: 18,
  gap: 20,
}

const tituloPaginaTextoStyle: CSSProperties = {
  margin: 0,
  fontSize: 24,
  lineHeight: 1.2,
  fontWeight: 700,
  color: '#0f172a',
  letterSpacing: '-.3px',
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
}

const descricaoPaginaStyle: CSSProperties = {
  margin: '5px 0 0',
  color: '#64748b',
  fontSize: 13,
  lineHeight: 1.4,
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
}

const resumoGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 12,
  marginBottom: 16,
}

const card: CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  padding: 18,
  boxShadow: '0 1px 2px rgba(15,23,42,.04)',
}

const cardResumo: CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  padding: 16,
  boxShadow: '0 1px 2px rgba(15,23,42,.04)',
  display: 'flex',
  flexDirection: 'column',
  gap: 5,
}

const numeroResumo: CSSProperties = {
  fontSize: 25,
  lineHeight: 1.15,
  color: '#174f86',
  fontWeight: 700,
}

const barraTopo: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 16,
}

const formulario: CSSProperties = {
  marginTop: 16,
  padding: 16,
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: 10,
}

const formGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1fr)',
  gap: 14,
}

const label: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  fontWeight: 700,
  fontSize: 12,
  color: '#475569',
}

const campo: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  minHeight: 40,
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  padding: '10px 11px',
  fontSize: 12,
  fontWeight: 400,
  background: '#ffffff',
  color: '#0f172a',
  fontFamily: 'inherit',
}

const campoPesquisa: CSSProperties = {
  width: '100%',
  minHeight: 40,
  boxSizing: 'border-box',
  marginTop: 16,
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  padding: '10px 11px',
  fontSize: 12,
  background: '#ffffff',
  color: '#0f172a',
  fontFamily: 'inherit',
}

const mensagemErro: CSSProperties = {
  marginTop: 12,
  padding: 10,
  borderRadius: 8,
  background: '#fef2f2',
  border: '1px solid #fecaca',
  color: '#b91c1c',
  fontSize: 12,
}

const tabela: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 12,
}

const thStyle: CSSProperties = {
  padding: '11px 10px',
  textAlign: 'left',
  borderBottom: '1px solid #e2e8f0',
  color: '#475569',
  background: '#f8fafc',
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '.03em',
}

const tdStyle: CSSProperties = {
  padding: '12px 10px',
  borderBottom: '1px solid #edf1f5',
  verticalAlign: 'middle',
  color: '#0f172a',
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
  fontWeight: 700,
  fontSize: 12,
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
  fontWeight: 700,
  fontSize: 12,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

const botaoAcao: CSSProperties = {
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  background: '#ffffff',
  color: '#2563eb',
  padding: '7px 10px',
  marginLeft: 7,
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 11,
}

const acoesDireita: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: 10,
  flexWrap: 'nowrap',
}
