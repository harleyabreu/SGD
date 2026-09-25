// ============================================================
// VERSÃO 2.0
// Gestão de Demandas de TI
// Arquivo: Feriados.tsx
// Componente: Administração de Feriados / Dias Não Úteis
//
// RESPONSABILIDADES:
// - Permitir ao Gestor cadastrar feriados que impactam o SLA
// - Listar feriados cadastrados
// - Pesquisar por data ou descrição
// - Editar feriados
// - Ativar/inativar feriados sem exclusão física
// - Persistir os registros no localStorage
// - Alimentar diretamente o motor de SLA por meio da chave "feriados"
//
// EVOLUÇÃO V2.0:
// - Primeira tela administrativa de calendário
// - Cadastro de feriados e dias não úteis
// - Status Ativo/Inativo
// - Pesquisa
// - Auditoria local das alterações
// - Layout administrativo consistente com o sistema
// ============================================================

import { useMemo, useState } from 'react'
import './Feriados.css'

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
}

const CHAVE_STORAGE = 'feriados'

function dataHoje(): string {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = String(hoje.getMonth() + 1).padStart(2, '0')
  const dia = String(hoje.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function formatarData(data: string): string {
  if (!data) return '-'
  const partes = data.slice(0, 10).split('-')
  if (partes.length !== 3) return data
  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

function carregarFeriados(): Feriado[] {
  try {
    const dados = JSON.parse(localStorage.getItem(CHAVE_STORAGE) || '[]')
    if (!Array.isArray(dados)) return []

    return dados.map((item, indice) => {
      if (typeof item === 'string') {
        const data = /^\d{2}\/\d{2}\/\d{4}$/.test(item)
          ? `${item.slice(6, 10)}-${item.slice(3, 5)}-${item.slice(0, 2)}`
          : item.slice(0, 10)

        return {
          id: Date.now() + indice,
          data,
          descricao: 'Feriado cadastrado anteriormente',
          ativo: true,
          criadoEm: new Date().toISOString(),
        }
      }

      return {
        id: Number(item?.id) || Date.now() + indice,
        data: String(item?.data || '').slice(0, 10),
        descricao: String(item?.descricao || 'Feriado'),
        ativo: item?.ativo !== false,
        criadoEm: String(item?.criadoEm || new Date().toISOString()),
        atualizadoEm: item?.atualizadoEm,
      }
    }).filter((item) => item.data)
  } catch {
    return []
  }
}

function salvarFeriados(lista: Feriado[]) {
  localStorage.setItem(CHAVE_STORAGE, JSON.stringify(lista))
}

function Feriados({ onVoltar }: Props) {
  const [feriados, setFeriados] = useState<Feriado[]>(carregarFeriados)
  const [pesquisa, setPesquisa] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('Todos')
  const [data, setData] = useState('')
  const [descricao, setDescricao] = useState('')
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [mensagem, setMensagem] = useState('')

  const filtrados = useMemo(() => {
    const termo = pesquisa.trim().toLowerCase()

    return [...feriados]
      .filter((item) => {
        const correspondePesquisa = !termo ||
          item.descricao.toLowerCase().includes(termo) ||
          formatarData(item.data).includes(termo) ||
          item.data.includes(termo)

        const correspondeStatus = filtroStatus === 'Todos' ||
          (filtroStatus === 'Ativos' && item.ativo) ||
          (filtroStatus === 'Inativos' && !item.ativo)

        return correspondePesquisa && correspondeStatus
      })
      .sort((a, b) => a.data.localeCompare(b.data))
  }, [feriados, pesquisa, filtroStatus])

  function limparFormulario() {
    setData('')
    setDescricao('')
    setEditandoId(null)
  }

  function mostrarMensagem(texto: string) {
    setMensagem(texto)
    window.setTimeout(() => setMensagem(''), 2500)
  }

  function salvar() {
    if (!data) {
      window.alert('Informe a data do feriado.')
      return
    }

    if (!descricao.trim()) {
      window.alert('Informe a descrição do feriado.')
      return
    }

    const existente = feriados.find(
      (item) => item.data === data && item.id !== editandoId
    )

    if (existente) {
      window.alert('Já existe um feriado cadastrado para esta data.')
      return
    }

    const agora = new Date().toISOString()

    if (editandoId !== null) {
      const atualizados = feriados.map((item) =>
        item.id === editandoId
          ? { ...item, data, descricao: descricao.trim(), atualizadoEm: agora }
          : item
      )

      setFeriados(atualizados)
      salvarFeriados(atualizados)
      limparFormulario()
      mostrarMensagem('Feriado atualizado com sucesso.')
      return
    }

    const novo: Feriado = {
      id: Date.now(),
      data,
      descricao: descricao.trim(),
      ativo: true,
      criadoEm: agora,
    }

    const atualizados = [...feriados, novo]
    setFeriados(atualizados)
    salvarFeriados(atualizados)
    limparFormulario()
    mostrarMensagem('Feriado cadastrado com sucesso.')
  }

  function editar(item: Feriado) {
    setEditandoId(item.id)
    setData(item.data)
    setDescricao(item.descricao)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function alternarStatus(item: Feriado) {
    const atualizados = feriados.map((registro) =>
      registro.id === item.id
        ? { ...registro, ativo: !registro.ativo, atualizadoEm: new Date().toISOString() }
        : registro
    )

    setFeriados(atualizados)
    salvarFeriados(atualizados)
    mostrarMensagem(item.ativo ? 'Feriado inativado.' : 'Feriado ativado.')
  }

  return (
    <div className="feriados-page">
      <header className="feriados-header">
        <div>
          <div className="feriados-breadcrumb">Administração / Feriados</div>
          <h1>Feriados / Dias Não Úteis</h1>
          <p>Gerencie as datas que não devem ser contabilizadas no SLA.</p>
        </div>
        <button className="feriados-btn-secondary" onClick={onVoltar}>← Voltar</button>
      </header>

      {mensagem && <div className="feriados-toast">{mensagem}</div>}

      <main className="feriados-content">
        <section className="feriados-card">
          <div className="feriados-card-title">
            <div>
              <h2>{editandoId !== null ? 'Editar feriado' : 'Novo feriado'}</h2>
              <span>Cadastre uma data que deverá ser ignorada no cálculo de prazo.</span>
            </div>
          </div>

          <div className="feriados-form">
            <div className="feriados-field">
              <label htmlFor="feriado-data">Data *</label>
              <input
                id="feriado-data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </div>

            <div className="feriados-field feriados-field-wide">
              <label htmlFor="feriado-descricao">Descrição *</label>
              <input
                id="feriado-descricao"
                type="text"
                maxLength={120}
                value={descricao}
                placeholder="Ex.: Independência do Brasil"
                onChange={(e) => setDescricao(e.target.value)}
              />
            </div>

            <div className="feriados-form-actions">
              <button className="feriados-btn-primary" onClick={salvar}>
                {editandoId !== null ? 'Salvar alterações' : 'Cadastrar feriado'}
              </button>
              {editandoId !== null && (
                <button className="feriados-btn-secondary" onClick={limparFormulario}>
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="feriados-card">
          <div className="feriados-card-title">
            <div>
              <h2>Calendário cadastrado</h2>
              <span>{feriados.filter((item) => item.ativo).length} feriado(s) ativo(s)</span>
            </div>
          </div>

          <div className="feriados-filtros">
            <div className="feriados-field feriados-search">
              <label htmlFor="feriado-pesquisa">Pesquisar</label>
              <input
                id="feriado-pesquisa"
                type="search"
                value={pesquisa}
                placeholder="Data ou descrição"
                onChange={(e) => setPesquisa(e.target.value)}
              />
            </div>

            <div className="feriados-field">
              <label htmlFor="feriado-status">Status</label>
              <select
                id="feriado-status"
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
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
                    <td colSpan={4} className="feriados-empty">
                      Nenhum feriado encontrado.
                    </td>
                  </tr>
                ) : (
                  filtrados.map((item) => (
                    <tr key={item.id}>
                      <td className="feriados-date">{formatarData(item.data)}</td>
                      <td>{item.descricao}</td>
                      <td>
                        <span className={`feriados-status ${item.ativo ? 'ativo' : 'inativo'}`}>
                          {item.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td>
                        <div className="feriados-actions">
                          <button onClick={() => editar(item)}>Editar</button>
                          <button onClick={() => alternarStatus(item)}>
                            {item.ativo ? 'Inativar' : 'Ativar'}
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
  )
}

export default Feriados
