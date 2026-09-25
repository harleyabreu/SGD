// ============================================================
// GESTÃO DE DEMANDAS DE TI
// V2.1 — ADMINISTRAÇÃO
// ============================================================
// Área administrativa exclusiva do Gestor/Administrador.
// Mantém os cadastros padronizados usados pelo restante do sistema.
// ============================================================

import { useMemo, useState } from 'react'
import type { Cliente, Sistema, TipoDemanda, Usuario, RegistroAuditoria } from '../types'
import {
  carregarClientes,
  carregarSistemas,
  carregarTipos,
  carregarUsuarios,
  salvarClientes,
  salvarSistemas,
  salvarTipos,
  salvarUsuarios,
  carregarDemandas,
  carregarAuditoria,
} from '../services/storage'
import { registrarAlteracao } from '../services/auditoria'
import './Administracao.css'

type Aba = 'usuarios' | 'clientes' | 'sistemas' | 'tipos' | 'auditoria'

type Props = {
  usuarioAtual: Usuario
  onVoltar: () => void
  onFeriados: () => void
}

function dataAtualISO() {
  return new Date().toISOString()
}

function proximoId(lista: Array<{ id: number }>) {
  return lista.reduce((maior, item) => Math.max(maior, item.id), 0) + 1
}

function Administracao({ usuarioAtual, onVoltar, onFeriados }: Props) {
  const [aba, setAba] = useState<Aba>('usuarios')
  const [usuarios, setUsuarios] = useState<Usuario[]>(carregarUsuarios)
  const [clientes, setClientes] = useState<Cliente[]>(carregarClientes)
  const [sistemas, setSistemas] = useState<Sistema[]>(carregarSistemas)
  const [tipos, setTipos] = useState<TipoDemanda[]>(carregarTipos)
  const [mensagem, setMensagem] = useState('')
  const [pesquisa, setPesquisa] = useState('')
  const [auditoria, setAuditoria] = useState<RegistroAuditoria[]>(carregarAuditoria)

  const [editUsuario, setEditUsuario] = useState<Usuario | null>(null)
  const [nomeUsuario, setNomeUsuario] = useState('')
  const [loginUsuario, setLoginUsuario] = useState('')
  const [emailUsuario, setEmailUsuario] = useState('')
  const [telefoneUsuario, setTelefoneUsuario] = useState('')
  const [perfilUsuario, setPerfilUsuario] = useState<Usuario['perfil']>('Analista')

  const [editCliente, setEditCliente] = useState<Cliente | null>(null)
  const [nomeCliente, setNomeCliente] = useState('')
  const [siglaCliente, setSiglaCliente] = useState('')

  const [editSistema, setEditSistema] = useState<Sistema | null>(null)
  const [nomeSistema, setNomeSistema] = useState('')
  const [clienteSistema, setClienteSistema] = useState('')

  const [editTipo, setEditTipo] = useState<TipoDemanda | null>(null)
  const [nomeTipo, setNomeTipo] = useState('')

  const termo = pesquisa.trim().toLowerCase()

  const usuariosFiltrados = useMemo(
    () => usuarios.filter((item) => !termo || `${item.nome} ${item.login} ${item.email} ${item.perfil}`.toLowerCase().includes(termo)),
    [usuarios, termo]
  )

  const clientesFiltrados = useMemo(
    () => clientes.filter((item) => !termo || `${item.nome} ${item.sigla || ''}`.toLowerCase().includes(termo)),
    [clientes, termo]
  )

  const sistemasFiltrados = useMemo(
    () => sistemas.filter((item) => !termo || item.nome.toLowerCase().includes(termo)),
    [sistemas, termo]
  )

  const tiposFiltrados = useMemo(
    () => tipos.filter((item) => !termo || item.nome.toLowerCase().includes(termo)),
    [tipos, termo]
  )

  function avisar(texto: string) {
    setMensagem(texto)
    window.setTimeout(() => setMensagem(''), 2800)
  }

  function limparUsuario() {
    setEditUsuario(null)
    setNomeUsuario('')
    setLoginUsuario('')
    setEmailUsuario('')
    setTelefoneUsuario('')
    setPerfilUsuario('Analista')
  }

  function editarUsuario(item: Usuario) {
    setEditUsuario(item)
    setNomeUsuario(item.nome)
    setLoginUsuario(item.login)
    setEmailUsuario(item.email)
    setTelefoneUsuario(item.telefone || '')
    setPerfilUsuario(item.perfil)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function salvarUsuario() {
    if (!nomeUsuario.trim() || !loginUsuario.trim() || !emailUsuario.trim()) {
      window.alert('Preencha nome, login e e-mail.')
      return
    }

    const duplicado = usuarios.find(
      (item) =>
        item.id !== editUsuario?.id &&
        (item.login.toLowerCase() === loginUsuario.trim().toLowerCase() ||
          item.email.toLowerCase() === emailUsuario.trim().toLowerCase())
    )

    if (duplicado) {
      window.alert('Já existe um usuário com este login ou e-mail.')
      return
    }

    const agora = dataAtualISO()
    let atualizados: Usuario[]

    if (editUsuario) {
      atualizados = usuarios.map((item) =>
        item.id === editUsuario.id
          ? {
              ...item,
              nome: nomeUsuario.trim(),
              login: loginUsuario.trim(),
              email: emailUsuario.trim(),
              telefone: telefoneUsuario.trim(),
              perfil: perfilUsuario,
              atualizadoEm: agora,
            }
          : item
      )
      registrarAlteracao('usuario', editUsuario.id, 'edicao', `Usuário ${nomeUsuario.trim()} foi atualizado.`, usuarioAtual.nome)
      avisar('Usuário atualizado com sucesso.')
    } else {
      const novo: Usuario = {
        id: proximoId(usuarios),
        nome: nomeUsuario.trim(),
        login: loginUsuario.trim(),
        email: emailUsuario.trim(),
        telefone: telefoneUsuario.trim(),
        perfil: perfilUsuario,
        status: 'Ativo',
        criadoEm: agora,
      }
      atualizados = [...usuarios, novo]
      registrarAlteracao('usuario', novo.id, 'criacao', `Usuário ${novo.nome} foi cadastrado.`, usuarioAtual.nome)
      avisar('Usuário cadastrado com sucesso.')
    }

    setUsuarios(atualizados)
    salvarUsuarios(atualizados)
    limparUsuario()
  }

  function alternarUsuario(item: Usuario) {
    if (item.id === usuarioAtual.id && item.status === 'Ativo') {
      window.alert('O usuário atualmente logado não pode ser inativado.')
      return
    }

    if (item.status === 'Ativo') {
      const abertas = carregarDemandas().filter(
        (demanda) =>
          demanda.responsavel === item.nome &&
          demanda.status !== 'Concluída' &&
          demanda.status !== 'Cancelada'
      )

      if (abertas.length > 0) {
        window.alert(`Não é possível inativar ${item.nome}. Existem ${abertas.length} demanda(s) aberta(s) atribuída(s) a este Analista. Redistribua as demandas antes.`)
        return
      }
    }

    const novoStatus = item.status === 'Ativo' ? 'Inativo' : 'Ativo'
    const atualizados = usuarios.map((registro) =>
      registro.id === item.id ? { ...registro, status: novoStatus, atualizadoEm: dataAtualISO() } : registro
    )
    setUsuarios(atualizados)
    salvarUsuarios(atualizados)
    registrarAlteracao('usuario', item.id, 'status', `${item.nome} foi ${novoStatus.toLowerCase()}.`, usuarioAtual.nome, {
      valorAnterior: item.status,
      valorNovo: novoStatus,
    })
    avisar(`Usuário ${novoStatus.toLowerCase()} com sucesso.`)
  }

  function limparCliente() {
    setEditCliente(null)
    setNomeCliente('')
    setSiglaCliente('')
  }

  function editarCliente(item: Cliente) {
    setEditCliente(item)
    setNomeCliente(item.nome)
    setSiglaCliente(item.sigla || '')
  }

  function salvarCliente() {
    if (!nomeCliente.trim()) {
      window.alert('Informe o nome do órgão/cliente.')
      return
    }
    const duplicado = clientes.find(
      (item) => item.id !== editCliente?.id && item.nome.toLowerCase() === nomeCliente.trim().toLowerCase()
    )
    if (duplicado) {
      window.alert('Este órgão já está cadastrado.')
      return
    }

    const agora = dataAtualISO()
    let atualizados: Cliente[]
    if (editCliente) {
      atualizados = clientes.map((item) => item.id === editCliente.id ? { ...item, nome: nomeCliente.trim(), sigla: siglaCliente.trim(), atualizadoEm: agora } : item)
      registrarAlteracao('cliente', editCliente.id, 'edicao', `Órgão ${nomeCliente.trim()} foi atualizado.`, usuarioAtual.nome)
      avisar('Órgão atualizado com sucesso.')
    } else {
      const novo: Cliente = { id: proximoId(clientes), nome: nomeCliente.trim(), sigla: siglaCliente.trim(), ativo: true, criadoEm: agora }
      atualizados = [...clientes, novo]
      registrarAlteracao('cliente', novo.id, 'criacao', `Órgão ${novo.nome} foi cadastrado.`, usuarioAtual.nome)
      avisar('Órgão cadastrado com sucesso.')
    }
    setClientes(atualizados)
    salvarClientes(atualizados)
    limparCliente()
  }

  function alternarCliente(item: Cliente) {
    const novoStatus = !item.ativo
    const atualizados = clientes.map((registro) => registro.id === item.id ? { ...registro, ativo: novoStatus, atualizadoEm: dataAtualISO() } : registro)
    setClientes(atualizados)
    salvarClientes(atualizados)
    registrarAlteracao('cliente', item.id, 'status', `${item.nome} foi ${novoStatus ? 'ativado' : 'inativado'}.`, usuarioAtual.nome)
    avisar(`Órgão ${novoStatus ? 'ativado' : 'inativado'}.`)
  }

  function limparSistema() {
    setEditSistema(null)
    setNomeSistema('')
    setClienteSistema('')
  }

  function editarSistema(item: Sistema) {
    setEditSistema(item)
    setNomeSistema(item.nome)
    setClienteSistema(item.clienteId ? String(item.clienteId) : '')
  }

  function salvarSistema() {
    if (!nomeSistema.trim()) {
      window.alert('Informe o nome do sistema/serviço.')
      return
    }
    const duplicado = sistemas.find((item) => item.id !== editSistema?.id && item.nome.toLowerCase() === nomeSistema.trim().toLowerCase())
    if (duplicado) {
      window.alert('Este sistema já está cadastrado.')
      return
    }

    const agora = dataAtualISO()
    const clienteId = clienteSistema ? Number(clienteSistema) : undefined
    let atualizados: Sistema[]
    if (editSistema) {
      atualizados = sistemas.map((item) => item.id === editSistema.id ? { ...item, nome: nomeSistema.trim(), clienteId, atualizadoEm: agora } : item)
      registrarAlteracao('sistema', editSistema.id, 'edicao', `Sistema ${nomeSistema.trim()} foi atualizado.`, usuarioAtual.nome)
      avisar('Sistema atualizado com sucesso.')
    } else {
      const novo: Sistema = { id: proximoId(sistemas), nome: nomeSistema.trim(), clienteId, ativo: true, criadoEm: agora }
      atualizados = [...sistemas, novo]
      registrarAlteracao('sistema', novo.id, 'criacao', `Sistema ${novo.nome} foi cadastrado.`, usuarioAtual.nome)
      avisar('Sistema cadastrado com sucesso.')
    }
    setSistemas(atualizados)
    salvarSistemas(atualizados)
    limparSistema()
  }

  function alternarSistema(item: Sistema) {
    const novoStatus = !item.ativo
    const atualizados = sistemas.map((registro) => registro.id === item.id ? { ...registro, ativo: novoStatus, atualizadoEm: dataAtualISO() } : registro)
    setSistemas(atualizados)
    salvarSistemas(atualizados)
    registrarAlteracao('sistema', item.id, 'status', `${item.nome} foi ${novoStatus ? 'ativado' : 'inativado'}.`, usuarioAtual.nome)
    avisar(`Sistema ${novoStatus ? 'ativado' : 'inativado'}.`)
  }

  function limparTipo() {
    setEditTipo(null)
    setNomeTipo('')
  }

  function editarTipo(item: TipoDemanda) {
    setEditTipo(item)
    setNomeTipo(item.nome)
  }

  function salvarTipo() {
    if (!nomeTipo.trim()) {
      window.alert('Informe o nome do tipo de demanda.')
      return
    }
    const duplicado = tipos.find((item) => item.id !== editTipo?.id && item.nome.toLowerCase() === nomeTipo.trim().toLowerCase())
    if (duplicado) {
      window.alert('Este tipo já está cadastrado.')
      return
    }

    const agora = dataAtualISO()
    let atualizados: TipoDemanda[]
    if (editTipo) {
      atualizados = tipos.map((item) => item.id === editTipo.id ? { ...item, nome: nomeTipo.trim(), atualizadoEm: agora } : item)
      registrarAlteracao('tipo', editTipo.id, 'edicao', `Tipo ${nomeTipo.trim()} foi atualizado.`, usuarioAtual.nome)
      avisar('Tipo atualizado com sucesso.')
    } else {
      const novo: TipoDemanda = { id: proximoId(tipos), nome: nomeTipo.trim(), ativo: true, criadoEm: agora }
      atualizados = [...tipos, novo]
      registrarAlteracao('tipo', novo.id, 'criacao', `Tipo ${novo.nome} foi cadastrado.`, usuarioAtual.nome)
      avisar('Tipo cadastrado com sucesso.')
    }
    setTipos(atualizados)
    salvarTipos(atualizados)
    limparTipo()
  }

  function alternarTipo(item: TipoDemanda) {
    const novoStatus = !item.ativo
    const atualizados = tipos.map((registro) => registro.id === item.id ? { ...registro, ativo: novoStatus, atualizadoEm: dataAtualISO() } : registro)
    setTipos(atualizados)
    salvarTipos(atualizados)
    registrarAlteracao('tipo', item.id, 'status', `${item.nome} foi ${novoStatus ? 'ativado' : 'inativado'}.`, usuarioAtual.nome)
    avisar(`Tipo ${novoStatus ? 'ativado' : 'inativado'}.`)
  }

  return (
    <div className="administracao-page">
      <header className="administracao-header">
        <div>
          <div className="administracao-breadcrumb">Administração / Configurações</div>
          <h1>Administração do Sistema</h1>
          <p>Cadastros e configurações utilizadas pela Gestão de Demandas.</p>
        </div>
        <div className="administracao-header-actions">
          <button className="adm-btn-secondary" type="button" onClick={onFeriados}>Feriados / Dias Não Úteis</button>
          <button className="adm-btn-secondary" type="button" onClick={onVoltar}>← Voltar</button>
        </div>
      </header>

      {mensagem && <div className="adm-toast">{mensagem}</div>}

      <main className="administracao-content">
        <div className="adm-tabs">
          {([
            ['usuarios', 'Usuários e Analistas'],
            ['clientes', 'Órgãos'],
            ['sistemas', 'Sistemas'],
            ['tipos', 'Tipos de Demanda'],
            ['auditoria', 'Auditoria'],
          ] as Array<[Aba, string]>).map(([id, label]) => (
            <button key={id} type="button" className={aba === id ? 'active' : ''} onClick={() => { setAba(id); setPesquisa('') }}>
              {label}
            </button>
          ))}
        </div>

        <div className="adm-toolbar">
          <input value={pesquisa} onChange={(event) => setPesquisa(event.target.value)} placeholder="Pesquisar no cadastro..." />
          <span>{aba === 'usuarios' ? usuariosFiltrados.length : aba === 'clientes' ? clientesFiltrados.length : aba === 'sistemas' ? sistemasFiltrados.length : aba === 'tipos' ? tiposFiltrados.length : auditoria.filter((item) => !termo || `${item.acao} ${item.descricao} ${item.usuario}`.toLowerCase().includes(termo)).length} registro(s)</span>
        </div>

        {aba === 'usuarios' && (
          <>
            <section className="adm-card adm-form-card">
              <div className="adm-card-heading"><div><h2>{editUsuario ? 'Editar usuário' : 'Novo usuário'}</h2><p>Gestores possuem também as permissões administrativas.</p></div>{editUsuario && <button type="button" onClick={limparUsuario}>Cancelar edição</button>}</div>
              <div className="adm-grid adm-grid-4">
                <label>Nome completo<input value={nomeUsuario} onChange={(e) => setNomeUsuario(e.target.value)} placeholder="Nome do usuário" /></label>
                <label>Login<input value={loginUsuario} onChange={(e) => setLoginUsuario(e.target.value)} placeholder="login" /></label>
                <label>E-mail<input value={emailUsuario} onChange={(e) => setEmailUsuario(e.target.value)} placeholder="usuario@prodepa.pa.gov.br" /></label>
                <label>Telefone<input value={telefoneUsuario} onChange={(e) => setTelefoneUsuario(e.target.value)} placeholder="Opcional" /></label>
              </div>
              <div className="adm-form-footer">
                <label>Perfil<select value={perfilUsuario} onChange={(e) => setPerfilUsuario(e.target.value as Usuario['perfil'])}><option value="Gestor/Administrador">Gestor / Administrador</option><option value="Analista">Analista</option></select></label>
                <button className="adm-btn-primary" type="button" onClick={salvarUsuario}>{editUsuario ? 'Salvar alterações' : '+ Cadastrar usuário'}</button>
              </div>
            </section>
            <section className="adm-card">
              <div className="adm-table-wrap"><table><thead><tr><th>Usuário</th><th>Login</th><th>Perfil</th><th>Status</th><th>Último acesso</th><th>Ações</th></tr></thead><tbody>{usuariosFiltrados.map((item) => <tr key={item.id}><td><strong>{item.nome}</strong><small>{item.email}</small></td><td>{item.login}</td><td><span className="adm-pill">{item.perfil === 'Gestor/Administrador' ? 'Gestor' : 'Analista'}</span></td><td><span className={`adm-status ${item.status === 'Ativo' ? 'ativo' : 'inativo'}`}>{item.status}</span></td><td>{item.ultimoAcesso ? new Date(item.ultimoAcesso).toLocaleString('pt-BR') : '—'}</td><td><button type="button" onClick={() => editarUsuario(item)}>Editar</button><button type="button" onClick={() => alternarUsuario(item)}>{item.status === 'Ativo' ? 'Inativar' : 'Ativar'}</button></td></tr>)}</tbody></table></div>
            </section>
          </>
        )}

        {aba === 'clientes' && (
          <>
            <section className="adm-card adm-form-card"><div className="adm-card-heading"><div><h2>{editCliente ? 'Editar órgão' : 'Novo órgão'}</h2><p>O órgão é utilizado como classificação da demanda; não possui acesso ao sistema.</p></div>{editCliente && <button type="button" onClick={limparCliente}>Cancelar edição</button>}</div><div className="adm-grid adm-grid-2"><label>Nome do órgão<input value={nomeCliente} onChange={(e) => setNomeCliente(e.target.value)} placeholder="Ex.: Secretaria de Estado" /></label><label>Sigla<input value={siglaCliente} onChange={(e) => setSiglaCliente(e.target.value)} placeholder="Ex.: SEFA" /></label></div><div className="adm-form-footer"><button className="adm-btn-primary" type="button" onClick={salvarCliente}>{editCliente ? 'Salvar alterações' : '+ Cadastrar órgão'}</button></div></section>
            <section className="adm-card"><div className="adm-table-wrap"><table><thead><tr><th>Órgão</th><th>Sigla</th><th>Status</th><th>Ações</th></tr></thead><tbody>{clientesFiltrados.map((item) => <tr key={item.id}><td><strong>{item.nome}</strong></td><td>{item.sigla || '—'}</td><td><span className={`adm-status ${item.ativo ? 'ativo' : 'inativo'}`}>{item.ativo ? 'Ativo' : 'Inativo'}</span></td><td><button type="button" onClick={() => editarCliente(item)}>Editar</button><button type="button" onClick={() => alternarCliente(item)}>{item.ativo ? 'Inativar' : 'Ativar'}</button></td></tr>)}</tbody></table></div></section>
          </>
        )}

        {aba === 'sistemas' && (
          <>
            <section className="adm-card adm-form-card"><div className="adm-card-heading"><div><h2>{editSistema ? 'Editar sistema' : 'Novo sistema'}</h2><p>Cadastre os sistemas/serviços para padronizar as demandas.</p></div>{editSistema && <button type="button" onClick={limparSistema}>Cancelar edição</button>}</div><div className="adm-grid adm-grid-2"><label>Nome do sistema<input value={nomeSistema} onChange={(e) => setNomeSistema(e.target.value)} placeholder="Nome do sistema ou serviço" /></label><label>Órgão relacionado<select value={clienteSistema} onChange={(e) => setClienteSistema(e.target.value)}><option value="">Não vincular</option>{clientes.filter((item) => item.ativo).map((item) => <option key={item.id} value={item.id}>{item.sigla ? `${item.sigla} — ${item.nome}` : item.nome}</option>)}</select></label></div><div className="adm-form-footer"><button className="adm-btn-primary" type="button" onClick={salvarSistema}>{editSistema ? 'Salvar alterações' : '+ Cadastrar sistema'}</button></div></section>
            <section className="adm-card"><div className="adm-table-wrap"><table><thead><tr><th>Sistema</th><th>Órgão</th><th>Status</th><th>Ações</th></tr></thead><tbody>{sistemasFiltrados.map((item) => { const cliente = clientes.find((c) => c.id === item.clienteId); return <tr key={item.id}><td><strong>{item.nome}</strong></td><td>{cliente?.sigla || cliente?.nome || '—'}</td><td><span className={`adm-status ${item.ativo ? 'ativo' : 'inativo'}`}>{item.ativo ? 'Ativo' : 'Inativo'}</span></td><td><button type="button" onClick={() => editarSistema(item)}>Editar</button><button type="button" onClick={() => alternarSistema(item)}>{item.ativo ? 'Inativar' : 'Ativar'}</button></td></tr> })}</tbody></table></div></section>
          </>
        )}

        {aba === 'tipos' && (
          <>
            <section className="adm-card adm-form-card"><div className="adm-card-heading"><div><h2>{editTipo ? 'Editar tipo' : 'Novo tipo de demanda'}</h2><p>Tipos padronizados alimentam o cadastro e os filtros das demandas.</p></div>{editTipo && <button type="button" onClick={limparTipo}>Cancelar edição</button>}</div><div className="adm-grid adm-grid-2"><label>Nome do tipo<input value={nomeTipo} onChange={(e) => setNomeTipo(e.target.value)} placeholder="Ex.: Melhoria" /></label></div><div className="adm-form-footer"><button className="adm-btn-primary" type="button" onClick={salvarTipo}>{editTipo ? 'Salvar alterações' : '+ Cadastrar tipo'}</button></div></section>
            <section className="adm-card"><div className="adm-table-wrap"><table><thead><tr><th>Tipo</th><th>Status</th><th>Ações</th></tr></thead><tbody>{tiposFiltrados.map((item) => <tr key={item.id}><td><strong>{item.nome}</strong></td><td><span className={`adm-status ${item.ativo ? 'ativo' : 'inativo'}`}>{item.ativo ? 'Ativo' : 'Inativo'}</span></td><td><button type="button" onClick={() => editarTipo(item)}>Editar</button><button type="button" onClick={() => alternarTipo(item)}>{item.ativo ? 'Inativar' : 'Ativar'}</button></td></tr>)}</tbody></table></div></section>
          </>
        )}

        {aba === 'auditoria' && (
          <section className="adm-card">
            <div className="adm-card-heading">
              <div><h2>Auditoria do sistema</h2><p>Registros somente para consulta. Nenhum registro pode ser apagado ou alterado pelo usuário.</p></div>
              <button type="button" onClick={() => setAuditoria(carregarAuditoria())}>Atualizar</button>
            </div>
            <div className="adm-table-wrap">
              <table><thead><tr><th>Data/Hora</th><th>Usuário</th><th>Ação</th><th>Descrição</th><th>Anterior</th><th>Novo</th><th>Motivo</th></tr></thead><tbody>
                {auditoria.filter((item) => !termo || `${item.acao} ${item.descricao} ${item.usuario}`.toLowerCase().includes(termo)).sort((a,b) => new Date(b.data).getTime() - new Date(a.data).getTime()).map((item) => (
                  <tr key={item.id}><td>{new Date(item.data).toLocaleString('pt-BR')}</td><td>{item.usuario}</td><td>{item.acao}</td><td>{item.descricao}</td><td>{item.valorAnterior || '—'}</td><td>{item.valorNovo || '—'}</td><td>{item.motivo || '—'}</td></tr>
                ))}
              </tbody></table>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default Administracao
