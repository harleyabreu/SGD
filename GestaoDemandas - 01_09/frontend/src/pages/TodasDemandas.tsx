// ============================================================
// V 0.9
// Gestão de Demandas de TI
// Todas as Demandas / Lista / Kanban
// ============================================================

import { useMemo, useState } from 'react'
import type { Demanda } from '../types'

type Props = {
  demandas: Demanda[]
  onVoltar: () => void
  onNovaDemanda: () => void
  onAlterarStatus: (id: number, novoStatus: string) => void
  onAbrirDetalhe?: (demanda: Demanda) => void
}

const STATUS = [
  'Nova',
  'Em Atendimento',
  'Com Pendências',
  'Concluída',
]

const PRIORIDADES = [
  'Crítica',
  'Alta',
  'Média',
  'Baixa',
]

export default function TodasDemandas({
  demandas,
  onVoltar,
  onNovaDemanda,
  onAlterarStatus,
  onAbrirDetalhe,
}: Props) {
  const [visualizacao, setVisualizacao] = useState<'lista' | 'kanban'>(
    'lista'
  )

  const [pesquisa, setPesquisa] = useState('')
  const [cliente, setCliente] = useState('')
  const [responsavel, setResponsavel] = useState('')
  const [status, setStatus] = useState('')
  const [prioridade, setPrioridade] = useState('')

  const clientes = useMemo(() => {
    return [...new Set(demandas.map((d) => d.cliente).filter(Boolean))]
  }, [demandas])

  const responsaveis = useMemo(() => {
    return [...new Set(
      demandas.map((d) => d.responsavel).filter(Boolean)
    )]
  }, [demandas])

  const demandasFiltradas = useMemo(() => {
    return demandas.filter((demanda) => {
      const texto = pesquisa.toLowerCase().trim()

      const correspondePesquisa =
        !texto ||
        demanda.titulo.toLowerCase().includes(texto) ||
        demanda.descricao.toLowerCase().includes(texto) ||
        demanda.id.toString().includes(texto)

      const correspondeCliente =
        !cliente || demanda.cliente === cliente

      const correspondeResponsavel =
        !responsavel || demanda.responsavel === responsavel

      const correspondeStatus =
        !status || demanda.status === status

      const correspondePrioridade =
        !prioridade || demanda.prioridade === prioridade

      return (
        correspondePesquisa &&
        correspondeCliente &&
        correspondeResponsavel &&
        correspondeStatus &&
        correspondePrioridade
      )
    })
  }, [
    demandas,
    pesquisa,
    cliente,
    responsavel,
    status,
    prioridade,
  ])

  function limparFiltros() {
    setPesquisa('')
    setCliente('')
    setResponsavel('')
    setStatus('')
    setPrioridade('')
  }

  function obterClassePrioridade(valor: string) {
    switch (valor) {
      case 'Crítica':
        return 'prioridade critica'

      case 'Alta':
        return 'prioridade alta'

      case 'Média':
        return 'prioridade media'

      default:
        return 'prioridade baixa'
    }
  }

  function obterClasseStatus(valor: string) {
    switch (valor) {
      case 'Nova':
        return 'status nova'

      case 'Em Atendimento':
        return 'status atendimento'

      case 'Com Pendências':
        return 'status pendencias'

      case 'Concluída':
        return 'status concluida'

      default:
        return 'status nova'
    }
  }

  function obterClasseColuna(valor: string) {
    switch (valor) {
      case 'Nova':
        return 'coluna coluna-nova'

      case 'Em Atendimento':
        return 'coluna coluna-atendimento'

      case 'Com Pendências':
        return 'coluna coluna-pendencias'

      case 'Concluída':
        return 'coluna coluna-concluida'

      default:
        return 'coluna'
    }
  }

  function formatarData(data: string) {
    if (!data) return '-'

    const partes = data.split('-')

    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`
    }

    return data
  }

  function renderCard(demanda: Demanda) {
    return (
      <div className="demanda-card" key={demanda.id}>

        <div className="card-topo">
          <div>
            <div className="numero-demanda">
              #{demanda.id}
            </div>

            <h3>{demanda.titulo}</h3>
          </div>

          <span className={obterClasseStatus(demanda.status)}>
            {demanda.status}
          </span>
        </div>

        <div className="linha-divisoria" />

        <div className="descricao">
          <span className="campo-label">
            DESCRIÇÃO
          </span>

          <p>
            {demanda.descricao || 'Sem descrição informada.'}
          </p>
        </div>

        <div className="informacoes">

          <div>
            <span className="campo-label">
              CLIENTE
            </span>

            <strong>{demanda.cliente}</strong>
          </div>

          <div>
            <span className="campo-label">
              RESPONSÁVEL
            </span>

            <strong>{demanda.responsavel}</strong>
          </div>

          <div>
            <span className="campo-label">
              PRIORIDADE
            </span>

            <strong
              className={obterClassePrioridade(
                demanda.prioridade
              )}
            >
              {demanda.prioridade}
            </strong>
          </div>

          <div>
            <span className="campo-label">
              PRAZO
            </span>

            <strong>
              {formatarData(demanda.prazo)}
            </strong>
          </div>

        </div>

        {demanda.observacao && (
          <div className="observacao">
            <span className="campo-label">
              OBSERVAÇÕES
            </span>

            <p>{demanda.observacao}</p>
          </div>
        )}

        {onAbrirDetalhe && (
          <div className="abrir-detalhe-lista">
            <button
              onClick={() => onAbrirDetalhe(demanda)}
            >
              Clique para visualizar os detalhes →
            </button>
          </div>
        )}

      </div>
    )
  }

  return (
    <>
      <style>{`

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family: Arial, Helvetica, sans-serif;
          background: #f4f7fb;
          color: #173b68;
        }

        .pagina {
          min-height: 100vh;
          padding: 30px 24px 60px;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .voltar {
          border: none;
          background: transparent;
          color: #174a80;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          padding: 0;
          margin-bottom: 18px;
        }

        .cabecalho {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 26px;
        }

        .cabecalho h1 {
          margin: 0 0 5px;
          font-size: 29px;
          color: #173b68;
        }

        .cabecalho p {
          margin: 0;
          color: #718096;
          font-size: 15px;
        }

        .btn-principal {
          background: #174a80;
          color: white;
          border: none;
          border-radius: 7px;
          padding: 12px 20px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 2px 5px rgba(0,0,0,.12);
        }

        .btn-principal:hover {
          background: #123d6b;
        }

        .filtros {
          background: white;
          border: 1px solid #e0e6ee;
          border-radius: 10px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(25, 55, 90, .06);
          margin-bottom: 14px;
        }

        .filtros-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
          gap: 14px;
        }

        .campo {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .campo label {
          font-size: 12px;
          font-weight: 700;
          color: #344e6c;
        }

        .campo input,
        .campo select {
          width: 100%;
          height: 40px;
          border: 1px solid #ccd6e2;
          border-radius: 6px;
          background: white;
          padding: 0 11px;
          color: #263f5d;
          font-size: 13px;
          outline: none;
        }

        .campo input:focus,
        .campo select:focus {
          border-color: #174a80;
          box-shadow: 0 0 0 2px rgba(23, 74, 128, .08);
        }

        .acoes {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .acoes-esquerda {
          display: flex;
          gap: 8px;
        }

        .btn-secundario {
          height: 38px;
          padding: 0 15px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          background: white;
          color: #294967;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-secundario:hover {
          background: #f7f9fc;
        }

        .visualizacao {
          display: flex;
          border: 1px solid #ccd6e2;
          border-radius: 7px;
          overflow: hidden;
          background: white;
        }

        .visualizacao button {
          border: none;
          background: white;
          padding: 9px 14px;
          cursor: pointer;
          color: #52677f;
          font-weight: 600;
          font-size: 13px;
        }

        .visualizacao button.ativo {
          background: #174a80;
          color: white;
        }

        .painel {
          background: white;
          border: 1px solid #e0e6ee;
          border-radius: 10px;
          box-shadow: 0 2px 8px rgba(25, 55, 90, .06);
          overflow: hidden;
        }

        .painel-cabecalho {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 17px 20px;
          border-bottom: 1px solid #e5eaf0;
        }

        .painel-cabecalho h2 {
          margin: 0;
          font-size: 16px;
          color: #193b62;
        }

        .contador {
          color: #718096;
          font-size: 13px;
        }

        .lista {
          padding: 14px;
        }

        .demanda-card {
          border: 1px solid #dbe3ec;
          border-radius: 9px;
          background: white;
          padding: 18px;
          margin-bottom: 12px;
          transition: .15s;
        }

        .demanda-card:hover {
          border-color: #b8c9dc;
          box-shadow: 0 3px 10px rgba(25, 55, 90, .07);
        }

        .card-topo {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 15px;
        }

        .card-topo h3 {
          margin: 5px 0 0;
          color: #173b68;
          font-size: 18px;
        }

        .numero-demanda {
          color: #8291a3;
          font-size: 11px;
          font-weight: 600;
        }

        .linha-divisoria {
          height: 1px;
          background: #e7edf3;
          margin: 15px 0;
        }

        .campo-label {
          display: block;
          color: #718096;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .5px;
          margin-bottom: 5px;
        }

        .descricao p {
          margin: 0;
          color: #334e68;
          font-size: 14px;
          line-height: 1.5;
        }

        .informacoes {
          display: grid;
          grid-template-columns: 1.2fr 1.2fr .8fr .8fr;
          gap: 15px;
          border-top: 1px solid #edf1f5;
          border-bottom: 1px solid #edf1f5;
          padding: 15px 0;
          margin-top: 15px;
        }

        .informacoes strong {
          color: #244666;
          font-size: 13px;
        }

        .prioridade {
          font-weight: 700;
        }

        .prioridade.critica {
          color: #b42318;
        }

        .prioridade.alta {
          color: #d94841;
        }

        .prioridade.media {
          color: #d97706;
        }

        .prioridade.baixa {
          color: #159447;
        }

        .observacao {
          margin-top: 14px;
          padding: 11px 13px;
          background: #f6f8fa;
          border-radius: 6px;
        }

        .observacao p {
          margin: 0;
          color: #455b72;
          font-size: 13px;
        }

        .abrir-detalhe-lista {
          display: flex;
          justify-content: flex-end;
          margin-top: 10px;
        }

        .abrir-detalhe-lista button {
          border: none;
          background: transparent;
          color: #174a80;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .status {
          display: inline-flex;
          align-items: center;
          padding: 5px 11px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
        }

        .status.nova {
          background: #eaf2fb;
          color: #21609b;
        }

        .status.atendimento {
          background: #eeeafe;
          color: #6546b8;
        }

        .status.pendencias {
          background: #fff0d9;
          color: #c46b00;
        }

        .status.concluida {
          background: #e7f7ee;
          color: #15803d;
        }

        .vazio {
          text-align: center;
          padding: 65px 20px;
          color: #718096;
        }

        .vazio-icone {
          font-size: 42px;
          margin-bottom: 12px;
        }

        .vazio h3 {
          margin: 0 0 7px;
          color: #294967;
        }

        .vazio p {
          margin: 0 0 18px;
          font-size: 14px;
        }

        /* =========================================
           KANBAN
        ========================================= */

        .kanban {
          padding: 14px;
          overflow-x: auto;
        }

        .kanban-grid {
          display: grid;
          grid-template-columns: repeat(
            4,
            minmax(245px, 1fr)
          );
          gap: 12px;
          min-width: 1000px;
        }

        /* COLUNAS */

        .coluna {
          border: 1px solid;
          border-radius: 9px;
          min-height: 480px;
          overflow: hidden;
          transition: .15s;
        }

        /* NOVA - AZUL */

        .coluna-nova {
          background: #eef6ff;
          border-color: #bdd5ee;
        }

        .coluna-nova .coluna-header {
          background: #dcecff;
          border-bottom-color: #bdd5ee;
        }

        .coluna-nova .coluna-header strong {
          color: #21609b;
        }

        .coluna-nova .quantidade {
          background: #c8def5;
          color: #21609b;
        }

        /* EM ATENDIMENTO - ROXO/AZUL */

        .coluna-atendimento {
          background: #f2efff;
          border-color: #d0c6ef;
        }

        .coluna-atendimento .coluna-header {
          background: #e5defc;
          border-bottom-color: #d0c6ef;
        }

        .coluna-atendimento .coluna-header strong {
          color: #6546b8;
        }

        .coluna-atendimento .quantidade {
          background: #d8cef5;
          color: #6546b8;
        }

        /* COM PENDÊNCIAS - LARANJA */

        .coluna-pendencias {
          background: #fff7e9;
          border-color: #efd4a5;
        }

        .coluna-pendencias .coluna-header {
          background: #ffedcf;
          border-bottom-color: #efd4a5;
        }

        .coluna-pendencias .coluna-header strong {
          color: #c46b00;
        }

        .coluna-pendencias .quantidade {
          background: #f7dcae;
          color: #c46b00;
        }

        /* CONCLUÍDA - VERDE */

        .coluna-concluida {
          background: #edf9f2;
          border-color: #b9dfc8;
        }

        .coluna-concluida .coluna-header {
          background: #dff3e7;
          border-bottom-color: #b9dfc8;
        }

        .coluna-concluida .coluna-header strong {
          color: #15803d;
        }

        .coluna-concluida .quantidade {
          background: #c8e7d2;
          color: #15803d;
        }

        /* CABEÇALHO DA COLUNA */

        .coluna-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 13px 14px;
        }

        .coluna-header strong {
          font-size: 13px;
        }

        .quantidade {
          min-width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          font-size: 11px;
          font-weight: 700;
        }

        .coluna-conteudo {
          padding: 10px;
        }

        /* CARD DO KANBAN */

        .kanban-card {
          background: white;
          border: 1px solid #d9e2ec;
          border-radius: 8px;
          padding: 13px;
          margin-bottom: 10px;
          box-shadow: 0 1px 3px rgba(0,0,0,.05);
        }

        .kanban-card:hover {
          box-shadow: 0 3px 9px rgba(0,0,0,.08);
          transform: translateY(-1px);
        }

        .kanban-card h3 {
          margin: 7px 0 5px;
          font-size: 14px;
          color: #173b68;
        }

        .kanban-id {
          font-size: 10px;
          color: #8795a5;
        }

        .kanban-descricao {
          font-size: 12px;
          color: #52677f;
          margin: 9px 0;
          line-height: 1.4;
        }

        .kanban-info {
          border-top: 1px solid #edf1f5;
          padding-top: 9px;
          margin-top: 9px;
        }

        .kanban-info div {
          margin-bottom: 7px;
        }

        .kanban-info span {
          display: block;
          font-size: 9px;
          color: #8492a2;
          font-weight: 700;
          text-transform: uppercase;
        }

        .kanban-info strong {
          font-size: 11px;
          color: #334e68;
        }

        .mover-status {
          width: 100%;
          margin-top: 8px;
          height: 32px;
          border: 1px solid #ccd6e2;
          border-radius: 5px;
          background: white;
          color: #334e68;
          font-size: 11px;
          cursor: pointer;
        }

        .mover-status:focus {
          outline: none;
          border-color: #174a80;
        }

        .sem-demandas {
          text-align: center;
          color: #8a99aa;
          font-size: 12px;
          padding: 50px 10px;
        }

        @media (max-width: 900px) {

          .filtros-grid {
            grid-template-columns: 1fr 1fr;
          }

          .informacoes {
            grid-template-columns: 1fr 1fr;
          }

        }

        @media (max-width: 600px) {

          .pagina {
            padding: 20px 12px 40px;
          }

          .cabecalho {
            align-items: flex-start;
            flex-direction: column;
          }

          .cabecalho h1 {
            font-size: 24px;
          }

          .filtros-grid {
            grid-template-columns: 1fr;
          }

          .acoes {
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
          }

          .acoes-esquerda {
            width: 100%;
          }

          .acoes-esquerda button {
            flex: 1;
          }

          .visualizacao {
            width: 100%;
          }

          .visualizacao button {
            flex: 1;
          }

          .informacoes {
            grid-template-columns: 1fr;
          }

          .card-topo {
            flex-direction: column;
          }

        }

      `}</style>

      <div className="pagina">

        <div className="container">

          <button
            className="voltar"
            onClick={onVoltar}
          >
            ← Voltar para o Dashboard
          </button>

          <div className="cabecalho">

            <div>
              <h1>Todas as Demandas</h1>

              <p>
                Gerencie e acompanhe todas as demandas de TI.
              </p>
            </div>

            <button
              className="btn-principal"
              onClick={onNovaDemanda}
            >
              + Nova Demanda
            </button>

          </div>

          <div className="filtros">

            <div className="filtros-grid">

              <div className="campo">

                <label>
                  Pesquisar
                </label>

                <input
                  type="text"
                  placeholder="Pesquisar por título, descrição ou código..."
                  value={pesquisa}
                  onChange={(e) =>
                    setPesquisa(e.target.value)
                  }
                />

              </div>

              <div className="campo">

                <label>
                  Cliente
                </label>

                <select
                  value={cliente}
                  onChange={(e) =>
                    setCliente(e.target.value)
                  }
                >

                  <option value="">
                    Todos os clientes
                  </option>

                  {clientes.map((item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  ))}

                </select>

              </div>

              <div className="campo">

                <label>
                  Responsável
                </label>

                <select
                  value={responsavel}
                  onChange={(e) =>
                    setResponsavel(e.target.value)
                  }
                >

                  <option value="">
                    Todos os responsáveis
                  </option>

                  {responsaveis.map((item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  ))}

                </select>

              </div>

              <div className="campo">

                <label>
                  Status
                </label>

                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value)
                  }
                >

                  <option value="">
                    Todos os status
                  </option>

                  {STATUS.map((item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  ))}

                </select>

              </div>

              <div className="campo">

                <label>
                  Prioridade
                </label>

                <select
                  value={prioridade}
                  onChange={(e) =>
                    setPrioridade(e.target.value)
                  }
                >

                  <option value="">
                    Todas
                  </option>

                  {PRIORIDADES.map((item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  ))}

                </select>

              </div>

            </div>

          </div>

          <div className="acoes">

            <div className="acoes-esquerda">

              <button
                className="btn-principal"
                onClick={() => {}}
              >
                🔎 Aplicar filtros
              </button>

              <button
                className="btn-secundario"
                onClick={limparFiltros}
              >
                Limpar filtros
              </button>

            </div>

            <div className="visualizacao">

              <button
                className={
                  visualizacao === 'lista'
                    ? 'ativo'
                    : ''
                }
                onClick={() =>
                  setVisualizacao('lista')
                }
              >
                ☷ Visualizar Lista
              </button>

              <button
                className={
                  visualizacao === 'kanban'
                    ? 'ativo'
                    : ''
                }
                onClick={() =>
                  setVisualizacao('kanban')
                }
              >
                ▦ Visualizar Kanban
              </button>

            </div>

          </div>

          <div className="painel">

            <div className="painel-cabecalho">

              <h2>
                {visualizacao === 'lista'
                  ? 'Demandas cadastradas'
                  : 'Kanban de Demandas'}
              </h2>

              <span className="contador">

                {demandasFiltradas.length}{' '}

                {demandasFiltradas.length === 1
                  ? 'demanda'
                  : 'demandas'}

              </span>

            </div>

            {visualizacao === 'lista' && (

              <div className="lista">

                {demandasFiltradas.length === 0 ? (

                  <div className="vazio">

                    <div className="vazio-icone">
                      📋
                    </div>

                    <h3>
                      Nenhuma demanda encontrada
                    </h3>

                    <p>
                      Quando novas demandas forem
                      cadastradas, elas aparecerão
                      nesta lista.
                    </p>

                    <button
                      className="btn-principal"
                      onClick={onNovaDemanda}
                    >
                      + Cadastrar demanda
                    </button>

                  </div>

                ) : (

                  demandasFiltradas.map(renderCard)

                )}

              </div>

            )}

            {visualizacao === 'kanban' && (

              <div className="kanban">

                <div className="kanban-grid">

                  {STATUS.map((statusColuna) => {

                    const demandasColuna =
                      demandasFiltradas.filter(
                        (d) =>
                          d.status === statusColuna
                      )

                    return (

                      <div
                        className={obterClasseColuna(
                          statusColuna
                        )}
                        key={statusColuna}
                      >

                        <div className="coluna-header">

                          <strong>
                            {statusColuna}
                          </strong>

                          <span className="quantidade">
                            {demandasColuna.length}
                          </span>

                        </div>

                        <div className="coluna-conteudo">

                          {demandasColuna.length === 0 ? (

                            <div className="sem-demandas">
                              Nenhuma demanda
                            </div>

                          ) : (

                            demandasColuna.map(
                              (demanda) => (

                                <div
                                  className="kanban-card"
                                  key={demanda.id}
                                >

                                  <div className="kanban-id">
                                    #{demanda.id}
                                  </div>

                                  <h3>
                                    {demanda.titulo}
                                  </h3>

                                  <span
                                    className={obterClassePrioridade(
                                      demanda.prioridade
                                    )}
                                  >
                                    {demanda.prioridade}
                                  </span>

                                  <div className="kanban-descricao">
                                    {demanda.descricao}
                                  </div>

                                  <div className="kanban-info">

                                    <div>

                                      <span>
                                        Cliente
                                      </span>

                                      <strong>
                                        {demanda.cliente}
                                      </strong>

                                    </div>

                                    <div>

                                      <span>
                                        Responsável
                                      </span>

                                      <strong>
                                        {demanda.responsavel}
                                      </strong>

                                    </div>

                                    <div>

                                      <span>
                                        Prazo
                                      </span>

                                      <strong>
                                        {formatarData(
                                          demanda.prazo
                                        )}
                                      </strong>

                                    </div>

                                  </div>

                                  {onAbrirDetalhe && (
                                    <button
                                      className="abrir-detalhe-kanban"
                                      onClick={() =>
                                        onAbrirDetalhe(
                                          demanda
                                        )
                                      }
                                    >
                                      Abrir detalhes
                                    </button>
                                  )}

                                  <select
                                    className="mover-status"
                                    value={demanda.status}
                                    onChange={(e) =>
                                      onAlterarStatus(
                                        demanda.id,
                                        e.target.value
                                      )
                                    }
                                  >

                                    {STATUS.map(
                                      (item) => (

                                        <option
                                          key={item}
                                          value={item}
                                        >
                                          Mover para: {item}
                                        </option>

                                      )
                                    )}

                                  </select>

                                </div>

                              )
                            )

                          )}

                        </div>

                      </div>

                    )
                  })}

                </div>

              </div>

            )}

          </div>

        </div>

      </div>

    </>
  )
}