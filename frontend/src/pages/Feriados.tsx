// ============================================================
// GESTÃO DE DEMANDAS DE TI
// V2.8 — FERIADOS / DIAS NÃO ÚTEIS
// ============================================================

import { useMemo, useState } from 'react'
import './Feriados.css'
import MenuPrincipal from '../components/MenuPrincipal'

type Feriado = {
  id: number
  data: string
  descricao: string
  ativo: boolean
  criadoEm: string
  atualizadoEm?: string
}

type Props = {
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

const CHAVE_STORAGE = 'feriados'

function formatarData(data: string): string {
  if (!data) return '-'

  const partes = data
    .slice(0, 10)
    .split('-')

  if (partes.length !== 3) {
    return data
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

function carregarFeriados(): Feriado[] {
  try {
    const dados = JSON.parse(
      localStorage.getItem(CHAVE_STORAGE) || '[]'
    )

    if (!Array.isArray(dados)) {
      return []
    }

    return dados
      .map((item, indice) => {
        if (typeof item === 'string') {
          const data =
            /^\d{2}\/\d{2}\/\d{4}$/.test(item)
              ? `${item.slice(6, 10)}-${item.slice(3, 5)}-${item.slice(0, 2)}`
              : item.slice(0, 10)

          return {
            id: Date.now() + indice,
            data,
            descricao:
              'Feriado Cadastrado Anteriormente',
            ativo: true,
            criadoEm:
              new Date().toISOString(),
          }
        }

        return {
          id:
            Number(item?.id) ||
            Date.now() + indice,
          data: String(
            item?.data || ''
          ).slice(0, 10),
          descricao: String(
            item?.descricao || 'Feriado'
          ),
          ativo: item?.ativo !== false,
          criadoEm: String(
            item?.criadoEm ||
              new Date().toISOString()
          ),
          atualizadoEm:
            item?.atualizadoEm,
        }
      })
      .filter((item) => item.data)
  } catch {
    return []
  }
}

function salvarFeriados(
  lista: Feriado[]
) {
  localStorage.setItem(
    CHAVE_STORAGE,
    JSON.stringify(lista)
  )
}

export default function Feriados({
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
  const [feriados, setFeriados] =
    useState<Feriado[]>(carregarFeriados)

  const [pesquisa, setPesquisa] =
    useState('')

  const [filtroStatus, setFiltroStatus] =
    useState('Todos')

  const [data, setData] =
    useState('')

  const [descricao, setDescricao] =
    useState('')

  const [editandoId, setEditandoId] =
    useState<number | null>(null)

  const [mensagem, setMensagem] =
    useState('')

  const filtrados = useMemo(() => {
    const termo =
      pesquisa.trim().toLowerCase()

    return [...feriados]
      .filter((item) => {
        const correspondePesquisa =
          !termo ||
          item.descricao
            .toLowerCase()
            .includes(termo) ||
          formatarData(item.data)
            .includes(termo) ||
          item.data.includes(termo)

        const correspondeStatus =
          filtroStatus === 'Todos' ||
          (
            filtroStatus === 'Ativos' &&
            item.ativo
          ) ||
          (
            filtroStatus === 'Inativos' &&
            !item.ativo
          )

        return (
          correspondePesquisa &&
          correspondeStatus
        )
      })
      .sort((a, b) =>
        a.data.localeCompare(b.data)
      )
  }, [
    feriados,
    pesquisa,
    filtroStatus,
  ])

  function limparFormulario() {
    setData('')
    setDescricao('')
    setEditandoId(null)
  }

  function mostrarMensagem(
    texto: string
  ) {
    setMensagem(texto)

    window.setTimeout(
      () => setMensagem(''),
      2500
    )
  }

  function salvar() {
    if (!data) {
      window.alert(
        'Informe a Data do Feriado.'
      )
      return
    }

    if (!descricao.trim()) {
      window.alert(
        'Informe a Descrição do Feriado.'
      )
      return
    }

    const existente =
      feriados.find(
        (item) =>
          item.data === data &&
          item.id !== editandoId
      )

    if (existente) {
      window.alert(
        'Já Existe um Feriado Cadastrado para Esta Data.'
      )
      return
    }

    const agora =
      new Date().toISOString()

    if (editandoId !== null) {
      const atualizados =
        feriados.map((item) =>
          item.id === editandoId
            ? {
                ...item,
                data,
                descricao:
                  descricao.trim(),
                atualizadoEm: agora,
              }
            : item
        )

      setFeriados(atualizados)
      salvarFeriados(atualizados)
      limparFormulario()

      mostrarMensagem(
        'Feriado Atualizado com Sucesso.'
      )

      return
    }

    const novo: Feriado = {
      id: Date.now(),
      data,
      descricao: descricao.trim(),
      ativo: true,
      criadoEm: agora,
    }

    const atualizados = [
      ...feriados,
      novo,
    ]

    setFeriados(atualizados)
    salvarFeriados(atualizados)
    limparFormulario()

    mostrarMensagem(
      'Feriado Cadastrado com Sucesso.'
    )
  }

  function editar(item: Feriado) {
    setEditandoId(item.id)
    setData(item.data)
    setDescricao(item.descricao)

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  function alternarStatus(
    item: Feriado
  ) {
    const atualizados =
      feriados.map((registro) =>
        registro.id === item.id
          ? {
              ...registro,
              ativo: !registro.ativo,
              atualizadoEm:
                new Date().toISOString(),
            }
          : registro
      )

    setFeriados(atualizados)
    salvarFeriados(atualizados)

    mostrarMensagem(
      item.ativo
        ? 'Feriado Inativado.'
        : 'Feriado Ativado.'
    )
  }

  return (
    <MenuPrincipal
      ativo="feriados"
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
      subtitulo="Feriados"
      rodapeAcoes={
        <>
          <button
            type="button"
            className="feriados-footer-voltar btn-secundario"
            onClick={onVoltar}
            aria-label="Voltar ao Dashboard"
          >
            ← Voltar ao Dashboard
          </button>

          <div className="feriados-footer-acoes-direita">
            {editandoId !== null && (
              <button
                type="button"
                className="btn-secundario"
                onClick={limparFormulario}
              >
                Cancelar
              </button>
            )}

            <button
              type="button"
              className="feriados-footer-cadastrar btn-principal"
              onClick={salvar}
              aria-label={editandoId !== null ? 'Salvar Alterações' : 'Cadastrar Feriado'}
            >
              {editandoId !== null
                ? 'Salvar Alterações'
                : 'Cadastrar Feriado'}
            </button>
          </div>
        </>
      }
    >
      <div className="feriados-page">

      {mensagem && (
        <div className="feriados-toast">
          {mensagem}
        </div>
      )}

      <main className="feriados-content">

        <div
          style={{
            marginBottom: 20,
          }}
        >
          <div className="feriados-breadcrumb">
            Administração / Feriados
          </div>

          <h1>
            Feriados
          </h1>

          <p>
            Gerencie as Datas que Não Devem
            Ser Contabilizadas no SLA.
          </p>
        </div>

        <section className="feriados-card">

          <div className="feriados-card-title">
            <div>
              <h2>
                {editandoId !== null
                  ? 'Editar Feriado'
                  : 'Novo Feriado'}
              </h2>

              <span>
                Cadastre uma Data que Deverá
                Ser Ignorada no Cálculo de Prazo.
              </span>
            </div>
          </div>

          <div className="feriados-form">

            <div className="feriados-field">
              <label htmlFor="feriado-data">
                Data *
              </label>

              <input
                id="feriado-data"
                type="date"
                value={data}
                onChange={(e) =>
                  setData(e.target.value)
                }
              />
            </div>

            <div className="feriados-field feriados-field-wide">
              <label htmlFor="feriado-descricao">
                Descrição *
              </label>

              <input
                id="feriado-descricao"
                type="text"
                maxLength={120}
                value={descricao}
                placeholder="Ex.: Independência do Brasil"
                onChange={(e) =>
                  setDescricao(
                    e.target.value
                  )
                }
              />
            </div>

          </div>
        </section>

        <section className="feriados-card">

          <div className="feriados-card-title">
            <div>
              <h2>
                Calendário Cadastrado
              </h2>

              <span>
                {
                  feriados.filter(
                    (item) => item.ativo
                  ).length
                } Feriado(s) Ativo(s)
              </span>
            </div>
          </div>

          <div className="feriados-filtros">

            <div className="feriados-field feriados-search">
              <label htmlFor="feriado-pesquisa">
                Pesquisar
              </label>

              <input
                id="feriado-pesquisa"
                type="search"
                value={pesquisa}
                placeholder="Data ou Descrição"
                onChange={(e) =>
                  setPesquisa(
                    e.target.value
                  )
                }
              />
            </div>

            <div className="feriados-field">
              <label htmlFor="feriado-status">
                Status
              </label>

              <select
                id="feriado-status"
                value={filtroStatus}
                onChange={(e) =>
                  setFiltroStatus(
                    e.target.value
                  )
                }
              >
                <option>Todos</option>
                <option>Ativos</option>
                <option>Inativos</option>
              </select>
            </div>

          </div>

          <div className="feriados-table-wrap">

            <table className="feriados-table">

              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>

                {filtrados.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="feriados-empty"
                    >
                      Nenhum Feriado Encontrado.
                    </td>
                  </tr>
                ) : (
                  filtrados.map((item) => (
                    <tr key={item.id}>

                      <td className="feriados-date">
                        {formatarData(item.data)}
                      </td>

                      <td>
                        {item.descricao}
                      </td>

                      <td>
                        <span
                          className={`feriados-status ${
                            item.ativo
                              ? 'ativo'
                              : 'inativo'
                          }`}
                        >
                          {item.ativo
                            ? 'Ativo'
                            : 'Inativo'}
                        </span>
                      </td>

                      <td>
                        <div className="feriados-actions">

                          <button
                            type="button"
                            className="feriados-action-btn feriados-action-editar"
                            onClick={() =>
                              editar(item)
                            }
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            className={`feriados-action-btn ${
                              item.ativo
                                ? 'feriados-action-inativar'
                                : 'feriados-action-ativar'
                            }`}
                            onClick={() =>
                              alternarStatus(
                                item
                              )
                            }
                          >
                            {item.ativo
                              ? 'Inativar'
                              : 'Ativar'}
                          </button>

                        </div>
                      </td>

                    </tr>
                  ))
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
