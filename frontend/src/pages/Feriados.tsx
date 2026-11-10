// ============================================================

// GESTÃO DE DEMANDAS DE TI

// V2.8 — FERIADOS / DIAS NÃO ÚTEIS

// ============================================================



import { useEffect, useMemo, useState } from 'react'

import './Feriados.css'

import MenuPrincipal from '../components/MenuPrincipal'
import { mostrarToast } from '../services/toast'
import { apiRequest } from '../services/api'



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



function obterDataHojeISO(): string {

  const agora = new Date()

  return [

    agora.getFullYear(),

    String(agora.getMonth() + 1).padStart(2, '0'),

    String(agora.getDate()).padStart(2, '0'),

  ].join('-')

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

    useState<Feriado[]>([])



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


  // ==========================================================
  // CARREGAR FERIADOS DIRETAMENTE DO POSTGRESQL
  // O banco é a fonte oficial; não importar dados antigos do navegador.
  // ==========================================================

  useEffect(() => {

    let desmontado = false

    async function carregarDoBanco() {

      try {

        const registros = await apiRequest<Feriado[]>('/feriados')

        if (desmontado) return

        setFeriados(Array.isArray(registros) ? registros : [])

      } catch (erro) {

        console.error(
          'Não foi possível consultar os feriados no PostgreSQL:',
          erro,
        )

        if (!desmontado) {

          mostrarToast(
            'Não foi possível consultar os feriados no PostgreSQL. Verifique a conexão e tente novamente.',
          )

        }

      }

    }

    void carregarDoBanco()

    return () => {

      desmontado = true

    }

  }, [])


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



  async function salvar() {

    if (!data) {

      window.alert(

        'Informe a Data do Feriado.'

      )

      return

    }

    // Data de hoje e datas futuras são permitidas.

    // Datas passadas não podem ser cadastradas nem usadas em uma

    // alteração de data. Feriados históricos já cadastrados são

    // preservados e continuam podendo ter a descrição atualizada.

    const hoje = obterDataHojeISO()

    const registroEmEdicao =

      editandoId !== null

        ? feriados.find((item) => item.id === editandoId)

        : undefined

    const dataPassada = data < hoje

    const alterandoParaDataPassada =

      dataPassada &&

      (!registroEmEdicao || registroEmEdicao.data !== data)

    if (alterandoParaDataPassada) {

      window.alert(

        'A Data do Feriado Deve Ser Atual ou Futura.'

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

    try {

      if (editandoId !== null) {

        const salvo = await apiRequest<Feriado>(

          `/feriados/${editandoId}`,

          {

            method: 'PUT',

            body: JSON.stringify({

              data,

              descricao: descricao.trim(),

            }),

          },

        )

        const atualizados =

          feriados.map((item) =>

            item.id === editandoId

              ? salvo

              : item

          )

        setFeriados(atualizados)


        limparFormulario()

        mostrarToast(

          'Feriado Atualizado com Sucesso.'

        )

        return

      }

      const novo = await apiRequest<Feriado>(

        '/feriados',

        {

          method: 'POST',

          body: JSON.stringify({

            data,

            descricao: descricao.trim(),

            ativo: true,

          }),

        },

      )

      const atualizados = [

        ...feriados,

        novo,

      ].sort((a, b) => a.data.localeCompare(b.data))

      setFeriados(atualizados)


      limparFormulario()

      mostrarToast(

        'Feriado Cadastrado com Sucesso.'

      )

    } catch (erro) {

      console.error(

        'Falha ao salvar feriado no PostgreSQL:',

        erro,

      )

      mostrarToast(

        erro instanceof Error

          ? erro.message

          : 'Não foi possível gravar o feriado no PostgreSQL.'

      )

    }

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



  async function alternarStatus(

    item: Feriado

  ) {

    try {

      const atualizado = await apiRequest<Feriado>(

        `/feriados/${item.id}/status`,

        {

          method: 'PATCH',

          body: JSON.stringify({

            ativo: !item.ativo,

          }),

        },

      )

      const atualizados =

        feriados.map((registro) =>

          registro.id === item.id

            ? atualizado

            : registro

        )

      setFeriados(atualizados)


      mostrarToast(

        item.ativo

          ? 'Feriado Inativado.'

          : 'Feriado Ativado.'

      )

    } catch (erro) {

      console.error(

        'Falha ao alterar status do feriado no PostgreSQL:',

        erro,

      )

      mostrarToast(

        erro instanceof Error

          ? erro.message

          : 'Não foi possível atualizar o feriado no PostgreSQL.'

      )

    }

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

                min={editandoId === null ? obterDataHojeISO() : undefined}
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