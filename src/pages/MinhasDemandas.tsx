import { useMemo, useState, type FormEvent } from 'react'
import type { Demanda, Usuario } from '../types'
import { carregarUsuarios, salvarUsuarios } from '../services/storage'
import { registrarAlteracao } from '../services/auditoria'
import { estaAtrasada as estaAtrasadaSLA, obterPrazoEfetivo } from '../sla'
import MenuPrincipal from '../components/MenuPrincipal'
import './MinhasDemandas.css'

type Props = {
  usuario: Usuario
  demandas: Demanda[]
  onVoltar: () => void
  onAbrirDetalhe: (demanda: Demanda) => void
  onAlterarStatus: (id: number, novoStatus: string, motivo?: string) => void
  onAdicionarComentario: (id: number, texto: string) => void
}

type UsuarioSeguranca = Usuario & {
  senhaHash?: string
  exigirTrocaSenha?: boolean
}

const MINIMO_SENHA = 6
const STATUS = ['Todos', 'Nova', 'Aguardando', 'Em Atendimento', 'Com Pendências', 'Concluída', 'Cancelada']
const PRIORIDADES = ['Todas', 'Crítica', 'Alta', 'Média', 'Baixa']

async function hashSenha(senha: string): Promise<string> {
  const bytes = new TextEncoder().encode(senha)
  const digest = await window.crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function converterData(data: string): Date | null {
  if (!data) return null

  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(data)
  if (match) {
    const [, dia, mes, ano] = match
    const resultado = new Date(Number(ano), Number(mes) - 1, Number(dia))
    resultado.setHours(0, 0, 0, 0)
    return resultado
  }

  const resultado = new Date(data)
  if (Number.isNaN(resultado.getTime())) return null
  resultado.setHours(0, 0, 0, 0)
  return resultado
}

function formatarData(data: string): string {
  const valor = converterData(data)
  if (!valor) return data || '—'
  return valor.toLocaleDateString('pt-BR')
}

function estaAtrasada(demanda: Demanda): boolean {
  return estaAtrasadaSLA(demanda)

}

function estaProxima(demanda: Demanda): boolean {
  if (
    !demanda.prazo ||
    demanda.status === 'Concluída' ||
    demanda.status === 'Cancelada'
  ) {
    return false
  }

  const prazo = obterPrazoEfetivo(demanda)

  if (!prazo) {
    return false
  }

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const limite = new Date(hoje)
  limite.setDate(limite.getDate() + 7)

  return prazo >= hoje && prazo <= limite

}

export default function MinhasDemandas({
  usuario,
  demandas,
  onVoltar,
  onAbrirDetalhe,
  onAlterarStatus,
}: Props) {
  const [pesquisa, setPesquisa] = useState('')
  const [statusFiltro, setStatusFiltro] = useState('Todos')
  const [prioridadeFiltro, setPrioridadeFiltro] = useState('Todas')
  const [situacaoFiltro, setSituacaoFiltro] = useState('Todos')
  const [contaAberta, setContaAberta] = useState(false)
  const [novoEmail, setNovoEmail] = useState(usuario.email || '')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmacaoSenha, setConfirmacaoSenha] = useState('')
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false)
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false)
  const [erroConta, setErroConta] = useState('')
  const [mensagem, setMensagem] = useState('')

  const minhasDemandas = useMemo(
    () => demandas.filter((demanda) => demanda.responsavel?.trim().toLowerCase() === usuario.nome?.trim().toLowerCase()),
    [demandas, usuario.nome],
  )

  const demandasFiltradas = useMemo(() => {
    const termo = pesquisa.trim().toLowerCase()

    return minhasDemandas.filter((demanda) => {
      const correspondePesquisa = !termo ||
        `${demanda.id} ${demanda.titulo} ${demanda.cliente} ${demanda.sistema || ''} ${demanda.descricao}`
          .toLowerCase()
          .includes(termo)

      const correspondeStatus = statusFiltro === 'Todos' || demanda.status === statusFiltro
      const correspondePrioridade = prioridadeFiltro === 'Todas' || demanda.prioridade === prioridadeFiltro

      const correspondeSituacao = situacaoFiltro === 'Todos'
        || (situacaoFiltro === 'Abertas' && demanda.status !== 'Concluída' && demanda.status !== 'Cancelada')
        || (situacaoFiltro === 'Concluídas' && demanda.status === 'Concluída')
        || (situacaoFiltro === 'Atrasadas' && estaAtrasada(demanda))

      return correspondePesquisa && correspondeStatus && correspondePrioridade && correspondeSituacao
    })
  }, [minhasDemandas, pesquisa, statusFiltro, prioridadeFiltro, situacaoFiltro])

  const indicadores = useMemo(() => ({
    total: minhasDemandas.length,
    abertas: minhasDemandas.filter((item) => item.status !== 'Concluída' && item.status !== 'Cancelada').length,
    atendimento: minhasDemandas.filter((item) => item.status === 'Em Atendimento').length,
    pendencias: minhasDemandas.filter((item) => item.status === 'Com Pendências').length,
    atrasadas: minhasDemandas.filter(estaAtrasada).length,
    concluidas: minhasDemandas.filter((item) => item.status === 'Concluída').length,
  }), [minhasDemandas])

  function limparFiltros() {
    setPesquisa('')
    setStatusFiltro('Todos')
    setPrioridadeFiltro('Todas')
    setSituacaoFiltro('Todos')
  }

  async function salvarConta(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErroConta('')

    const email = novoEmail.trim()
    const senha = novaSenha

    if (!email) {
      setErroConta('Informe um e-mail válido.')
      return
    }

    if (senha && senha.length < MINIMO_SENHA) {
      setErroConta(`A nova senha deve possuir no mínimo ${MINIMO_SENHA} caracteres.`)
      return
    }

    if (senha && senha !== confirmacaoSenha) {
      setErroConta('A confirmação da senha não confere.')
      return
    }

    try {
      const usuarios = carregarUsuarios() as UsuarioSeguranca[]
      const usuarioAtual = usuarios.find((item) => item.id === usuario.id)

      if (!usuarioAtual) {
        setErroConta('Usuário não encontrado.')
        return
      }

      const emailEmUso = usuarios.some(
        (item) => item.id !== usuario.id && item.email.toLowerCase() === email.toLowerCase(),
      )

      if (emailEmUso) {
        setErroConta('Este e-mail já está sendo utilizado por outro usuário.')
        return
      }

      let usuarioAtualizado: UsuarioSeguranca = {
        ...usuarioAtual,
        email,
        atualizadoEm: new Date().toISOString(),
      }

      if (senha) {
        usuarioAtualizado = {
          ...usuarioAtualizado,
          senhaHash: await hashSenha(senha),
          exigirTrocaSenha: false,
        }
      }

      const atualizados = usuarios.map((item) => item.id === usuario.id ? usuarioAtualizado : item)
      salvarUsuarios(atualizados)

      if (usuarioAtual.email !== email) {
        registrarAlteracao(
          'usuario',
          usuario.id,
          'alteracao_email',
          `O usuário ${usuario.nome} alterou o próprio e-mail.`,
          usuario.nome,
          { valorAnterior: usuarioAtual.email, valorNovo: email },
        )
      }

      if (senha) {
        registrarAlteracao(
          'usuario',
          usuario.id,
          'troca_senha',
          `O usuário ${usuario.nome} alterou a própria senha.`,
          usuario.nome,
        )
      }

      setMensagem('Dados da conta atualizados com sucesso.')
      setNovaSenha('')
      setConfirmacaoSenha('')
      setContaAberta(false)
      window.setTimeout(() => setMensagem(''), 2800)
    } catch {
      setErroConta('Não foi possível salvar as alterações da conta.')
    }
  }

  function abrirConta() {
    setNovoEmail(usuario.email || '')
    setNovaSenha('')
    setConfirmacaoSenha('')
    setErroConta('')
    setContaAberta(true)
  }

  function cancelarConta() {
    setErroConta('')
    setContaAberta(false)
    setNovaSenha('')
    setConfirmacaoSenha('')
  }

  return (
    <MenuPrincipal
      usuarioAtual={usuario}
      ativo="minhas-demandas"
      subtitulo="Minhas Demandas"
      onMinhasDemandas={() => {
        setContaAberta(false)
        setMensagem('')
      }}
      onMinhaConta={abrirConta}
      onSair={onVoltar}
    >
      <div className="minhas-demandas-page">
        <div className="minhas-demandas-heading">
          <div>
            <h2>Minhas Demandas</h2>
            <p>Demandas atualmente atribuídas a <strong>{usuario.nome}</strong>.</p>
          </div>
        </div>

        <section className="md-indicators" aria-label="Indicadores das minhas demandas">
          <div className="md-indicator"><span>Total atribuídas</span><strong>{indicadores.total}</strong></div>
          <div className="md-indicator"><span>Em aberto</span><strong>{indicadores.abertas}</strong></div>
          <div className="md-indicator"><span>Em atendimento</span><strong>{indicadores.atendimento}</strong></div>
          <div className="md-indicator"><span>Com pendências</span><strong>{indicadores.pendencias}</strong></div>
          <div className="md-indicator md-indicator-danger"><span>Atrasadas</span><strong>{indicadores.atrasadas}</strong></div>
          <div className="md-indicator md-indicator-success"><span>Concluídas</span><strong>{indicadores.concluidas}</strong></div>
        </section>

        <section className="md-filter-card">
          <div className="md-filter-search">
            <label htmlFor="md-pesquisa">Pesquisar</label>
            <input
              id="md-pesquisa"
              value={pesquisa}
              onChange={(event) => setPesquisa(event.target.value)}
              placeholder="Pesquisar por ID, título, órgão, sistema ou descrição..."
            />
          </div>

          <div className="md-filter-field">
            <label htmlFor="md-status">Status</label>
            <select id="md-status" value={statusFiltro} onChange={(event) => setStatusFiltro(event.target.value)}>
              {STATUS.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>

          <div className="md-filter-field">
            <label htmlFor="md-prioridade">Prioridade</label>
            <select id="md-prioridade" value={prioridadeFiltro} onChange={(event) => setPrioridadeFiltro(event.target.value)}>
              {PRIORIDADES.map((prioridade) => <option key={prioridade} value={prioridade}>{prioridade}</option>)}
            </select>
          </div>

          <div className="md-filter-field">
            <label htmlFor="md-situacao">Situação</label>
            <select id="md-situacao" value={situacaoFiltro} onChange={(event) => setSituacaoFiltro(event.target.value)}>
              <option value="Todos">Todas</option>
              <option value="Abertas">Abertas</option>
              <option value="Concluídas">Concluídas</option>
              <option value="Atrasadas">Atrasadas</option>
            </select>
          </div>

          <button type="button" className="md-clear-button" onClick={limparFiltros}>Limpar Filtros</button>
        </section>

        <section className="md-table-card">
          <div className="md-table-header">
            <div>
              <h3>Demandas atribuídas</h3>
              <p>{demandasFiltradas.length} {demandasFiltradas.length === 1 ? 'registro encontrado' : 'registros encontrados'}</p>
            </div>
          </div>

          {demandasFiltradas.length === 0 ? (
            <div className="md-empty">
              <div className="md-empty-icon">📋</div>
              <h3>Nenhuma demanda encontrada</h3>
              <p>Não há demandas atribuídas a você com os filtros selecionados.</p>
            </div>
          ) : (
            <div className="md-table-wrap">
              <table className="md-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Demanda</th>
                    <th>Órgão</th>
                    <th>Prioridade</th>
                    <th>Status</th>
                    <th>Prazo</th>
                    <th>SLA</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {demandasFiltradas.map((demanda) => {
                    const atrasada = estaAtrasada(demanda)
                    const proxima = estaProxima(demanda)

                    return (
                      <tr key={demanda.id}>
                        <td className="md-id">DEM-{String(demanda.id).padStart(5, '0')}</td>
                        <td>
                          <strong>{demanda.titulo}</strong>
                          <small>{demanda.sistema || '—'}</small>
                        </td>
                        <td>{demanda.cliente || '—'}</td>
                        <td><span className={`md-priority md-priority-${demanda.prioridade.toLowerCase()}`}>{demanda.prioridade}</span></td>
                        <td><span className={`md-status md-status-${demanda.status.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>{demanda.status}</span></td>
                        <td>{formatarData(demanda.prazo)}</td>
                        <td>
                          <span className={`md-sla ${atrasada ? 'danger' : proxima ? 'warning' : 'ok'}`}>
                            {atrasada ? 'Atrasada' : proxima ? 'Próxima' : 'No prazo'}
                          </span>
                        </td>
                        <td>
                          <div className="md-actions">
                            <button type="button" onClick={() => onAbrirDetalhe(demanda)}>Detalhes</button>
                            {demanda.status !== 'Concluída' && demanda.status !== 'Cancelada' && (
                              <>
                                <button type="button" className="md-action-warning" onClick={() => {
                                  const motivo = window.prompt('Informe o motivo da pendência:')
                                  if (motivo?.trim()) onAlterarStatus(demanda.id, 'Com Pendências', motivo)
                                }}>Pendência</button>
                                <button type="button" className="md-action-success" onClick={() => {
                                  const comentario = window.prompt('Informe o comentário de conclusão:')
                                  if (comentario?.trim()) onAlterarStatus(demanda.id, 'Concluída', comentario)
                                }}>Concluir</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {contaAberta && (
        <div className="md-modal-backdrop" role="presentation">
          <div className="md-modal" role="dialog" aria-modal="true" aria-labelledby="md-conta-title">
            <div className="md-modal-header">
              <div>
                <h3 id="md-conta-title">Minha Conta</h3>
                <p>Altere seu e-mail e sua senha quando desejar.</p>
              </div>
              <button type="button" className="md-modal-close" onClick={cancelarConta} aria-label="Fechar">×</button>
            </div>

            <form onSubmit={salvarConta}>
              <div className="md-account-grid">
                <label>
                  Nome
                  <input value={usuario.nome} readOnly />
                </label>
                <label>
                  Login
                  <input value={usuario.login} readOnly />
                </label>
                <label className="md-account-full">
                  E-mail
                  <input type="email" value={novoEmail} onChange={(event) => setNovoEmail(event.target.value)} autoComplete="email" />
                </label>
                <label>
                  Nova Senha
                  <div className="md-password-wrap">
                    <input
                      type={mostrarNovaSenha ? 'text' : 'password'}
                      value={novaSenha}
                      onChange={(event) => setNovaSenha(event.target.value)}
                      minLength={MINIMO_SENHA}
                      placeholder={`Mínimo ${MINIMO_SENHA} caracteres`}
                      autoComplete="new-password"
                    />
                    <button type="button" onClick={() => setMostrarNovaSenha((valor) => !valor)} aria-label={mostrarNovaSenha ? 'Ocultar senha' : 'Visualizar senha'}>🔍</button>
                  </div>
                </label>
                <label>
                  Confirmar Senha
                  <div className="md-password-wrap">
                    <input
                      type={mostrarConfirmacao ? 'text' : 'password'}
                      value={confirmacaoSenha}
                      onChange={(event) => setConfirmacaoSenha(event.target.value)}
                      minLength={MINIMO_SENHA}
                      placeholder="Repita a senha"
                      autoComplete="new-password"
                    />
                    <button type="button" onClick={() => setMostrarConfirmacao((valor) => !valor)} aria-label={mostrarConfirmacao ? 'Ocultar senha' : 'Visualizar senha'}>🔍</button>
                  </div>
                </label>
              </div>

              <div className="md-account-note">A alteração de senha exige no mínimo 6 caracteres. Deixe os campos de senha vazios para manter a senha atual.</div>

              {erroConta && <div className="md-account-error">{erroConta}</div>}

              <div className="md-modal-actions">
                <button type="button" className="md-cancel-button" onClick={cancelarConta}>Cancelar</button>
                <button type="submit" className="md-save-button">Salvar Alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {mensagem && <div className="md-toast">✓ {mensagem}</div>}
    </MenuPrincipal>
  )
}
