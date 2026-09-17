// ============================================================
// GESTÃO DE DEMANDAS DE TI
// V3.0 — ADMINISTRAÇÃO
// ============================================================
// Área administrativa exclusiva do Gestor/Administrador.
// Mantém os cadastros padronizados usados pelo restante do sistema.
//
// V3.0
// V1.9 — Ajuste final da tela de usuários.
// - Removido definitivamente o botão de geração de senha.

// - Estrutura visual alinhada à Dashboard
// - Sidebar padrão do sistema
// - Cabeçalho superior padrão
// - Tipografia Inter
// - Paleta oficial da Dashboard
// - Funcionalidades administrativas preservadas
// ============================================================

import { useMemo, useState } from 'react'
import type {
  Cliente,
  Sistema,
  TipoDemanda,
  Usuario,
  RegistroAuditoria,
} from '../types'

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
import MenuPrincipal from '../components/MenuPrincipal'

type Aba =
  | 'usuarios'
  | 'clientes'
  | 'sistemas'
  | 'tipos'
  | 'auditoria'

type Props = {
  usuarioAtual: Usuario
  onVoltar: () => void
  onVoltarConfiguracoes?: () => void
  onFeriados: () => void

  // Navegações opcionais.
  // Mantidas opcionais para não quebrar o App existente.
  onDashboard?: () => void
  onTodasDemandas?: () => void
  onNovaDemanda?: () => void
  onClientes?: () => void
  onResponsaveis?: () => void
  onRelatorios?: () => void
  onConfiguracoes?: () => void
  onSair?: () => void
}

type UsuarioSeguranca = Usuario & {
  senhaHash?: string
  exigirTrocaSenha?: boolean
}

const MINIMO_SENHA = 6

async function hashSenha(senha: string): Promise<string> {
  const dados = new TextEncoder().encode(senha)
  const digest = await window.crypto.subtle.digest('SHA-256', dados)

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function dataAtualISO() {
  return new Date().toISOString()
}

function proximoId(lista: Array<{ id: number }>) {
  return lista.reduce(
    (maior, item) => Math.max(maior, item.id),
    0
  ) + 1
}

function formatarNomeComposto(nome: string) {
  return nome
    .trim()
    .split(/\s+/)
    .map((palavra) => {
      if (!palavra) return palavra
      return palavra.charAt(0).toLocaleUpperCase('pt-BR') + palavra.slice(1).toLocaleLowerCase('pt-BR')
    })
    .join(' ')
}

function Administracao({
  usuarioAtual,
  onVoltar,
  onVoltarConfiguracoes,
  onFeriados,
  onDashboard,
  onTodasDemandas,
  onNovaDemanda,
  onClientes,
  onResponsaveis,
  onRelatorios,
  onConfiguracoes,
  onSair,
}: Props) {
  const [aba, setAba] = useState<Aba>('usuarios')

  const [usuarios, setUsuarios] =
    useState<Usuario[]>(carregarUsuarios)

  const [clientes, setClientes] =
    useState<Cliente[]>(carregarClientes)

  const [sistemas, setSistemas] =
    useState<Sistema[]>(carregarSistemas)

  const [tipos, setTipos] =
    useState<TipoDemanda[]>(carregarTipos)

  const [mensagem, setMensagem] = useState('')

  const [pesquisa, setPesquisa] = useState('')

  const [auditoria, setAuditoria] =
    useState<RegistroAuditoria[]>(carregarAuditoria)

  // ==========================================================
  // USUÁRIO
  // ==========================================================

  const [editUsuario, setEditUsuario] =
    useState<Usuario | null>(null)

  const [nomeUsuario, setNomeUsuario] =
    useState('')

  const [loginUsuario, setLoginUsuario] =
    useState('')

  const [emailUsuario, setEmailUsuario] =
    useState('')

  const [telefoneUsuario, setTelefoneUsuario] =
    useState('')

  const [perfilUsuario, setPerfilUsuario] =
    useState<Usuario['perfil']>('Analista')

  const [senhaUsuario, setSenhaUsuario] =
    useState('')

  const [confirmarSenhaUsuario, setConfirmarSenhaUsuario] =
    useState('')

  const [mostrarSenhaUsuario, setMostrarSenhaUsuario] =
    useState(false)

  const [mostrarConfirmarSenhaUsuario, setMostrarConfirmarSenhaUsuario] =
    useState(false)

  const [modoAlterarSenha, setModoAlterarSenha] =
    useState(false)

  // ==========================================================
  // CLIENTE
  // ==========================================================

  const [editCliente, setEditCliente] =
    useState<Cliente | null>(null)

  const [nomeCliente, setNomeCliente] =
    useState('')

  const [siglaCliente, setSiglaCliente] =
    useState('')

  // ==========================================================
  // SISTEMA
  // ==========================================================

  const [editSistema, setEditSistema] =
    useState<Sistema | null>(null)

  const [nomeSistema, setNomeSistema] =
    useState('')

  const [clienteSistema, setClienteSistema] =
    useState('')

  // ==========================================================
  // TIPO
  // ==========================================================

  const [editTipo, setEditTipo] =
    useState<TipoDemanda | null>(null)

  const [nomeTipo, setNomeTipo] =
    useState('')

  // ==========================================================
  // PESQUISA
  // ==========================================================

  const termo = pesquisa.trim().toLowerCase()

  const usuariosFiltrados = useMemo(
    () =>
      usuarios.filter(
        (item) =>
          !termo ||
          `${item.nome} ${item.login} ${item.email} ${item.perfil}`
            .toLowerCase()
            .includes(termo)
      ),
    [usuarios, termo]
  )

  const clientesFiltrados = useMemo(
    () =>
      clientes.filter(
        (item) =>
          !termo ||
          `${item.nome} ${item.sigla || ''}`
            .toLowerCase()
            .includes(termo)
      ),
    [clientes, termo]
  )

  const sistemasFiltrados = useMemo(
    () =>
      sistemas.filter(
        (item) =>
          !termo ||
          item.nome.toLowerCase().includes(termo)
      ),
    [sistemas, termo]
  )

  const tiposFiltrados = useMemo(
    () =>
      tipos.filter(
        (item) =>
          !termo ||
          item.nome.toLowerCase().includes(termo)
      ),
    [tipos, termo]
  )

  const auditoriaFiltrada = useMemo(
    () =>
      auditoria
        .filter(
          (item) =>
            !termo ||
            `${item.acao} ${item.descricao} ${item.usuario}`
              .toLowerCase()
              .includes(termo)
        )
        .sort(
          (a, b) =>
            new Date(b.data).getTime() -
            new Date(a.data).getTime()
        ),
    [auditoria, termo]
  )

  // ==========================================================
  // MENSAGEM
  // ==========================================================

  function avisar(texto: string) {
    setMensagem(texto)

    window.setTimeout(
      () => setMensagem(''),
      2800
    )
  }

  function atualizarAuditoriaLocal() {
    setAuditoria(carregarAuditoria())
  }

  function quantidadeGestoresAtivos() {
    return usuarios.filter(
      (item) =>
        item.perfil === 'Gestor/Administrador' &&
        item.status === 'Ativo'
    ).length
  }

  // ==========================================================
  // USUÁRIOS
  // ==========================================================

  function limparUsuario() {
    setEditUsuario(null)
    setNomeUsuario('')
    setLoginUsuario('')
    setEmailUsuario('')
    setTelefoneUsuario('')
    setPerfilUsuario('Analista')
    setSenhaUsuario('')
    setConfirmarSenhaUsuario('')
    setMostrarSenhaUsuario(false)
    setMostrarConfirmarSenhaUsuario(false)
    setModoAlterarSenha(false)
  }

  function editarUsuario(item: Usuario) {
    setEditUsuario(item)
    setNomeUsuario(item.nome)
    setLoginUsuario(item.login)
    setEmailUsuario(item.email)
    setTelefoneUsuario(item.telefone || '')
    setPerfilUsuario(item.perfil)

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  function alterarSenhaUsuario(item: Usuario) {
    const ehGestor =
      usuarioAtual.perfil === 'Gestor/Administrador'

    const podeAlterar =
      ehGestor || item.id === usuarioAtual.id

    if (!podeAlterar) {
      window.alert(
        'Somente o Gestor pode alterar a senha de outros usuários. Você pode alterar apenas a sua própria senha.'
      )
      return
    }

    editarUsuario(item)
    setModoAlterarSenha(true)
    setSenhaUsuario('')
    setConfirmarSenhaUsuario('')
    setMostrarSenhaUsuario(false)
    setMostrarConfirmarSenhaUsuario(false)
  }

  async function salvarUsuario() {
    if (
      !nomeUsuario.trim() ||
      !loginUsuario.trim() ||
      !emailUsuario.trim()
    ) {
      window.alert(
        'Preencha nome, login e e-mail.'
      )
      return
    }

    if (!editUsuario || modoAlterarSenha) {
      if (senhaUsuario.length < MINIMO_SENHA) {
        window.alert(
          `A senha deve ter no mínimo ${MINIMO_SENHA} caracteres.`
        )
        return
      }

      if (senhaUsuario !== confirmarSenhaUsuario) {
        window.alert('A confirmação da senha não confere.')
        return
      }
    }

    if (
      editUsuario &&
      editUsuario.status === 'Ativo' &&
      editUsuario.perfil === 'Gestor/Administrador' &&
      perfilUsuario !== 'Gestor/Administrador' &&
      quantidadeGestoresAtivos() <= 1
    ) {
      window.alert(
        'Não é possível retirar o perfil de Gestor deste usuário. O sistema precisa manter pelo menos um Gestor ativo.'
      )
      return
    }

    const duplicado = usuarios.find(
      (item) =>
        item.id !== editUsuario?.id &&
        (
          item.login.toLowerCase() ===
            loginUsuario.trim().toLowerCase() ||
          item.email.toLowerCase() ===
            emailUsuario.trim().toLowerCase()
        )
    )

    if (duplicado) {
      window.alert(
        'Já existe um usuário com este login ou e-mail.'
      )
      return
    }

    const agora = dataAtualISO()

    let atualizados: Usuario[]

    if (editUsuario) {
      let senhaHashNova: string | undefined

      if (modoAlterarSenha) {
        senhaHashNova = await hashSenha(senhaUsuario)
      }

      atualizados = usuarios.map(
        (item) =>
          item.id === editUsuario.id
            ? {
                ...item,
                nome: nomeUsuario.trim(),
                login: loginUsuario.trim(),
                email: emailUsuario.trim(),
                telefone: telefoneUsuario.trim(),
                perfil: perfilUsuario,
                atualizadoEm: agora,
                ...(senhaHashNova
                  ? {
                      senhaHash: senhaHashNova,
                      exigirTrocaSenha: false,
                    }
                  : {}),
              }
            : item
      )

      registrarAlteracao(
        'usuario',
        editUsuario.id,
        modoAlterarSenha ? 'alteracao_senha' : 'edicao',
        modoAlterarSenha
          ? `Senha do usuário ${nomeUsuario.trim()} foi alterada pelo Gestor.`
          : `Usuário ${nomeUsuario.trim()} foi atualizado.`,
        usuarioAtual.nome,
        {
          valorAnterior: modoAlterarSenha
            ? 'Senha: cadastrada anteriormente'
            : `Nome: ${editUsuario.nome} | Login: ${editUsuario.login} | E-mail: ${editUsuario.email} | Telefone: ${editUsuario.telefone || '—'} | Perfil: ${editUsuario.perfil === 'Gestor/Administrador' ? 'Gestor' : 'Analista'}`,
          valorNovo: modoAlterarSenha
            ? 'Senha: alterada'
            : `Nome: ${nomeUsuario.trim()} | Login: ${loginUsuario.trim()} | E-mail: ${emailUsuario.trim()} | Telefone: ${telefoneUsuario.trim() || '—'} | Perfil: ${perfilUsuario === 'Gestor/Administrador' ? 'Gestor' : 'Analista'}`,
        }
      )

      atualizarAuditoriaLocal()

      avisar(
        modoAlterarSenha
          ? 'Senha alterada com sucesso.'
          : 'Usuário atualizado com sucesso.'
      )
    } else {
      const senhaHash = await hashSenha(senhaUsuario)

      const novo: UsuarioSeguranca = {
        id: proximoId(usuarios),
        nome: nomeUsuario.trim(),
        login: loginUsuario.trim(),
        email: emailUsuario.trim(),
        telefone: telefoneUsuario.trim(),
        perfil: perfilUsuario,
        status: 'Ativo',
        criadoEm: agora,
        senhaHash,
        exigirTrocaSenha: true,
      }

      atualizados = [
        ...usuarios,
        novo,
      ]

      registrarAlteracao(
        'usuario',
        novo.id,
        'criacao',
        `Usuário ${novo.nome} foi cadastrado.`,
        usuarioAtual.nome
      )

      atualizarAuditoriaLocal()

      avisar(
        'Usuário cadastrado com sucesso.'
      )
    }

    setUsuarios(atualizados)
    salvarUsuarios(atualizados)
    limparUsuario()
  }

  function alternarUsuario(item: Usuario) {
    if (
      item.id === usuarioAtual.id &&
      item.status === 'Ativo'
    ) {
      window.alert(
        'O usuário atualmente logado não pode ser inativado.'
      )
      return
    }

    if (item.status === 'Ativo') {
      const abertas =
        carregarDemandas().filter(
          (demanda) =>
            demanda.responsavel === item.nome &&
            demanda.status !== 'Concluída' &&
            demanda.status !== 'Cancelada'
        )

      if (abertas.length > 0) {
        window.alert(
          `Não é possível inativar ${item.nome}. Existem ${abertas.length} demanda(s) aberta(s) atribuída(s) a este Analista. Redistribua as demandas antes.`
        )
        return
      }
    }

    if (
      item.status === 'Ativo' &&
      item.perfil === 'Gestor/Administrador' &&
      quantidadeGestoresAtivos() <= 1
    ) {
      window.alert(
        'Não é possível inativar este usuário. O sistema precisa manter pelo menos um Gestor ativo.'
      )
      return
    }

    const novoStatus: Usuario['status'] =
      item.status === 'Ativo'
        ? 'Inativo'
        : 'Ativo'

    const atualizados =
      usuarios.map(
        (registro) =>
          registro.id === item.id
            ? {
                ...registro,
                status: novoStatus,
                atualizadoEm: dataAtualISO(),
              }
            : registro
      )

    setUsuarios(atualizados)
    salvarUsuarios(atualizados)

    registrarAlteracao(
      'usuario',
      item.id,
      'status',
      `${item.nome} foi ${novoStatus.toLowerCase()}.`,
      usuarioAtual.nome,
      {
        valorAnterior: item.status,
        valorNovo: novoStatus,
      }
    )

    atualizarAuditoriaLocal()

    avisar(
      `Usuário ${novoStatus.toLowerCase()} com sucesso.`
    )
  }

  // ==========================================================
  // CLIENTES
  // ==========================================================

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
      window.alert(
        'Informe o nome do órgão/cliente.'
      )
      return
    }

    const duplicado = clientes.find(
      (item) =>
        item.id !== editCliente?.id &&
        item.nome.toLowerCase() ===
          nomeCliente.trim().toLowerCase()
    )

    if (duplicado) {
      window.alert(
        'Este órgão já está cadastrado.'
      )
      return
    }

    const agora = dataAtualISO()

    let atualizados: Cliente[]

    if (editCliente) {
      atualizados = clientes.map(
        (item) =>
          item.id === editCliente.id
            ? {
                ...item,
                nome: nomeCliente.trim(),
                sigla: siglaCliente.trim(),
                atualizadoEm: agora,
              }
            : item
      )

      registrarAlteracao(
        'cliente',
        editCliente.id,
        'edicao',
        `Órgão ${nomeCliente.trim()} foi atualizado.`,
        usuarioAtual.nome,
        {
          valorAnterior: `Nome: ${editCliente.nome} | Sigla: ${editCliente.sigla || '—'}`,
          valorNovo: `Nome: ${nomeCliente.trim()} | Sigla: ${siglaCliente.trim() || '—'}`,
        }
      )

      atualizarAuditoriaLocal()

      avisar(
        'Órgão atualizado com sucesso.'
      )
    } else {
      const novo: Cliente = {
        id: proximoId(clientes),
        nome: nomeCliente.trim(),
        sigla: siglaCliente.trim(),
        ativo: true,
        criadoEm: agora,
      }

      atualizados = [
        ...clientes,
        novo,
      ]

      registrarAlteracao(
        'cliente',
        novo.id,
        'criacao',
        `Órgão ${novo.nome} foi cadastrado.`,
        usuarioAtual.nome
      )

      atualizarAuditoriaLocal()

      avisar(
        'Órgão cadastrado com sucesso.'
      )
    }

    setClientes(atualizados)
    salvarClientes(atualizados)
    limparCliente()
  }

  function alternarCliente(item: Cliente) {
    const novoStatus = !item.ativo

    const atualizados =
      clientes.map(
        (registro) =>
          registro.id === item.id
            ? {
                ...registro,
                ativo: novoStatus,
                atualizadoEm: dataAtualISO(),
              }
            : registro
      )

    setClientes(atualizados)
    salvarClientes(atualizados)

    registrarAlteracao(
      'cliente',
      item.id,
      'status',
      `${item.nome} foi ${novoStatus ? 'ativado' : 'inativado'}.`,
      usuarioAtual.nome,
      {
        valorAnterior: item.ativo ? 'Ativo' : 'Inativo',
        valorNovo: novoStatus ? 'Ativo' : 'Inativo',
      }
    )

    atualizarAuditoriaLocal()

    avisar(
      `Órgão ${novoStatus ? 'ativado' : 'inativado'}.`
    )
  }

  // ==========================================================
  // SISTEMAS
  // ==========================================================

  function limparSistema() {
    setEditSistema(null)
    setNomeSistema('')
    setClienteSistema('')
  }

  function editarSistema(item: Sistema) {
    setEditSistema(item)
    setNomeSistema(item.nome)
    setClienteSistema(
      item.clienteId
        ? String(item.clienteId)
        : ''
    )
  }

  function salvarSistema() {
    if (!nomeSistema.trim()) {
      window.alert(
        'Informe o nome do sistema/serviço.'
      )
      return
    }

    const duplicado = sistemas.find(
      (item) =>
        item.id !== editSistema?.id &&
        item.nome.toLowerCase() ===
          nomeSistema.trim().toLowerCase()
    )

    if (duplicado) {
      window.alert(
        'Este sistema já está cadastrado.'
      )
      return
    }

    const agora = dataAtualISO()

    const clienteId =
      clienteSistema
        ? Number(clienteSistema)
        : undefined

    let atualizados: Sistema[]

    if (editSistema) {
      atualizados = sistemas.map(
        (item) =>
          item.id === editSistema.id
            ? {
                ...item,
                nome: nomeSistema.trim(),
                clienteId,
                atualizadoEm: agora,
              }
            : item
      )

      const clienteAnterior = clientes.find(
        (cliente) => cliente.id === editSistema.clienteId
      )

      const clienteNovo = clientes.find(
        (cliente) => cliente.id === clienteId
      )

      registrarAlteracao(
        'sistema',
        editSistema.id,
        'edicao',
        `Sistema ${nomeSistema.trim()} foi atualizado.`,
        usuarioAtual.nome,
        {
          valorAnterior: `Nome: ${editSistema.nome} | Órgão: ${clienteAnterior?.sigla || clienteAnterior?.nome || '—'}`,
          valorNovo: `Nome: ${nomeSistema.trim()} | Órgão: ${clienteNovo?.sigla || clienteNovo?.nome || '—'}`,
        }
      )

      atualizarAuditoriaLocal()

      avisar(
        'Sistema atualizado com sucesso.'
      )
    } else {
      const novo: Sistema = {
        id: proximoId(sistemas),
        nome: nomeSistema.trim(),
        clienteId,
        ativo: true,
        criadoEm: agora,
      }

      atualizados = [
        ...sistemas,
        novo,
      ]

      registrarAlteracao(
        'sistema',
        novo.id,
        'criacao',
        `Sistema ${novo.nome} foi cadastrado.`,
        usuarioAtual.nome
      )

      atualizarAuditoriaLocal()

      avisar(
        'Sistema cadastrado com sucesso.'
      )
    }

    setSistemas(atualizados)
    salvarSistemas(atualizados)
    limparSistema()
  }

  function alternarSistema(item: Sistema) {
    const novoStatus = !item.ativo

    const atualizados =
      sistemas.map(
        (registro) =>
          registro.id === item.id
            ? {
                ...registro,
                ativo: novoStatus,
                atualizadoEm: dataAtualISO(),
              }
            : registro
      )

    setSistemas(atualizados)
    salvarSistemas(atualizados)

    registrarAlteracao(
      'sistema',
      item.id,
      'status',
      `${item.nome} foi ${novoStatus ? 'ativado' : 'inativado'}.`,
      usuarioAtual.nome,
      {
        valorAnterior: item.ativo ? 'Ativo' : 'Inativo',
        valorNovo: novoStatus ? 'Ativo' : 'Inativo',
      }
    )

    atualizarAuditoriaLocal()

    avisar(
      `Sistema ${novoStatus ? 'ativado' : 'inativado'}.`
    )
  }

  // ==========================================================
  // TIPOS
  // ==========================================================

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
      window.alert(
        'Informe o nome do tipo de demanda.'
      )
      return
    }

    const duplicado = tipos.find(
      (item) =>
        item.id !== editTipo?.id &&
        item.nome.toLowerCase() ===
          nomeTipo.trim().toLowerCase()
    )

    if (duplicado) {
      window.alert(
        'Este tipo já está cadastrado.'
      )
      return
    }

    const agora = dataAtualISO()

    let atualizados: TipoDemanda[]

    if (editTipo) {
      atualizados = tipos.map(
        (item) =>
          item.id === editTipo.id
            ? {
                ...item,
                nome: nomeTipo.trim(),
                atualizadoEm: agora,
              }
            : item
      )

      registrarAlteracao(
        'tipo',
        editTipo.id,
        'edicao',
        `Tipo ${nomeTipo.trim()} foi atualizado.`,
        usuarioAtual.nome,
        {
          valorAnterior: editTipo.nome,
          valorNovo: nomeTipo.trim(),
        }
      )

      atualizarAuditoriaLocal()

      avisar(
        'Tipo atualizado com sucesso.'
      )
    } else {
      const novo: TipoDemanda = {
        id: proximoId(tipos),
        nome: nomeTipo.trim(),
        ativo: true,
        criadoEm: agora,
      }

      atualizados = [
        ...tipos,
        novo,
      ]

      registrarAlteracao(
        'tipo',
        novo.id,
        'criacao',
        `Tipo ${novo.nome} foi cadastrado.`,
        usuarioAtual.nome
      )

      atualizarAuditoriaLocal()

      avisar(
        'Tipo cadastrado com sucesso.'
      )
    }

    setTipos(atualizados)
    salvarTipos(atualizados)
    limparTipo()
  }

  function alternarTipo(item: TipoDemanda) {
    const novoStatus = !item.ativo

    const atualizados =
      tipos.map(
        (registro) =>
          registro.id === item.id
            ? {
                ...registro,
                ativo: novoStatus,
                atualizadoEm: dataAtualISO(),
              }
            : registro
      )

    setTipos(atualizados)
    salvarTipos(atualizados)

    registrarAlteracao(
      'tipo',
      item.id,
      'status',
      `${item.nome} foi ${novoStatus ? 'ativado' : 'inativado'}.`,
      usuarioAtual.nome,
      {
        valorAnterior: item.ativo ? 'Ativo' : 'Inativo',
        valorNovo: novoStatus ? 'Ativo' : 'Inativo',
      }
    )

    atualizarAuditoriaLocal()

    avisar(
      `Tipo ${novoStatus ? 'ativado' : 'inativado'}.`
    )
  }

  const quantidadeRegistros =
    aba === 'usuarios'
      ? usuariosFiltrados.length
      : aba === 'clientes'
        ? clientesFiltrados.length
        : aba === 'sistemas'
          ? sistemasFiltrados.length
          : aba === 'tipos'
            ? tiposFiltrados.length
            : auditoriaFiltrada.length

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <MenuPrincipal
      usuarioAtual={usuarioAtual}
      ativo="configuracoes"
      subtitulo="Administração Do Sistema"
      onDashboard={onDashboard || onVoltar}
      onNovaDemanda={onNovaDemanda}
      onTodasDemandas={onTodasDemandas}
      onClientes={onClientes}
      onResponsaveis={onResponsaveis}
      onFeriados={onFeriados}
      onRelatorios={onRelatorios}
      onConfiguracoes={onConfiguracoes}
      onSair={onSair || onVoltar}
      rodapeAcoes={
        <>
          <button
            type="button"
            className="adm-btn-secondary adm-footer-voltar"
            onClick={onVoltarConfiguracoes || onVoltar}
          >
            ← Voltar a Configurações
          </button>

          <div className="adm-footer-acoes-direita">
            {aba === 'usuarios' && (
              <button
                type="button"
                className="adm-btn-primary adm-footer-cadastrar"
                onClick={salvarUsuario}
              >
                {editUsuario ? 'Salvar Alterações' : '+ Cadastrar Analista'}
              </button>
            )}

            {aba === 'clientes' && (
              <button
                type="button"
                className="adm-btn-primary adm-footer-cadastrar"
                onClick={salvarCliente}
              >
                {editCliente ? 'Salvar Alterações' : '+ Cadastrar Órgão'}
              </button>
            )}

            {aba === 'sistemas' && (
              <button
                type="button"
                className="adm-btn-primary adm-footer-cadastrar"
                onClick={salvarSistema}
              >
                {editSistema ? 'Salvar Alterações' : '+ Cadastrar Sistema'}
              </button>
            )}

            {aba === 'tipos' && (
              <button
                type="button"
                className="adm-btn-primary adm-footer-cadastrar"
                onClick={salvarTipo}
              >
                {editTipo ? 'Salvar Alterações' : '+ Cadastrar Tipo'}
              </button>
            )}
          </div>
        </>
      }
    >
        <main className="administracao-content">

          <div className="adm-page-heading">

            <div>
              <div className="administracao-breadcrumb">
                
              </div>

              <h2>
                Administração Do Sistema
              </h2>

              <p>
                Cadastros e Configurações Utilizadas pela Gestão de Demandas.
              </p>
            </div>


          </div>

          {/* ==================================================
              ABAS
          ================================================== */}

          <div className="adm-tabs">

            {([
              ['usuarios', 'Analistas'],
              ['clientes', 'Órgãos'],
              ['sistemas', 'Sistemas'],
              ['tipos', 'Tipos de Demanda'],
              ['auditoria', 'Auditoria'],
            ] as Array<[Aba, string]>).map(
              ([id, label]) => (

                <button
                  key={id}
                  type="button"
                  className={
                    aba === id
                      ? 'active'
                      : ''
                  }
                  onClick={() => {
                    setAba(id)
                    setPesquisa('')
                    if (id === 'auditoria') {
                      atualizarAuditoriaLocal()
                    }
                  }}
                >
                  {label}
                </button>

              )
            )}

          </div>

          {/* ==================================================
              PESQUISA
          ================================================== */}

          <div className="adm-toolbar">

            <div className="adm-search">

              <span className="adm-search-icon">
                ⌕
              </span>

              <input
                value={pesquisa}
                onChange={(event) =>
                  setPesquisa(
                    event.target.value
                  )
                }
                placeholder="Pesquisar no cadastro..."
              />

            </div>

            <span>
              {quantidadeRegistros} registro(s)
            </span>

          </div>

          {/* ==================================================
              USUÁRIOS
          ================================================== */}

          {aba === 'usuarios' && (
            <>
              <section className="adm-card adm-form-card">

                <div className="adm-card-heading">

                  <div>
                    <h2>
                      {editUsuario
                        ? 'Editar Analista'
                        : 'Novo Analista'}
                    </h2>

                    <p>
                      Gestores Possuem Também as Permissões Administrativas.
                    </p>
                  </div>

                  {editUsuario && (
                    <button
                      type="button"
                      onClick={limparUsuario}
                      className="adm-btn-secondary adm-cancel-edit"
                    >
                      Cancelar Alteração
                    </button>
                  )}

                </div>

                <div className="adm-grid adm-grid-4">

                  <label>
                    Nome Completo

                    <input
                      value={nomeUsuario}
                      onChange={(e) =>
                        setNomeUsuario(
                          e.target.value
                        )
                      }
                      placeholder="Nome do Analista"
                    />
                  </label>

                  <label>
                    Login

                    <input
                      value={loginUsuario}
                      onChange={(e) =>
                        setLoginUsuario(
                          e.target.value
                        )
                      }
                      placeholder="login"
                    />
                  </label>

                  <label>
                    E-mail

                    <input
                      value={emailUsuario}
                      onChange={(e) =>
                        setEmailUsuario(
                          e.target.value
                        )
                      }
                      placeholder="usuario@prodepa.pa.gov.br"
                    />
                  </label>

                  <label>
                    Telefone

                    <input
                      value={telefoneUsuario}
                      onChange={(e) =>
                        setTelefoneUsuario(
                          e.target.value
                        )
                      }
                      placeholder="Opcional"
                    />
                  </label>

                </div>

                {(!editUsuario || modoAlterarSenha) && (
                  <div className="adm-security-section">
                    <div className="adm-security-heading">
                      <div>
                        <strong>{modoAlterarSenha ? 'Alterar Senha' : 'Senha de Acesso Inicial'}</strong>
                        <small>
                          {modoAlterarSenha
                            ? 'Defina uma nova senha com no mínimo 6 caracteres para o usuário selecionado.'
                            : 'Defina uma senha com no mínimo 6 caracteres. No primeiro acesso, o usuário deverá alterá-la.'}
                        </small>
                      </div>
                    </div>

                    <div className="adm-security-grid">
                      <label>
                        Senha Temporária
                        <div className="adm-password-field">
                          <input
                            type={mostrarSenhaUsuario ? 'text' : 'password'}
                            value={senhaUsuario}
                            onChange={(e) => setSenhaUsuario(e.target.value)}
                            placeholder="Mínimo 6 caracteres"
                            minLength={MINIMO_SENHA}
                            autoComplete="new-password"
                          />
                          <button
                            type="button"
                            className="adm-password-toggle"
                            onClick={() => setMostrarSenhaUsuario((valor) => !valor)}
                            title={mostrarSenhaUsuario ? 'Ocultar senha' : 'Visualizar senha'}
                            aria-label={mostrarSenhaUsuario ? 'Ocultar senha' : 'Visualizar senha'}
                          >
                            🔍
                          </button>
                        </div>
                      </label>

                      <label>
                        Confirmar Senha
                        <div className="adm-password-field">
                          <input
                            type={mostrarConfirmarSenhaUsuario ? 'text' : 'password'}
                            value={confirmarSenhaUsuario}
                            onChange={(e) => setConfirmarSenhaUsuario(e.target.value)}
                            placeholder="Repita a senha"
                            minLength={MINIMO_SENHA}
                            autoComplete="new-password"
                          />
                          <button
                            type="button"
                            className="adm-password-toggle"
                            onClick={() => setMostrarConfirmarSenhaUsuario((valor) => !valor)}
                            title={mostrarConfirmarSenhaUsuario ? 'Ocultar senha' : 'Visualizar senha'}
                            aria-label={mostrarConfirmarSenhaUsuario ? 'Ocultar senha' : 'Visualizar senha'}
                          >
                            🔍
                          </button>
                        </div>
                      </label>
                    </div>

                    <div className="adm-security-policy">
                      <strong>Política de senha:</strong> mínimo de 6 caracteres.
                    </div>
                  </div>
                )}

                <div className="adm-form-footer">

                  <label>
                    Perfil

                    <select
                      value={perfilUsuario}
                      onChange={(e) =>
                        setPerfilUsuario(
                          e.target.value as Usuario['perfil']
                        )
                      }
                    >
                      <option value="Gestor/Administrador">
                        Gestor (a)
                      </option>

                      <option value="Analista">
                        Analista
                      </option>
                    </select>
                  </label>

                </div>

              </section>

              <section className="adm-card">

                <div className="adm-table-wrap">

                  <table>

                    <thead>
                      <tr>
                        <th>Usuário</th>
                        <th>Login</th>
                        <th>Perfil</th>
                        <th>Status</th>
                        <th>Último Acesso</th>
                        <th>Ações</th>
                      </tr>
                    </thead>

                    <tbody>

                      {usuariosFiltrados.map(
                        (item) => (

                          <tr key={item.id}>

                            <td>
                              <strong>
                                {item.nome}
                              </strong>

                              <small>
                                {item.email}
                              </small>
                            </td>

                            <td>
                              {item.login}
                            </td>

                            <td>
                              <span className="adm-pill">
                                {item.perfil ===
                                'Gestor/Administrador'
                                  ? 'Gestor'
                                  : 'Analista'}
                              </span>
                            </td>

                            <td>
                              <span
                                className={`adm-status ${
                                  item.status === 'Ativo'
                                    ? 'ativo'
                                    : 'inativo'
                                }`}
                              >
                                {item.status}
                              </span>
                            </td>

                            <td>
                              {item.ultimoAcesso
                                ? new Date(
                                    item.ultimoAcesso
                                  ).toLocaleString(
                                    'pt-BR'
                                  )
                                : '—'}
                            </td>

                            <td>
                              <button
                                type="button"
                                onClick={() =>
                                  editarUsuario(item)
                                }
                              >
                                Editar
                              </button>

                              {(usuarioAtual.perfil === 'Gestor/Administrador' ||
                                item.id === usuarioAtual.id) && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    alterarSenhaUsuario(item)
                                  }
                                >
                                  Alterar Senha
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  alternarUsuario(item)
                                }
                              >
                                {item.status ===
                                'Ativo'
                                  ? 'Inativar'
                                  : 'Ativar'}
                              </button>
                            </td>

                          </tr>

                        )
                      )}

                    </tbody>

                  </table>

                </div>

              </section>
            </>
          )}

          {/* ==================================================
              ÓRGÃOS
          ================================================== */}

          {aba === 'clientes' && (
            <>
              <section className="adm-card adm-form-card">

                <div className="adm-card-heading">

                  <div>
                    <h2>
                      {editCliente
                        ? 'Editar Órgão'
                        : 'Novo Órgão'}
                    </h2>

                    <p>
                      O Órgão é utilizado como classificação da Demanda; não possui acesso ao Sistema.
                    </p>
                  </div>

                  {editCliente && (
                    <button
                      type="button"
                      onClick={limparCliente}
                      className="adm-btn-secondary adm-cancel-edit"
                    >
                      Cancelar Alteração
                    </button>
                  )}

                </div>

                <div className="adm-grid adm-grid-2">

                  <label>
                    Nome Do Órgão

                    <input
                      value={nomeCliente}
                      onChange={(e) =>
                        setNomeCliente(
                          e.target.value
                        )
                      }
                      placeholder="Ex.: Secretaria De Estado"
                    />
                  </label>

                  <label>
                    Sigla

                    <input
                      value={siglaCliente}
                      onChange={(e) =>
                        setSiglaCliente(
                          e.target.value
                        )
                      }
                      placeholder="Ex.: SEFA"
                    />
                  </label>

                </div>


              </section>

              <section className="adm-card">

                <div className="adm-table-wrap">

                  <table>

                    <thead>
                      <tr>
                        <th>Órgão</th>
                        <th>Sigla</th>
                        <th>Status</th>
                        <th>Ações</th>
                      </tr>
                    </thead>

                    <tbody>

                      {clientesFiltrados.map(
                        (item) => (

                          <tr key={item.id}>

                            <td>
                              <strong>
                                {item.nome}
                              </strong>
                            </td>

                            <td>
                              {item.sigla || '—'}
                            </td>

                            <td>
                              <span
                                className={`adm-status ${
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

                              <button
                                type="button"
                                onClick={() =>
                                  editarCliente(item)
                                }
                              >
                                Editar
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  alternarCliente(item)
                                }
                              >
                                {item.ativo
                                  ? 'Inativar'
                                  : 'Ativar'}
                              </button>

                            </td>

                          </tr>

                        )
                      )}

                    </tbody>

                  </table>

                </div>

              </section>
            </>
          )}

          {/* ==================================================
              SISTEMAS
          ================================================== */}

          {aba === 'sistemas' && (
            <>
              <section className="adm-card adm-form-card">

                <div className="adm-card-heading">

                  <div>
                    <h2>
                      {editSistema
                        ? 'Editar Sistema'
                        : 'Novo Sistema'}
                    </h2>

                    <p>
                      Cadastre os Sistemas/Serviços para padronizar as Demandas.
                    </p>
                  </div>

                  {editSistema && (
                    <button
                      type="button"
                      onClick={limparSistema}
                      className="adm-btn-secondary adm-cancel-edit"
                    >
                      Cancelar Alteração
                    </button>
                  )}

                </div>

                <div className="adm-grid adm-grid-2">

                  <label>
                    Nome Do Sistema

                    <input
                      value={nomeSistema}
                      onChange={(e) =>
                        setNomeSistema(
                          e.target.value
                        )
                      }
                      placeholder="Nome Do Sistema Ou Serviço"
                    />
                  </label>

                  <label>
                    Órgão Relacionado

                    <select
                      value={clienteSistema}
                      onChange={(e) =>
                        setClienteSistema(
                          e.target.value
                        )
                      }
                    >
                      <option value="">
                        Não vincular
                      </option>

                      {clientes
                        .filter(
                          (item) => item.ativo
                        )
                        .map((item) => (
                          <option
                            key={item.id}
                            value={item.id}
                          >
                            {item.sigla
                              ? `${item.sigla} — ${formatarNomeComposto(item.nome)}`
                              : formatarNomeComposto(item.nome)}
                          </option>
                        ))}
                    </select>
                  </label>

                </div>


              </section>

              <section className="adm-card">

                <div className="adm-table-wrap">

                  <table>

                    <thead>
                      <tr>
                        <th>Sistema</th>
                        <th>Órgão</th>
                        <th>Status</th>
                        <th>Ações</th>
                      </tr>
                    </thead>

                    <tbody>

                      {sistemasFiltrados.map(
                        (item) => {

                          const cliente =
                            clientes.find(
                              (c) =>
                                c.id ===
                                item.clienteId
                            )

                          return (
                            <tr key={item.id}>

                              <td>
                                <strong>
                                  {formatarNomeComposto(item.nome)}
                                </strong>
                              </td>

                              <td>
                                {cliente?.sigla ||
                                  (cliente?.nome ? formatarNomeComposto(cliente.nome) : undefined) ||
                                  '—'}
                              </td>

                              <td>
                                <span
                                  className={`adm-status ${
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

                                <button
                                  type="button"
                                  onClick={() =>
                                    editarSistema(
                                      item
                                    )
                                  }
                                >
                                  Editar
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    alternarSistema(
                                      item
                                    )
                                  }
                                >
                                  {item.ativo
                                    ? 'Inativar'
                                    : 'Ativar'}
                                </button>

                              </td>

                            </tr>
                          )
                        }
                      )}

                    </tbody>

                  </table>

                </div>

              </section>
            </>
          )}

          {/* ==================================================
              TIPOS DE DEMANDA
          ================================================== */}

          {aba === 'tipos' && (
            <>
              <section className="adm-card adm-form-card">

                <div className="adm-card-heading">

                  <div>
                    <h2>
                      {editTipo
                        ? 'Editar Tipo'
                        : 'Novo Tipo de Demanda'}
                    </h2>

                    <p>
                      Tipos Padronizados Alimentam o Cadastro e os Filtros das Demandas.
                    </p>
                  </div>

                  {editTipo && (
                    <button
                      type="button"
                      onClick={limparTipo}
                      className="adm-btn-secondary adm-cancel-edit"
                    >
                      Cancelar Alteração
                    </button>
                  )}

                </div>

                <div className="adm-grid adm-grid-2">

                  <label>
                    Nome do Tipo

                    <input
                      value={nomeTipo}
                      onChange={(e) =>
                        setNomeTipo(
                          e.target.value
                        )
                      }
                      placeholder="Ex.: Melhoria"
                    />
                  </label>

                </div>


              </section>

              <section className="adm-card">

                <div className="adm-table-wrap">

                  <table>

                    <thead>
                      <tr>
                        <th>Tipo</th>
                        <th>Status</th>
                        <th>Ações</th>
                      </tr>
                    </thead>

                    <tbody>

                      {tiposFiltrados.map(
                        (item) => (

                          <tr key={item.id}>

                            <td>
                              <strong>
                                {item.nome}
                              </strong>
                            </td>

                            <td>
                              <span
                                className={`adm-status ${
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

                              <button
                                type="button"
                                onClick={() =>
                                  editarTipo(item)
                                }
                              >
                                Editar
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  alternarTipo(item)
                                }
                              >
                                {item.ativo
                                  ? 'Inativar'
                                  : 'Ativar'}
                              </button>

                            </td>

                          </tr>

                        )
                      )}

                    </tbody>

                  </table>

                </div>

              </section>
            </>
          )}

          {/* ==================================================
              AUDITORIA
          ================================================== */}

          {aba === 'auditoria' && (
            <section className="adm-card">

              <div className="adm-card-heading">

                <div>
                  <h2>
                    Auditoria do Sistema
                  </h2>

                  <p>
                    Registros somente para consulta. Nenhum registro pode ser apagado ou alterado pelo usuário.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setAuditoria(
                      carregarAuditoria()
                    )
                  }
                  className="adm-refresh-button"
                >
                  ↻ Atualizar
                </button>

              </div>

              <div className="adm-table-wrap">

                <table>

                  <thead>

                    <tr>
                      <th>Data/Hora</th>
                      <th>Usuário</th>
                      <th>Ação</th>
                      <th>Descrição</th>
                      <th>Anterior</th>
                      <th>Novo</th>
                      <th>Motivo</th>
                    </tr>

                  </thead>

                  <tbody>

                    {auditoriaFiltrada.map(
                      (item) => (

                        <tr key={item.id}>

                          <td>
                            {new Date(
                              item.data
                            ).toLocaleString(
                              'pt-BR'
                            )}
                          </td>

                          <td>
                            {item.usuario}
                          </td>

                          <td>
                            <span className="adm-audit-action">
                              {item.acao}
                            </span>
                          </td>

                          <td>
                            {item.descricao}
                          </td>

                          <td>
                            {item.valorAnterior ||
                              '—'}
                          </td>

                          <td>
                            {item.valorNovo ||
                              '—'}
                          </td>

                          <td>
                            {item.motivo ||
                              '—'}
                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            </section>
          )}

        </main>

      {/* ======================================================
          TOAST
      ====================================================== */}

      {mensagem && (
        <div className="adm-toast">
          <span className="adm-toast-icon">
            ✓
          </span>

          {mensagem}
        </div>
      )}
    </MenuPrincipal>
  )

}

export default Administracao